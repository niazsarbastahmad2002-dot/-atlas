export default function StaffLoading() {
  return (
    <main className="settings-page shell" aria-busy="true" aria-label="Loading clinic access">
      <header className="page-heading settings-heading">
        <div>
          <div className="eyebrow">Atlas</div>
          <h1>Clinic access</h1>
          <p>Loading…</p>
        </div>
      </header>
      <div className="settings-grid staff-settings-grid">
        <section className="settings-card settings-loading-card" />
        <section className="settings-card settings-loading-card" />
      </div>
    </main>
  );
}
