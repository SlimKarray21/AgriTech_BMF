package com.pistoncontrol.presentation.controller.admin

import com.pistoncontrol.infrastructure.persistence.ClimatsExpo
import com.pistoncontrol.infrastructure.persistence.Profiles
import com.pistoncontrol.infrastructure.persistence.SolExpo
import com.pistoncontrol.infrastructure.persistence.TypePlante
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
                val existing = Profiles.select { Profiles.email eq email }.singleOrNull()
                if (existing != null) {
                    body["created_by"]?.jsonPrimitive?.longOrNull?.let { cb ->
                        Profiles.update({ Profiles.email eq email }) { it[Profiles.createdBy] = cb }
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
                Profiles.selectAll().map {
                    buildJsonObject {
                        put("id",               it[Profiles.id])
                        put("user_id",          it[Profiles.userId] ?: JsonNull)
                        put("email",            it[Profiles.email])
                        put("first_name",       it[Profiles.firstName])
                        put("last_name",        it[Profiles.lastName])
                        put("user_role",        it[Profiles.userRole])
                        put("phone_number",     it[Profiles.phoneNumber])
                        put("location",         it[Profiles.location])
                        put("country",          it[Profiles.country])
                        put("city",             it[Profiles.city])
                        put("avatar_url",       it[Profiles.avatarUrl])
                        put("date_of_birth",    it[Profiles.dateOfBirth]?.toString())
                        put("date_deb_abo",     it[Profiles.dateDebAbo]?.toString())
                        put("date_exp_abo",     it[Profiles.dateExpAbo]?.toString())
                        put("type_abo",         it[Profiles.typeAbo])
                        put("company_name",     it[Profiles.companyName])
                        put("company_logo",     it[Profiles.companyLogo])
                        put("created_by",       it[Profiles.createdBy])
                        put("abo_capteur_sol",  it[Profiles.aboCapSol])
                        put("abo_electrovanne", it[Profiles.aboElectrovanne])
                        put("abo_sante_plante", it[Profiles.aboSantePlante])
                        put("created_at",       it[Profiles.createdAt].toString())
                        put("updated_at",       it[Profiles.updatedAt].toString())
                    }
                }
            }
            call.respond(HttpStatusCode.OK, buildJsonArray { rows.forEach { add(it) } })
        }
        get("/{id}") {
            val id = call.parameters["id"]?.toLongOrNull()
                ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
            val row = transaction {
                Profiles.select { Profiles.id eq id }.firstOrNull()?.let {
                    buildJsonObject {
                        put("id",               it[Profiles.id])
                        put("email",            it[Profiles.email])
                        put("first_name",       it[Profiles.firstName])
                        put("last_name",        it[Profiles.lastName])
                        put("user_role",        it[Profiles.userRole])
                        put("type_abo",         it[Profiles.typeAbo])
                        put("abo_capteur_sol",  it[Profiles.aboCapSol])
                        put("abo_electrovanne", it[Profiles.aboElectrovanne])
                        put("abo_sante_plante", it[Profiles.aboSantePlante])
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
                Profiles.update({ Profiles.id eq id }) {
                    body["first_name"]?.jsonPrimitive?.contentOrNull?.let       { v -> it[Profiles.firstName]      = v }
                    body["last_name"]?.jsonPrimitive?.contentOrNull?.let        { v -> it[Profiles.lastName]       = v }
                    body["user_role"]?.jsonPrimitive?.contentOrNull?.let        { v -> it[Profiles.userRole]       = v }
                    body["phone_number"]?.jsonPrimitive?.contentOrNull?.let     { v -> it[Profiles.phoneNumber]    = v }
                    body["location"]?.jsonPrimitive?.contentOrNull?.let         { v -> it[Profiles.location]       = v }
                    body["country"]?.jsonPrimitive?.contentOrNull?.let          { v -> it[Profiles.country]        = v }
                    body["city"]?.jsonPrimitive?.contentOrNull?.let             { v -> it[Profiles.city]           = v }
                    body["email"]?.jsonPrimitive?.contentOrNull?.let            { v -> it[Profiles.email]          = v }
                    body["type_abo"]?.jsonPrimitive?.contentOrNull?.let         { v -> it[Profiles.typeAbo]        = v }
                    body["company_name"]?.jsonPrimitive?.contentOrNull?.let     { v -> it[Profiles.companyName]    = v }
                    body["company_logo"]?.jsonPrimitive?.contentOrNull?.let     { v -> it[Profiles.companyLogo]    = v }
                    body["date_deb_abo"]?.jsonPrimitive?.contentOrNull?.let { v ->
                        it.set<LocalDate?>(Profiles.dateDebAbo, runCatching { LocalDate.parse(v) }.getOrNull())
                    }
                    body["date_exp_abo"]?.jsonPrimitive?.contentOrNull?.let { v ->
                        it.set<LocalDate?>(Profiles.dateExpAbo, runCatching { LocalDate.parse(v) }.getOrNull())
                    }
                    body["abo_capteur_sol"]?.jsonPrimitive?.booleanOrNull?.let  { v -> it[Profiles.aboCapSol]       = v }
                    body["abo_electrovanne"]?.jsonPrimitive?.booleanOrNull?.let { v -> it[Profiles.aboElectrovanne] = v }
                    body["abo_sante_plante"]?.jsonPrimitive?.booleanOrNull?.let { v -> it[Profiles.aboSantePlante]  = v }
                    if (body.containsKey("created_by")) {
                        it[Profiles.createdBy] = body["created_by"]?.jsonPrimitive?.longOrNull
                    }
                    it[Profiles.updatedAt] = Instant.now()
                }
            }
            call.respond(HttpStatusCode.OK, mapOf("message" to "Updated"))
        }
        delete("/{id}") {
            val id = call.parameters["id"]?.toLongOrNull()
                ?: return@delete call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
            val count = transaction { Profiles.deleteWhere { Profiles.id eq id } }
            if (count == 0) call.respond(HttpStatusCode.NotFound, ErrorResponse("Not found"))
            else call.respond(HttpStatusCode.OK, mapOf("message" to "Deleted"))
        }
    }
}

