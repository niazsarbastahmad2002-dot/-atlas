import "./patient-profile-design.css";

type Props = {
  kind: "clinic" | "doctor" | "times";
  eyebrow: string;
  title: string;
  subtitle?: string | null;
};

// A truthful visual identity, never a fake professional photograph.
export function PatientProfileHero({ kind, eyebrow, title, subtitle }: Props) {
  const mark = kind === "clinic" ? "+" : kind === "times" ? "◷" : title.trim().slice(0, 1);
  return (
    <header className={`patient-profile-hero patient-profile-${kind}`}>
      <span className="patient-profile-rings" aria-hidden="true" />
      <div className="patient-profile-inner">
        <span className="patient-profile-mark" aria-hidden="true">{mark}</span>
        <div className="patient-profile-heading">
          <span className="patient-profile-eyebrow">{eyebrow}</span>
          <h1><bdi>{title}</bdi></h1>
          {subtitle ? <p><bdi>{subtitle}</bdi></p> : null}
        </div>
      </div>
    </header>
  );
}
