# Atlas App Review notes — current iOS build

This file is the current App Review note for the phone-first iOS build. If older release-planning text mentions native Sign in with Apple, this file reflects the actual current app behavior and must be used for submission.

Atlas is clinic scheduling and front-desk workflow software. It does not provide diagnosis, treatment, medical advice, or emergency services.

## What is native on iOS

- Native SwiftUI welcome and first-run experience.
- Native **Today** tab that displays the protected current clinic-day snapshot: clinic, doctor, appointment time, patient name, operational status, and queue order.
- Native synthetic sample clinic available from first launch with no account and no real patient data.
- Native **Continuity Mode** during internet loss using `NWPathMonitor`, protected local file storage, clear OFFLINE/last-synced state, and automatic live recovery after reconnection.
- Native loading, retry, connection-recovery, pull-to-refresh, external-link handling, and persistent WKWebView session behavior.
- Universal Links for secure receptionist invitations.

The **Workspace** tab contains Atlas's full server-authorized scheduling workflow. Appointment creation, rescheduling, status changes, Smart Fill, messaging, staff changes, and settings remain server-backed so stale local state cannot bypass authorization or double-booking protections.

## Authentication

The current product is phone-first. The iOS app does **not** present native Sign in with Apple in this build. Do not tell App Review to look for a Sign in with Apple button.

Production phone/WhatsApp verification must be fully activated before submission if App Review is expected to test real account creation. Until that provider gate is complete, the native synthetic sample remains the safe no-account review path.

## Reviewer path

1. Fresh install Atlas.
2. Tap **Try native sample clinic**.
3. Use the **All / Queue** segmented control and inspect the native clinic-day list. All names are invented sample data.
4. Return and tap **Continue with phone** when the production verification provider is active, or use the dedicated synthetic reviewer account supplied in App Store Connect if one is required.
5. After the dashboard has loaded once, switch between **Today** and **Workspace**. Today is a native read-only clinic-day overview; Workspace contains the full scheduling controls.
6. To test Continuity Mode after a clinic-day snapshot exists, disable network connectivity. Atlas shows an explicit native OFFLINE state with the last synced clinic day and does not permit offline writes. Restore connectivity; Atlas refreshes from the server rather than replaying cached changes.
7. A valid receptionist invitation Universal Link opens inside the installed Atlas app and still requires identity verification before membership is granted.

## Guideline 4.2 positioning

Atlas is intentionally hybrid rather than a generic website wrapper. The native app contributes an always-available clinic-day surface, a native no-account sample experience, protected outage continuity, native network/recovery behavior, Universal Links, and persistent device session behavior. The web-backed Workspace is retained for write-heavy workflows because server authorization, tenant isolation, and appointment-conflict protections must remain authoritative.
