"use strict";

// Focused responsive spacing fixes for Atlas Local.
// Keep controls comfortable on iPad, iPhone, Galaxy and other phone/tablet widths.
(() => {
  const style = document.createElement("style");
  style.id = "atlas-local-responsive-fixes";
  style.textContent = `
    .toolbar {
      grid-template-columns: max-content minmax(0, 1fr) max-content max-content;
      column-gap: 12px;
      row-gap: 10px;
    }
    .toolbar > *,
    .composer-grid > * {
      min-width: 0;
    }
    .day-input {
      min-width: 0;
      width: 100%;
    }
    .toolbar button {
      white-space: nowrap;
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

    @media (max-width: 900px) {
      .toolbar {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .toolbar .day-input {
        grid-column: 1 / -1;
        grid-row: 1;
      }
      .toolbar button {
        width: 100%;
      }

      .composer-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .composer-grid .wide,
      .composer-grid .button {
        grid-column: 1 / -1;
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
    }
  `;
  document.head.append(style);
})();
