package com.CapteurSol.routes

import com.CapteurSol.services.CapteurSolService
import com.CapteurSol.services.CreateParcelleWizardInput
import com.CapteurSol.services.CreateParcelleInput
import com.CapteurSol.services.CreateVanneInput
import com.CapteurSol.services.UpdateParcelleInput
import com.CapteurSol.services.UpdateVanneInput
import com.CapteurSol.services.WizardPlantInput
import com.CapteurSol.services.WizardVanneInput
import com.pistoncontrol.routes.ErrorResponse
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.auth.authenticate
import io.ktor.server.auth.jwt.JWTPrincipal
import io.ktor.server.auth.principal
import io.ktor.server.plugins.ContentTransformationException
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.patch
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import mu.KotlinLogging
import java.util.UUID

private val logger = KotlinLogging.logger {}

@Serializable
data class CreateParcelleRequest(
    val nomSurface: String,
    val localisation: String,
    val typeSol: String,
    val fkUser: Long? = null,
    val fkSol: Long? = null,
    val fkClimat: Long? = null,
    val tailleHa: Double,
)

@Serializable
data class CreateVanneRequest(
    val name: String,
    val parcelId: Long,
    val userId: Long,
    val debit: Double = 0.0,
    val isAuto: Boolean = false,
    val isOpen: Boolean = false,
    val lastAction: String? = null,
    val nbPlants: Int = 0,
    val scheduleDays: List<String>? = null,
    val scheduleStart: String? = null,
    val scheduleEnd: String? = null,
)

@Serializable
data class UpdateVanneRequest(
    val name: String? = null,
    val parcelId: Long? = null,
    val userId: Long? = null,
    val debit: Double? = null,
    val isAuto: Boolean? = null,
    val isOpen: Boolean? = null,
    val lastAction: String? = null,
    val nbPlants: Int? = null,
    val scheduleDays: List<String>? = null,
    val scheduleStart: String? = null,
    val scheduleEnd: String? = null,
)

@Serializable
data class UpdateParcelleRequest(
    val nomSurface: String? = null,
    val localisation: String? = null,
    val typeSol: String? = null,
    val fkUser: Long? = null,
    val fkSol: Long? = null,
    val fkClimat: Long? = null,
    val tailleHa: Double? = null,
)

@Serializable
data class WizardPlantRequest(
    val name: String = "",
    val type: String = "autre",
    val age: Int = 1,
    val count: Int = 0,
    val waterNeedPerPlant: Double = 0.0,
)

@Serializable
data class WizardVanneRequest(
    val name: String = "",
    val nbPlants: Int = 0,
    val debit: Double = 0.0,
)

@Serializable
data class CreateParcelleWizardRequest(
    val nomSurface: String = "",
    val localisation: String = "",
    val typeSol: String = "standard",
    val fkUser: Long? = null,
    val tailleHa: Double = 0.0,
    val plants: List<WizardPlantRequest> = emptyList(),
    val vannes: List<WizardVanneRequest> = emptyList(),
)

private suspend fun authenticatedCapteurUserId(call: io.ktor.server.application.ApplicationCall, service: CapteurSolService): Long? {
    val principal = call.principal<JWTPrincipal>()
    val disableAuth = (System.getenv("DISABLE_AUTH") ?: "false").toBooleanStrictOrNull() == true
    val authUserId = principal?.payload?.getClaim("userId")?.asString()
        ?: principal?.payload?.subject
        ?: if (disableAuth) (System.getenv("TEST_AUTH_USER_ID") ?: "00000000-0000-0000-0000-000000000001") else null
    val authEmail = principal?.payload?.getClaim("email")?.asString()
    val authRole = principal?.payload?.getClaim("role")?.asString()

    logger.info { "[AUTH] JWT claims -> userId=$authUserId, email=$authEmail, role=$authRole, sub=${principal?.payload?.subject}, exp=${principal?.expiresAt}, principalNull=${principal == null}" }

    if (authUserId == null) {
        logger.warn { "[AUTH] REJECTED: no userId in JWT (principal null: ${principal == null})" }
        call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Missing authentication token"))
        return null
    }

    val authUserUuid = try {
        UUID.fromString(authUserId)
    } catch (_: IllegalArgumentException) {
        logger.warn { "[AUTH] REJECTED: invalid UUID format: $authUserId" }
        call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Invalid authenticated user id"))
        return null
    }

    val capteurUserId = try {
        service.resolveOrCreateCapteurUserId(authUserUuid, authEmail)
    } catch (e: Exception) {
        logger.error(e) { "[AUTH] DB ERROR resolving CapteurSol user for authId=$authUserId email=$authEmail" }
        call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Database error during user resolution: ${e.message}"))
        return null
    }

    if (capteurUserId == null) {
        logger.warn { "[AUTH] REJECTED: resolveOrCreateCapteurUserId returned null for authId=$authUserId, email=$authEmail — check [resolveUser] logs above for details" }
        call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Authenticated user not found. No profile could be resolved for email=$authEmail. Check server logs for details."))
        return null
    }

    logger.info { "[AUTH] OK: CapteurSol userId=$capteurUserId for authId=$authUserId (email=$authEmail)" }
    return capteurUserId
}

