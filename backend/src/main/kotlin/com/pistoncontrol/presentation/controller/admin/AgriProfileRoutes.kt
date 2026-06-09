package com.pistoncontrol.presentation.controller.admin

import com.pistoncontrol.infrastructure.persistence.ClimatsExpo
import com.pistoncontrol.infrastructure.persistence.Utilisateur
import com.pistoncontrol.infrastructure.persistence.SolExpo
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

fun Route.profilesRoutes() {
    route("/profiles") {
        post {
            val body = call.receive<JsonObject>()
            val email = body["email"]?.jsonPrimitive?.contentOrNull
                ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("email required"))
            transaction {
                val existing = Utilisateur.select { Utilisateur.email eq email }.singleOrNull()
                if (existing != null) {
                    body["created_by"]?.jsonPrimitive?.longOrNull?.let { cb ->
                        Utilisateur.update({ Utilisateur.email eq email }) { it[Utilisateur.createdBy] = cb }
                    }
                    call.response.status(HttpStatusCode.OK)
                } else {
                    call.response.status(HttpStatusCode.NotFound)
                }
            }
            call.respond(HttpStatusCode.OK, mapOf("message" to "ok"))
        }
        get {
            val rows = transaction {
                Utilisateur.selectAll().map {
                    buildJsonObject {
                        put("id",            it[Utilisateur.id])
                        put("user_id",       it[Utilisateur.userId].toString())
                        put("email",         it[Utilisateur.email])
                        put("first_name",    it[Utilisateur.firstName])
                        put("last_name",     it[Utilisateur.lastName])
                        put("user_role",     it[Utilisateur.userRole])
                        put("phone_number",  it[Utilisateur.phoneNumber])
                        put("country",       it[Utilisateur.country])
                        put("city",          it[Utilisateur.city])
                        put("avatar_url",    it[Utilisateur.avatarUrl])
                        put("date_of_birth", it[Utilisateur.dateOfBirth]?.toString())
                        put("date_deb_abo",  it[Utilisateur.dateDebAbo]?.toString())
                        put("date_exp_abo",  it[Utilisateur.dateExpAbo]?.toString())
                        put("type_abo",      it[Utilisateur.typeAbo])
                        put("company_name",  it[Utilisateur.companyName])
                        put("company_logo",  it[Utilisateur.companyLogo])
                        put("created_by",    it[Utilisateur.createdBy])
                        put("created_at",    it[Utilisateur.createdAt].toString())
                        put("updated_at",    it[Utilisateur.updatedAt].toString())
                    }
                }
            }
            call.respond(HttpStatusCode.OK, buildJsonArray { rows.forEach { add(it) } })
        }
        get("/{id}") {
            val id = call.parameters["id"]?.toLongOrNull()
                ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
            val row = transaction {
                Utilisateur.select { Utilisateur.id eq id }.firstOrNull()?.let {
                    buildJsonObject {
                        put("id",         it[Utilisateur.id])
                        put("user_id",    it[Utilisateur.userId].toString())
                        put("email",      it[Utilisateur.email])
                        put("first_name", it[Utilisateur.firstName])
                        put("last_name",  it[Utilisateur.lastName])
                        put("user_role",  it[Utilisateur.userRole])
                        put("type_abo",   it[Utilisateur.typeAbo])
                    }
                }
            }
            if (row == null) call.respond(HttpStatusCode.NotFound, ErrorResponse("Not found"))
            else call.respond(HttpStatusCode.OK, row)
        }
        patch("/{id}") {
            val id = call.parameters["id"]?.toLongOrNull()
                ?: return@patch call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
            val body = call.receive<JsonObject>()
            transaction {
                Utilisateur.update({ Utilisateur.id eq id }) {
                    body["first_name"]?.jsonPrimitive?.contentOrNull?.let    { v -> it[Utilisateur.firstName]   = v }
                    body["last_name"]?.jsonPrimitive?.contentOrNull?.let     { v -> it[Utilisateur.lastName]    = v }
                    body["user_role"]?.jsonPrimitive?.contentOrNull?.let     { v -> it[Utilisateur.userRole]    = v }
                    body["phone_number"]?.jsonPrimitive?.contentOrNull?.let  { v -> it[Utilisateur.phoneNumber] = v }
                    body["country"]?.jsonPrimitive?.contentOrNull?.let       { v -> it[Utilisateur.country]     = v }
                    body["city"]?.jsonPrimitive?.contentOrNull?.let          { v -> it[Utilisateur.city]        = v }
                    body["email"]?.jsonPrimitive?.contentOrNull?.let         { v -> it[Utilisateur.email]       = v }
                    if (body.containsKey("type_abo"))
                        it[Utilisateur.typeAbo] = body["type_abo"]?.jsonPrimitive?.contentOrNull
                    body["company_name"]?.jsonPrimitive?.contentOrNull?.let  { v -> it[Utilisateur.companyName] = v }
                    body["company_logo"]?.jsonPrimitive?.contentOrNull?.let  { v -> it[Utilisateur.companyLogo] = v }
                    body["avatar_url"]?.jsonPrimitive?.contentOrNull?.let    { v -> it[Utilisateur.avatarUrl]   = v }
                    if (body.containsKey("date_deb_abo"))
                        it[Utilisateur.dateDebAbo] = body["date_deb_abo"]?.jsonPrimitive?.contentOrNull
                            ?.let { v -> runCatching { LocalDate.parse(v) }.getOrNull() }
                    if (body.containsKey("date_exp_abo"))
                        it[Utilisateur.dateExpAbo] = body["date_exp_abo"]?.jsonPrimitive?.contentOrNull
                            ?.let { v -> runCatching { LocalDate.parse(v) }.getOrNull() }
                    if (body.containsKey("created_by")) {
                        it[Utilisateur.createdBy] = body["created_by"]?.jsonPrimitive?.longOrNull
                    }
                    it[Utilisateur.updatedAt] = Instant.now()
                }
            }
            call.respond(HttpStatusCode.OK, mapOf("message" to "Updated"))
        }
        delete("/{id}") {
            val id = call.parameters["id"]?.toLongOrNull()
                ?: return@delete call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
            val count = transaction { Utilisateur.deleteWhere { Utilisateur.id eq id } }
            if (count == 0) call.respond(HttpStatusCode.NotFound, ErrorResponse("Not found"))
            else call.respond(HttpStatusCode.OK, mapOf("message" to "Deleted"))
        }
    }
}

