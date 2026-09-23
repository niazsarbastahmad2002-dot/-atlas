# Changelog

This file records notable user-facing, developer-facing, security, and operational changes to the public Atlas project.

## Unreleased

No unreleased changes are currently documented.

## v0.1.0 — 2026-09-23

First formal GitHub release and open-source maintenance baseline.

### Added

- public contribution guidance
- project code of conduct
- documented release process
- pull request template
- structured bug-report and feature-request templates
- weekly npm Dependabot version-update configuration
- GitHub repository topics for project discoverability

### Changed

- public project documentation now makes contribution, verification, safety, and release expectations explicit
- Next.js updated from 16.3.0 to 16.3.6
- resolved sharp dependency updated from 0.35.3 to 0.35.4

### Security

- GitHub secret scanning enabled
- GitHub push protection enabled
- private vulnerability reporting enabled
- final release baseline passed the production dependency audit
- secret scanning reported no open alerts at release preparation time

### Verification

The release commit passed Atlas CI, including TypeScript, 347 tests, the production build, production dependency audit, and browser E2E smoke tests.

Publishing a GitHub release is separate from deploying Atlas production.

## Changelog policy

For future releases:

- group entries under Added, Changed, Fixed, Security, or Removed when relevant
- describe observable changes rather than internal implementation noise
- avoid patient data, credentials, private infrastructure details, or incident-sensitive information
- link to the relevant release or pull request when useful
