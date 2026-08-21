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
    @State private var destination: URL?
    @State private var pendingInviteToken: String?
    @State private var currentWebURL: URL?
    @State private var isWebLoading = false
    @State private var webErrorMessage: String?
    @State private var webReloadID = UUID()

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
                errorMessage: $webErrorMessage
            )
            .id("\(url.absoluteString)-\(webReloadID.uuidString)")
            .ignoresSafeArea(.container, edges: .bottom)

            if isWebLoading && webErrorMessage == nil {
                ProgressView("Opening Atlas…")
                    .padding(.horizontal, 18)
                    .padding(.vertical, 14)
                    .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 14))
                    .accessibilityLabel("Opening Atlas")
            }

            if let webErrorMessage {
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
}

struct AtlasWebView: UIViewRepresentable {
    let url: URL
    @Binding var currentURL: URL?
    @Binding var isLoading: Bool
    @Binding var errorMessage: String?

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.applicationNameForUserAgent = "Atlas-iOS/1.0"
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
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        context.coordinator.parent = self
        guard webView.url == nil else { return }
        webView.load(URLRequest(url: url))
    }

    func makeCoordinator() -> Coordinator { Coordinator(parent: self) }

    final class Coordinator: NSObject, WKNavigationDelegate {
        var parent: AtlasWebView
        weak var webView: WKWebView?

        init(parent: AtlasWebView) {
            self.parent = parent
        }

        @objc func refresh(_ sender: UIRefreshControl) {
            parent.errorMessage = nil
            parent.isLoading = true
            webView?.reload()
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
