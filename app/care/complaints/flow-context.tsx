"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { ComplaintId } from "@/lib/patient/complaint-guide";

type FlowValue = {
  complaint: ComplaintId | null;
  emergencyAnswer: "yes" | "no" | null;
  chooseComplaint: (id: ComplaintId) => void;
  answerEmergency: (answer: "yes" | "no") => void;
  reset: () => void;
};

// Deliberately in-memory only: never in a URL, cookie, sessionStorage,
// localStorage, API request, analytics event, or patient medical record.
const FlowContext = createContext<FlowValue | null>(null);

export function PatientComplaintFlowProvider({ children }: { children: ReactNode }) {
  const [complaint, setComplaint] = useState<ComplaintId | null>(null);
  const [emergencyAnswer, setEmergencyAnswer] = useState<"yes" | "no" | null>(null);

  const chooseComplaint = (id: ComplaintId) => {
    setComplaint(id);
    setEmergencyAnswer(null);
  };
  const reset = () => {
    setComplaint(null);
    setEmergencyAnswer(null);
  };

  return (
    <FlowContext.Provider value={{
      complaint,
      emergencyAnswer,
      chooseComplaint,
      answerEmergency: setEmergencyAnswer,
      reset,
    }}>
      {children}
    </FlowContext.Provider>
  );
}

export function usePatientComplaintFlow() {
  const value = useContext(FlowContext);
  if (!value) throw new Error("Complaint guide must be used inside the Patient-only flow");
  return value;
}
