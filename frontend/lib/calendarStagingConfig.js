export const STAGING_PROJECT = "labboy-workload-app-staging";
export const STAGING_APP = "1:299459134462:web:5f1bd25089a933cdf7b6af";
export function validateCalendarStagingConfig(value) {
  if (!value || value.projectId !== STAGING_PROJECT || value.appId !== STAGING_APP || value.authDomain !== `${STAGING_PROJECT}.firebaseapp.com` || typeof value.apiKey !== "string" || !value.apiKey || value.apiKey.length > 200) throw new Error("Staging configuration does not match the approved target");
  return {
    projectId: value.projectId,
    appId: value.appId,
    authDomain: value.authDomain,
    apiKey: value.apiKey
  };
}
