# Atlas Vision — verified self-booking foundation

Public self-booking must not let an anonymous request occupy a clinic slot.

## Security model

1. Atlas server normalizes the Iraqi mobile number and generates a short-lived OTP.
2. Only SHA-256 hashes of the phone, OTP, and optional IP bucket are stored.
3. Booking verification is separate from staff/login OTP so one flow cannot supersede the other.
4. Verification requests are rate-limited per phone and IP, old active codes are superseded, codes expire, and verification stops after five attempts.
5. The browser never receives service-role credentials and cannot execute booking database functions directly.
6. Final booking re-checks publication state, doctor activity, clinic public-booking enablement, weekly hours, closed dates, lead time, horizon, slot alignment, and appointment overlap inside the database transaction.
7. The appointment is inserted into the ordinary Atlas appointments table with the existing doctor-slot uniqueness and reminder/audit triggers.
8. A private patient appointment token is created in the same transaction with no clinic-member actor. The patient gets Atlas's existing private appointment surface; no clinic membership and no staff account are created.

## Transport boundary

This migration does **not** send OTPs. A server-only route must later:
- generate the raw OTP;
- reserve its hash through the service function;
- deliver the OTP through an approved provider;
- attach the provider message ID;
- verify the submitted code;
- call the final booking function.

No production WhatsApp/Coexistence configuration is changed by this foundation.
