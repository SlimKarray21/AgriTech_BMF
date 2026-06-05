package com.pistoncontrol.presentation.controller.admin

import com.pistoncontrol.infrastructure.persistence.RapportEau
import com.pistoncontrol.infrastructure.persistence.RapportSol
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.json.*
import com.pistoncontrol.presentation.controller.ErrorResponse
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.Instant
import java.time.LocalDate

fun Route.rapportSolRoutes() {
    route("/rapport-sol") {
        get {
            val rows = transaction {
                RapportSol.selectAll().orderBy(RapportSol.createdAt, SortOrder.DESC).map {
                    buildJsonObject {
                        put("id",                     it[RapportSol.id])
                        put("report_name",            it[RapportSol.reportName])
                        put("parcel_id",              it[RapportSol.parcelId])
                        put("user_id",                it[RapportSol.userId])
                        put("analysis_date",          it[RapportSol.analysisDate].toString())
                        put("argile_percent",         it[RapportSol.argilePercent])
                        put("limon_percent",          it[RapportSol.limonPercent])
                        put("sable_percent",          it[RapportSol.sablePercent])
                        put("ph",                     it[RapportSol.ph])
                        put("ce_ds_m",                it[RapportSol.ceDsM])
                        put("calcaire_total_percent", it[RapportSol.calcaireTotalPercent])
                        put("calcaire_actif_percent", it[RapportSol.calcaireActifPercent])
                        put("mo_percent",             it[RapportSol.moPercent])
                        put("rapport_cn",             it[RapportSol.rapportCn])
                        put("p2o5_ppm",               it[RapportSol.p2o5Ppm])
                        put("k2o_ppm",                it[RapportSol.k2oPpm])
                        put("mgo_ppm",                it[RapportSol.mgoPpm])
                        put("cec_meq_100g",           it[RapportSol.cecMeq100g])
                        put("esp_percent",            it[RapportSol.espPercent])
                        put("interpretations",        it[RapportSol.interpretations])
                        put("created_at",             it[RapportSol.createdAt].toString())
                    }
                }
            }
            call.respond(HttpStatusCode.OK, buildJsonArray { rows.forEach { add(it) } })
        }
        post {
            val body = call.receive<JsonObject>()
            val vInterp: String? = body["interpretations"]?.jsonPrimitive?.contentOrNull
            val newId = transaction {
                RapportSol.insert {
                    it[reportName]           = body["report_name"]?.jsonPrimitive?.content ?: ""
                    it[parcelId]             = body["parcel_id"]?.jsonPrimitive?.long ?: 0L
                    it[userId]               = body["user_id"]?.jsonPrimitive?.long ?: 0L
                    it[analysisDate]         = body["analysis_date"]?.jsonPrimitive?.contentOrNull
                        ?.let { v -> runCatching { LocalDate.parse(v) }.getOrNull() } ?: LocalDate.now()
                    it[argilePercent]        = body["argile_percent"]?.jsonPrimitive?.double ?: 0.0
                    it[limonPercent]         = body["limon_percent"]?.jsonPrimitive?.double ?: 0.0
                    it[sablePercent]         = body["sable_percent"]?.jsonPrimitive?.double ?: 0.0
                    it[ph]                   = body["ph"]?.jsonPrimitive?.double ?: 7.0
                    it[ceDsM]                = body["ce_ds_m"]?.jsonPrimitive?.double ?: 0.0
                    it[calcaireTotalPercent] = body["calcaire_total_percent"]?.jsonPrimitive?.double ?: 0.0
                    it[calcaireActifPercent] = body["calcaire_actif_percent"]?.jsonPrimitive?.double ?: 0.0
                    it[moPercent]            = body["mo_percent"]?.jsonPrimitive?.double ?: 0.0
                    it[rapportCn]            = body["rapport_cn"]?.jsonPrimitive?.double ?: 0.0
                    it[p2o5Ppm]              = body["p2o5_ppm"]?.jsonPrimitive?.double ?: 0.0
                    it[k2oPpm]               = body["k2o_ppm"]?.jsonPrimitive?.double ?: 0.0
                    it[mgoPpm]               = body["mgo_ppm"]?.jsonPrimitive?.double ?: 0.0
                    it[cecMeq100g]           = body["cec_meq_100g"]?.jsonPrimitive?.double ?: 0.0
                    it[espPercent]           = body["esp_percent"]?.jsonPrimitive?.double ?: 0.0
                    it[interpretations]      = vInterp
                    it[createdAt]            = Instant.now()
                    it[updatedAt]            = Instant.now()
                }[RapportSol.id]
            }
            call.respond(HttpStatusCode.Created, buildJsonObject { put("id", newId) })
        }
        delete("/{id}") {
            val id = call.parameters["id"]?.toLongOrNull()
                ?: return@delete call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
            val count = transaction { RapportSol.deleteWhere { RapportSol.id eq id } }
            if (count == 0) call.respond(HttpStatusCode.NotFound, ErrorResponse("Not found"))
            else call.respond(HttpStatusCode.OK, mapOf("message" to "Deleted"))
        }
    }
}

