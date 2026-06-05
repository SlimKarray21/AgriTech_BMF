package com.pistoncontrol.presentation.controller.capteursol

import com.pistoncontrol.application.service.CapteurSolApplicationService
import com.pistoncontrol.application.service.capteursol.CreateParcelleInput
import com.pistoncontrol.application.service.capteursol.CreateParcelleWizardInput
import com.pistoncontrol.application.service.capteursol.CreateRapportEauInput
import com.pistoncontrol.application.service.capteursol.CreateRapportSolInput
import com.pistoncontrol.application.service.capteursol.CreateVanneInput
import com.pistoncontrol.application.service.capteursol.UpdateParcelleInput
import com.pistoncontrol.application.service.capteursol.UpdateVanneInput
import com.pistoncontrol.application.service.capteursol.WizardPlantInput
import com.pistoncontrol.application.service.capteursol.WizardVanneInput
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.double
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.contentOrNull
import com.pistoncontrol.common.utils.arrayValue
import com.pistoncontrol.common.utils.doubleValue
import com.pistoncontrol.common.utils.intValue
import com.pistoncontrol.common.utils.isAdminJwt
import com.pistoncontrol.common.utils.jwtEmailClaim
import com.pistoncontrol.common.utils.jwtPrincipal
import com.pistoncontrol.common.utils.jwtUserIdClaim
import com.pistoncontrol.common.utils.stringValue
import com.pistoncontrol.presentation.dto.capteursol.CreateParcelleRequest
import com.pistoncontrol.presentation.dto.capteursol.CreateParcelleWizardRequest
import com.pistoncontrol.presentation.dto.capteursol.CreateVanneRequest
import com.pistoncontrol.presentation.dto.capteursol.UpdateParcelleRequest
import com.pistoncontrol.presentation.dto.capteursol.UpdateVanneRequest
import com.pistoncontrol.presentation.controller.ErrorResponse
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.ApplicationCall
import io.ktor.server.application.call
import io.ktor.server.auth.authenticate
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
import mu.KotlinLogging
import java.util.UUID

private val logger = KotlinLogging.logger {}

