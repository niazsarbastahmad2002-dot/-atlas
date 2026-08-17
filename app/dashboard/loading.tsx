export default function DashboardLoading() {
  return (
    <main className="workspace-page shell" aria-busy="true" aria-label="Loading schedule">
      <section className="stats workspace-stats" aria-hidden="true">
        <article className="stat skeleton" />
        <article className="stat skeleton" />
        <article className="stat skeleton" />
      </section>
      <div className="workspace-grid" aria-hidden="true">
        <section className="panel skeleton" style={{ minHeight: 620 }} />
        <section className="panel schedule-card skeleton" />
      </div>
    </main>
  );
}
