import { apiFetch } from "./http";

// ── SUBSCRIPTION PLANS ────────────────────────────────────────────────────────

export const getSubscriptionPlans = async (): Promise<any[]> =>
  apiFetch("/api/agri/subscription-plans");

export const createSubscriptionPlan = async (d: any): Promise<any> =>
  apiFetch("/api/agri/subscription-plans", { method: "POST", body: JSON.stringify(d) });

export const updateSubscriptionPlan = async (id: string, d: any): Promise<any> =>
  apiFetch(`/api/agri/subscription-plans/${id}`, { method: "PATCH", body: JSON.stringify(d) });

export const deleteSubscriptionPlan = async (id: string): Promise<void> => {
  await apiFetch(`/api/agri/subscription-plans/${id}`, { method: "DELETE" });
};

// ── SUBSCRIPTION PAYMENTS ─────────────────────────────────────────────────────

export const getSubscriptionPayments = async (): Promise<any[]> =>
  apiFetch("/api/agri/subscription-payments");

export const createSubscriptionPayment = async (d: any): Promise<any> =>
  apiFetch("/api/agri/subscription-payments", { method: "POST", body: JSON.stringify(d) });

export const updateSubscriptionPayment = async (id: string, d: any): Promise<any> =>
  apiFetch(`/api/agri/subscription-payments/${id}`, { method: "PATCH", body: JSON.stringify(d) });
