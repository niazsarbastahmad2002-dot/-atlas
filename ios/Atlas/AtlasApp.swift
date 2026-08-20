import AuthenticationServices
import CryptoKit
import SwiftUI
import UIKit
import WebKit

private let atlasBaseURL = URL(string: "https://atlasdemofixed.vercel.app")!

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

    var body: some View {
        Group {
            if let destination {
                AtlasWebView(url: destination)
                    .ignoresSafeArea(.container, edges: .bottom)
            } else if hasOpened {
                AtlasWebView(url: atlasBaseURL.appending(path: "dashboard"))
                    .ignoresSafeArea(.container, edges: .bottom)
            } else {
                welcome
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
            Text("Clinic appointments. One clear flow.")
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

            Button("Open Atlas") {
                hasOpened = true
                destination = atlasBaseURL.appending(path: "login")
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

            var fragment = URLComponents()
            fragment.queryItems = [
                URLQueryItem(name: "provider", value: "apple"),
                URLQueryItem(name: "id_token", value: identityToken),
                URLQueryItem(name: "nonce", value: nonce),
                URLQueryItem(name: "full_name", value: fullName.isEmpty ? nil : fullName),
            ]

            var authURL = atlasBaseURL.appending(path: "auth/native")
            if var components = URLComponents(url: authURL, resolvingAgainstBaseURL: false) {
                components.fragment = fragment.percentEncodedQuery
                if let url = components.url { authURL = url }
            }

            appleNonce = nil
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
