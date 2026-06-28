import { apiFetch } from "./http";

// ── MATERIAL RESERVATIONS ─────────────────────────────────────────────────────

export const getMaterialReservations = async (): Promise<any[]> =>
  apiFetch("/api/agri/material-reservations");

export const createMaterialReservation = async (d: any): Promise<any> =>
  apiFetch("/api/agri/material-reservations", { method: "POST", body: JSON.stringify(d) });

export const updateMaterialReservation = async (id: string, d: any): Promise<any> =>
  apiFetch(`/api/agri/material-reservations/${id}`, { method: "PATCH", body: JSON.stringify(d) });

// ── RESERVATION ITEMS ─────────────────────────────────────────────────────────

export const getReservationItems = async (): Promise<any[]> =>
  apiFetch("/api/agri/reservation-items");

export const createReservationItem = async (d: any): Promise<any> =>
  apiFetch("/api/agri/reservation-items", { method: "POST", body: JSON.stringify(d) });

export const getReservationItemsByReservation = async (reservationId: string): Promise<any[]> =>
  apiFetch(`/api/agri/reservation-items?reservation_id=${reservationId}`);

export const deleteReservationItem = async (id: string): Promise<void> => {
  await apiFetch(`/api/agri/reservation-items/${id}`, { method: "DELETE" });
};
