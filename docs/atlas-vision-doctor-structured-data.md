# Atlas Vision — public doctor structured data

Atlas public doctor pages emit a small Schema.org `Physician` JSON-LD object to help search engines understand the page.

## Data boundary

Only fields already intentionally published through the doctor/clinic directory RPC are used:

- doctor display name;
- doctor public bio;
- specialty and subspecialty as general expertise context;
- clinic display name;
- published clinic phone;
- published street/area/city/country address fields.

Atlas does not include patient data, appointments, ratings, reviews, unverified credentials, government identifiers, or invented “accepting new patients” claims.

## Safety

The JSON is serialized server-side and escapes `<` before being inserted into the JSON-LD script. The page remains the human-readable source of truth.
