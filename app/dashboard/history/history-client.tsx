"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UiLocale } from "@/lib/i18n/ui";
import { deleteArchivedAppointments } from "./actions";

type HistoryRow = {
  id: string;
  patientName: string;
  patientPhone: string;
  doctorName: string;
  appointmentAt: string;
  displayTime: string;
  status: string;
  removed: boolean;
};

const copy = {
  en: {
    search: "Search patient, phone, or doctor",
    all: "All history",
    removed: "Removed only",
    newest: "Newest first",
    oldest: "Oldest first",
    patient: "Patient",
    doctor: "Doctor",
    time: "Appointment",
    status: "Status",
    removedLabel: "Removed",
    selectAll: "Select all removed",
    selected: "selected",
    clear: "Clear",
    delete: "Delete forever",
    deleting: "Deleting…",
    deleteConfirm: "Permanently delete the selected removed appointments? This cannot be undone.",
    adminOnly: "Only clinic administration can permanently delete removed records.",
    empty: "No history matches this view.",
    failed: "Atlas could not delete those records. Refresh and try again.",
    notAllowed: "Only clinic administration can permanently delete removed records.",
  },
  ku: {
    search: "بە ناوی نەخۆش، ژمارە یان پزیشک بگەڕێ",
    all: "هەموو مێژوو",
    removed: "تەنها لابراوەکان",
    newest: "نوێترین لە سەرەوە",
    oldest: "کۆنترین لە سەرەوە",
    patient: "نەخۆش",
    doctor: "پزیشک",
    time: "وادە",
    status: "دۆخ",
    removedLabel: "لابراوە",
    selectAll: "هەموو لابراوەکان دیاری بکە",
    selected: "دیاریکراو",
    clear: "پاککردنەوە",
    delete: "بۆ هەمیشە بسڕەوە",
    deleting: "دەسڕدرێتەوە…",
    deleteConfirm: "وادە لابراوە دیاریکراوەکان بۆ هەمیشە بسڕدرێنەوە؟ ئەمە ناگەڕێتەوە.",
    adminOnly: "تەنها بەڕێوەبردنی کلینیک دەتوانێت تۆماری لابراو بۆ هەمیشە بسڕێتەوە.",
    empty: "هیچ تۆمارێک لەم دیمەنەدا نییە.",
    failed: "Atlas نەیتوانی ئەم تۆمارانە بسڕێتەوە. پەڕەکە نوێ بکەرەوە و دووبارە هەوڵ بدە.",
    notAllowed: "تەنها بەڕێوەبردنی کلینیک دەتوانێت تۆماری لابراو بۆ هەمیشە بسڕێتەوە.",
  },
  ar: {
    search: "ابحث باسم المريض أو الرقم أو الطبيب",
    all: "كل السجل",
    removed: "المحذوفة فقط",
    newest: "الأحدث أولاً",
    oldest: "الأقدم أولاً",
    patient: "المريض",
    doctor: "الطبيب",
    time: "الموعد",
    status: "الحالة",
    removedLabel: "تمت الإزالة",
    selectAll: "تحديد كل المواعيد المحذوفة",
    selected: "محدد",
    clear: "مسح",
    delete: "حذف نهائي",
    deleting: "جارٍ الحذف…",
    deleteConfirm: "حذف المواعيد المحددة نهائياً؟ لا يمكن التراجع عن هذا الإجراء.",
    adminOnly: "يمكن لإدارة العيادة فقط حذف السجلات نهائياً.",
    empty: "لا يوجد سجل يطابق هذا العرض.",
    failed: "تعذر على Atlas حذف هذه السجلات. حدّث الصفحة وحاول مرة أخرى.",
    notAllowed: "يمكن لإدارة العيادة فقط حذف السجلات نهائياً.",
  },
} as const;

const statusLabels: Record<UiLocale, Record<string, string>> = {
  en: { pending: "Pending", confirmed: "Confirmed", cancelled: "Cancelled", completed: "Completed", no_show: "No-show", voided: "Removed" },
  ku: { pending: "چاوەڕوان", confirmed: "پشتڕاستکراوە", cancelled: "هەڵوەشێنراوەتەوە", completed: "تەواوبوو", no_show: "نەهات", voided: "لابراوە" },
  ar: { pending: "قيد الانتظار", confirmed: "مؤكد", cancelled: "ملغي", completed: "مكتمل", no_show: "لم يحضر", voided: "تمت الإزالة" },
};

