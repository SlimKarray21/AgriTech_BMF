-- Accès par page mobile pour les plans d'abonnement
-- Chaque plan déclare la liste des pages mobiles (uiearth_flutter) qu'il déverrouille.
-- Format : tableau JSON de clés de pages, ex. ["accueil","parcelles","vannes"].
-- Les pages "meteo" et "profil" restent toujours autorisées côté application,
-- indépendamment de cette liste.

ALTER TABLE subscription_plans
    ADD COLUMN IF NOT EXISTS page_access TEXT NOT NULL DEFAULT '[]';
