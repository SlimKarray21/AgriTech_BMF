import { API_BASE_URL } from "./api-config";
import { getToken } from "@/lib/token";

/**
 * Wrapper fetch commun à tous les services : injecte le token, sérialise en
 * JSON, et remonte un message d'erreur exploitable (corps JSON `{ error }`
 * sinon texte brut).
 */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const raw = await res.text();
    let message = raw || `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.error === "string") message = parsed.error;
    } catch {
      // corps non-JSON : on garde le texte brut
    }
    throw new Error(message);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}