// typePlanteRoutes() supprimé : table type_plante retirée du schéma.

fun Route.solsRoutes() {
    route("/sols") {
        get {
            val rows = transaction {
                SolExpo.selectAll().map {
                    buildJsonObject {
                        put("id",          it[SolExpo.id])
                        put("nature",      it[SolExpo.nature])
                        put("humidite",    it[SolExpo.humidite])
                        put("salinite",    it[SolExpo.salinite])
                        put("ph",          it[SolExpo.ph])
                        put("temperature", it[SolExpo.temperature])
                        put("date_mesure", it[SolExpo.dateMesure].toString())
                        put("created_at",  it[SolExpo.createdAt].toString())
                    }
                }
            }
            call.respond(HttpStatusCode.OK, buildJsonArray { rows.forEach { add(it) } })
        }
        post {
            val body = call.receive<JsonObject>()
            val newId = transaction {
                SolExpo.insert {
                    it[nature]      = body["nature"]?.jsonPrimitive?.content ?: ""
                    it[humidite]    = body["humidite"]?.jsonPrimitive?.double ?: 0.0
                    it[salinite]    = body["salinite"]?.jsonPrimitive?.double ?: 0.0
                    it[ph]          = body["ph"]?.jsonPrimitive?.double ?: 7.0
                    it[temperature] = body["temperature"]?.jsonPrimitive?.double ?: 20.0
                    it[dateMesure]  = body["date_mesure"]?.jsonPrimitive?.contentOrNull
                        ?.let { v -> runCatching { Instant.parse(v) }.getOrNull() } ?: Instant.now()
                    it[createdAt]   = Instant.now()
                }[SolExpo.id]
            }
            call.respond(HttpStatusCode.Created, buildJsonObject { put("id", newId) })
        }
        patch("/{id}") {
            val id = call.parameters["id"]?.toLongOrNull()
                ?: return@patch call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
            val body = call.receive<JsonObject>()
            transaction {
                SolExpo.update({ SolExpo.id eq id }) {
                    body["nature"]?.jsonPrimitive?.contentOrNull?.let     { v -> it[SolExpo.nature]      = v }
                    body["humidite"]?.jsonPrimitive?.doubleOrNull?.let    { v -> it[SolExpo.humidite]    = v }
                    body["salinite"]?.jsonPrimitive?.doubleOrNull?.let    { v -> it[SolExpo.salinite]    = v }
                    body["ph"]?.jsonPrimitive?.doubleOrNull?.let          { v -> it[SolExpo.ph]          = v }
                    body["temperature"]?.jsonPrimitive?.doubleOrNull?.let { v -> it[SolExpo.temperature] = v }
                }
            }
            call.respond(HttpStatusCode.OK, mapOf("message" to "Updated"))
        }
        delete("/{id}") {
            val id = call.parameters["id"]?.toLongOrNull()
                ?: return@delete call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
            val count = transaction { SolExpo.deleteWhere { SolExpo.id eq id } }
            if (count == 0) call.respond(HttpStatusCode.NotFound, ErrorResponse("Not found"))
            else call.respond(HttpStatusCode.OK, mapOf("message" to "Deleted"))
        }
    }
}

