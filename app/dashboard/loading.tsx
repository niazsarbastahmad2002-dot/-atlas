export default function DashboardLoading() {
  return (
    <main className="workspace-page shell" aria-busy="true" aria-label="Loading schedule">
      <section className="stats workspace-stats schedule-summary" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <article className="stat schedule-stat skeleton" key={index} />
        ))}
      </section>
      <div className="workspace-grid" aria-hidden="true">
        <section className="panel skeleton" style={{ minHeight: 620 }} />
        <section className="panel schedule-card skeleton" />
      </div>
    </main>
  );
}
