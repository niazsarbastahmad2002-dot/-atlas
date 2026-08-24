import { ModernDemoWorkspace } from "./demo-modern";

export default function DemoPage() {
  return (
    <>
      <ModernDemoWorkspace />
      <style>{`
        .demo-modern-time-input {
          box-sizing: border-box !important;
          display: block;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          inline-size: 100% !important;
          max-inline-size: 100% !important;
          min-inline-size: 0 !important;
          justify-self: stretch;
          overflow: hidden;
          -webkit-appearance: none;
          appearance: none;
          text-align: left;
          direction: ltr;
        }
        .demo-modern-time-input::-webkit-date-and-time-value,
        .demo-modern-time-input::-webkit-datetime-edit {
          text-align: left;
        }
      `}</style>
    </>
  );
}
