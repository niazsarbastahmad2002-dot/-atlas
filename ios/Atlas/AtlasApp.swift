import AuthenticationServices
import CryptoKit
import SwiftUI
import UIKit
import WebKit

private let atlasBaseURL = URL(string: "https://atlasdemofixed.vercel.app")!
private let atlasUniversalLinkHosts: Set<String> = [
    "atlasdemofixed.vercel.app",
    "atlasappointments.com",
]
private let atlasInviteTokenCharacters = CharacterSet(charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_")

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

private func atlasInviteFinishPath(for token: String) -> String {
    "/join/\(token)/finish"
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
    @State private var errorMessage: String?
    @State private var appleNonce: String?
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

    private var shouldOfferNativeAppleSignIn: Bool {
        guard let currentWebURL,
              currentWebURL.scheme?.lowercased() == "https",
              let host = currentWebURL.host?.lowercased(),
              atlasUniversalLinkHosts.contains(host) else {
            return false
        }
        return currentWebURL.path == "/login" || atlasInviteToken(from: currentWebURL) != nil
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
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if shouldOfferNativeAppleSignIn {
                nativeAppleSignInBar
            }
        }
    }

    private var nativeAppleSignInBar: some View {
        VStack(spacing: 8) {
            Text(pendingInviteToken == nil ? "Sign in securely without leaving Atlas" : "Use Apple to accept this clinic invitation")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            SignInWithAppleButton(.continue) { request in
                prepareAppleRequest(request)
            } onCompletion: { result in
                completeAppleSignIn(result)
            }
            .signInWithAppleButtonStyle(.black)
            .frame(height: 50)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            if let errorMessage {
                Text(errorMessage)
                    .font(.footnote)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(.horizontal, 18)
        .padding(.top, 10)
        .padding(.bottom, 8)
        .background(.regularMaterial)
    }

    private var welcome: some View {
        VStack(spacing: 22) {
            Spacer()
            Image(systemName: "cross.case.fill")
                .font(.system(size: 58, weight: .semibold))
                .accessibilityHidden(true)
            Text("Atlas")
                .font(.largeTitle.bold())
            Text(pendingInviteToken == nil ? "Clinic appointments. One clear flow." : "Your secure clinic invitation is ready.")
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            SignInWithAppleButton(.continue) { request in
                prepareAppleRequest(request)
            } onCompletion: { result in
                completeAppleSignIn(result)
            }
            .signInWithAppleButtonStyle(.black)
            .frame(height: 52)
            .clipShape(RoundedRectangle(cornerRadius: 12))

            Button(pendingInviteToken == nil ? "Open Atlas" : "Use another sign-in method") {
                hasOpened = true
                if let pendingInviteToken {
                    destination = atlasInviteURL(for: pendingInviteToken)
                } else {
                    destination = atlasBaseURL.appending(path: "login")
                }
            }
            .buttonStyle(.bordered)

            if pendingInviteToken == nil {
                Button("Try with sample data") {
                    destination = atlasBaseURL.appending(path: "demo")
                }
                .buttonStyle(.plain)
                .foregroundStyle(.secondary)
            }

            if let errorMessage {
                Text(errorMessage)
                    .font(.footnote)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
            }
            Spacer()
        }
        .padding(28)
    }

    private func prepareAppleRequest(_ request: ASAuthorizationAppleIDRequest) {
        if let currentWebURL, let inviteToken = atlasInviteToken(from: currentWebURL) {
            pendingInviteToken = inviteToken
        }
        let nonce = UUID().uuidString
        appleNonce = nonce
        errorMessage = nil
        request.requestedScopes = [.email, .fullName]
        request.nonce = sha256(nonce)
    }

    private func handleIncomingURL(_ url: URL) {
        guard let token = atlasInviteToken(from: url) else { return }
        pendingInviteToken = token
        errorMessage = nil
        webErrorMessage = nil

        // Returning users keep their existing Atlas web session. The server-side
        // invitation route will redeem immediately when that session is valid,
        // or present the normal authentication choices if it has expired.
        if hasOpened {
            destination = atlasInviteURL(for: token)
        }
    }

    private func completeAppleSignIn(_ result: Result<ASAuthorization, Error>) {
        do {
            let authorization = try result.get()
            guard let nonce = appleNonce,
                  let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let tokenData = credential.identityToken,
                  let identityToken = String(data: tokenData, encoding: .utf8) else {
                throw AtlasNativeError.missingIdentityToken
            }
            guard let codeData = credential.authorizationCode,
                  let authorizationCode = String(data: codeData, encoding: .utf8),
                  !authorizationCode.isEmpty else {
                throw AtlasNativeError.missingAuthorizationCode
            }

            var parts: [String] = []
            if let given = credential.fullName?.givenName { parts.append(given) }
            if let family = credential.fullName?.familyName { parts.append(family) }
            let fullName = parts.joined(separator: " ")
            let next = pendingInviteToken.map(atlasInviteFinishPath) ?? "/dashboard"

            var fragment = URLComponents()
            fragment.queryItems = [
                URLQueryItem(name: "provider", value: "apple"),
                URLQueryItem(name: "id_token", value: identityToken),
                URLQueryItem(name: "authorization_code", value: authorizationCode),
                URLQueryItem(name: "nonce", value: nonce),
                URLQueryItem(name: "full_name", value: fullName.isEmpty ? nil : fullName),
                URLQueryItem(name: "next", value: next),
            ]

            var authURL = atlasBaseURL.appending(path: "auth/native")
            if var components = URLComponents(url: authURL, resolvingAgainstBaseURL: false) {
                components.fragment = fragment.percentEncodedQuery
                if let url = components.url { authURL = url }
            }

            appleNonce = nil
            pendingInviteToken = nil
            hasOpened = true
            destination = authURL
            errorMessage = nil
        } catch {
            appleNonce = nil
            errorMessage = "Apple sign-in did not complete. You can try again or open Atlas with another sign-in method."
        }
    }

    private func sha256(_ input: String) -> String {
        SHA256.hash(data: Data(input.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}

enum AtlasNativeError: Error {
    case missingIdentityToken
    case missingAuthorizationCode
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
