package com.pistoncontrol.presentation.controller.admin

import com.pistoncontrol.application.service.EmailCampaignService
import com.pistoncontrol.infrastructure.persistence.EmailCampaign
import com.pistoncontrol.presentation.controller.ErrorResponse
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.json.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.update
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.Instant

/** Endpoints des campagnes « Mail automatique » (admin). */
fun Route.emailCampaignRoutes(service: EmailCampaignService) {
    route("/email-campaigns") {

        get {
            val rows = transaction {
                EmailCampaign.selectAll()
                    .sortedByDescending { it[EmailCampaign.createdAt] }
                    .map {
                        buildJsonObject {
                            put("id",                 it[EmailCampaign.id])
                            put("name",               it[EmailCampaign.name])
                            put("subject",            it[EmailCampaign.subject])
                            put("body",               it[EmailCampaign.body])
                            put("audience",           it[EmailCampaign.audience])
                            put("plan_name",          it[EmailCampaign.planName])
                            put("search_name",        it[EmailCampaign.searchName])
                            put("expiry_within_days", it[EmailCampaign.expiryWithinDays])
                            put("frequency_days",     it[EmailCampaign.frequencyDays])
                            put("active",             it[EmailCampaign.active])
                            put("last_sent_at",       it[EmailCampaign.lastSentAt]?.toString())
                            put("created_at",         it[EmailCampaign.createdAt].toString())
                        }
                    }
            }
            call.respond(HttpStatusCode.OK, buildJsonArray { rows.forEach { add(it) } })
        }

        post {
            val b = call.receive<JsonObject>()
            val newId = transaction {
                EmailCampaign.insert {
                    it[name]             = b["name"]?.jsonPrimitive?.content ?: "Campagne"
                    it[subject]          = b["subject"]?.jsonPrimitive?.content ?: ""
                    it[body]             = b["body"]?.jsonPrimitive?.content ?: ""
                    it[audience]         = b["audience"]?.jsonPrimitive?.content ?: "all"
                    it[planName]         = b["plan_name"]?.jsonPrimitive?.contentOrNull
                    it[searchName]       = b["search_name"]?.jsonPrimitive?.contentOrNull
                    it[expiryWithinDays] = b["expiry_within_days"]?.jsonPrimitive?.intOrNull
                    it[frequencyDays]    = b["frequency_days"]?.jsonPrimitive?.intOrNull ?: 4
                    it[active]           = b["active"]?.jsonPrimitive?.booleanOrNull ?: true
                    it[createdAt]        = Instant.now()
                }[EmailCampaign.id]
            }
            call.respond(HttpStatusCode.Created, buildJsonObject { put("id", newId) })
        }

        patch("/{id}") {
            val id = call.parameters["id"]?.toLongOrNull()
                ?: return@patch call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
            val b = call.receive<JsonObject>()
            transaction {
                EmailCampaign.update({ EmailCampaign.id eq id }) {
                    b["name"]?.jsonPrimitive?.contentOrNull?.let    { v -> it[EmailCampaign.name] = v }
                    b["subject"]?.jsonPrimitive?.contentOrNull?.let { v -> it[EmailCampaign.subject] = v }
                    b["body"]?.jsonPrimitive?.contentOrNull?.let    { v -> it[EmailCampaign.body] = v }
                    b["audience"]?.jsonPrimitive?.contentOrNull?.let { v -> it[EmailCampaign.audience] = v }
                    // Champs nullables : présence de la clé = mise à jour (même vers null)
                    if (b.containsKey("plan_name"))          it[EmailCampaign.planName]         = b["plan_name"]?.jsonPrimitive?.contentOrNull
                    if (b.containsKey("search_name"))        it[EmailCampaign.searchName]       = b["search_name"]?.jsonPrimitive?.contentOrNull
                    if (b.containsKey("expiry_within_days")) it[EmailCampaign.expiryWithinDays] = b["expiry_within_days"]?.jsonPrimitive?.intOrNull
                    b["frequency_days"]?.jsonPrimitive?.intOrNull?.let  { v -> it[EmailCampaign.frequencyDays] = v }
                    b["active"]?.jsonPrimitive?.booleanOrNull?.let      { v -> it[EmailCampaign.active] = v }
                }
            }
            call.respond(HttpStatusCode.OK, mapOf("message" to "Updated"))
        }

        delete("/{id}") {
            val id = call.parameters["id"]?.toLongOrNull()
                ?: return@delete call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
            val count = transaction { EmailCampaign.deleteWhere { EmailCampaign.id eq id } }
            if (count == 0) call.respond(HttpStatusCode.NotFound, ErrorResponse("Not found"))
            else call.respond(HttpStatusCode.OK, mapOf("message" to "Deleted"))
        }

        // Envoi immédiat (test / déclenchement manuel)
        post("/{id}/send-now") {
            val id = call.parameters["id"]?.toLongOrNull()
                ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
            val sent = service.sendCampaign(id)
            call.respond(HttpStatusCode.OK, buildJsonObject { put("sent", sent) })
        }

        // Aperçu du nombre de destinataires pour une cible donnée (avant enregistrement)
        post("/preview") {
            val b = call.receive<JsonObject>()
            val recipients = service.resolveRecipients(
                audience = b["audience"]?.jsonPrimitive?.content ?: "all",
                planName = b["plan_name"]?.jsonPrimitive?.contentOrNull,
                searchName = b["search_name"]?.jsonPrimitive?.contentOrNull,
                expiryWithinDays = b["expiry_within_days"]?.jsonPrimitive?.intOrNull,
            )
            call.respond(HttpStatusCode.OK, buildJsonObject {
                put("count", recipients.size)
                put("sample", buildJsonArray { recipients.take(10).forEach { add(it.email) } })
            })
        }
    }
}
