"use strict";

// Responsive and workflow clarity for Atlas Local.
// Keep the offline receptionist surface readable on iPad, iPhone, Galaxy,
// Android tablets and desktop without changing any online Atlas behavior.
(() => {
  const style = document.createElement("style");
  style.id = "atlas-local-responsive-fixes";
  style.textContent = `
    .toolbar {
      grid-template-columns: max-content minmax(0, 1fr) max-content max-content;
      column-gap: 18px;
      row-gap: 10px;
    }
    .toolbar > *,
    .composer-grid > *,
    .appointment > * {
      min-width: 0;
    }
    .day-input {
      min-width: 0;
      width: 100%;
    }
    .toolbar button {
      white-space: nowrap;
    }
    #today-day {
      margin-inline-start: 4px;
      position: relative;
      z-index: 1;
    }

    .composer-grid {
      grid-template-columns:
        minmax(180px, 1.3fr)
        minmax(160px, 1fr)
        minmax(150px, .8fr)
        minmax(150px, .65fr);
      column-gap: 14px;
      row-gap: 12px;
    }
    .composer-grid .button {
      grid-column: 1 / -1;
      width: 100%;
      min-height: 48px;
      white-space: nowrap;
    }

    input[type="date"],
    input[type="time"] {
      -webkit-appearance: none;
      appearance: none;
      background-image: none;
      padding-inline: 12px;
      overflow: hidden;
    }
    input[type="date"]::-webkit-calendar-picker-indicator,
    input[type="time"]::-webkit-calendar-picker-indicator {
      display: none;
      -webkit-appearance: none;
      width: 0;
      height: 0;
      margin: 0;
      padding: 0;
      opacity: 0;
    }
    input[type="date"]::-webkit-date-and-time-value,
    input[type="time"]::-webkit-date-and-time-value {
      margin: 0;
      padding: 0;
      text-align: center;
    }

    .appointment {
      grid-template-columns: 88px 38px minmax(0, 1fr) minmax(210px, 260px) auto;
    }
    .status-select {
      min-width: 0;
      line-height: 1.2;
    }
    .status-select[data-status="pending"] {
      background: #fff7e5;
      border-color: #ead7a0;
      color: #6d5615;
    }
    .status-select[data-status="confirmed"] {
      background: #eaf7f2;
      border-color: #b9ddcf;
      color: #176f56;
    }
    .status-select[data-status="waiting"] {
      background: #eef5ff;
      border-color: #cbdcf2;
      color: #285a82;
    }
    .status-select[data-status="completed"] {
      background: #f1f4f3;
      border-color: #d8e0dd;
      color: #53655f;
    }
    .status-select[data-status="no_show"] {
      background: #fff0f0;
      border-color: #eccaca;
      color: #8b3434;
    }
    .status-select[data-status="cancelled"] {
      background: #f6f2f2;
      border-color: #dfd2d2;
      color: #705858;
    }
    .queue-empty {
      visibility: hidden;
    }
    .call-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      white-space: nowrap;
    }
    .stat span {
      line-height: 1.25;
    }

    @media (max-width: 1100px) {
      .appointment {
        grid-template-columns: 78px 32px minmax(0, 1fr) minmax(190px, 240px);
      }
      .row-actions {
        grid-column: 3 / 5;
        justify-content: flex-end;
      }
    }

    @media (max-width: 900px) {
      .toolbar {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        column-gap: 12px;
      }
      .toolbar .day-input {
        grid-column: 1 / -1;
        grid-row: 1;
      }
      .toolbar button {
        width: 100%;
      }
      #today-day {
        margin-inline-start: 0;
      }

      .composer-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .composer-grid .wide,
      .composer-grid .button {
        grid-column: 1 / -1;
      }
      .appointment {
        grid-template-columns: 74px 30px minmax(0, 1fr);
      }
      .status-select,
      .row-actions {
        grid-column: 3;
        width: 100%;
      }
      .row-actions {
        justify-content: flex-start;
      }
    }

    @media (max-width: 640px) {
      .shell {
        width: min(100% - 18px, 1180px);
        margin-top: 14px;
      }
      .toolbar {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }
      .toolbar button {
        min-width: 0;
        padding-inline: 8px;
        font-size: 12px;
      }
      .composer {
        padding: 13px;
      }
      .composer-grid {
        grid-template-columns: minmax(0, 1fr);
      }
      .composer-grid .wide,
      .composer-grid .button {
        grid-column: auto;
      }
      .appointment {
        grid-template-columns: 66px 28px minmax(0, 1fr);
        gap: 8px;
        padding-inline: 11px;
      }
      .status-select {
        font-size: 11px;
      }
      .row-actions .button,
      .row-actions .call-link {
        flex: 1 1 90px;
      }
      .stats {
        gap: 7px;
      }
      .stat {
        padding: 11px 12px;
      }
      .stat span {
        font-size: 10px;
      }
    }
  `;
  document.head.append(style);
})();
