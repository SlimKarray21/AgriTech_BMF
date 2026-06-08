// URL de base du backend Ktor.
// Configurable au build via la variable d'env Vite VITE_API_BASE_URL
// (injectée par Docker / .env). Fallback sur le backend local en dev.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
export const USE_MOCK = false;
