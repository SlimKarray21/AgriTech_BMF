package com.pistoncontrol.application.service

import com.pistoncontrol.domain.model.capteursol.Parcelle
import com.pistoncontrol.domain.model.capteursol.Vanne
import com.pistoncontrol.application.service.capteursol.CapteurSolService
import com.pistoncontrol.application.service.capteursol.CreateParcelleInput
import com.pistoncontrol.application.service.capteursol.CreateParcelleWizardInput
import com.pistoncontrol.application.service.capteursol.CreateRapportEauInput
import com.pistoncontrol.application.service.capteursol.CreateRapportSolInput
import com.pistoncontrol.application.service.capteursol.CreateVanneInput
import com.pistoncontrol.application.service.capteursol.ParcelleDetails
import com.pistoncontrol.application.service.capteursol.UpdateParcelleInput
import com.pistoncontrol.application.service.capteursol.UpdateVanneInput
import com.pistoncontrol.application.service.capteursol.WizardCreateResult
import com.pistoncontrol.application.usecase.ResolveCapteurSolUserUseCase
import com.pistoncontrol.infrastructure.persistence.repository.ExposedCapteurSolRepository
import java.util.UUID

class CapteurSolApplicationService(
    private val delegate: CapteurSolService = CapteurSolService(),
    private val resolveCapteurSolUserUseCase: ResolveCapteurSolUserUseCase =
        ResolveCapteurSolUserUseCase(ExposedCapteurSolRepository(delegate)),
) {
    suspend fun resolveOrCreateCapteurUserId(authUserId: UUID, authEmail: String? = null): Long? =
        resolveCapteurSolUserUseCase(authUserId, authEmail)

    suspend fun listParcelles(userId: Long?): List<Parcelle> = delegate.listParcelles(userId)

    suspend fun createParcelle(input: CreateParcelleInput): Parcelle = delegate.createParcelle(input)

    suspend fun getParcelleDetails(id: Long, userId: Long? = null): ParcelleDetails? =
        delegate.getParcelleDetails(id, userId)

    suspend fun updateParcelle(id: Long, ownerUserId: Long?, input: UpdateParcelleInput): Parcelle? =
        delegate.updateParcelle(id, ownerUserId, input)

    suspend fun deleteParcelle(id: Long, ownerUserId: Long?): Boolean = delegate.deleteParcelle(id, ownerUserId)

    suspend fun listVannes(parcelId: Long? = null, userId: Long? = null): List<Vanne> =
        delegate.listVannes(parcelId, userId)

    suspend fun createVanne(input: CreateVanneInput, skipOwnerCheck: Boolean = false): Vanne? =
        delegate.createVanne(input, skipOwnerCheck)

    suspend fun updateVanne(id: Long, ownerUserId: Long?, input: UpdateVanneInput): Vanne? =
        delegate.updateVanne(id, ownerUserId, input)

    suspend fun deleteVanne(id: Long, ownerUserId: Long?): Boolean = delegate.deleteVanne(id, ownerUserId)

    suspend fun listPlantsByParcelleId(parcelleId: Long): List<com.pistoncontrol.application.service.capteursol.ParcellePlantSummary> =
        delegate.listPlantsByParcelleId(parcelleId)

    suspend fun createParcelleWizard(input: CreateParcelleWizardInput): WizardCreateResult =
        delegate.createParcelleWizard(input)

    suspend fun createRapportEau(input: CreateRapportEauInput) = delegate.createRapportEau(input)

    suspend fun createRapportSol(input: CreateRapportSolInput) = delegate.createRapportSol(input)

    suspend fun listRapportsEau(userId: Long? = null, parcelId: Long? = null) =
        delegate.listRapportsEau(userId, parcelId)

    suspend fun listRapportsSol(userId: Long? = null, parcelId: Long? = null) =
        delegate.listRapportsSol(userId, parcelId)

    suspend fun getRapportEauById(id: Long) = delegate.getRapportEauById(id)

    suspend fun getRapportSolById(id: Long) = delegate.getRapportSolById(id)

    suspend fun deleteRapportEau(id: Long) = delegate.deleteRapportEau(id)

    suspend fun deleteRapportSol(id: Long) = delegate.deleteRapportSol(id)
}