const APP_PREFIX_PATTERN = /^[A-Z0-9]{10}$/;
const BUNDLE_ID_PATTERN = /^[A-Za-z0-9.-]+$/;

export const ATLAS_IOS_BUNDLE_ID = "com.atlasappointments.app";

export function appleApplicationIdentifier(
  appPrefix: string | null | undefined,
  bundleId = ATLAS_IOS_BUNDLE_ID,
) {
  const prefix = appPrefix?.trim() ?? "";
  const bundle = bundleId.trim();
  if (!APP_PREFIX_PATTERN.test(prefix) || !BUNDLE_ID_PATTERN.test(bundle)) return null;
  return `${prefix}.${bundle}`;
}

export function buildAppleAppSiteAssociation(appIdentifier: string) {
  return {
    applinks: {
      details: [
        {
          appIDs: [appIdentifier],
          components: [
            {
              "/": "/join/*",
              comment: "Open secure Atlas receptionist invitation links in the iOS app.",
            },
          ],
        },
      ],
    },
  };
}