private suspend fun authenticatedCapteurUserId(call: ApplicationCall, service: CapteurSolApplicationService): Long? {
    val disableAuth = (System.getenv("DISABLE_AUTH") ?: "false").toBooleanStrictOrNull() == true
    val authUserId = call.jwtUserIdClaim()
        ?: if (disableAuth) (System.getenv("TEST_AUTH_USER_ID") ?: "00000000-0000-0000-0000-000000000001") else null
    val authEmail = call.jwtEmailClaim()
    val authRole = call.jwtPrincipal()?.payload?.getClaim("role")?.asString()

    logger.info { "[AUTH] JWT claims -> userId=$authUserId, email=$authEmail, role=$authRole, sub=${call.jwtPrincipal()?.payload?.subject}, exp=${call.jwtPrincipal()?.expiresAt}, principalNull=${call.jwtPrincipal() == null}" }

    if (authUserId == null) {
        logger.warn { "[AUTH] REJECTED: no userId in JWT (principal null: ${call.jwtPrincipal() == null})" }
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

fun Route.capteurSolRoutes(service: CapteurSolApplicationService = CapteurSolApplicationService()) {
    authenticate("auth-jwt") {
        route("/wizard") {
            post("/parcelles") {
                val capteurUserId = authenticatedCapteurUserId(call, service) ?: return@post
                try {
                    val body = call.receive<CreateParcelleWizardRequest>()

                    // Si fkUser est fourni dans le body (ex: admin crée pour un client), on l'utilise.
                    // Sinon on utilise l'ID de l'utilisateur connecté (ex: mobile).
                    val targetUserId = body.fkUser ?: capteurUserId
                    logger.info { "[WIZARD] capteurUserId=$capteurUserId body.fkUser=${body.fkUser} targetUserId=$targetUserId" }

                    val plants = body.plants.map { plant ->
                        WizardPlantInput(
                            name = plant.name,
                            type = plant.type,
                            age = plant.age,
                            count = plant.count,
                            waterNeedPerPlant = plant.waterNeedPerPlant,
                        )
                    }

                    val vannes = body.vannes.map { vanne ->
                        WizardVanneInput(
                            name = vanne.name,
                            nbPlants = vanne.nbPlants,
                            debit = vanne.debit,
                        )
                    }

                    val result = service.createParcelleWizard(
                        CreateParcelleWizardInput(
                            nomSurface = body.nomSurface,
                            localisation = body.localisation,
                            typeSol = body.typeSol,
                            fkUser = targetUserId,
                            tailleHa = body.tailleHa,
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
                val isAdmin = call.isAdminJwt()
                val data = service.listParcelles(if (isAdmin) null else capteurUserId)
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
                val isAdmin = call.isAdminJwt()
                val data = service.getParcelleDetails(parcelId, if (isAdmin) null else capteurUserId)
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
                val isAdmin = call.isAdminJwt()
                val body = call.receive<UpdateParcelleRequest>()
                val updated = service.updateParcelle(
                    id = parcelId,
                    ownerUserId = if (isAdmin) null else capteurUserId,
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
                val isAdmin = call.isAdminJwt()
                val deleted = service.deleteParcelle(parcelId, if (isAdmin) null else capteurUserId)
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
                val isAdmin = call.isAdminJwt()
                val data = service.listVannes(parcelId = parcelId, userId = if (isAdmin) null else capteurUserId)
                call.respond(HttpStatusCode.OK, data)
            }

            get("/{id}/plants") {
                val parcelId = call.parameters["id"]?.toLongOrNull()
                    ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid parcelle id"))
                val capteurUserId = authenticatedCapteurUserId(call, service) ?: return@get
                val isAdmin = call.isAdminJwt()
                val ownedParcelle = service.getParcelleDetails(parcelId, if (isAdmin) null else capteurUserId)
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
                val isAdmin = call.isAdminJwt()
                val parcelId = call.request.queryParameters["parcelId"]?.toLongOrNull()
                val data = service.listVannes(parcelId = parcelId, userId = if (isAdmin) null else capteurUserId)
                call.respond(HttpStatusCode.OK, data)
            }

            post {
                val capteurUserId = authenticatedCapteurUserId(call, service) ?: return@post
                val isAdmin = call.isAdminJwt()
                val body = call.receive<CreateVanneRequest>()
                val created = service.createVanne(
                    input = CreateVanneInput(
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
                    ),
                    skipOwnerCheck = isAdmin,
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
                val isAdmin = call.isAdminJwt()
                val body = call.receive<UpdateVanneRequest>()
                val updated = service.updateVanne(
                    id = id,
                    ownerUserId = if (isAdmin) null else capteurUserId,
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
                val isAdmin = call.isAdminJwt()
                val deleted = service.deleteVanne(id, if (isAdmin) null else capteurUserId)
                if (!deleted) {
                    call.respond(HttpStatusCode.NotFound, ErrorResponse("Vanne not found"))
                } else {
                    call.respond(HttpStatusCode.OK, mapOf("message" to "Vanne deleted"))
                }
            }
        }

        // ── Rapports Eau ──────────────────────────────────────────────────────
        route("/rapports/eau") {
            get {
                val capteurUserId = authenticatedCapteurUserId(call, service) ?: return@get
                val isAdmin = call.isAdminJwt()
                val parcelId = call.request.queryParameters["parcelId"]?.toLongOrNull()
                val data = service.listRapportsEau(
                    userId = if (isAdmin) null else capteurUserId,
                    parcelId = parcelId
                )
                call.respond(HttpStatusCode.OK, data)
            }

            get("/{id}") {
                val id = call.parameters["id"]?.toLongOrNull()
                    ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
                val rapport = service.getRapportEauById(id)
                if (rapport == null) call.respond(HttpStatusCode.NotFound, ErrorResponse("Not found"))
                else call.respond(HttpStatusCode.OK, rapport)
            }

            post {
                val capteurUserId = authenticatedCapteurUserId(call, service) ?: return@post
                val b = call.receive<JsonObject>()
                fun d(k: String) = b[k]?.jsonPrimitive?.double ?: 0.0
                fun s(k: String) = b[k]?.jsonPrimitive?.contentOrNull
                val created = service.createRapportEau(CreateRapportEauInput(
                    reportName   = s("reportName") ?: "",
                    parcelId     = b["parcelId"]?.jsonPrimitive?.content?.toLongOrNull() ?: 0L,
                    userId       = capteurUserId,
                    analysisDate = s("analysisDate") ?: java.time.LocalDate.now().toString(),
                    ph = d("ph"), cewDsM = d("cewDsM"), residuSecMgL = d("residuSecMgL"),
                    chloruresMeqL = d("chloruresMeqL"), sulfatesMeqL = d("sulfatesMeqL"),
                    bicarbonatesMeqL = d("bicarbonatesMeqL"), sodiumMeqL = d("sodiumMeqL"),
                    calciumMeqL = d("calciumMeqL"), magnesiumMeqL = d("magnesiumMeqL"),
                    sarRatio = d("sarRatio"), dureteF = d("dureteF"),
                    interpretations = s("interpretations"),
                ))
                call.respond(HttpStatusCode.Created, created)
            }

            delete("/{id}") {
                val id = call.parameters["id"]?.toLongOrNull()
                    ?: return@delete call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
                authenticatedCapteurUserId(call, service) ?: return@delete
                val deleted = service.deleteRapportEau(id)
                if (deleted) call.respond(HttpStatusCode.OK, mapOf("message" to "Deleted"))
                else call.respond(HttpStatusCode.NotFound, ErrorResponse("Not found"))
            }
        }

        // ── Rapports Sol ──────────────────────────────────────────────────────
        route("/rapports/sol") {
            get {
                val capteurUserId = authenticatedCapteurUserId(call, service) ?: return@get
                val isAdmin = call.isAdminJwt()
                val parcelId = call.request.queryParameters["parcelId"]?.toLongOrNull()
                val data = service.listRapportsSol(
                    userId = if (isAdmin) null else capteurUserId,
                    parcelId = parcelId
                )
                call.respond(HttpStatusCode.OK, data)
            }

            get("/{id}") {
                val id = call.parameters["id"]?.toLongOrNull()
                    ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
                val rapport = service.getRapportSolById(id)
                if (rapport == null) call.respond(HttpStatusCode.NotFound, ErrorResponse("Not found"))
                else call.respond(HttpStatusCode.OK, rapport)
            }

            post {
                val capteurUserId = authenticatedCapteurUserId(call, service) ?: return@post
                val b = call.receive<JsonObject>()
                fun d(k: String) = b[k]?.jsonPrimitive?.double ?: 0.0
                fun s(k: String) = b[k]?.jsonPrimitive?.contentOrNull
                val created = service.createRapportSol(CreateRapportSolInput(
                    reportName   = s("reportName") ?: "",
                    parcelId     = b["parcelId"]?.jsonPrimitive?.content?.toLongOrNull() ?: 0L,
                    userId       = capteurUserId,
                    analysisDate = s("analysisDate") ?: java.time.LocalDate.now().toString(),
                    argilePercent = d("argilePercent"), limonPercent = d("limonPercent"),
                    sablePercent = d("sablePercent"), ph = d("ph"), ceDsM = d("ceDsM"),
                    calcaireTotalPercent = d("calcaireTotalPercent"),
                    calcaireActifPercent = d("calcaireActifPercent"),
                    moPercent = d("moPercent"), rapportCn = d("rapportCn"),
                    p2o5Ppm = d("p2o5Ppm"), k2oPpm = d("k2oPpm"), mgoPpm = d("mgoPpm"),
                    cecMeq100g = d("cecMeq100g"), espPercent = d("espPercent"),
                    interpretations = s("interpretations"),
                ))
                call.respond(HttpStatusCode.Created, created)
            }

            delete("/{id}") {
                val id = call.parameters["id"]?.toLongOrNull()
                    ?: return@delete call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid id"))
                authenticatedCapteurUserId(call, service) ?: return@delete
                val deleted = service.deleteRapportSol(id)
                if (deleted) call.respond(HttpStatusCode.OK, mapOf("message" to "Deleted"))
                else call.respond(HttpStatusCode.NotFound, ErrorResponse("Not found"))
            }
        }
    }
}