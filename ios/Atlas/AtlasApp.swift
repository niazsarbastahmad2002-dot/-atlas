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

    var body: some View {
        Group {
            if let destination {
                AtlasWebView(url: destination)
                    .id(destination.absoluteString)
                    .ignoresSafeArea(.container, edges: .bottom)
            } else if hasOpened {
                let dashboardURL = atlasBaseURL.appending(path: "dashboard")
                AtlasWebView(url: dashboardURL)
                    .id(dashboardURL.absoluteString)
                    .ignoresSafeArea(.container, edges: .bottom)
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
                let nonce = UUID().uuidString
                appleNonce = nonce
                request.requestedScopes = [.email, .fullName]
                request.nonce = sha256(nonce)
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

    private func handleIncomingURL(_ url: URL) {
        guard let token = atlasInviteToken(from: url) else { return }
        pendingInviteToken = token
        errorMessage = nil

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
                  let data = credential.identityToken,
                  let identityToken = String(data: data, encoding: .utf8) else {
                throw AtlasNativeError.missingIdentityToken
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
}

struct AtlasWebView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.keyboardDismissMode = .interactive
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        guard webView.url == nil else { return }
        webView.load(URLRequest(url: url))
    }

    func makeCoordinator() -> Coordinator { Coordinator() }

    final class Coordinator: NSObject, WKNavigationDelegate {
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction) async -> WKNavigationActionPolicy {
            guard let target = navigationAction.request.url else { return .cancel }
            if target.host == atlasBaseURL.host || target.scheme == "about" {
                return .allow
            }
            if navigationAction.navigationType == .linkActivated {
                await MainActor.run { UIApplication.shared.open(target) }
                return .cancel
            }
            return .allow
        }
    }
}
