import Foundation
import XCTest
@testable import Atlas

final class ContinuityTests: XCTestCase {
    private let now = Date(timeIntervalSince1970: 1_787_546_320) // 2026-08-24 in Baghdad.

    private func snapshot(
        userId: String = "11111111-1111-4111-8111-111111111111",
        clinicId: String = "22222222-2222-4222-8222-222222222222",
        day: String = "2026-08-24",
        syncedAt: String = "2026-08-24T04:10:00.000Z",
        status: String = "confirmed"
    ) -> AtlasContinuitySnapshot {
        AtlasContinuitySnapshot(
            version: 1,
            userId: userId,
            clinicId: clinicId,
            clinicName: "Atlas Clinic",
            day: day,
            doctorId: "33333333-3333-4333-8333-333333333333",
            doctorName: "Dr Sara",
            syncedAt: syncedAt,
            appointments: [
                AtlasContinuityAppointment(
                    id: "44444444-4444-4444-8444-444444444444",
                    patientName: "Test Patient",
                    appointmentAt: "2026-08-24T06:00:00.000Z",
                    doctorName: "Dr Sara",
                    status: status,
                    queueOrder: 1
                ),
            ]
        )
    }

    private func temporaryBase() -> URL {
        FileManager.default.temporaryDirectory
            .appending(path: "atlas-continuity-tests")
            .appending(path: UUID().uuidString)
    }

    func testValidSnapshotRoundTripsInProtectedStore() throws {
        let base = temporaryBase()
        defer { try? FileManager.default.removeItem(at: base) }
        let store = AtlasContinuityStore(baseDirectory: base)
        let expected = snapshot()

        XCTAssertTrue(store.save(expected, now: now))
        XCTAssertEqual(store.load(now: now), expected)
    }

    func testDifferentAccountOrClinicClearsSnapshot() throws {
        let base = temporaryBase()
        defer { try? FileManager.default.removeItem(at: base) }
        let store = AtlasContinuityStore(baseDirectory: base)

        XCTAssertTrue(store.save(snapshot(), now: now))
        XCTAssertFalse(store.clearIfScopeChanged(
            userId: "11111111-1111-4111-8111-111111111111",
            clinicId: "22222222-2222-4222-8222-222222222222",
            now: now
        ))
        XCTAssertNotNil(store.load(now: now))

        XCTAssertTrue(store.clearIfScopeChanged(
            userId: "55555555-5555-4555-8555-555555555555",
            clinicId: "22222222-2222-4222-8222-222222222222",
            now: now
        ))
        XCTAssertNil(store.load(now: now))
    }

    func testPreviousDaySnapshotIsRejectedAndRemoved() throws {
        let base = temporaryBase()
        defer { try? FileManager.default.removeItem(at: base) }
        let store = AtlasContinuityStore(baseDirectory: base)

        XCTAssertTrue(store.save(snapshot(), now: now))
        let tomorrow = now.addingTimeInterval(24 * 60 * 60)
        XCTAssertNil(store.load(now: tomorrow))
    }

    func testCorruptedLocalDataFailsClosed() throws {
        let base = temporaryBase()
        defer { try? FileManager.default.removeItem(at: base) }
        let store = AtlasContinuityStore(baseDirectory: base)
        let file = base
            .appending(path: "Atlas", directoryHint: .isDirectory)
            .appending(path: "Continuity", directoryHint: .isDirectory)
            .appending(path: "continuity-v1.json")
        try FileManager.default.createDirectory(at: file.deletingLastPathComponent(), withIntermediateDirectories: true)
        try Data("not-json".utf8).write(to: file)

        XCTAssertNil(store.load(now: now))
        XCTAssertFalse(FileManager.default.fileExists(atPath: file.path))
    }

    func testUnsafeOrStaleSnapshotIsNeverAccepted() {
        XCTAssertFalse(AtlasContinuityValidation.isValid(snapshot(status: "voided"), now: now))
        XCTAssertFalse(AtlasContinuityValidation.isValid(
            snapshot(syncedAt: "2026-08-22T00:00:00.000Z"),
            now: now
        ))
    }
}
