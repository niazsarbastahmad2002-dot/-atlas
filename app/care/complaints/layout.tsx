import type { ReactNode } from "react";
import { PatientComplaintFlowProvider } from "./flow-context";

export default function PatientComplaintLayout({ children }: { children: ReactNode }) {
  return <PatientComplaintFlowProvider>{children}</PatientComplaintFlowProvider>;
}