export function HistoryClient({
  clinicId,
  rows,
  locale,
  canDelete,
}: {
  clinicId: string;
  rows: HistoryRow[];
  locale: UiLocale;
  canDelete: boolean;
}) {
  const router = useRouter();
  const t = copy[locale];
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "removed">("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState("");
  const [pending, startTransition] = useTransition();

  const visibleRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows
      .filter((row) => filter === "all" || row.removed)
      .filter((row) => !needle || `${row.patientName} ${row.patientPhone} ${row.doctorName}`.toLowerCase().includes(needle))
      .sort((a, b) => sort === "newest"
        ? new Date(b.appointmentAt).getTime() - new Date(a.appointmentAt).getTime()
        : new Date(a.appointmentAt).getTime() - new Date(b.appointmentAt).getTime());
  }, [filter, query, rows, sort]);

  const removableVisible = visibleRows.filter((row) => row.removed).map((row) => row.id);
  const allVisibleSelected = removableVisible.length > 0 && removableVisible.every((id) => selected.has(id));

  function toggle(id: string) {
    setFeedback("");
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setFeedback("");
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) removableVisible.forEach((id) => next.delete(id));
      else removableVisible.forEach((id) => next.add(id));
      return next;
    });
  }

  function permanentlyDelete() {
    if (!canDelete || pending || selected.size === 0) return;
    if (!window.confirm(t.deleteConfirm)) return;
    const ids = [...selected];
    setFeedback("");
    startTransition(async () => {
      const result = await deleteArchivedAppointments(clinicId, ids);
      if (!result.ok) {
        setFeedback(result.error === "not_allowed" ? t.notAllowed : t.failed);
        return;
      }
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <section className="history-card">
      <div className="history-toolbar">
        <input
          aria-label={t.search}
          placeholder={t.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select aria-label="History filter" value={filter} onChange={(event) => setFilter(event.target.value as "all" | "removed")}>
          <option value="all">{t.all}</option>
          <option value="removed">{t.removed}</option>
        </select>
        <select aria-label="History sort" value={sort} onChange={(event) => setSort(event.target.value as "newest" | "oldest")}>
          <option value="newest">{t.newest}</option>
          <option value="oldest">{t.oldest}</option>
        </select>
      </div>

      {canDelete && removableVisible.length > 0 ? (
        <label className="history-select-all">
          <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} />
          <span>{t.selectAll}</span>
        </label>
      ) : null}

      <div className="history-list">
        {visibleRows.length === 0 ? <div className="history-empty">{t.empty}</div> : visibleRows.map((row) => (
          <article className={`history-row ${row.removed ? "is-removed" : ""}`} key={row.id}>
            <div className="history-check">
              {canDelete && row.removed ? (
                <input
                  aria-label={`${t.patient}: ${row.patientName}`}
                  type="checkbox"
                  checked={selected.has(row.id)}
                  onChange={() => toggle(row.id)}
                />
              ) : <span className="history-check-spacer" />}
            </div>
            <div className="history-patient">
              <strong>{row.patientName}</strong>
              <span dir="ltr">{row.patientPhone}</span>
            </div>
            <div><span className="history-label">{t.doctor}</span><strong>{row.doctorName}</strong></div>
            <div><span className="history-label">{t.time}</span><strong>{row.displayTime}</strong></div>
            <div className="history-status">
              <span className={`status status-${row.removed ? "cancelled" : row.status}`}>
                {row.removed ? t.removedLabel : statusLabels[locale][row.status] ?? row.status}
              </span>
            </div>
          </article>
        ))}
      </div>

      {!canDelete ? <p className="field-help history-admin-note">{t.adminOnly}</p> : null}
      {feedback ? <p className="notice notice-error history-feedback" role="alert">{feedback}</p> : null}

      {canDelete && selected.size > 0 ? (
        <div className="history-selection-bar">
          <strong>{selected.size} {t.selected}</strong>
          <div>
            <button className="button button-ghost button-small" type="button" disabled={pending} onClick={() => setSelected(new Set())}>{t.clear}</button>
            <button className="button button-danger button-small" type="button" disabled={pending} onClick={permanentlyDelete}>{pending ? t.deleting : t.delete}</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
