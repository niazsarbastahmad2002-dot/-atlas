import Foundation

struct AtlasContinuityAppointment: Codable, Equatable {
    let id: String
    let patientName: String
    let appointmentAt: String
    let doctorName: String
    let status: String
    let queueOrder: Int?
}

struct AtlasContinuitySnapshot: Codable, Equatable {
    let version: Int
    let userId: String
    let clinicId: String
    let clinicName: String
    let day: String
    let doctorId: String?
    let doctorName: String?
    let syncedAt: String
    let appointments: [AtlasContinuityAppointment]
}

enum AtlasContinuityValidation {
    static let currentVersion = 1
    private static let uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
    private static let dayPattern = /^\d{4}-\d{2}-\d{2}$/
    private static let allowedStatuses: Set<String> = ["pending", "confirmed", "cancelled", "completed", "no_show"]

    static func baghdadDay(for date: Date) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Asia/Baghdad") ?? .current
        let components = calendar.dateComponents([.year, .month, .day], from: date)
        guard let year = components.year, let month = components.month, let day = components.day else { return "" }
        return String(format: "%04d-%02d-%02d", year, month, day)
    }

    static func parseISO8601(_ value: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: value) { return date }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: value)
    }

    static func isValid(_ snapshot: AtlasContinuitySnapshot, now: Date = Date()) -> Bool {
        guard snapshot.version == currentVersion,
              snapshot.userId.wholeMatch(of: uuidPattern) != nil,
              snapshot.clinicId.wholeMatch(of: uuidPattern) != nil,
              snapshot.day.wholeMatch(of: dayPattern) != nil,
              snapshot.day == baghdadDay(for: now),
              (2...120).contains(snapshot.clinicName.count),
              snapshot.appointments.count <= 500,
              let syncedAt = parseISO8601(snapshot.syncedAt),
              syncedAt <= now.addingTimeInterval(5 * 60),
              syncedAt >= now.addingTimeInterval(-30 * 60 * 60) else {
            return false
        }

        if let doctorId = snapshot.doctorId, doctorId.wholeMatch(of: uuidPattern) == nil { return false }
        if let doctorName = snapshot.doctorName, !(2...120).contains(doctorName.count) { return false }

        for appointment in snapshot.appointments {
            guard appointment.id.wholeMatch(of: uuidPattern) != nil,
                  (2...120).contains(appointment.patientName.count),
                  (2...120).contains(appointment.doctorName.count),
                  allowedStatuses.contains(appointment.status),
                  let appointmentAt = parseISO8601(appointment.appointmentAt),
                  baghdadDay(for: appointmentAt) == snapshot.day else {
                return false
            }
            if let queueOrder = appointment.queueOrder, !(1...500).contains(queueOrder) { return false }
        }
        return true
    }
}

final class AtlasContinuityStore {
    static let shared = AtlasContinuityStore()

    private let fileManager: FileManager
    private let fileURL: URL

    init(fileManager: FileManager = .default, baseDirectory: URL? = nil) {
        self.fileManager = fileManager
        let root = baseDirectory ?? fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let directory = root.appending(path: "Atlas", directoryHint: .isDirectory)
            .appending(path: "Continuity", directoryHint: .isDirectory)
        self.fileURL = directory.appending(path: "continuity-v1.json")
    }

    @discardableResult
    func save(_ snapshot: AtlasContinuitySnapshot, now: Date = Date()) -> Bool {
        guard AtlasContinuityValidation.isValid(snapshot, now: now) else { return false }
        do {
            let directory = fileURL.deletingLastPathComponent()
            try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
            try fileManager.setAttributes([.protectionKey: FileProtectionType.complete], ofItemAtPath: directory.path)

            let data = try JSONEncoder().encode(snapshot)
            try data.write(to: fileURL, options: [.atomic, .completeFileProtection])
            try fileManager.setAttributes([.protectionKey: FileProtectionType.complete], ofItemAtPath: fileURL.path)
            var values = URLResourceValues()
            values.isExcludedFromBackup = true
            var protectedURL = fileURL
            try protectedURL.setResourceValues(values)
            return true
        } catch {
            return false
        }
    }

    func load(now: Date = Date()) -> AtlasContinuitySnapshot? {
        guard fileManager.fileExists(atPath: fileURL.path) else { return nil }
        do {
            let data = try Data(contentsOf: fileURL)
            let snapshot = try JSONDecoder().decode(AtlasContinuitySnapshot.self, from: data)
            guard AtlasContinuityValidation.isValid(snapshot, now: now) else {
                clear()
                return nil
            }
            return snapshot
        } catch {
            clear()
            return nil
        }
    }

    @discardableResult
    func clearIfScopeChanged(userId: String, clinicId: String, now: Date = Date()) -> Bool {
        guard let current = load(now: now) else { return false }
        guard current.userId != userId || current.clinicId != clinicId else { return false }
        clear()
        return true
    }

    func clear() {
        try? fileManager.removeItem(at: fileURL)
    }
}
