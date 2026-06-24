package com.pistoncontrol.presentation.dto.capteursol

import kotlinx.serialization.Serializable

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
    val userId: Long? = null,
    val debit: Double = 0.0,
    val isAuto: Boolean = false,
    val isOpen: Boolean = false,
    val lastAction: String? = null,
    val nbPlants: Int = 0,
    val scheduleDays: List<String>? = null,
    val scheduleStart: String? = null,
    val scheduleEnd: String? = null,
    val deviceId: String? = null,
    val pistonNumber: Int? = null,
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
    val deviceId: String? = null,
    val pistonNumber: Int? = null,
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
