package com.pistoncontrol.presentation.controller.admin

import com.pistoncontrol.infrastructure.persistence.Reclamations
import com.pistoncontrol.infrastructure.persistence.SubscripNotif
import com.pistoncontrol.infrastructure.persistence.SupportNotifications
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

fun Route.reclamationsRoutes() {
    route("/reclamations") {
        get {
            val rows = transaction {
                Reclamations.selectAll().orderBy(Reclamations.createdAt, SortOrder.DESC).map {
                    buildJsonObject {
                        put("id",         it[Reclamations.id])
                        put("user_id",    it[Reclamations.userId])
                        put("profile_id", it[Reclamations.profileId])
                        put("sujet",      it[Reclamations.sujet])
                        put("message",    it[Reclamations.message])
                        put("statut",     it[Reclamations.statut])
                        put("traite_by",  it[Reclamations.traiteBy])
                        put("traite_at",  it[Reclamations.traiteAt]?.toString())
                        put("created_at", it[Reclamations.createdAt].toString())
                        put("updated_at", it[Reclamations.updatedAt].toString())
                    }
                }
            }
            call.respond(HttpStatusCode.OK, buildJsonArray { rows.forEach { add(it) } })
        }
        post {
            val body = call.receive<JsonObject>()
            val vProfileId: Long? = body["profile_id"]?.jsonPrimitive?.longOrNull
            val newId = transaction {
                Reclamations.insert {
                    it[userId]    = body["user_id"]?.jsonPrimitive?.long ?: 0L
                    it[profileId] = vProfileId
                    it[sujet]     = body["sujet"]?.jsonPrimitive?.content ?: ""
                    it[message]   = body["message"]?.jsonPrimitive?.content ?: ""
                    it[statut]    = body["statut"]?.jsonPrimitive?.contentOrNull ?: "ouvert"
                    it[createdAt] = Instant.now()
                    it[updatedAt] = Instant.now()
                }[Reclamations.id]
            }
            call.respond(HttpStatusCode.Created, buildJsonObject { put("id", newId) })
        }
        patch("/{id}") {
            val id = call.parameters["id"]?.toLongOrNull()
                ?: return@patch call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
            val body = call.receive<JsonObject>()
            transaction {
                Reclamations.update({ Reclamations.id eq id }) {
                    body["statut"]?.jsonPrimitive?.contentOrNull?.let    { v -> it[Reclamations.statut]   = v }
                    body["traite_by"]?.jsonPrimitive?.longOrNull?.let    { v -> it[Reclamations.traiteBy] = v }
                    body["traite_at"]?.jsonPrimitive?.contentOrNull?.let { v ->
                        it.set<Instant?>(Reclamations.traiteAt, runCatching { Instant.parse(v) }.getOrNull())
                    }
                    it[Reclamations.updatedAt] = Instant.now()
                }
            }
            call.respond(HttpStatusCode.OK, mapOf("message" to "Updated"))
        }
        delete("/{id}") {
            val id = call.parameters["id"]?.toLongOrNull()
                ?: return@delete call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
            val count = transaction { Reclamations.deleteWhere { Reclamations.id eq id } }
            if (count == 0) call.respond(HttpStatusCode.NotFound, ErrorResponse("Not found"))
            else call.respond(HttpStatusCode.OK, mapOf("message" to "Deleted"))
        }
    }
}

fun Route.supportNotificationsRoutes() {
    route("/support-notifications") {
        get {
            val rows = transaction {
                SupportNotifications.selectAll().orderBy(SupportNotifications.createdAt, SortOrder.DESC).map {
                    buildJsonObject {
                        put("id",               it[SupportNotifications.id])
                        put("title",            it[SupportNotifications.title])
                        put("message",          it[SupportNotifications.message])
                        put("notif_type",       it[SupportNotifications.notifType])
                        put("is_read",          it[SupportNotifications.isRead])
                        put("link",             it[SupportNotifications.link])
                        put("created_for_role", it[SupportNotifications.createdForRole])
                        put("created_at",       it[SupportNotifications.createdAt].toString())
                    }
                }
            }
            call.respond(HttpStatusCode.OK, buildJsonArray { rows.forEach { add(it) } })
        }
        post {
            val body = call.receive<JsonObject>()
            val vMsg: String?  = body["message"]?.jsonPrimitive?.contentOrNull
            val vLink: String? = body["link"]?.jsonPrimitive?.contentOrNull
            val vRole: String? = body["created_for_role"]?.jsonPrimitive?.contentOrNull
            val newId = transaction {
                SupportNotifications.insert {
                    it[title]          = body["title"]?.jsonPrimitive?.content ?: ""
                    it[message]        = vMsg
                    it[notifType]      = body["notif_type"]?.jsonPrimitive?.contentOrNull ?: "info"
                    it[isRead]         = body["is_read"]?.jsonPrimitive?.boolean ?: false
                    it[link]           = vLink
                    it[createdForRole] = vRole
                    it[createdAt]      = Instant.now()
                }[SupportNotifications.id]
            }
            call.respond(HttpStatusCode.Created, buildJsonObject { put("id", newId) })
        }
        patch("/{id}") {
            val id = call.parameters["id"]?.toLongOrNull()
                ?: return@patch call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
            val body = call.receive<JsonObject>()
            transaction {
                SupportNotifications.update({ SupportNotifications.id eq id }) {
                    body["is_read"]?.jsonPrimitive?.booleanOrNull?.let { v -> it[SupportNotifications.isRead] = v }
                }
            }
            call.respond(HttpStatusCode.OK, mapOf("message" to "Updated"))
        }
    }
}

fun Route.subscripNotifRoutes() {
    route("/subscrip-notif") {
        get {
            val rows = transaction {
                SubscripNotif.selectAll().orderBy(SubscripNotif.createdAt, SortOrder.DESC).map {
                    buildJsonObject {
                        put("id",             it[SubscripNotif.id])
                        put("client_email",   it[SubscripNotif.clientEmail])
                        put("client_name",    it[SubscripNotif.clientName])
                        put("days_remaining", it[SubscripNotif.daysRemaining])
                        put("sent_at",        it[SubscripNotif.sentAt].toString())
                        put("created_at",     it[SubscripNotif.createdAt].toString())
                    }
                }
            }
            call.respond(HttpStatusCode.OK, buildJsonArray { rows.forEach { add(it) } })
        }
        post {
            val body = call.receive<JsonObject>()
            val newId = transaction {
                SubscripNotif.insert {
                    it[clientEmail]   = body["client_email"]?.jsonPrimitive?.content ?: ""
                    it[clientName]    = body["client_name"]?.jsonPrimitive?.content ?: ""
                    it[daysRemaining] = body["days_remaining"]?.jsonPrimitive?.int ?: 0
                    it[sentAt]        = Instant.now()
                    it[createdAt]     = Instant.now()
                }[SubscripNotif.id]
            }
            call.respond(HttpStatusCode.Created, buildJsonObject { put("id", newId) })
        }
    }
}
