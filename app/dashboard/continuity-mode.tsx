"use client";

import { useEffect, useRef, useState } from "react";

type ContinuityAppointment = {
  id: string;
  patientName: string;
  appointmentAt: string;
  doctorName: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  queueOrder: number | null;
};

export type ContinuitySnapshot = {
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

function syncTimeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "the last successful load";
  return new Intl.DateTimeFormat(undefined, {
    timeZone: "Asia/Baghdad",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function ContinuitySnapshotPublisher({
  userId,
  clinicId,
  snapshot,
  syncedAt,
}: {
  userId: string;
  clinicId: string;
  snapshot: ContinuitySnapshot | null;
  syncedAt: string;
}) {
  const [offline, setOffline] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    nativePost(snapshot
      ? { type: "snapshot", snapshot }
      : { type: "scope", userId, clinicId });
  }, [clinicId, snapshot, userId]);

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
          Showing Atlas as of {syncTimeLabel(syncedAt)}. Changes from other staff may not appear until connection returns.
        </span>
      </div>
      <style>{`
        .atlas-continuity-banner{position:sticky;top:0;z-index:80;display:flex;align-items:center;justify-content:center;gap:9px;min-height:42px;padding:8px 14px;border-bottom:1px solid #d8caa2;background:#fff8e7;color:#5e4a12;font-size:11px;line-height:1.35;text-align:center}.atlas-continuity-banner strong{flex:0 0 auto;font-size:10px;letter-spacing:.08em}html[data-atlas-offline="true"] .workspace-page form,html[data-atlas-offline="true"] .workspace-page button,html[data-atlas-offline="true"] .live-clinic-flow button{pointer-events:none;opacity:.58}html[data-atlas-offline="true"] .workspace-page input,html[data-atlas-offline="true"] .workspace-page select,html[data-atlas-offline="true"] .workspace-page textarea{pointer-events:none}@media(max-width:680px){.atlas-continuity-banner{align-items:flex-start;flex-direction:column;gap:2px;text-align:left}}
      `}</style>
    </>
  );
}

export function ContinuityCacheClearSignal() {
  useEffect(() => {
    nativePost({ type: "clear" });
  }, []);
  return null;
}
