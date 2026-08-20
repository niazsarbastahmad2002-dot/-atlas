from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / "app/dashboard/page.tsx"
text = path.read_text()
old = '    supabase.from("doctor_workflow_settings").select("doctor_id, default_reminder_language").eq("clinic_id", clinic.id),'
new = '    (supabase as any).from("doctor_workflow_settings").select("doctor_id, default_reminder_language").eq("clinic_id", clinic.id),'
if text.count(old) != 1:
    raise SystemExit(f"expected one workflow query, found {text.count(old)}")
path.write_text(text.replace(old, new, 1))
(root / ".github/workflows/atlas-one-shot-type-fix.yml").unlink(missing_ok=True)
Path(__file__).unlink(missing_ok=True)
