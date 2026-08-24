import SwiftUI
import UIKit
import WebKit

private let atlasBaseURL = URL(string: "https://atlasdemofixed.vercel.app")!
private let atlasUniversalLinkHosts: Set<String> = [
    "atlasdemofixed.vercel.app",
    "atlasappointments.com",
]
private let atlasInviteTokenCharacters = CharacterSet(charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_")
private let atlasNonReplayableAuthPaths: Set<String> = ["/auth/callback", "/auth/invite", "/auth/native"]
private let atlasContinuityHandlerName = "atlasContinuity"

private func atlasInviteToken(from url: URL) -> String? {
    guard url.scheme?.lowercased() == "https",
          let host = url.host?.lowercased(),
          atlasUniversalLinkHosts.contains(host) else {
        return nil
    }

    let parts = url.path.split(separator: "/", omittingEmptySubsequences: true)
    guard parts.count == 2, parts[0] == "join" else { return nil }

    let token = String(parts[1])
    guard token.count == 43,
          token.unicodeScalars.allSatisfy({ atlasInviteTokenCharacters.contains($0) }) else {
        return nil
    }
    return token
}

private func atlasInviteURL(for token: String) -> URL {
    atlasBaseURL.appending(path: "join").appending(path: token)
}

private func atlasRetryURL(currentURL: URL?, initialURL: URL) -> URL {
    let dashboard = atlasBaseURL.appending(path: "dashboard")
    let candidate = currentURL ?? initialURL
    guard candidate.scheme?.lowercased() == "https",
          let host = candidate.host?.lowercased(),
          atlasUniversalLinkHosts.contains(host) else {
        return dashboard
    }

    // One-time auth callback credentials are never replayed after a network error.
    if atlasNonReplayableAuthPaths.contains(candidate.path) {
        return dashboard
    }

    guard var components = URLComponents(url: candidate, resolvingAgainstBaseURL: false) else {
        return dashboard
    }
    components.fragment = nil
    return components.url ?? dashboard
}

private func atlasShouldClearContinuity(for url: URL?) -> Bool {
    guard let url,
          url.scheme?.lowercased() == "https",
          let host = url.host?.lowercased(),
          atlasUniversalLinkHosts.contains(host) else {
        return false
    }
    return url.path == "/" || url.path == "/login" || url.path.hasPrefix("/auth/")
}

@main
struct AtlasApp: App {
    var body: some Scene {
        WindowGroup {
            AtlasRootView()
        }
    }
}

struct AtlasRootView: View {
    @AppStorage("atlasHasOpened") private var hasOpened = false
    @StateObject private var networkMonitor = AtlasNetworkMonitor()
    @State private var destination: URL?
    @State private var pendingInviteToken: String?
    @State private var currentWebURL: URL?
    @State private var isWebLoading = false
    @State private var webErrorMessage: String?
    @State private var webReloadID = UUID()
    @State private var continuitySnapshot = AtlasContinuityStore.shared.load()
    @State private var sawOffline = false
    @State private var recoveringFromOffline = false

    var body: some View {
        Group {
            if let activeWebDestination {
                webExperience(activeWebDestination)
            } else {
                welcome
            }
        }
        .onOpenURL { url in
            handleIncomingURL(url)
        }
        .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
            guard let url = activity.webpageURL else { return }
            handleIncomingURL(url)
        }
        .onChange(of: networkMonitor.isOffline) { _, offline in
            handleConnectivityChange(offline: offline)
        }
        .onChange(of: isWebLoading) { _, loading in
            if recoveringFromOffline && !loading && webErrorMessage == nil && !networkMonitor.isOffline {
                recoveringFromOffline = false
            }
        }
        .onChange(of: webErrorMessage) { _, message in
            if message != nil && !networkMonitor.isOffline {
                recoveringFromOffline = false
            }
        }
    }

    private var activeWebDestination: URL? {
        if let destination { return destination }
        return hasOpened ? atlasBaseURL.appending(path: "dashboard") : nil
    }

    @ViewBuilder
    private func webExperience(_ url: URL) -> some View {
        ZStack {
            AtlasWebView(
                url: url,
                currentURL: $currentWebURL,
                isLoading: $isWebLoading,
                errorMessage: $webErrorMessage,
                onContinuitySnapshot: acceptContinuitySnapshot,
                onContinuityScope: acceptContinuityScope,
                onContinuityClear: clearContinuitySnapshot
            )
            .id("\(url.absoluteString)-\(webReloadID.uuidString)")
            .ignoresSafeArea(.container, edges: .bottom)

            if networkMonitor.isOffline {
                AtlasContinuityOfflineView(snapshot: continuitySnapshot)
            } else if recoveringFromOffline {
                VStack(spacing: 12) {
                    ProgressView()
                    Text("Connection restored")
                        .font(.headline)
                    Text("Refreshing Atlas with the live clinic schedule…")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding(28)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color(uiColor: .systemBackground))
            } else if isWebLoading && webErrorMessage == nil {
                ProgressView("Opening Atlas…")
                    .padding(.horizontal, 18)
                    .padding(.vertical, 14)
                    .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 14))
                    .accessibilityLabel("Opening Atlas")
            }

            if !networkMonitor.isOffline && !recoveringFromOffline, let webErrorMessage {
                VStack(spacing: 16) {
                    Image(systemName: "wifi.exclamationmark")
                        .font(.system(size: 42, weight: .semibold))
                        .foregroundStyle(.secondary)
                        .accessibilityHidden(true)
                    Text("Atlas could not open")
                        .font(.title2.bold())
                    Text(webErrorMessage)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                    Button("Try again") {
                        let retryURL = atlasRetryURL(
                            currentURL: currentWebURL,
                            initialURL: url
                        )
                        destination = retryURL
                        currentWebURL = retryURL
                        self.webErrorMessage = nil
                        isWebLoading = true
                        webReloadID = UUID()
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding(28)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color(uiColor: .systemBackground))
            }
        }
    }

    private var welcome: some View {
        VStack(spacing: 22) {
            Spacer()
            Image(systemName: "cross.case.fill")
                .font(.system(size: 58, weight: .semibold))
                .accessibilityHidden(true)
            Text("Atlas")
                .font(.largeTitle.bold())
            Text(pendingInviteToken == nil
                 ? "Your clinic starts with your phone number."
                 : "Your secure clinic invitation is ready.")
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button(pendingInviteToken == nil ? "Continue with phone" : "Verify phone and join") {
                hasOpened = true
                webErrorMessage = nil
                if let pendingInviteToken {
                    destination = atlasInviteURL(for: pendingInviteToken)
                } else {
                    destination = atlasBaseURL.appending(path: "login")
                }
            }
            .buttonStyle(.borderedProminent)

            if pendingInviteToken == nil {
                Button("Try with sample data") {
                    destination = atlasBaseURL.appending(path: "demo")
                }
                .buttonStyle(.plain)
                .foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding(28)
    }

    private func handleIncomingURL(_ url: URL) {
        guard let token = atlasInviteToken(from: url) else { return }
        pendingInviteToken = token
        webErrorMessage = nil

        // A valid invitation never grants membership by itself. It only opens the
        // invitation page; the server redeems it after the user verifies identity.
        if hasOpened {
            destination = atlasInviteURL(for: token)
        }
    }

    private func handleConnectivityChange(offline: Bool) {
        if offline {
            sawOffline = true
            recoveringFromOffline = false
            continuitySnapshot = AtlasContinuityStore.shared.load()
            return
        }

        guard sawOffline, let initialURL = activeWebDestination else { return }
        sawOffline = false
        recoveringFromOffline = true
        let retryURL = atlasRetryURL(currentURL: currentWebURL, initialURL: initialURL)
        destination = retryURL
        currentWebURL = retryURL
        webErrorMessage = nil
        isWebLoading = true
        webReloadID = UUID()
    }

    private func acceptContinuitySnapshot(_ snapshot: AtlasContinuitySnapshot) {
        guard AtlasContinuityStore.shared.save(snapshot) else { return }
        continuitySnapshot = snapshot
    }

    private func acceptContinuityScope(userId: String, clinicId: String) {
        if AtlasContinuityStore.shared.clearIfScopeChanged(userId: userId, clinicId: clinicId) {
            continuitySnapshot = nil
        }
    }

    private func clearContinuitySnapshot() {
        AtlasContinuityStore.shared.clear()
        continuitySnapshot = nil
    }
}

private struct AtlasContinuityOfflineView: View {
    let snapshot: AtlasContinuitySnapshot?

    var body: some View {
        VStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 7) {
                HStack(spacing: 8) {
                    Image(systemName: "wifi.slash")
                        .accessibilityHidden(true)
                    Text("OFFLINE")
                        .font(.caption.bold())
                        .tracking(1.1)
                }
                .foregroundStyle(.orange)

                if let snapshot {
                    Text("Showing Atlas as of \(timeLabel(snapshot.syncedAt)).")
                        .font(.headline)
                } else {
                    Text("Atlas is offline.")
                        .font(.headline)
                }
                Text("Changes from other staff may not appear until connection returns.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Text("Read-only continuity view")
                    .font(.caption.bold())
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(20)
            .background(Color(uiColor: .secondarySystemBackground))

            if let snapshot {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 0) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(snapshot.clinicName)
                                .font(.title2.bold())
                            if let doctorName = snapshot.doctorName {
                                Text(doctorName)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 18)

                        if snapshot.appointments.isEmpty {
                            Text("No appointments were in the last synced clinic day.")
                                .foregroundStyle(.secondary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(20)
                        } else {
                            ForEach(snapshot.appointments, id: \.id) { appointment in
                                Divider()
                                VStack(alignment: .leading, spacing: 7) {
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
                                    HStack(spacing: 8) {
                                        Text(timeLabel(appointment.appointmentAt))
                                        Text("·")
                                        Text(appointment.doctorName)
                                        Text("·")
                                        Text(statusLabel(appointment.status))
                                    }
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal, 20)
                                .padding(.vertical, 14)
                            }
                        }
                    }
                }
            } else {
                VStack(spacing: 12) {
                    Image(systemName: "lock.doc")
                        .font(.system(size: 34, weight: .medium))
                        .foregroundStyle(.secondary)
                    Text("No protected clinic-day snapshot is available yet.")
                        .font(.headline)
                        .multilineTextAlignment(.center)
                    Text("Reconnect once to load today’s schedule. Atlas does not store a browser copy of patient data for offline use.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding(28)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(uiColor: .systemBackground))
    }

    private func timeLabel(_ isoValue: String) -> String {
        guard let date = AtlasContinuityValidation.parseISO8601(isoValue) else { return "Last sync unavailable" }
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

struct AtlasWebView: UIViewRepresentable {
    let url: URL
    @Binding var currentURL: URL?
    @Binding var isLoading: Bool
    @Binding var errorMessage: String?
    let onContinuitySnapshot: (AtlasContinuitySnapshot) -> Void
    let onContinuityScope: (String, String) -> Void
    let onContinuityClear: () -> Void

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.applicationNameForUserAgent = "Atlas-iOS/1.0"
        configuration.userContentController.add(context.coordinator, name: atlasContinuityHandlerName)
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.keyboardDismissMode = .interactive
        let refreshControl = UIRefreshControl()
        refreshControl.addTarget(context.coordinator, action: #selector(Coordinator.refresh(_:)), for: .valueChanged)
        webView.scrollView.refreshControl = refreshControl
        context.coordinator.webView = webView
        currentURL = url
        isLoading = true
        errorMessage = nil
        webView.load(URLRequest(url: url, cachePolicy: .reloadRevalidatingCacheData))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        context.coordinator.parent = self
        guard webView.url == nil else { return }
        webView.load(URLRequest(url: url, cachePolicy: .reloadRevalidatingCacheData))
    }

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: atlasContinuityHandlerName)
    }

    func makeCoordinator() -> Coordinator { Coordinator(parent: self) }

    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var parent: AtlasWebView
        weak var webView: WKWebView?

        init(parent: AtlasWebView) {
            self.parent = parent
        }

        @objc func refresh(_ sender: UIRefreshControl) {
            parent.errorMessage = nil
            parent.isLoading = true
            webView?.reloadFromOrigin()
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            parent.currentURL = webView.url
            parent.isLoading = true
            parent.errorMessage = nil
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            parent.currentURL = webView.url
            parent.isLoading = false
            webView.scrollView.refreshControl?.endRefreshing()
            if atlasShouldClearContinuity(for: webView.url) {
                parent.onContinuityClear()
            }
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            finishWithError(webView)
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            finishWithError(webView)
        }

        private func finishWithError(_ webView: WKWebView) {
            parent.currentURL = webView.url ?? parent.currentURL
            parent.isLoading = false
            parent.errorMessage = "Check your internet connection, then try again. Your Atlas session is kept on this device."
            webView.scrollView.refreshControl?.endRefreshing()
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.name == atlasContinuityHandlerName,
                  message.frameInfo.isMainFrame,
                  atlasUniversalLinkHosts.contains(message.frameInfo.securityOrigin.host.lowercased()),
                  let body = message.body as? [String: Any],
                  let type = body["type"] as? String else {
                return
            }

            switch type {
            case "clear":
                parent.onContinuityClear()
            case "scope":
                guard let userId = body["userId"] as? String,
                      let clinicId = body["clinicId"] as? String,
                      UUID(uuidString: userId) != nil,
                      UUID(uuidString: clinicId) != nil else {
                    return
                }
                parent.onContinuityScope(userId, clinicId)
            case "snapshot":
                guard let rawSnapshot = body["snapshot"],
                      JSONSerialization.isValidJSONObject(rawSnapshot),
                      let data = try? JSONSerialization.data(withJSONObject: rawSnapshot),
                      let snapshot = try? JSONDecoder().decode(AtlasContinuitySnapshot.self, from: data),
                      AtlasContinuityValidation.isValid(snapshot) else {
                    return
                }
                parent.onContinuityScope(snapshot.userId, snapshot.clinicId)
                parent.onContinuitySnapshot(snapshot)
            default:
                return
            }
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction) async -> WKNavigationActionPolicy {
            guard let target = navigationAction.request.url else { return .cancel }
            if target.scheme == "about" || target.host.map({ atlasUniversalLinkHosts.contains($0.lowercased()) }) == true {
                return .allow
            }
            await MainActor.run { UIApplication.shared.open(target) }
            return .cancel
        }
    }
}
