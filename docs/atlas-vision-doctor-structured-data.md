# Atlas Vision — public doctor structured data

Atlas public doctor pages emit a small Schema.org `Person` JSON-LD object with `jobTitle: "Physician"` to help search engines understand the page without asserting credentials Atlas has not verified.

## Data boundary

Only fields already intentionally published through the doctor/clinic directory RPC are used:

- doctor display name;
- doctor public bio;
- specialty and subspecialty as general expertise context;
- clinic display name through the Person-compatible `worksFor` relationship;
- published clinic phone;
- published street/area/city/country address fields.

Atlas does not include patient data, appointments, ratings, reviews, unverified credentials, government identifiers, or invented “accepting new patients” claims.

## Safety

The JSON is serialized server-side and escapes `<` before being inserted into the JSON-LD script. The human-readable page remains the source of truth. `Person` is used so `worksFor` has the correct Schema.org domain instead of attaching a Person-only relationship to an organization-like `Physician` node.
