## Plan: Module STOCK + Refonte Finance/Ventes

Ce module ajoute un système complet de gestion de stock, réservation matériel (Kanban), et refonte de la partie Finance/Ventes avec confirmation sécurisée.

---

### 1. Base de données (migration)

Nouvelles tables :

- **`stock_items`** — catalogue stock
  - `name`, `category`, `purchase_price_dt`, `quantity`, `features` (jsonb), `low_stock_threshold` (défaut 5)
  - Calcul stock_value côté front (price × quantity)

- **`stock_movements`** — historique mouvements
  - `stock_item_id`, `type` (`in`/`out`/`reservation`/`adjustment`), `quantity`, `reason`, `reservation_id`, `created_by`

- **`material_reservations`** — Kanban demandes
  - `profile_id` (client), `surface_id` (parcelle, nullable), `subscription_plan_id` (nullable)
  - `status` enum texte : `nouvelle_demande` | `en_analyse` | `reserve` | `confirme` | `installe`
  - `notes`, `total_devices_price_dt`, `created_by`, `updated_at`

- **`reservation_items`** — lignes d'une réservation
  - `reservation_id`, `stock_item_id`, `quantity`, `unit_price_dt`

- **`client_sales`** — table VENTES (après confirmation)
  - `profile_id`, `reservation_id`, `subscription_plan_id`
  - `subscription_price_dt`, `equipment_price_dt`, `total_dt`
  - `payment_method` (`especes` | `carte` | `virement` | `mobile`)
  - `status` (`en_attente` | `confirme` | `refuse`)
  - `confirmed_by`, `confirmed_at`

- **`support_notifications`** — notifications support
  - `type` (`new_parcelle` | `low_stock` | `sale_confirmed` | `big_reservation`)
  - `title`, `message`, `link`, `read` (bool), `created_for_role`

RLS : admin/sous_admin gèrent tout, authenticated peut lire. Realtime activé sur toutes ces tables.

Trigger auto :
- À l'insertion d'une `surface` → créer automatiquement une `material_reservations` (status `nouvelle_demande`) + `support_notifications` (`new_parcelle`).
- À l'update statut `reserve` → décrémenter `stock_items.quantity` + créer `stock_movements`.
- À l'update statut `installe` → notification "installation terminée".

---

### 2. Nouveau menu latéral

`AdminLayout.tsx` : ajout d'une section **STOCK** au-dessus de Finance, avec sous-items :
- Stock (catalogue)
- Réservation Matériel (Kanban)
- Ventes

Icônes : `Package`, `ClipboardList`, `ShoppingCart`.

---

### 3. Page Stock (`StockPage.tsx`)

- Formulaire d'ajout (Dialog) : Nom, Prix, Catégorie (select : Capteur / Vanne / Module / Contrôleur / Autre), Quantité, Fonctionnalités (textarea), threshold.
- Tableau dynamique : Appareil | Catégorie | Prix Achat | Quantité | Valeur Stock | Badge | Actions.
  - Badge couleur : `quantity > threshold` vert, `≤ threshold` orange, `=0` rouge.
- Actions : Modifier (Dialog), Supprimer (confirm), Historique (Dialog listant `stock_movements`).
- KPIs en haut : valeur totale stock, nb articles, alertes rupture.
- Realtime updates.

---

### 4. Page Réservation Matériel (`ReservationMaterielPage.tsx`)

Interface **Kanban Drag & Drop** avec 5 colonnes :
1. Nouvelle Demande
2. En Analyse
3. Réservé
4. Confirmé
5. Installé

- Bibliothèque : `@dnd-kit/core` + `@dnd-kit/sortable` (déjà supporté).
- Chaque carte : nom client, parcelle liée, abonnement, total matériel, date.
- Click carte → Dialog détail :
  - Liste appareils réservés (ajout/suppression depuis stock)
  - Sélection abonnement (récupéré de `subscription_plans`)
  - Notes support
  - Bouton "Réserver le matériel" (décrémente stock automatiquement)
- Drag entre colonnes = update statut.
- Realtime.

---

### 5. Refonte Finance

`FinancePage.tsx` :
- ❌ Supprimer onglet "Appareils" (catalogue devices).
- Conserver onglets : Plans d'abonnement, Paiements abonnements.
- ✅ Ajouter onglet **CLIENTS** : tableau des réservations confirmées prêtes à confirmer en vente.
  - Colonnes : Client | Abonnement | Prix Abo | Prix Appareillage | Prix Total | Confirmer | Modifier | Supprimer.
  - Bouton **Confirmer** → ouvre **Popup Sécurité** (login + mot de passe).
    - Vérification via `supabase.auth.signInWithPassword` (réauth admin).
    - Si OK → crée `client_sales` (statut `confirme`), met `material_reservations.status = 'installe'`, notification.

---

### 6. Page Ventes (`VentesPage.tsx`)

- Tableau : Date | Acheteur | Abonnement | Total | Méthode Paiement | Statut.
- Filtres par statut/méthode.
- KPIs : total CA, ventes confirmées, en attente, refusées.

---

### 7. Notifications support

Badge dynamique dans le sidebar sur "Réservation Matériel" affichant le nombre de `support_notifications` non-lues.
Toast realtime à la création.

---

### Détails techniques

- **Drag & drop** : utiliser `@dnd-kit/core` (installer si besoin).
- **Auth re-verification** : `supabase.auth.signInWithPassword({ email: currentUser.email, password: input })` côté client pour valider sans déconnecter.
- **Trigger SQL** sur `surfaces` AFTER INSERT pour créer la réservation + notification.
- **Trigger SQL** sur `material_reservations` AFTER UPDATE OF status pour décrémenter stock quand passe à `reserve`.
- **i18n** : ajout des clés FR/EN/AR (`nav.stock`, `nav.reservation`, `nav.ventes`, etc.).
- **Realtime** : `ALTER PUBLICATION supabase_realtime ADD TABLE` pour les 5 nouvelles tables.

### Fichiers créés
- `supabase/migrations/<timestamp>_stock_system.sql`
- `src/pages/admin/StockPage.tsx`
- `src/pages/admin/ReservationMaterielPage.tsx`
- `src/pages/admin/VentesPage.tsx`
- `src/components/SecurityConfirmDialog.tsx`

### Fichiers modifiés
- `src/App.tsx` (routes)
- `src/components/AdminLayout.tsx` (menu + badge)
- `src/pages/admin/FinancePage.tsx` (suppr appareils, ajout Clients)
- `src/i18n/translations.ts`
- `src/types/models.ts`
