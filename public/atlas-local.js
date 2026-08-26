(() => {
  "use strict";
  const scripts = [
    "/atlas-local-copy.js",
    "/atlas-local-base.js",
    "/atlas-local-core.js",
    "/atlas-local-polish.js",
    "/atlas-local-app.js",
    "/atlas-local-after.js",
  ];
  const load = (src) => new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`failed:${src}`));
    document.head.append(script);
  });
  (async () => {
    for (const src of scripts) await load(src);
  })().catch(() => {
    const restore = document.getElementById("restore-button");
    if (restore) restore.disabled = true;
    const setup = document.getElementById("setup-error");
    if (setup) {
      setup.textContent = "Atlas Local could not load its offline files. Open it once while internet is available, then try again.";
      setup.classList.remove("hidden");
    }
  });
})();
