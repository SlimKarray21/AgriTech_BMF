package com.pistoncontrol.presentation.controller.admin

import com.pistoncontrol.infrastructure.persistence.ClientSales
import com.pistoncontrol.infrastructure.persistence.DeviceCatalog
import com.pistoncontrol.infrastructure.persistence.DeviceSales
import com.pistoncontrol.infrastructure.persistence.SubscriptionPayments
import com.pistoncontrol.infrastructure.persistence.SubscriptionPlans
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
import java.time.LocalDate

fun Route.subscriptionPlansRoutes() {
    route("/subscription-plans") {
        get {
            val rows = transaction {
                SubscriptionPlans.selectAll().map {
                    buildJsonObject {
                        put("id",            it[SubscriptionPlans.id])
                        put("name",          it[SubscriptionPlans.name])
                        put("price_dt",      it[SubscriptionPlans.priceDt])
                        put("duration_days", it[SubscriptionPlans.durationDays])
                        put("features",      it[SubscriptionPlans.features])
                        put("active",        it[SubscriptionPlans.active])
                        put("created_at",    it[SubscriptionPlans.createdAt].toString())
                    }
                }
            }
            call.respond(HttpStatusCode.OK, buildJsonArray { rows.forEach { add(it) } })
        }
        post {
            val body = call.receive<JsonObject>()
            val newId = transaction {
                SubscriptionPlans.insert {
                    it[name]         = body["name"]?.jsonPrimitive?.content ?: ""
                    it[priceDt]      = body["price_dt"]?.jsonPrimitive?.double ?: 0.0
                    it[durationDays] = body["duration_days"]?.jsonPrimitive?.int ?: 30
                    it[features]     = body["features"]?.toString() ?: "{}"
                    it[active]       = body["active"]?.jsonPrimitive?.boolean ?: true
                    it[createdAt]    = Instant.now()
                }[SubscriptionPlans.id]
            }
            call.respond(HttpStatusCode.Created, buildJsonObject { put("id", newId) })
        }
        patch("/{id}") {
            val id = call.parameters["id"]?.toLongOrNull()
                ?: return@patch call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
            val body = call.receive<JsonObject>()
            transaction {
                SubscriptionPlans.update({ SubscriptionPlans.id eq id }) {
                    body["name"]?.jsonPrimitive?.contentOrNull?.let      { v -> it[SubscriptionPlans.name]         = v }
                    body["price_dt"]?.jsonPrimitive?.doubleOrNull?.let   { v -> it[SubscriptionPlans.priceDt]      = v }
                    body["duration_days"]?.jsonPrimitive?.intOrNull?.let { v -> it[SubscriptionPlans.durationDays] = v }
                    body["active"]?.jsonPrimitive?.booleanOrNull?.let    { v -> it[SubscriptionPlans.active]       = v }
                    body["features"]?.let                                { v -> it[SubscriptionPlans.features]     = v.toString() }
                }
            }
            call.respond(HttpStatusCode.OK, mapOf("message" to "Updated"))
        }
        delete("/{id}") {
            val id = call.parameters["id"]?.toLongOrNull()
                ?: return@delete call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
            val count = transaction { SubscriptionPlans.deleteWhere { SubscriptionPlans.id eq id } }
            if (count == 0) call.respond(HttpStatusCode.NotFound, ErrorResponse("Not found"))
            else call.respond(HttpStatusCode.OK, mapOf("message" to "Deleted"))
        }
    }
}

