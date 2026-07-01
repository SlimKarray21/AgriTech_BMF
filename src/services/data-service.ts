// Point d'entrée historique des services de données.
//
// L'implémentation est désormais découpée par domaine (un fichier par
// ressource). Ce barrel ré-exporte tout pour préserver les imports existants
// `from "@/services/data-service"`. Pour le nouveau code, importer plutôt le
// module de domaine ciblé (ex. `@/services/vannes`).

export { apiFetch } from "./http";
export * from "./profiles";
export * from "./surfaces";
export * from "./plantes";
export * from "./vannes";
export * from "./sols";
export * from "./climats";
export * from "./reclamations";
export * from "./subscriptions";
export * from "./emailCampaigns";
export * from "./sales";
export * from "./stock";
export * from "./reservations";
export * from "./rapports";
