export default function StaffLoading() {
  return (
    <main className="settings-page shell" aria-busy="true" data-atlas-loading="staff">
      <div className="settings-grid staff-settings-grid" aria-hidden="true">
        <section className="settings-card skeleton" style={{ minHeight: 220 }} />
        <section className="settings-card skeleton" style={{ minHeight: 320 }} />
      </div>
    </main>
  );
}
