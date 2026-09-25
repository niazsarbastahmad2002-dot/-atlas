"use client";

import { useEffect } from "react";

const CANONICAL_ATLAS_ORIGIN = "https://atlasclinic.dpdns.org";
const LEGACY_PRODUCTION_ORIGIN = "https://atlasdemofixed.vercel.app";

function authFragment() {
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const hasSession = Boolean(fragment.get("access_token") && fragment.get("refresh_token"));
  const hasAuthError = Boolean(fragment.get("error") || fragment.get("error_code"));
  return hasSession || hasAuthError ? window.location.hash : "";
}

function callbackOrigin() {
  return window.location.origin === LEGACY_PRODUCTION_ORIGIN
    ? CANONICAL_ATLAS_ORIGIN
    : window.location.origin;
}

export function EmailAuthFragmentBridge() {
  useEffect(() => {
    if (window.location.pathname === "/auth/email/callback" || window.location.pathname === "/auth/invite") return;

    const fragment = authFragment();
    if (!fragment) return;

    const callback = new URL("/auth/email/callback", callbackOrigin());
    callback.searchParams.set("next", "/dashboard/select-clinic");
    callback.hash = fragment;

    // Do not leave Supabase session tokens in the current page history.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    window.location.replace(callback.toString());
  }, []);

  return null;
}
