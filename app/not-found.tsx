import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="center-page">
      <section className="auth-card">
        <div className="brand">Atlas</div>
        <h1>That page does not exist.</h1>
        <Link className="button" href="/">Return home</Link>
      </section>
    </main>
  );
}