fun Route.subscriptionPaymentsRoutes() {
    route("/subscription-payments") {
        get {
            val rows = transaction {
                SubscriptionPayments.selectAll().map {
                    buildJsonObject {
                        put("id",             it[SubscriptionPayments.id])
                        put("profile_id",     it[SubscriptionPayments.profileId])
                        put("plan_id",        it[SubscriptionPayments.planId])
                        put("amount_dt",      it[SubscriptionPayments.amountDt])
                        put("payment_method", it[SubscriptionPayments.paymentMethod])
                        put("status",         it[SubscriptionPayments.status])
                        put("date_start",     it[SubscriptionPayments.dateStart]?.toString())
                        put("date_exp",       it[SubscriptionPayments.dateExp]?.toString())
                        put("validated_at",   it[SubscriptionPayments.validatedAt]?.toString())
                        put("validated_by",   it[SubscriptionPayments.validatedBy])
                        put("created_at",     it[SubscriptionPayments.createdAt].toString())
                    }
                }
            }
            call.respond(HttpStatusCode.OK, buildJsonArray { rows.forEach { add(it) } })
        }
        post {
            val body = call.receive<JsonObject>()
            val vDateStart: LocalDate? = body["date_start"]?.jsonPrimitive?.contentOrNull?.let { v -> runCatching { LocalDate.parse(v) }.getOrNull() }
            val vDateExp: LocalDate?   = body["date_exp"]?.jsonPrimitive?.contentOrNull?.let   { v -> runCatching { LocalDate.parse(v) }.getOrNull() }
            val newId = transaction {
                SubscriptionPayments.insert {
                    it[profileId]     = body["profile_id"]?.jsonPrimitive?.long ?: 0L
                    it[planId]        = body["plan_id"]?.jsonPrimitive?.long ?: 0L
                    it[amountDt]      = body["amount_dt"]?.jsonPrimitive?.double ?: 0.0
                    it[paymentMethod] = body["payment_method"]?.jsonPrimitive?.contentOrNull ?: "cash"
                    it[status]        = body["status"]?.jsonPrimitive?.contentOrNull ?: "pending"
                    it[dateStart]     = vDateStart
                    it[dateExp]       = vDateExp
                    it[createdAt]     = Instant.now()
                }[SubscriptionPayments.id]
            }
            call.respond(HttpStatusCode.Created, buildJsonObject { put("id", newId) })
        }
        patch("/{id}") {
            val id = call.parameters["id"]?.toLongOrNull()
                ?: return@patch call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
            val body = call.receive<JsonObject>()
            transaction {
                SubscriptionPayments.update({ SubscriptionPayments.id eq id }) {
                    body["status"]?.jsonPrimitive?.contentOrNull?.let       { v -> it[SubscriptionPayments.status]      = v }
                    body["validated_by"]?.jsonPrimitive?.longOrNull?.let    { v -> it[SubscriptionPayments.validatedBy] = v }
                    body["validated_at"]?.jsonPrimitive?.contentOrNull?.let { v ->
                        it.set<Instant?>(SubscriptionPayments.validatedAt, runCatching { Instant.parse(v) }.getOrNull())
                    }
                }
            }
            call.respond(HttpStatusCode.OK, mapOf("message" to "Updated"))
        }
    }
}

