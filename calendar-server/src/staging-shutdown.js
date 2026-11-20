export async function closeStagingServer(server, resourceStatus, initializedSdk) {
  await new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  });
  resourceStatus?.close();

  const current = await initializedSdk()?.catch(() => null);
  if (!current) return;
  await current.db.terminate();
  const { deleteApp } = await import("firebase-admin/app");
  await deleteApp(current.app);
}
