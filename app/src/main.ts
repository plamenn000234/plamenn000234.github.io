import "./app.css";
import { mount } from "svelte";
import App from "./App.svelte";
import { migrate } from "./core/store.svelte";
import { applyTheme } from "./core/ui.svelte";
import { startStats, autoCopy, refresh, cloud } from "./core/cloud.svelte";

migrate();
applyTheme();
startStats(); autoCopy();
if (cloud.a.token) refresh().catch(() => {});
mount(App as any, { target: document.getElementById("app")! } as any);

// Offline: the service worker for /v3/ only. The 2.x app keeps its own sw.js at the site root.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  addEventListener("load", () => { navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js", { scope: import.meta.env.BASE_URL }).catch(() => {}); });
}