fun Route.clientSalesRoutes() {
    route("/client-sales") {
        get {
            val rows = transaction {
                ClientSales.selectAll().map {
                    buildJsonObject {
                        put("id",                    it[ClientSales.id])
                        put("profile_id",            it[ClientSales.profileId])
                        put("subscription_plan_id",  it[ClientSales.subscriptionPlanId])
                        put("reservation_id",        it[ClientSales.reservationId])
                        put("subscription_price_dt", it[ClientSales.subscriptionPriceDt])
                        put("equipment_price_dt",    it[ClientSales.equipmentPriceDt])
                        put("total_dt",              it[ClientSales.totalDt])
                        put("payment_method",        it[ClientSales.paymentMethod])
                        put("status",                it[ClientSales.status])
                        put("confirmed_by",          it[ClientSales.confirmedBy])
                        put("confirmed_at",          it[ClientSales.confirmedAt]?.toString())
                        put("created_at",            it[ClientSales.createdAt].toString())
                    }
                }
            }
            call.respond(HttpStatusCode.OK, buildJsonArray { rows.forEach { add(it) } })
        }
        post {
            val body = call.receive<JsonObject>()
            val vPlanId: Long? = body["subscription_plan_id"]?.jsonPrimitive?.longOrNull
            val vResId: Long?  = body["reservation_id"]?.jsonPrimitive?.longOrNull
            val newId = transaction {
                ClientSales.insert {
                    it[profileId]           = body["profile_id"]?.jsonPrimitive?.long ?: 0L
                    it[subscriptionPlanId]  = vPlanId
                    it[reservationId]       = vResId
                    it[subscriptionPriceDt] = body["subscription_price_dt"]?.jsonPrimitive?.double ?: 0.0
                    it[equipmentPriceDt]    = body["equipment_price_dt"]?.jsonPrimitive?.double ?: 0.0
                    it[totalDt]             = body["total_dt"]?.jsonPrimitive?.double ?: 0.0
                    it[paymentMethod]       = body["payment_method"]?.jsonPrimitive?.contentOrNull ?: "cash"
                    it[status]              = body["status"]?.jsonPrimitive?.contentOrNull ?: "pending"
                    it[createdAt]           = Instant.now()
                }[ClientSales.id]
            }
            call.respond(HttpStatusCode.Created, buildJsonObject { put("id", newId) })
        }
        patch("/{id}") {
            val id = call.parameters["id"]?.toLongOrNull()
                ?: return@patch call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
            val body = call.receive<JsonObject>()
            transaction {
                ClientSales.update({ ClientSales.id eq id }) {
                    body["status"]?.jsonPrimitive?.contentOrNull?.let       { v -> it[ClientSales.status]      = v }
                    body["confirmed_by"]?.jsonPrimitive?.longOrNull?.let    { v -> it[ClientSales.confirmedBy] = v }
                    body["confirmed_at"]?.jsonPrimitive?.contentOrNull?.let { v ->
                        it.set<Instant?>(ClientSales.confirmedAt, runCatching { Instant.parse(v) }.getOrNull())
                    }
                }
            }
            call.respond(HttpStatusCode.OK, mapOf("message" to "Updated"))
        }
    }
}

fun Route.deviceCatalogRoutes() {
    route("/device-catalog") {
        get {
            val rows = transaction {
                DeviceCatalog.selectAll().map {
                    buildJsonObject {
                        put("id",              it[DeviceCatalog.id])
                        put("name",            it[DeviceCatalog.name])
                        put("device_type",     it[DeviceCatalog.deviceType])
                        put("price_dt",        it[DeviceCatalog.priceDt])
                        put("stock",           it[DeviceCatalog.stock])
                        put("available",       it[DeviceCatalog.available])
                        put("connected_state", it[DeviceCatalog.connectedState])
                        put("info",            it[DeviceCatalog.info])
                        put("created_at",      it[DeviceCatalog.createdAt].toString())
                        put("updated_at",      it[DeviceCatalog.updatedAt].toString())
                    }
                }
            }
            call.respond(HttpStatusCode.OK, buildJsonArray { rows.forEach { add(it) } })
        }
        post {
            val body = call.receive<JsonObject>()
            val vInfo: String? = body["info"]?.jsonPrimitive?.contentOrNull
            val newId = transaction {
                DeviceCatalog.insert {
                    it[name]           = body["name"]?.jsonPrimitive?.content ?: ""
                    it[deviceType]     = body["device_type"]?.jsonPrimitive?.content ?: ""
                    it[priceDt]        = body["price_dt"]?.jsonPrimitive?.double ?: 0.0
                    it[stock]          = body["stock"]?.jsonPrimitive?.int ?: 0
                    it[available]      = body["available"]?.jsonPrimitive?.boolean ?: true
                    it[connectedState] = body["connected_state"]?.jsonPrimitive?.contentOrNull ?: "disconnected"
                    it[info]           = vInfo
                    it[createdAt]      = Instant.now()
                    it[updatedAt]      = Instant.now()
                }[DeviceCatalog.id]
            }
            call.respond(HttpStatusCode.Created, buildJsonObject { put("id", newId) })
        }
        patch("/{id}") {
            val id = call.parameters["id"]?.toLongOrNull()
                ?: return@patch call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
            val body = call.receive<JsonObject>()
            transaction {
                DeviceCatalog.update({ DeviceCatalog.id eq id }) {
                    body["name"]?.jsonPrimitive?.contentOrNull?.let            { v -> it[DeviceCatalog.name]           = v }
                    body["device_type"]?.jsonPrimitive?.contentOrNull?.let     { v -> it[DeviceCatalog.deviceType]     = v }
                    body["price_dt"]?.jsonPrimitive?.doubleOrNull?.let         { v -> it[DeviceCatalog.priceDt]        = v }
                    body["stock"]?.jsonPrimitive?.intOrNull?.let               { v -> it[DeviceCatalog.stock]          = v }
                    body["available"]?.jsonPrimitive?.booleanOrNull?.let       { v -> it[DeviceCatalog.available]      = v }
                    body["connected_state"]?.jsonPrimitive?.contentOrNull?.let { v -> it[DeviceCatalog.connectedState] = v }
                    body["info"]?.jsonPrimitive?.contentOrNull?.let            { v -> it[DeviceCatalog.info]           = v }
                    it[DeviceCatalog.updatedAt] = Instant.now()
                }
            }
            call.respond(HttpStatusCode.OK, mapOf("message" to "Updated"))
        }
        delete("/{id}") {
            val id = call.parameters["id"]?.toLongOrNull()
                ?: return@delete call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
            val count = transaction { DeviceCatalog.deleteWhere { DeviceCatalog.id eq id } }
            if (count == 0) call.respond(HttpStatusCode.NotFound, ErrorResponse("Not found"))
            else call.respond(HttpStatusCode.OK, mapOf("message" to "Deleted"))
        }
    }
}

