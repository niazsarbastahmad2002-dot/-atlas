import SwiftUI

struct AtlasNativeTodayView: View {
    let snapshot: AtlasContinuitySnapshot?
    let isOffline: Bool
    let openAtlas: () -> Void

    var body: some View {
        NavigationStack {
            Group {
                if let snapshot {
                    clinicDay(snapshot)
                } else {
                    emptyState
                }
            }
            .navigationTitle("Today")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    statusBadge
                }
            }
        }
    }

    @ViewBuilder
    private func clinicDay(_ snapshot: AtlasContinuitySnapshot) -> some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 6) {
                    Text(snapshot.clinicName)
                        .font(.title3.bold())
                    if let doctorName = snapshot.doctorName {
                        Text(doctorName)
                            .foregroundStyle(.secondary)
                    }
                    Text(isOffline
                         ? "Offline · showing Atlas as of \(timeLabel(snapshot.syncedAt))"
                         : "Synced at \(timeLabel(snapshot.syncedAt))")
                        .font(.caption)
                        .foregroundStyle(isOffline ? .orange : .secondary)
                    if isOffline {
                        Text("Changes from other staff may not appear until connection returns.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.vertical, 4)
            }

            Section("Clinic day") {
                if snapshot.appointments.isEmpty {
                    Text("No appointments in the current clinic day.")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(snapshot.appointments, id: \.id) { appointment in
                        appointmentRow(appointment)
                    }
                }
            }

            Section {
                Button("Open full Atlas") {
                    openAtlas()
                }
                .fontWeight(.semibold)
            } footer: {
                Text("Today is a native read-only overview. Scheduling and changes stay in the full Atlas workspace so server conflict protections remain authoritative.")
            }
        }
        .listStyle(.insetGrouped)
    }

    private var emptyState: some View {
        ContentUnavailableView {
            Label(isOffline ? "Atlas is offline" : "Today is ready", systemImage: isOffline ? "wifi.slash" : "calendar")
        } description: {
            Text(isOffline
                 ? "No protected clinic-day snapshot is available yet. Reconnect once to load today’s schedule."
                 : "Open Atlas once to load your clinic. After that, Today gives you a native clinic-day overview and protected outage fallback.")
        } actions: {
            if !isOffline {
                Button("Open Atlas") {
                    openAtlas()
                }
                .buttonStyle(.borderedProminent)
            }
        }
    }

    @ViewBuilder
    private var statusBadge: some View {
        if isOffline {
            Label("Offline", systemImage: "wifi.slash")
                .font(.caption.bold())
                .foregroundStyle(.orange)
                .accessibilityLabel("Atlas is offline")
        } else {
            Label("Synced", systemImage: "checkmark.circle")
                .font(.caption.bold())
                .foregroundStyle(.secondary)
                .accessibilityLabel("Atlas clinic day is synced")
        }
    }

    private func appointmentRow(_ appointment: AtlasContinuityAppointment) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline) {
                Text(appointment.patientName)
                    .font(.headline)
                Spacer()
                if let queueOrder = appointment.queueOrder {
                    Text("#\(queueOrder)")
                        .font(.caption.bold())
                        .foregroundStyle(.secondary)
                }
            }
            HStack(spacing: 7) {
                Text(timeLabel(appointment.appointmentAt))
                Text("·")
                Text(appointment.doctorName)
                Text("·")
                Text(statusLabel(appointment.status))
            }
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 3)
    }

    private func timeLabel(_ isoValue: String) -> String {
        guard let date = AtlasContinuityValidation.parseISO8601(isoValue) else { return "Time unavailable" }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US")
        formatter.timeZone = TimeZone(identifier: "Asia/Baghdad")
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: date)
    }

    private func statusLabel(_ status: String) -> String {
        switch status {
        case "pending": return "Pending"
        case "confirmed": return "Confirmed"
        case "cancelled": return "Cancelled"
        case "completed": return "Completed"
        case "no_show": return "No-show"
        default: return "Scheduled"
        }
    }
}

struct AtlasNativeDemoView: View {
    let close: () -> Void
    let continueWithPhone: () -> Void

    @State private var showWaitingOnly = false

    private let sampleAppointments = [
        DemoAppointment(patient: "Rana A.", time: "9:00 AM", doctor: "Dr. Sara", status: "Confirmed", queue: 1, waiting: true),
        DemoAppointment(patient: "Omar K.", time: "9:30 AM", doctor: "Dr. Sara", status: "Confirmed", queue: 2, waiting: true),
        DemoAppointment(patient: "Dilan H.", time: "10:15 AM", doctor: "Dr. Sara", status: "Pending", queue: 3, waiting: true),
        DemoAppointment(patient: "Ari M.", time: "11:00 AM", doctor: "Dr. Sara", status: "Completed", queue: nil, waiting: false),
    ]

    var body: some View {
        NavigationStack {
            List {
                Section {
                    VStack(alignment: .leading, spacing: 5) {
                        Text("Sample Clinic")
                            .font(.title3.bold())
                        Text("Dr. Sara · Today")
                            .foregroundStyle(.secondary)
                        Text("Native sample — no account or patient data is used")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 4)
                }

                Section {
                    Picker("View", selection: $showWaitingOnly) {
                        Text("All").tag(false)
                        Text("Queue").tag(true)
                    }
                    .pickerStyle(.segmented)
                }

                Section("Clinic day") {
                    ForEach(filteredAppointments) { appointment in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack(alignment: .firstTextBaseline) {
                                Text(appointment.patient)
                                    .font(.headline)
                                Spacer()
                                if let queue = appointment.queue {
                                    Text("#\(queue)")
                                        .font(.caption.bold())
                                        .foregroundStyle(.secondary)
                                }
                            }
                            Text("\(appointment.time) · \(appointment.doctor) · \(appointment.status)")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 3)
                    }
                }

                Section {
                    Button("Use Atlas with my clinic") {
                        continueWithPhone()
                    }
                    .fontWeight(.semibold)
                } footer: {
                    Text("This native sample demonstrates the clinic-day experience without writing anything to Atlas.")
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Today")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Back") { close() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Text("Sample")
                        .font(.caption.bold())
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private var filteredAppointments: [DemoAppointment] {
        showWaitingOnly ? sampleAppointments.filter(\.waiting) : sampleAppointments
    }

    private struct DemoAppointment: Identifiable {
        let id = UUID()
        let patient: String
        let time: String
        let doctor: String
        let status: String
        let queue: Int?
        let waiting: Bool
    }
}
