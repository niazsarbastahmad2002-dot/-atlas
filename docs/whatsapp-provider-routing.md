# WhatsApp provider routing

Atlas keeps direct Meta Cloud API as the default. The WhatsApp-first login-code and phone-bound staff-invitation senders share one template-payload path and select either direct Meta or 360dialog from `WHATSAPP_PROVIDER`.

## Safety boundaries

- `ATLAS_WHATSAPP_AUTH_ENABLED=false` prevents login codes and staff invitations for every provider.
- `WHATSAPP_ENABLED=false` independently prevents appointment reminder delivery.
- Selecting 360dialog requires only server-side `D360_API_KEY`; no key belongs in source control or a `NEXT_PUBLIC_*` variable.
- Provider readiness exposes booleans and the provider name, never credential values.
- Direct Meta and its clinic-scoped Coexistence configuration remain supported and unchanged.

## 360dialog limitations

The [360dialog sandbox](https://docs.360dialog.com/docs/get-started/sandbox) can send only its predefined templates to the phone linked to the sandbox key. It cannot create or edit Atlas's authentication or staff-invitation templates, so it cannot prove those production flows.

360dialog supports [authentication templates](https://docs.360dialog.com/docs/resources/authentication-messages) and [copy-code authentication buttons](https://docs.360dialog.com/docs/resources/authentication-messages/copy-code-authentication-templates) on an eligible real channel. Atlas still requires approved templates and a real-phone verification before activation.

Connecting Atlas's existing WhatsApp Business App number to 360dialog is not a parallel API switch. 360dialog documents it as a [Coexistence-number migration](https://docs.360dialog.com/docs/hub/migrations/migrate-a-coex-number-to-360dialog) when the number is already directly on Meta or another provider. Do not migrate, disconnect, or re-register the existing Iraqi `+964` number without an explicit release decision.

The existing 360dialog reminder transport sends the older two-body-variable reminder contract. Atlas's newer interactive confirmation/day-of patient loop remains Meta-specific until 360dialog template compatibility and authenticated inbound webhook handling are separately implemented and verified.
