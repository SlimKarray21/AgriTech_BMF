package com.pistoncontrol.presentation.controller.admin

import com.pistoncontrol.infrastructure.persistence.MaterialReservations
import com.pistoncontrol.infrastructure.persistence.ReservationItems
import com.pistoncontrol.infrastructure.persistence.StockItems
import com.pistoncontrol.infrastructure.persistence.StockMovements
import com.pistoncontrol.presentation.controller.ErrorResponse
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.json.*
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.Instant

fun Route.stockItemsRoutes() {
    route("/stock-items") {
        get {
            val rows = transaction {
                StockItems.selectAll().map {
                    buildJsonObject {
                        put("id",                  it[StockItems.id])
                        put("name",                it[StockItems.name])
                        put("category",            it[StockItems.category])
                        put("quantity",            it[StockItems.quantity])
                        put("purchase_price_dt",   it[StockItems.purchasePriceDt])
                        put("low_stock_threshold", it[StockItems.lowStockThreshold])
                        put("features",            it[StockItems.features])
                        put("created_at",          it[StockItems.createdAt].toString())
                        put("updated_at",          it[StockItems.updatedAt].toString())
                    }
                }
            }
            call.respond(HttpStatusCode.OK, buildJsonArray { rows.forEach { add(it) } })
        }
        post {
            val body = call.receive<JsonObject>()
            val vFeatures: String? = body["features"]?.jsonPrimitive?.contentOrNull
            val newId = transaction {
                StockItems.insert {
                    it[name]              = body["name"]?.jsonPrimitive?.content ?: ""
                    it[category]          = body["category"]?.jsonPrimitive?.contentOrNull ?: "general"
                    it[quantity]          = body["quantity"]?.jsonPrimitive?.int ?: 0
                    it[purchasePriceDt]   = body["purchase_price_dt"]?.jsonPrimitive?.double ?: 0.0
                    it[lowStockThreshold] = body["low_stock_threshold"]?.jsonPrimitive?.int ?: 5
                    it[features]          = vFeatures
                    it[createdAt]         = Instant.now()
                    it[updatedAt]         = Instant.now()
                }[StockItems.id]
            }
            call.respond(HttpStatusCode.Created, buildJsonObject { put("id", newId) })
        }
        patch("/{id}") {
            val id = call.parameters["id"]?.toLongOrNull()
                ?: return@patch call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
            val body = call.receive<JsonObject>()
            transaction {
                StockItems.update({ StockItems.id eq id }) {
                    body["name"]?.jsonPrimitive?.contentOrNull?.let             { v -> it[StockItems.name]              = v }
                    body["category"]?.jsonPrimitive?.contentOrNull?.let         { v -> it[StockItems.category]          = v }
                    body["quantity"]?.jsonPrimitive?.intOrNull?.let             { v -> it[StockItems.quantity]          = v }
                    body["purchase_price_dt"]?.jsonPrimitive?.doubleOrNull?.let { v -> it[StockItems.purchasePriceDt]   = v }
                    body["low_stock_threshold"]?.jsonPrimitive?.intOrNull?.let  { v -> it[StockItems.lowStockThreshold] = v }
                    body["features"]?.jsonPrimitive?.contentOrNull?.let         { v -> it[StockItems.features]          = v }
                    it[StockItems.updatedAt] = Instant.now()
                }
            }
            call.respond(HttpStatusCode.OK, mapOf("message" to "Updated"))
        }
        delete("/{id}") {
            val id = call.parameters["id"]?.toLongOrNull()
                ?: return@delete call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
            val count = transaction { StockItems.deleteWhere { StockItems.id eq id } }
            if (count == 0) call.respond(HttpStatusCode.NotFound, ErrorResponse("Not found"))
            else call.respond(HttpStatusCode.OK, mapOf("message" to "Deleted"))
        }
    }
}

fun Route.stockMovementsRoutes() {
    route("/stock-movements") {
        get {
            val filterItemId = call.request.queryParameters["stock_item_id"]?.toLongOrNull()
            val rows = transaction {
                val query = if (filterItemId != null)
                    StockMovements.select { StockMovements.stockItemId eq filterItemId }
                else
                    StockMovements.selectAll()
                query.orderBy(StockMovements.createdAt, SortOrder.DESC).map {
                    buildJsonObject {
                        put("id",             it[StockMovements.id])
                        put("stock_item_id",  it[StockMovements.stockItemId])
                        put("movement_type",  it[StockMovements.movementType])
                        put("quantity",       it[StockMovements.quantity])
                        put("reason",         it[StockMovements.reason])
                        put("reservation_id", it[StockMovements.reservationId])
                        put("created_by",     it[StockMovements.createdBy])
                        put("created_at",     it[StockMovements.createdAt].toString())
                    }
                }
            }
            call.respond(HttpStatusCode.OK, buildJsonArray { rows.forEach { add(it) } })
        }
        post {
            val body = call.receive<JsonObject>()
            val vReason: String? = body["reason"]?.jsonPrimitive?.contentOrNull
            val vResId: Long?    = body["reservation_id"]?.jsonPrimitive?.longOrNull
            val vCreBy: Long?    = body["created_by"]?.jsonPrimitive?.longOrNull
            val newId = transaction {
                StockMovements.insert {
                    it[stockItemId]   = body["stock_item_id"]?.jsonPrimitive?.long ?: 0L
                    it[movementType]  = body["movement_type"]?.jsonPrimitive?.contentOrNull ?: "out"
                    it[quantity]      = body["quantity"]?.jsonPrimitive?.int ?: 0
                    it[reason]        = vReason
                    it[reservationId] = vResId
                    it[createdBy]     = vCreBy
                    it[createdAt]     = Instant.now()
                }[StockMovements.id]
            }
            call.respond(HttpStatusCode.Created, buildJsonObject { put("id", newId) })
        }
    }
}

