// Legacy code must never adopt a named staging/emulator app as its default app.
export function selectDefaultFirebaseApp(apps, initialize) {
  return apps.find(app => app.name === "[DEFAULT]") || initialize();
}
