export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && window.location.hostname.includes("safaimitra.online")
    ? "https://api.safaimitra.online"
    : "http://localhost:5001");


