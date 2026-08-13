export default function DashboardLoading() {
  return (
    <main className="dashboard shell" aria-busy="true" aria-live="polite">
      <header className="dashboard-header">
        <div><div className="brand">Atlas</div><p className="quiet">Loading clinic workspace…</p></div>
      </header>
      <section className="stats loading-grid" aria-label="Loading appointment summary">
        <div className="stat skeleton" />
        <div className="stat skeleton" />
        <div className="stat skeleton" />
      </section>
      <div className="panel empty-state">Loading appointments…</div>
    </main>
  );
}