fun Route.capteurSolRoutes(service: CapteurSolService = CapteurSolService()) {
    authenticate("auth-jwt") {
        route("/wizard") {
            post("/parcelles") {
                val capteurUserId = authenticatedCapteurUserId(call, service) ?: return@post
                try {
                    val body = call.receive<JsonObject>()
                    val nomSurface = body.stringValue("nomSurface")
                    val localisation = body.stringValue("localisation")
                    val typeSol = body.stringValue("typeSol", "standard")
                    val tailleHa = body.doubleValue("tailleHa")

                    val plants = body.arrayValue("plants").map { plantEl ->
                        val plant = plantEl as? JsonObject ?: JsonObject(emptyMap())
                        WizardPlantInput(
                            name = plant.stringValue("name", "Plante"),
                            type = plant.stringValue("type", "autre"),
                            age = plant.intValue("age", 1),
                            count = plant.intValue("count", 0),
                            waterNeedPerPlant = plant.doubleValue("waterNeedPerPlant", 0.0),
                        )
                    }

                    val vannes = body.arrayValue("vannes").mapIndexed { index, vanneEl ->
                        val vanne = vanneEl as? JsonObject ?: JsonObject(emptyMap())
                        WizardVanneInput(
                            name = vanne.stringValue("name", "Vanne ${index + 1}"),
                            nbPlants = vanne.intValue("nbPlants", 0),
                            debit = vanne.doubleValue("debit", 0.0),
                        )
                    }

                    val result = service.createParcelleWizard(
                        CreateParcelleWizardInput(
                            nomSurface = nomSurface,
                            localisation = localisation,
                            typeSol = typeSol,
                            fkUser = capteurUserId,
                            tailleHa = tailleHa,
                            plants = plants,
                            vannes = vannes,
                        )
                    )
                    call.respond(HttpStatusCode.Created, result)
                } catch (e: ContentTransformationException) {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse("Invalid wizard payload format. Please verify numeric fields and required properties. ${e.message ?: ""}".trim()),
                    )
                } catch (e: IllegalArgumentException) {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse(e.message ?: "Invalid wizard payload"),
                    )
                }
            }
        }

        route("/parcelles") {
            get {
                val capteurUserId = authenticatedCapteurUserId(call, service) ?: return@get
                val data = service.listParcelles(capteurUserId)
                call.respond(HttpStatusCode.OK, data)
            }

            post {
                val capteurUserId = authenticatedCapteurUserId(call, service) ?: return@post
                val body = call.receive<CreateParcelleRequest>()
                val created = service.createParcelle(
                    CreateParcelleInput(
                        nomSurface = body.nomSurface,
                        localisation = body.localisation,
                        typeSol = body.typeSol,
                        fkUser = capteurUserId,
                        fkSol = body.fkSol,
                        fkClimat = body.fkClimat,
                        tailleHa = body.tailleHa,
                    )
                )
                call.respond(HttpStatusCode.Created, created)
            }

            get("/{id}") {
                val parcelId = call.parameters["id"]?.toLongOrNull()
                    ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid parcelle id"))
                val capteurUserId = authenticatedCapteurUserId(call, service) ?: return@get
                val data = service.getParcelleDetails(parcelId, capteurUserId)
                if (data == null) {
                    call.respond(HttpStatusCode.NotFound, ErrorResponse("Parcelle not found"))
                } else {
                    call.respond(HttpStatusCode.OK, data)
                }
            }

            patch("/{id}") {
                val parcelId = call.parameters["id"]?.toLongOrNull()
                    ?: return@patch call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid parcelle id"))
                val capteurUserId = authenticatedCapteurUserId(call, service) ?: return@patch
                val body = call.receive<UpdateParcelleRequest>()
                val updated = service.updateParcelle(
                    id = parcelId,
                    ownerUserId = capteurUserId,
                    input = UpdateParcelleInput(
                        nomSurface = body.nomSurface,
                        localisation = body.localisation,
                        typeSol = body.typeSol,
                        fkUser = null,
                        fkSol = body.fkSol,
                        fkClimat = body.fkClimat,
                        tailleHa = body.tailleHa,
                    )
                )
                if (updated == null) {
                    call.respond(HttpStatusCode.NotFound, ErrorResponse("Parcelle not found"))
                } else {
                    call.respond(HttpStatusCode.OK, updated)
                }
            }

            delete("/{id}") {
                val parcelId = call.parameters["id"]?.toLongOrNull()
                    ?: return@delete call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid parcelle id"))
                val capteurUserId = authenticatedCapteurUserId(call, service) ?: return@delete
                val deleted = service.deleteParcelle(parcelId, capteurUserId)
                if (!deleted) {
                    call.respond(HttpStatusCode.NotFound, ErrorResponse("Parcelle not found"))
                } else {
                    call.respond(HttpStatusCode.OK, mapOf("message" to "Parcelle deleted"))
                }
            }

            get("/{id}/vannes") {
                val parcelId = call.parameters["id"]?.toLongOrNull()
                    ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid parcelle id"))
                val capteurUserId = authenticatedCapteurUserId(call, service) ?: return@get
                val data = service.listVannes(parcelId = parcelId, userId = capteurUserId)
                call.respond(HttpStatusCode.OK, data)
            }

            get("/{id}/plants") {
                val parcelId = call.parameters["id"]?.toLongOrNull()
                    ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid parcelle id"))
                val capteurUserId = authenticatedCapteurUserId(call, service) ?: return@get
                val ownedParcelle = service.getParcelleDetails(parcelId, capteurUserId)
                if (ownedParcelle == null) {
                    call.respond(HttpStatusCode.NotFound, ErrorResponse("Parcelle not found"))
                } else {
                    val data = service.listPlantsByParcelleId(parcelId)
                    call.respond(HttpStatusCode.OK, data)
                }
            }
        }

        route("/vannes") {
            get {
                val capteurUserId = authenticatedCapteurUserId(call, service) ?: return@get
                val parcelId = call.request.queryParameters["parcelId"]?.toLongOrNull()
                val data = service.listVannes(parcelId = parcelId, userId = capteurUserId)
                call.respond(HttpStatusCode.OK, data)
            }

            post {
                val capteurUserId = authenticatedCapteurUserId(call, service) ?: return@post
                val body = call.receive<CreateVanneRequest>()
                val created = service.createVanne(
                    CreateVanneInput(
                        name = body.name,
                        parcelId = body.parcelId,
                        userId = capteurUserId,
                        debit = body.debit,
                        isAuto = body.isAuto,
                        isOpen = body.isOpen,
                        lastAction = body.lastAction,
                        nbPlants = body.nbPlants,
                        scheduleDays = body.scheduleDays,
                        scheduleStart = body.scheduleStart,
                        scheduleEnd = body.scheduleEnd,
                    )
                )
                if (created == null) {
                    return@post call.respond(HttpStatusCode.Forbidden, ErrorResponse("Parcelle not found for this user"))
                }
                call.respond(HttpStatusCode.Created, created)
            }

            patch("/{id}") {
                val id = call.parameters["id"]?.toLongOrNull()
                    ?: return@patch call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid vanne id"))
                val capteurUserId = authenticatedCapteurUserId(call, service) ?: return@patch
                val body = call.receive<UpdateVanneRequest>()
                val updated = service.updateVanne(
                    id = id,
                    ownerUserId = capteurUserId,
                    input = UpdateVanneInput(
                        name = body.name,
                        parcelId = body.parcelId,
                        userId = capteurUserId,
                        debit = body.debit,
                        isAuto = body.isAuto,
                        isOpen = body.isOpen,
                        lastAction = body.lastAction,
                        nbPlants = body.nbPlants,
                        scheduleDays = body.scheduleDays,
                        scheduleStart = body.scheduleStart,
                        scheduleEnd = body.scheduleEnd,
                    )
                )
                if (updated == null) {
                    call.respond(HttpStatusCode.NotFound, ErrorResponse("Vanne not found"))
                } else {
                    call.respond(HttpStatusCode.OK, updated)
                }
            }

            delete("/{id}") {
                val id = call.parameters["id"]?.toLongOrNull()
                    ?: return@delete call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid vanne id"))
                val capteurUserId = authenticatedCapteurUserId(call, service) ?: return@delete
                val deleted = service.deleteVanne(id, capteurUserId)
                if (!deleted) {
                    call.respond(HttpStatusCode.NotFound, ErrorResponse("Vanne not found"))
                } else {
                    call.respond(HttpStatusCode.OK, mapOf("message" to "Vanne deleted"))
                }
            }
        }
    }
}

private fun JsonObject.stringValue(key: String, default: String = ""): String {
    val value = this[key] as? JsonPrimitive ?: return default
    return value.content.trim().ifEmpty { default }
}

private fun JsonObject.intValue(key: String, default: Int = 0): Int {
    val value = this[key] as? JsonPrimitive ?: return default
    return value.content.toIntOrNull() ?: default
}

private fun JsonObject.doubleValue(key: String, default: Double = 0.0): Double {
    val value = this[key] as? JsonPrimitive ?: return default
    return value.content.replace(',', '.').toDoubleOrNull() ?: default
}

private fun JsonObject.arrayValue(key: String): JsonArray {
    val value = this[key]
    return if (value is JsonArray) value else JsonArray(emptyList())
}
