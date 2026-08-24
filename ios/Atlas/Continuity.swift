import Combine
import Foundation
@preconcurrency import Network

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

    private static func isUUID(_ value: String) -> Bool {
        UUID(uuidString: value) != nil
    }

    private static func isDay(_ value: String) -> Bool {
        let parts = value.split(separator: "-", omittingEmptySubsequences: false)
        guard parts.count == 3,
              parts[0].count == 4,
              parts[1].count == 2,
              parts[2].count == 2,
              let year = Int(parts[0]),
              let month = Int(parts[1]),
              let day = Int(parts[2]),
              (2000...2200).contains(year),
              (1...12).contains(month),
              (1...31).contains(day) else {
            return false
        }
        return true
    }

    static func isValid(_ snapshot: AtlasContinuitySnapshot, now: Date = Date()) -> Bool {
        guard snapshot.version == currentVersion,
              isUUID(snapshot.userId),
              isUUID(snapshot.clinicId),
              isDay(snapshot.day),
              snapshot.day == baghdadDay(for: now),
              (2...120).contains(snapshot.clinicName.count),
              snapshot.appointments.count <= 500,
              let syncedAt = parseISO8601(snapshot.syncedAt),
              syncedAt <= now.addingTimeInterval(5 * 60),
              syncedAt >= now.addingTimeInterval(-30 * 60 * 60) else {
            return false
        }

        if let doctorId = snapshot.doctorId, !isUUID(doctorId) { return false }
        if let doctorName = snapshot.doctorName, !(2...120).contains(doctorName.count) { return false }

        for appointment in snapshot.appointments {
            guard isUUID(appointment.id),
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

@MainActor
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

@MainActor
final class AtlasNetworkMonitor: ObservableObject {
    @Published private(set) var isOffline = false

    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "com.atlasappointments.network-monitor", qos: .utility)

    init(startImmediately: Bool = true) {
        monitor.pathUpdateHandler = { [weak self] path in
            let offline = path.status != .satisfied
            Task { @MainActor [weak self] in
                self?.isOffline = offline
            }
        }
        if startImmediately {
            monitor.start(queue: queue)
        }
    }

    deinit {
        monitor.cancel()
    }
}
