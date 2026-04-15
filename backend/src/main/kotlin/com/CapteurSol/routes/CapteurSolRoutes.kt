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
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.patch
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import kotlinx.serialization.Serializable

@Serializable
data class CreateParcelleRequest(
    val nomSurface: String,
    val localisation: String,
    val typeSol: String,
    val fkUser: Long,
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
    val name: String,
    val type: String,
    val age: Int,
    val count: Int,
    val waterNeedPerPlant: Double,
)

@Serializable
data class WizardVanneRequest(
    val name: String,
    val nbPlants: Int = 0,
    val debit: Double = 0.0,
)

@Serializable
data class CreateParcelleWizardRequest(
    val nomSurface: String,
    val localisation: String,
    val typeSol: String,
    val fkUser: Long,
    val tailleHa: Double,
    val plants: List<WizardPlantRequest>,
    val vannes: List<WizardVanneRequest>,
)

fun Route.capteurSolRoutes(service: CapteurSolService = CapteurSolService()) {
    route("/wizard") {
        post("/parcelles") {
            val body = call.receive<CreateParcelleWizardRequest>()
            val result = service.createParcelleWizard(
                CreateParcelleWizardInput(
                    nomSurface = body.nomSurface,
                    localisation = body.localisation,
                    typeSol = body.typeSol,
                    fkUser = body.fkUser,
                    tailleHa = body.tailleHa,
                    plants = body.plants.map {
                        WizardPlantInput(
                            name = it.name,
                            type = it.type,
                            age = it.age,
                            count = it.count,
                            waterNeedPerPlant = it.waterNeedPerPlant,
                        )
                    },
                    vannes = body.vannes.map {
                        WizardVanneInput(
                            name = it.name,
                            nbPlants = it.nbPlants,
                            debit = it.debit,
                        )
                    },
                )
            )
            call.respond(HttpStatusCode.Created, result)
        }
    }

    route("/parcelles") {
        get {
            val userId = call.request.queryParameters["userId"]?.toLongOrNull()
            val data = service.listParcelles(userId)
            call.respond(HttpStatusCode.OK, data)
        }

        post {
            val body = call.receive<CreateParcelleRequest>()
            val created = service.createParcelle(
                CreateParcelleInput(
                    nomSurface = body.nomSurface,
                    localisation = body.localisation,
                    typeSol = body.typeSol,
                    fkUser = body.fkUser,
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
            val userId = call.request.queryParameters["userId"]?.toLongOrNull()
            val data = service.getParcelleDetails(parcelId, userId)
            if (data == null) {
                call.respond(HttpStatusCode.NotFound, ErrorResponse("Parcelle not found"))
            } else {
                call.respond(HttpStatusCode.OK, data)
            }
        }

        patch("/{id}") {
            val parcelId = call.parameters["id"]?.toLongOrNull()
                ?: return@patch call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid parcelle id"))
            val body = call.receive<UpdateParcelleRequest>()
            val updated = service.updateParcelle(
                id = parcelId,
                input = UpdateParcelleInput(
                    nomSurface = body.nomSurface,
                    localisation = body.localisation,
                    typeSol = body.typeSol,
                    fkUser = body.fkUser,
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
            val deleted = service.deleteParcelle(parcelId)
            if (!deleted) {
                call.respond(HttpStatusCode.NotFound, ErrorResponse("Parcelle not found"))
            } else {
                call.respond(HttpStatusCode.OK, mapOf("message" to "Parcelle deleted"))
            }
        }

        get("/{id}/vannes") {
            val parcelId = call.parameters["id"]?.toLongOrNull()
                ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid parcelle id"))
            val data = service.listVannes(parcelId = parcelId, userId = null)
            call.respond(HttpStatusCode.OK, data)
        }

        get("/{id}/plants") {
            val parcelId = call.parameters["id"]?.toLongOrNull()
                ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid parcelle id"))
            val data = service.listPlantsByParcelleId(parcelId)
            call.respond(HttpStatusCode.OK, data)
        }
    }

    route("/vannes") {
        get {
            val parcelId = call.request.queryParameters["parcelId"]?.toLongOrNull()
            val userId = call.request.queryParameters["userId"]?.toLongOrNull()
            val data = service.listVannes(parcelId = parcelId, userId = userId)
            call.respond(HttpStatusCode.OK, data)
        }

        post {
            val body = call.receive<CreateVanneRequest>()
            val created = service.createVanne(
                CreateVanneInput(
                    name = body.name,
                    parcelId = body.parcelId,
                    userId = body.userId,
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
            call.respond(HttpStatusCode.Created, created)
        }

        patch("/{id}") {
            val id = call.parameters["id"]?.toLongOrNull()
                ?: return@patch call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid vanne id"))
            val body = call.receive<UpdateVanneRequest>()
            val updated = service.updateVanne(
                id = id,
                input = UpdateVanneInput(
                    name = body.name,
                    parcelId = body.parcelId,
                    userId = body.userId,
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
            val deleted = service.deleteVanne(id)
            if (!deleted) {
                call.respond(HttpStatusCode.NotFound, ErrorResponse("Vanne not found"))
            } else {
                call.respond(HttpStatusCode.OK, mapOf("message" to "Vanne deleted"))
            }
        }
    }
}
