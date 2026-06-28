import { apiFetch } from "./http";

// ── CLIENT SALES ──────────────────────────────────────────────────────────────

export const getClientSales = async (): Promise<any[]> =>
  apiFetch("/api/agri/client-sales");

export const createClientSale = async (d: any): Promise<any> =>
  apiFetch("/api/agri/client-sales", { method: "POST", body: JSON.stringify(d) });

export const updateClientSale = async (id: string, d: any): Promise<any> =>
  apiFetch(`/api/agri/client-sales/${id}`, { method: "PATCH", body: JSON.stringify(d) });

// ── DEVICE SALES ──────────────────────────────────────────────────────────────

export const getDeviceSales = async (): Promise<any[]> =>
  apiFetch("/api/agri/device-sales");

export const createDeviceSale = async (d: any): Promise<any> =>
  apiFetch("/api/agri/device-sales", { method: "POST", body: JSON.stringify(d) });

export const updateDeviceSale = async (id: string, d: any): Promise<any> =>
  apiFetch(`/api/agri/device-sales/${id}`, { method: "PATCH", body: JSON.stringify(d) });
