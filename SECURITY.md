# Security Policy

## Supported versions

Atlas is actively developed. Security fixes are prioritized for the current development branch.

## Reporting a vulnerability

Please do **not** report suspected security vulnerabilities through public GitHub issues.

Instead, contact the project maintainer privately through the security contact listed on the GitHub repository profile, or use GitHub's private vulnerability reporting feature if it is enabled for this repository.

When reporting a vulnerability, please include:

- A clear description of the issue
- Steps to reproduce it, if possible
- The affected component or file
- The potential security impact
- Any suggested mitigation, if known

Please avoid including patient data, production credentials, access tokens, or other sensitive information in a report.

## What to do if a secret is exposed

If you discover a real credential or token in the repository, do not use it. Report it privately and treat it as compromised so it can be revoked or rotated promptly.

## Scope

Atlas is not an EMR and is not intended to store diagnoses, treatment plans, clinical notes, or other medical-record content. Security reports concerning authentication, authorization, tenant isolation, patient self-service links, reminder workflows, or other Atlas application security are welcome.

## Disclosure

Please allow reasonable time for investigation and remediation before publicly disclosing a vulnerability.