fun Route.rapportEauRoutes() {
    route("/rapport-eau") {
        get {
            val rows = transaction {
                RapportEau.selectAll().orderBy(RapportEau.createdAt, SortOrder.DESC).map {
                    buildJsonObject {
                        put("id",                 it[RapportEau.id])
                        put("report_name",        it[RapportEau.reportName])
                        put("parcel_id",          it[RapportEau.parcelId])
                        put("user_id",            it[RapportEau.userId])
                        put("analysis_date",      it[RapportEau.analysisDate].toString())
                        put("ph",                 it[RapportEau.ph])
                        put("cew_ds_m",           it[RapportEau.cewDsM])
                        put("residu_sec_mg_l",    it[RapportEau.residuSecMgL])
                        put("chlorures_meq_l",    it[RapportEau.chloruresMeqL])
                        put("sulfates_meq_l",     it[RapportEau.sulfatesMeqL])
                        put("bicarbonates_meq_l", it[RapportEau.bicarbonatesMeqL])
                        put("sodium_meq_l",       it[RapportEau.sodiumMeqL])
                        put("calcium_meq_l",      it[RapportEau.calciumMeqL])
                        put("magnesium_meq_l",    it[RapportEau.magnesiumMeqL])
                        put("sar_ratio",          it[RapportEau.sarRatio])
                        put("durete_f",           it[RapportEau.dureteF])
                        put("interpretations",    it[RapportEau.interpretations])
                        put("created_at",         it[RapportEau.createdAt].toString())
                    }
                }
            }
            call.respond(HttpStatusCode.OK, buildJsonArray { rows.forEach { add(it) } })
        }
        post {
            val body = call.receive<JsonObject>()
            val vInterp: String? = body["interpretations"]?.jsonPrimitive?.contentOrNull
            val newId = transaction {
                RapportEau.insert {
                    it[reportName]       = body["report_name"]?.jsonPrimitive?.content ?: ""
                    it[parcelId]         = body["parcel_id"]?.jsonPrimitive?.long ?: 0L
                    it[userId]           = body["user_id"]?.jsonPrimitive?.long ?: 0L
                    it[analysisDate]     = body["analysis_date"]?.jsonPrimitive?.contentOrNull
                        ?.let { v -> runCatching { LocalDate.parse(v) }.getOrNull() } ?: LocalDate.now()
                    it[ph]               = body["ph"]?.jsonPrimitive?.double ?: 7.0
                    it[cewDsM]           = body["cew_ds_m"]?.jsonPrimitive?.double ?: 0.0
                    it[residuSecMgL]     = body["residu_sec_mg_l"]?.jsonPrimitive?.double ?: 0.0
                    it[chloruresMeqL]    = body["chlorures_meq_l"]?.jsonPrimitive?.double ?: 0.0
                    it[sulfatesMeqL]     = body["sulfates_meq_l"]?.jsonPrimitive?.double ?: 0.0
                    it[bicarbonatesMeqL] = body["bicarbonates_meq_l"]?.jsonPrimitive?.double ?: 0.0
                    it[sodiumMeqL]       = body["sodium_meq_l"]?.jsonPrimitive?.double ?: 0.0
                    it[calciumMeqL]      = body["calcium_meq_l"]?.jsonPrimitive?.double ?: 0.0
                    it[magnesiumMeqL]    = body["magnesium_meq_l"]?.jsonPrimitive?.double ?: 0.0
                    it[sarRatio]         = body["sar_ratio"]?.jsonPrimitive?.double ?: 0.0
                    it[dureteF]          = body["durete_f"]?.jsonPrimitive?.double ?: 0.0
                    it[interpretations]  = vInterp
                    it[createdAt]        = Instant.now()
                    it[updatedAt]        = Instant.now()
                }[RapportEau.id]
            }
            call.respond(HttpStatusCode.Created, buildJsonObject { put("id", newId) })
        }
        delete("/{id}") {
            val id = call.parameters["id"]?.toLongOrNull()
                ?: return@delete call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
            val count = transaction { RapportEau.deleteWhere { RapportEau.id eq id } }
            if (count == 0) call.respond(HttpStatusCode.NotFound, ErrorResponse("Not found"))
            else call.respond(HttpStatusCode.OK, mapOf("message" to "Deleted"))
        }
    }
}
