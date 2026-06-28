import { apiFetch } from "./http";

// ── STOCK ITEMS ───────────────────────────────────────────────────────────────

export const getStockItems = async (): Promise<any[]> =>
  apiFetch("/api/agri/stock-items");

export const createStockItem = async (d: any): Promise<any> =>
  apiFetch("/api/agri/stock-items", { method: "POST", body: JSON.stringify(d) });

export const updateStockItem = async (id: string, d: any): Promise<any> =>
  apiFetch(`/api/agri/stock-items/${id}`, { method: "PATCH", body: JSON.stringify(d) });

export const deleteStockItem = async (id: string): Promise<void> => {
  await apiFetch(`/api/agri/stock-items/${id}`, { method: "DELETE" });
};

// ── STOCK MOVEMENTS ───────────────────────────────────────────────────────────

export const getStockMovements = async (stockItemId?: string): Promise<any[]> => {
  const url = stockItemId
    ? `/api/agri/stock-movements?stock_item_id=${stockItemId}`
    : "/api/agri/stock-movements";
  return apiFetch(url);
};

export const createStockMovement = async (d: any): Promise<any> =>
  apiFetch("/api/agri/stock-movements", { method: "POST", body: JSON.stringify(d) });
