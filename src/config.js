export const AUTH_MODE = (import.meta.env.VITE_AUTH_MODE || "local").toLowerCase(); // local | firebase

export const API_BASE =
  // Default to same-origin (works with Vite proxy + hosted previews).
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "";
