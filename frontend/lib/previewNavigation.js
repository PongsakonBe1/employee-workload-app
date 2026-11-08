const destinations = {
  "/dashboard": "/dev/dashboard",
  "/admin/staff-analytics": "/dev/staff",
  "/worklogs/new": "/dev/record",
  "/admin/record": "/dev/record",
  "/worklogs": "/dev/history",
  "/calendar": "/dev/calendar",
  "/resources": "/dev/resources",
  "/admin/equipment-items": "/dev/equipment",
  "/admin/equipment-health": "/dev/equipment/usage"
};
export const previewDestination = href => destinations[href] || null;