fun Route.typePlanteRoutes() {
    route("/type-plante") {
        get {
            val rows = transaction {
                TypePlante.selectAll().map {
                    buildJsonObject {
                        put("id",                    it[TypePlante.id])
                        put("nom_plante",            it[TypePlante.nomPlante])
                        put("type_plante",           it[TypePlante.typePlante])
                        put("besoin_eau_par_plante", it[TypePlante.besoinEauParPlante])
                        put("created_at",            it[TypePlante.createdAt].toString())
                    }
                }
            }
            call.respond(HttpStatusCode.OK, buildJsonArray { rows.forEach { add(it) } })
        }
        post {
            val body = call.receive<JsonObject>()
            val newId = transaction {
                TypePlante.insert {
                    it[nomPlante]          = body["nom_plante"]?.jsonPrimitive?.content ?: ""
                    it[typePlante]         = body["type_plante"]?.jsonPrimitive?.content ?: ""
                    it[besoinEauParPlante] = body["besoin_eau_par_plante"]?.jsonPrimitive?.double ?: 0.0
                    it[createdAt]          = Instant.now()
                }[TypePlante.id]
            }
            call.respond(HttpStatusCode.Created, buildJsonObject { put("id", newId) })
        }
        patch("/{id}") {
            val id = call.parameters["id"]?.toLongOrNull()
                ?: return@patch call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
            val body = call.receive<JsonObject>()
            transaction {
                TypePlante.update({ TypePlante.id eq id }) {
                    body["nom_plante"]?.jsonPrimitive?.contentOrNull?.let           { v -> it[TypePlante.nomPlante]          = v }
                    body["type_plante"]?.jsonPrimitive?.contentOrNull?.let          { v -> it[TypePlante.typePlante]         = v }
                    body["besoin_eau_par_plante"]?.jsonPrimitive?.doubleOrNull?.let { v -> it[TypePlante.besoinEauParPlante] = v }
                }
            }
            call.respond(HttpStatusCode.OK, mapOf("message" to "Updated"))
        }
        delete("/{id}") {
            val id = call.parameters["id"]?.toLongOrNull()
                ?: return@delete call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
            val count = transaction { TypePlante.deleteWhere { TypePlante.id eq id } }
            if (count == 0) call.respond(HttpStatusCode.NotFound, ErrorResponse("Not found"))
            else call.respond(HttpStatusCode.OK, mapOf("message" to "Deleted"))
        }
    }
}

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
