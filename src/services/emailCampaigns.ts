import { apiFetch } from "./http";

// Campagne « Mail automatique » (voir backend EmailCampaign).
export type EmailCampaign = {
  id: string;
  name: string;
  subject: string;
  body: string;
  audience: "all" | "client" | "partenaire" | "abonnement" | "nom";
  plan_name: string | null;
  search_name: string | null;
  expiry_within_days: number | null;
  frequency_days: number;
  active: boolean;
  last_sent_at: string | null;
  created_at: string;
};

export const getEmailCampaigns = async (): Promise<any[]> =>
  apiFetch("/api/agri/email-campaigns");

export const createEmailCampaign = async (d: any): Promise<any> =>
  apiFetch("/api/agri/email-campaigns", { method: "POST", body: JSON.stringify(d) });

export const updateEmailCampaign = async (id: string, d: any): Promise<any> =>
  apiFetch(`/api/agri/email-campaigns/${id}`, { method: "PATCH", body: JSON.stringify(d) });

export const deleteEmailCampaign = async (id: string): Promise<void> => {
  await apiFetch(`/api/agri/email-campaigns/${id}`, { method: "DELETE" });
};

export const sendEmailCampaignNow = async (id: string): Promise<{ sent: number }> =>
  apiFetch(`/api/agri/email-campaigns/${id}/send-now`, { method: "POST" });

export const previewEmailCampaign = async (d: {
  audience: string;
  plan_name?: string | null;
  search_name?: string | null;
  expiry_within_days?: number | null;
}): Promise<{ count: number; sample: string[] }> =>
  apiFetch("/api/agri/email-campaigns/preview", { method: "POST", body: JSON.stringify(d) });
