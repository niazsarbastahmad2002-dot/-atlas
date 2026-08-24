# Appointment contact relationship

Atlas keeps one communication phone number per appointment and records only whether that number belongs to the patient, a parent/guardian, or another relative/caregiver.

This is intentionally not a patient-contact directory: no separate contact name, extra phone number, family profile, or guardianship document is stored.

Existing appointments default to `patient`. Reminder consent refers to the phone owner, and WhatsApp-originated audit actions are attributed as `contact` when the number is not the patient's.
