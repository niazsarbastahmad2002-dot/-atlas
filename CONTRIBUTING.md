# Contributing to Atlas

Thanks for contributing to Atlas.

Atlas is an open-source, mobile-first clinic appointment and reminder workflow. Contributions should improve the core operational loop for clinics without turning Atlas into a general EMR or hospital-management system.

## Project scope

Good contribution areas include:

- receptionist and appointment workflows
- scheduling reliability
- multilingual usability
- accessibility and mobile/tablet behavior
- privacy, security, and tenant isolation
- testing, documentation, and developer experience
- reminder workflows and safe external integrations

Atlas is intentionally not a diagnostic system, treatment tool, clinical-note store, or general medical-record platform.

## Before you start

1. Search existing issues and pull requests before opening a new one.
2. For a substantial change, open an issue first so the problem and scope can be discussed.
3. Keep pull requests focused on one problem whenever possible.
4. Report security vulnerabilities privately as described in [SECURITY.md](SECURITY.md), not in a public issue.

## Safe development rules

Atlas is healthcare-adjacent software, so development must be conservative.

- Use synthetic data only in public development, tests, screenshots, examples, and demos.
- Never commit patient data, production credentials, access tokens, API keys, private keys, passwords, or real clinic secrets.
- Never commit `.env.local` or another populated environment file.
- Do not point public-development changes at real clinic data.
- Treat production infrastructure, authentication, database policy, domains, payment systems, and messaging-provider configuration as separate operational concerns that require deliberate review.
- Preserve tenant isolation and least-privilege behavior.
- Avoid claims about clinical outcomes or regulatory compliance unless they are supported by dedicated evidence.

If a secret is exposed, treat it as compromised and follow [SECURITY.md](SECURITY.md).

## Local setup

### Requirements

- Node.js 24.x
- npm

### Install

```bash
git clone https://github.com/niazsarbastahmad2002-dot/-atlas.git
cd -atlas
npm ci
cp .env.example .env.local
```

Populate only the development values you actually need. Authenticated flows require a suitable development configuration; do not reuse production secrets or real clinic data.

Start the development server:

```bash
npm run dev
```

## Verification

Before opening a pull request, run:

```bash
npm run check
npm audit --omit=dev --audit-level=high
```

Browser E2E coverage lives under `e2e/` and should use synthetic data.

If you change behavior that is difficult to cover automatically, describe the manual verification you performed in the pull request.

## Pull request expectations

A useful pull request should explain:

- the problem being solved
- the scope of the change
- how it was verified
- any security, privacy, data-model, migration, or multilingual implications
- screenshots or recordings for meaningful UI changes when useful

Keep unrelated cleanup out of the same pull request.

Do not merge a change solely because generated checks pass. Runtime behavior on supported devices remains important evidence for Atlas.

## Multilingual changes

Atlas currently supports Sorani Kurdish, Arabic, and English UI.

When changing user-facing text:

- preserve meaning across languages
- preserve right-to-left layout where applicable
- avoid embedding English terminology inside Kurdish/Arabic sentences when it harms readability
- test narrow phone and tablet layouts when text length changes

## AI-assisted contributions

AI-assisted development is welcome, but the human contributor remains responsible for the result.

- Review and understand generated code before submitting it.
- Run the relevant checks.
- Do not provide patient data, production secrets, private credentials, or other sensitive Atlas information to external AI tools.
- Describe any unusual generated or automated change when it helps reviewers understand the risk.

## Releases

See [RELEASES.md](RELEASES.md) for the release process and [CHANGELOG.md](CHANGELOG.md) for notable changes.

## License

By contributing, you agree that your contribution may be distributed under the repository's [MIT License](LICENSE).
