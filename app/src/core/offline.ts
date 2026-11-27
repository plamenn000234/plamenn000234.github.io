// "Save all recipes for offline": asks the service worker to cache every collection file.
import { D, MINE_SLUG } from "./catalog";
import { toast } from "./ui.svelte";
export function saveOffline() {
  const sw = navigator.serviceWorker?.controller;
  if (!sw) { toast.show("Offline mode starts after the next reload. Open the app again, then tap this once more."); return; }
  const urls = D.folders.filter((f) => f[1] !== MINE_SLUG).map((f) => "../r/" + f[1] + ".json");
  navigator.serviceWorker.addEventListener("message", (e) => { if (e.data?.type === "cached") toast.show(`Saved ${e.data.ok} of ${e.data.n} collections for offline use`); }, { once: true });
  sw.postMessage({ type: "cacheAll", urls }); toast.show("Saving " + urls.length + " collections for offline use…");
}