fun Route.climatsRoutes() {
    route("/climats") {
        get {
            val rows = transaction {
                ClimatsExpo.selectAll().map {
                    buildJsonObject {
                        put("id",                       it[ClimatsExpo.id])
                        put("temperature_c",            it[ClimatsExpo.temperatureC])
                        put("humidite_c",               it[ClimatsExpo.humiditeC])
                        put("vitesse_vent",             it[ClimatsExpo.vitesseVent])
                        put("puissance_ensoleillement", it[ClimatsExpo.puissanceEnsoleillement])
                        put("created_at",               it[ClimatsExpo.createdAt].toString())
                    }
                }
            }
            call.respond(HttpStatusCode.OK, buildJsonArray { rows.forEach { add(it) } })
        }
        post {
            val body = call.receive<JsonObject>()
            val newId = transaction {
                ClimatsExpo.insert {
                    it[temperatureC]            = body["temperature_c"]?.jsonPrimitive?.double ?: 0.0
                    it[humiditeC]               = body["humidite_c"]?.jsonPrimitive?.double ?: 0.0
                    it[vitesseVent]             = body["vitesse_vent"]?.jsonPrimitive?.double ?: 0.0
                    it[puissanceEnsoleillement] = body["puissance_ensoleillement"]?.jsonPrimitive?.double ?: 0.0
                    it[createdAt]               = Instant.now()
                }[ClimatsExpo.id]
            }
            call.respond(HttpStatusCode.Created, buildJsonObject { put("id", newId) })
        }
        patch("/{id}") {
            val id = call.parameters["id"]?.toLongOrNull()
                ?: return@patch call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
            val body = call.receive<JsonObject>()
            transaction {
                ClimatsExpo.update({ ClimatsExpo.id eq id }) {
                    body["temperature_c"]?.jsonPrimitive?.doubleOrNull?.let            { v -> it[ClimatsExpo.temperatureC]            = v }
                    body["humidite_c"]?.jsonPrimitive?.doubleOrNull?.let               { v -> it[ClimatsExpo.humiditeC]               = v }
                    body["vitesse_vent"]?.jsonPrimitive?.doubleOrNull?.let             { v -> it[ClimatsExpo.vitesseVent]             = v }
                    body["puissance_ensoleillement"]?.jsonPrimitive?.doubleOrNull?.let { v -> it[ClimatsExpo.puissanceEnsoleillement] = v }
                }
            }
            call.respond(HttpStatusCode.OK, mapOf("message" to "Updated"))
        }
        delete("/{id}") {
            val id = call.parameters["id"]?.toLongOrNull()
                ?: return@delete call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
            val count = transaction { ClimatsExpo.deleteWhere { ClimatsExpo.id eq id } }
            if (count == 0) call.respond(HttpStatusCode.NotFound, ErrorResponse("Not found"))
            else call.respond(HttpStatusCode.OK, mapOf("message" to "Deleted"))
        }
    }
}
