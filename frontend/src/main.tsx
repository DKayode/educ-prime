import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { appService } from "./lib/services/app.service";

createRoot(document.getElementById("root")!).render(<App />);

// Sync the runtime favicon + document title from the backend's /app
// response so changes to config.json's `app` section take effect without
// a frontend redeploy. The initial values in index.html are the fallback
// for the moment between page load and this fetch completing.
appService
  .get()
  .then((app) => {
    if (app.favicon) {
      const link = document.getElementById("app-favicon") as HTMLLinkElement | null;
      if (link) {
        link.href = app.favicon;
        link.type = app.favicon.endsWith(".ico") ? "image/x-icon" : "image/png";
      }
    }
    if (app.name) {
      // Only override if the document is still showing the bundled default,
      // so pages that set a more specific title (via React Helmet etc.)
      // aren't clobbered.
      if (document.title === "Edukia Admin") document.title = `${app.name} Admin`;
    }
    if (app.logo) {
      // Social crawlers don't run JS, so og:image / twitter:image picked up
      // by them is whatever index.html ships. We still update at runtime for
      // any client that re-reads the DOM (in-app preview screens, RSS-ish
      // tools, screen readers surfacing meta).
      const og = document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null;
      if (og) og.content = app.logo;
      const tw = document.querySelector('meta[name="twitter:image"]') as HTMLMetaElement | null;
      if (tw) tw.content = app.logo;
    }
  })
  .catch(() => {
    // Backend unreachable — keep the index.html defaults silently.
  });
