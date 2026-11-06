// Project-owned vectors from the approved Review 10, not Apple's SF Symbols assets.
const paths = {
  record: "M5 4h9l5 5v11H5zM14 4v5h5M9 13h6M9 16h4",
  history: "M5 3h9l5 5v13H5zM14 3v5h5M9 12h6M9 16h6",
  calendar: "M5 5h14v15H5zM5 10h14M8 3v4M16 3v4M8 13h2M14 13h2M8 16h2M14 16h2",
  resources: "M4 14v-3a8 8 0 0 1 16 0v3M4 12h3v8H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2M20 12h-3v8h3a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2",
  chart: "M4 4v16h16M8 16v-4M12 16V8M16 16v-6M20 16V5",
  door: "M6 21V4l12-2v19M6 21h14M14 12h.01",
  phone: "M7 3H3v3c0 8.3 6.7 15 15 15h3v-4l-5-2-2 3a14 14 0 0 1-8-8l3-2z",
  software: "M3 3h18v13H3zM8 21h8m-4-5v5",
  account: "M8 7a4 4 0 1 0 8 0 4 4 0 1 0-8 0M4 22v-3a8 8 0 0 1 16 0v3",
  plug: "M8 3v5m8-5v5M6 8h12v4a6 6 0 0 1-6 6v4m0-4a6 6 0 0 1-6-6",
  usb: "M6 9h12v12H6zM9 9V3h6v6m-4-4v1m2-1v1",
  staff: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M3 20v-2a6 6 0 0 1 12 0v2M17 4a3.5 3.5 0 0 1 0 7M18 14a5 5 0 0 1 3 4v2",
  equipment: "m3 7 9-4 9 4v10l-9 4-9-4V7m0 0 9 4 9-4m-9 4v10",
  templates: "m13 2-9 12h7l-1 8 10-13h-8l1-7",
  export: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  audit: "M12 8v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18",
  admin: "m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4m-4 10 3 3 5-6",
  settings: "m9 3-.5 3-2 1L4 6 2 10l2.5 2v2L2 16l2 4 3-1 2 1 .5 2h5l.5-2 2-1 3 1 2-4-2.5-2v-2l2.5-2-2-4-3 1-2-1-.5-3H9M12 9a4 4 0 1 0 0 8 4 4 0 0 0 0-8",
};
const layers = { calendar: "M5 5h14v5H5z", history: "M5 3h9v5h5v13H5z", resources: "M3 13h4v7H3zM17 13h4v7h-4z" };
export function ReviewSymbol({ name, size = 20, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-review-symbol={name} {...props}>
    {layers[name] && <path d={layers[name]} fill="currentColor" fillOpacity=".16" stroke="none" />}
    <path d={paths[name] || paths.record} />
  </svg>;
}