fun Route.materialReservationsRoutes() {
    route("/material-reservations") {
        get {
            val rows = transaction {
                MaterialReservations.selectAll().map {
                    buildJsonObject {
                        put("id",                     it[MaterialReservations.id])
                        put("profile_id",             it[MaterialReservations.profileId])
                        put("surface_id",             it[MaterialReservations.surfaceId])
                        put("subscription_plan_id",   it[MaterialReservations.subscriptionPlanId])
                        put("status",                 it[MaterialReservations.status])
                        put("total_devices_price_dt", it[MaterialReservations.totalDevicesPriceDt])
                        put("notes",                  it[MaterialReservations.notes])
                        put("created_by",             it[MaterialReservations.createdBy])
                        put("created_at",             it[MaterialReservations.createdAt].toString())
                        put("updated_at",             it[MaterialReservations.updatedAt].toString())
                    }
                }
            }
            call.respond(HttpStatusCode.OK, buildJsonArray { rows.forEach { add(it) } })
        }
        post {
            val body = call.receive<JsonObject>()
            val vProfileId: Long?  = body["profile_id"]?.jsonPrimitive?.longOrNull
            val vSurfaceId: Long?  = body["surface_id"]?.jsonPrimitive?.longOrNull
            val vPlanId: Long?     = body["subscription_plan_id"]?.jsonPrimitive?.longOrNull
            val vNotes: String?    = body["notes"]?.jsonPrimitive?.contentOrNull
            val vCreatedBy: Long?  = body["created_by"]?.jsonPrimitive?.longOrNull
            val newId = transaction {
                MaterialReservations.insert {
                    it[profileId]           = vProfileId
                    it[surfaceId]           = vSurfaceId
                    it[subscriptionPlanId]  = vPlanId
                    it[status]              = body["status"]?.jsonPrimitive?.contentOrNull ?: "pending"
                    it[totalDevicesPriceDt] = body["total_devices_price_dt"]?.jsonPrimitive?.double ?: 0.0
                    it[notes]               = vNotes
                    it[createdBy]           = vCreatedBy
                    it[createdAt]           = Instant.now()
                    it[updatedAt]           = Instant.now()
                }[MaterialReservations.id]
            }
            call.respond(HttpStatusCode.Created, buildJsonObject { put("id", newId) })
        }
        patch("/{id}") {
            val id = call.parameters["id"]?.toLongOrNull()
                ?: return@patch call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
            val body = call.receive<JsonObject>()
            transaction {
                MaterialReservations.update({ MaterialReservations.id eq id }) {
                    body["status"]?.jsonPrimitive?.contentOrNull?.let { v -> it[MaterialReservations.status] = v }
                    body["notes"]?.jsonPrimitive?.contentOrNull?.let  { v -> it[MaterialReservations.notes]  = v }
                    it[MaterialReservations.updatedAt] = Instant.now()
                }
            }
            call.respond(HttpStatusCode.OK, mapOf("message" to "Updated"))
        }
    }
}

fun Route.reservationItemsRoutes() {
    route("/reservation-items") {
        get {
            val rows = transaction {
                ReservationItems.selectAll().map {
                    buildJsonObject {
                        put("id",             it[ReservationItems.id])
                        put("reservation_id", it[ReservationItems.reservationId])
                        put("stock_item_id",  it[ReservationItems.stockItemId])
                        put("quantity",       it[ReservationItems.quantity])
                        put("unit_price_dt",  it[ReservationItems.unitPriceDt])
                        put("created_at",     it[ReservationItems.createdAt].toString())
                    }
                }
            }
            call.respond(HttpStatusCode.OK, buildJsonArray { rows.forEach { add(it) } })
        }
        post {
            val body = call.receive<JsonObject>()
            val newId = transaction {
                ReservationItems.insert {
                    it[reservationId] = body["reservation_id"]?.jsonPrimitive?.long ?: 0L
                    it[stockItemId]   = body["stock_item_id"]?.jsonPrimitive?.long ?: 0L
                    it[quantity]      = body["quantity"]?.jsonPrimitive?.int ?: 1
                    it[unitPriceDt]   = body["unit_price_dt"]?.jsonPrimitive?.double ?: 0.0
                    it[createdAt]     = Instant.now()
                }[ReservationItems.id]
            }
            call.respond(HttpStatusCode.Created, buildJsonObject { put("id", newId) })
        }
    }
}
