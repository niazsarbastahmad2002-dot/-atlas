"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type ContinuityAppointment = {
  id: string;
  patientName: string;
  appointmentAt: string;
  doctorName: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  queueOrder: number | null;
};

type ContinuitySnapshot = {
  version: 1;
  userId: string;
  clinicId: string;
  clinicName: string;
  day: string;
  doctorId: string | null;
  doctorName: string | null;
  syncedAt: string;
  appointments: ContinuityAppointment[];
};

type AtlasNativeWindow = Window & {
  webkit?: {
    messageHandlers?: {
      atlasContinuity?: { postMessage: (value: unknown) => void };
    };
  };
};

function nativePost(value: unknown) {
  const nativeWindow = window as AtlasNativeWindow;
  nativeWindow.webkit?.messageHandlers?.atlasContinuity?.postMessage(value);
}

function syncTimeLabel(value: string | null) {
  if (!value) return "the last successful load";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "the last successful load";
  return new Intl.DateTimeFormat(undefined, {
    timeZone: "Asia/Baghdad",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function AtlasContinuityMode() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const [offline, setOffline] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const wasOffline = useRef(false);

  const refreshSnapshot = useCallback(async () => {
    if (pathname !== "/dashboard" || navigator.onLine === false) return;

    const params = new URLSearchParams();
    const clinic = new URLSearchParams(searchKey).get("clinic");
    const doctor = new URLSearchParams(searchKey).get("doctor");
    if (clinic) params.set("clinic", clinic);
    if (doctor) params.set("doctor", doctor);

    try {
      const response = await fetch(`/api/continuity/snapshot${params.size ? `?${params}` : ""}`, {
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const body = await response.json().catch(() => null) as {
        clear?: unknown;
        snapshot?: ContinuitySnapshot;
      } | null;

      if (body?.clear === true) {
        nativePost({ type: "clear" });
        setLastSyncedAt(null);
        return;
      }
      if (!response.ok || !body?.snapshot || body.snapshot.version !== 1) return;

      nativePost({ type: "snapshot", snapshot: body.snapshot });
      setLastSyncedAt(body.snapshot.syncedAt);
    } catch {
      // The network guard owns offline UX. A failed refresh never mutates or
      // replaces the last protected snapshot.
    }
  }, [pathname, searchKey]);

  useEffect(() => {
    void refreshSnapshot();
    const timer = window.setInterval(() => {
      if (!document.hidden) void refreshSnapshot();
    }, 60_000);
    const onVisible = () => {
      if (!document.hidden) void refreshSnapshot();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshSnapshot]);

  useEffect(() => {
    const update = () => {
      const nextOffline = navigator.onLine === false;
      if (nextOffline) {
        wasOffline.current = true;
        setOffline(true);
        document.documentElement.dataset.atlasOffline = "true";
        return;
      }

      setOffline(false);
      delete document.documentElement.dataset.atlasOffline;
      if (wasOffline.current) {
        wasOffline.current = false;
        // A full live reload is intentional after reconnect. No cached state is
        // ever replayed into Supabase or allowed to overwrite newer server data.
        window.location.reload();
      }
    };

    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      delete document.documentElement.dataset.atlasOffline;
    };
  }, []);

  if (!offline) return null;

  return (
    <>
      <div className="atlas-continuity-banner" role="status" aria-live="polite">
        <strong>OFFLINE</strong>
        <span>
          Showing the last loaded Atlas screen as of {syncTimeLabel(lastSyncedAt)}. Changes from other staff may not appear until connection returns.
        </span>
      </div>
      <style>{`
        .atlas-continuity-banner{position:sticky;top:0;z-index:80;display:flex;align-items:center;justify-content:center;gap:9px;min-height:42px;padding:8px 14px;border-bottom:1px solid #d8caa2;background:#fff8e7;color:#5e4a12;font-size:11px;line-height:1.35;text-align:center}.atlas-continuity-banner strong{flex:0 0 auto;font-size:10px;letter-spacing:.08em}html[data-atlas-offline="true"] .app-content form,html[data-atlas-offline="true"] .app-content button,html[data-atlas-offline="true"] .live-clinic-flow button{pointer-events:none;opacity:.58}html[data-atlas-offline="true"] .app-content input,html[data-atlas-offline="true"] .app-content select,html[data-atlas-offline="true"] .app-content textarea{pointer-events:none}@media(max-width:680px){.atlas-continuity-banner{align-items:flex-start;flex-direction:column;gap:2px;text-align:left}}
      `}</style>
    </>
  );
}
