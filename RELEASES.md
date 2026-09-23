# Atlas release process

Atlas uses deliberate releases so public version history reflects verified project state rather than every development commit.

## Current state

The package currently reports version `0.1.0`, but the repository has not yet published a formal GitHub release.

The first formal release should be created only after the intended release commit on `main` has been reviewed and verified.

## Versioning

Atlas follows semantic-versioning principles.

Before 1.0:

- patch versions are for fixes and low-risk refinements
- minor versions may include new or changed product behavior
- breaking behavior should be called out explicitly in release notes

A 1.0 release should represent a deliberate product milestone, not simply the passage of time.

## Release checklist

Before publishing a release:

1. Confirm the intended changes are on `main`.
2. Run:

   ```bash
   npm ci
   npm run check
   npm audit --omit=dev --audit-level=high
   ```

3. Review relevant runtime behavior on supported form factors when the release changes user-facing workflows.
4. Confirm no patient data, credentials, private keys, tokens, or private operational documents are included.
5. Review database/authentication/migration implications when applicable.
6. Update [CHANGELOG.md](CHANGELOG.md).
7. Confirm the package version is intentional.
8. Create an annotated version tag and GitHub release.
9. Write release notes that summarize user-visible changes, important fixes, known limitations, and any required operator action.

## Release safety

Publishing a GitHub release does **not** authorize a production deployment.

Production deployments, database changes, authentication changes, DNS/domain changes, Meta/WhatsApp configuration changes, and other consequential infrastructure actions remain separate decisions and should be verified independently.

## Security releases

If a release addresses a vulnerability:

- coordinate disclosure using [SECURITY.md](SECURITY.md)
- avoid publishing exploit-enabling details before affected deployments can be protected
- rotate or revoke exposed credentials independently of the code release when required
