from pathlib import Path
root = Path(__file__).resolve().parents[1]
path = root / "app/dashboard/page.tsx"
text = path.read_text()
old = '(doctorWorkflowRows ?? []).find((row) => row.doctor_id === selectedDoctor?.id)?.default_reminder_language'
new = '(doctorWorkflowRows ?? []).find((row: { doctor_id: string; default_reminder_language: string }) => row.doctor_id === selectedDoctor?.id)?.default_reminder_language'
if text.count(old) != 1:
    raise SystemExit(f"expected one default row lookup, found {text.count(old)}")
path.write_text(text.replace(old, new, 1))
(root / ".github/workflows/atlas-one-shot-row-type-fix.yml").unlink(missing_ok=True)
Path(__file__).unlink(missing_ok=True)