fun Route.deviceSalesRoutes() {
    route("/device-sales") {
        get {
            val rows = transaction {
                DeviceSales.selectAll().map {
                    buildJsonObject {
                        put("id",               it[DeviceSales.id])
                        put("buyer_profile_id", it[DeviceSales.buyerProfileId])
                        put("device_id",        it[DeviceSales.deviceId])
                        put("quantity",         it[DeviceSales.quantity])
                        put("unit_price_dt",    it[DeviceSales.unitPriceDt])
                        put("total_dt",         it[DeviceSales.totalDt])
                        put("payment_method",   it[DeviceSales.paymentMethod])
                        put("status",           it[DeviceSales.status])
                        put("validated_at",     it[DeviceSales.validatedAt]?.toString())
                        put("validated_by",     it[DeviceSales.validatedBy])
                        put("created_at",       it[DeviceSales.createdAt].toString())
                    }
                }
            }
            call.respond(HttpStatusCode.OK, buildJsonArray { rows.forEach { add(it) } })
        }
        post {
            val body = call.receive<JsonObject>()
            val newId = transaction {
                DeviceSales.insert {
                    it[buyerProfileId] = body["buyer_profile_id"]?.jsonPrimitive?.long ?: 0L
                    it[deviceId]       = body["device_id"]?.jsonPrimitive?.long ?: 0L
                    it[quantity]       = body["quantity"]?.jsonPrimitive?.int ?: 1
                    it[unitPriceDt]    = body["unit_price_dt"]?.jsonPrimitive?.double ?: 0.0
                    it[totalDt]        = body["total_dt"]?.jsonPrimitive?.double ?: 0.0
                    it[paymentMethod]  = body["payment_method"]?.jsonPrimitive?.contentOrNull ?: "cash"
                    it[status]         = body["status"]?.jsonPrimitive?.contentOrNull ?: "pending"
                    it[createdAt]      = Instant.now()
                }[DeviceSales.id]
            }
            call.respond(HttpStatusCode.Created, buildJsonObject { put("id", newId) })
        }
        patch("/{id}") {
            val id = call.parameters["id"]?.toLongOrNull()
                ?: return@patch call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
            val body = call.receive<JsonObject>()
            transaction {
                DeviceSales.update({ DeviceSales.id eq id }) {
                    body["status"]?.jsonPrimitive?.contentOrNull?.let       { v -> it[DeviceSales.status]      = v }
                    body["validated_by"]?.jsonPrimitive?.longOrNull?.let    { v -> it[DeviceSales.validatedBy] = v }
                    body["validated_at"]?.jsonPrimitive?.contentOrNull?.let { v ->
                        it.set<Instant?>(DeviceSales.validatedAt, runCatching { Instant.parse(v) }.getOrNull())
                    }
                }
            }
            call.respond(HttpStatusCode.OK, mapOf("message" to "Updated"))
        }
    }
}
