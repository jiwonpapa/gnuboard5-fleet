export async function registerFleetServiceWorker(
  enabled = import.meta.env.PROD,
) {
  if (!enabled || !("serviceWorker" in navigator)) return null;
  return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
}
