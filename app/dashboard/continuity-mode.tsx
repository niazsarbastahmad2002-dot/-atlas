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

type StoredContinuityKey = {
  id: "key";
  key: CryptoKey;
};

type StoredContinuitySnapshot = {
  id: "snapshot";
  scope: string;
  storedAt: number;
  iv: number[];
  ciphertext: number[];
};

type AtlasNativeWindow = Window & {
  webkit?: {
    messageHandlers?: {
      atlasContinuity?: { postMessage: (value: unknown) => void };
    };
  };
};

const CONTINUITY_DB = "atlas-continuity-v2";
const CONTINUITY_STORE = "state";
const CONTINUITY_DB_VERSION = 1;
const CONTINUITY_ACTIVE_MARKER = "atlas-continuity-active";

function nativePost(value: unknown) {
  const nativeWindow = window as AtlasNativeWindow;
  nativeWindow.webkit?.messageHandlers?.atlasContinuity?.postMessage(value);
}

function openContinuityDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(CONTINUITY_DB, CONTINUITY_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CONTINUITY_STORE)) {
        db.createObjectStore(CONTINUITY_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("continuity_db_unavailable"));
  });
}

function readContinuityRecord<T>(db: IDBDatabase, id: string) {
  return new Promise<T | undefined>((resolve, reject) => {
    const transaction = db.transaction(CONTINUITY_STORE, "readonly");
    const request = transaction.objectStore(CONTINUITY_STORE).get(id);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error ?? new Error("continuity_read_failed"));
  });
}

function writeContinuityRecord(db: IDBDatabase, value: StoredContinuityKey | StoredContinuitySnapshot) {
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(CONTINUITY_STORE, "readwrite");
    transaction.objectStore(CONTINUITY_STORE).put(value);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("continuity_write_failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("continuity_write_aborted"));
  });
}

async function getOrCreateContinuityKey(db: IDBDatabase) {
  const existing = await readContinuityRecord<StoredContinuityKey>(db, "key");
  if (existing?.key) return existing.key;

  const key = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  await writeContinuityRecord(db, { id: "key", key });
  return key;
}

async function persistBrowserSnapshot(snapshot: ContinuitySnapshot) {
  if (!("indexedDB" in window) || !window.crypto?.subtle) return;

  const db = await openContinuityDb();
  try {
    const key = await getOrCreateContinuityKey(db);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const envelope = {
      snapshot,
      locale: document.documentElement.lang || "en",
      direction: document.documentElement.dir === "rtl" ? "rtl" : "ltr",
    };
    const plaintext = new TextEncoder().encode(JSON.stringify(envelope));
    const encrypted = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);

    await writeContinuityRecord(db, {
      id: "snapshot",
      scope: `${snapshot.userId}:${snapshot.clinicId}:${snapshot.day}`,
      storedAt: Date.now(),
      iv: Array.from(iv),
      ciphertext: Array.from(new Uint8Array(encrypted)),
    });
    window.localStorage.setItem(CONTINUITY_ACTIVE_MARKER, "1");
  } finally {
    db.close();
  }
}

export async function clearBrowserContinuityCache() {
  try {
    window.localStorage.setItem(CONTINUITY_ACTIVE_MARKER, "0");
    if (!("indexedDB" in window)) return;
    const db = await openContinuityDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(CONTINUITY_STORE, "readwrite");
      transaction.objectStore(CONTINUITY_STORE).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("continuity_clear_failed"));
      transaction.onabort = () => reject(transaction.error ?? new Error("continuity_clear_aborted"));
    });
    db.close();
  } catch {
    // Clearing continuity data is best-effort in browsers that do not support
    // IndexedDB/CryptoKey persistence. No online Atlas behavior depends on it.
  }
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
        void clearBrowserContinuityCache();
        setLastSyncedAt(null);
        return;
      }
      if (!response.ok || !body?.snapshot || body.snapshot.version !== 1) return;

      nativePost({ type: "snapshot", snapshot: body.snapshot });
      void persistBrowserSnapshot(body.snapshot).catch(() => undefined);
      setLastSyncedAt(body.snapshot.syncedAt);
    } catch {
      // A failed refresh never mutates or replaces the last protected snapshot.
    }
  }, [pathname, searchKey]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/atlas-sw.js", { scope: "/" }).catch(() => undefined);
  }, []);

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
        // Reconnect always reloads authoritative server state. Offline continuity
        // is visibility-only and never replays stale mutations into Supabase.
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
          Atlas is read-only while disconnected. This screen remains available, and a protected copy of today&apos;s schedule can reopen offline. Last synced {syncTimeLabel(lastSyncedAt)}.
        </span>
      </div>
      <style>{`
        .atlas-continuity-banner{position:sticky;top:0;z-index:80;display:flex;align-items:center;justify-content:center;gap:9px;min-height:42px;padding:8px 14px;border-bottom:1px solid #d8caa2;background:#fff8e7;color:#5e4a12;font-size:11px;line-height:1.35;text-align:center}.atlas-continuity-banner strong{flex:0 0 auto;font-size:10px;letter-spacing:.08em}html[data-atlas-offline="true"] .app-content form,html[data-atlas-offline="true"] .app-content button,html[data-atlas-offline="true"] .live-clinic-flow button{pointer-events:none;opacity:.58}html[data-atlas-offline="true"] .app-content input,html[data-atlas-offline="true"] .app-content select,html[data-atlas-offline="true"] .app-content textarea{pointer-events:none}@media(max-width:680px){.atlas-continuity-banner{align-items:flex-start;flex-direction:column;gap:2px;text-align:left}}
      `}</style>
    </>
  );
}
