package com.pistoncontrol.presentation.controller.admin

import io.ktor.server.auth.*
import io.ktor.server.routing.*

fun Route.agriAdminRoutes() {
    authenticate("auth-jwt") {
        route("/api/agri") {

            // ── Agriculture ──────────────────────────────────────────────────
            profilesRoutes()
            // typePlanteRoutes() supprimé (table type_plante retirée)
            solsRoutes()
            climatsRoutes()

            // ── Support & Notifications ──────────────────────────────────────
            reclamationsRoutes()
            supportNotificationsRoutes()
            subscripNotifRoutes()

            // ── Ventes & Abonnements ─────────────────────────────────────────
            subscriptionPlansRoutes()
            subscriptionPaymentsRoutes()
            clientSalesRoutes()
            deviceCatalogRoutes()
            deviceSalesRoutes()

            // ── Stock & Réservations ─────────────────────────────────────────
            stockItemsRoutes()
            stockMovementsRoutes()
            materialReservationsRoutes()
            reservationItemsRoutes()

            // ── Rapports ─────────────────────────────────────────────────────
            rapportSolRoutes()
            rapportEauRoutes()
        }
    }
}
