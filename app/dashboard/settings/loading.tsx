export default function SettingsLoading() {
  return (
    <main className="settings-page shell" aria-busy="true" aria-label="Loading settings">
      <div className="settings-grid" aria-hidden="true">
        <section className="settings-card skeleton" style={{ minHeight: 180 }} />
        <section className="settings-card skeleton" style={{ minHeight: 260 }} />
        <section className="settings-card settings-card-wide skeleton" style={{ minHeight: 260 }} />
        <section className="settings-card skeleton" style={{ minHeight: 260 }} />
        <section className="settings-card skeleton" style={{ minHeight: 180 }} />
      </div>
    </main>
  );
}
