package com.CapteurSol.models

import kotlinx.serialization.Serializable

@Serializable
data class RapportSol(
	val id: Long,
	val reportName: String,
	val parcelId: Long,
	val userId: Long,
	val analysisDate: String,
	val argilePercent: Double,
	val limonPercent: Double,
	val sablePercent: Double,
	val ph: Double,
	val ceDsM: Double,
	val calcaireTotalPercent: Double,
	val calcaireActifPercent: Double,
	val moPercent: Double,
	val rapportCn: Double,
	val p2o5Ppm: Double,
	val k2oPpm: Double,
	val mgoPpm: Double,
	val cecMeq100g: Double,
	val espPercent: Double,
	val interpretations: String? = null,
	val createdAt: String,
	val updatedAt: String
)

@Serializable
data class RapportEau(
	val id: Long,
	val reportName: String,
	val parcelId: Long,
	val userId: Long,
	val analysisDate: String,
	val ph: Double,
	val cewDsM: Double,
	val residuSecMgL: Double,
	val chloruresMeqL: Double,
	val sulfatesMeqL: Double,
	val bicarbonatesMeqL: Double,
	val sodiumMeqL: Double,
	val calciumMeqL: Double,
	val magnesiumMeqL: Double,
	val sarRatio: Double,
	val dureteF: Double,
	val interpretations: String? = null,
	val createdAt: String,
	val updatedAt: String
)

@Serializable
data class RapportFile(
	val id: Long,
	val reportType: String,
	val reportId: Long,
	val userId: Long,
	val fileUrl: String,
	val uploadedAt: String
)

@Serializable
data class TypePlante(
	val id: Long,
	val nomPlante: String,
	val typePlante: String,
	val besoinEauParPlante: Double,
	val createdAt: String
)

@Serializable
data class Parcelle(
	val id: Long,
	val nomSurface: String,
	val localisation: String,
	val typeSol: String,
	val fkUser: Long,
	val fkSol: Long? = null,
	val fkClimat: Long? = null,
	val createdAt: String,
	val updatedAt: String,
	val tailleHa: Double
)

@Serializable
data class SolExpo(
	val id: Long,
	val nature: String,
	val humidite: Double,
	val salinite: Double,
	val ph: Double,
	val temperature: Double,
	val dateMesure: String,
	val createdAt: String
)

@Serializable
data class ClimatsExpo(
	val id: Long,
	val temperatureC: Double,
	val humiditeC: Double,
	val vitesseVent: Double,
	val puissanceEnsoleillement: Double,
	val createdAt: String
)

@Serializable
data class Profile(
	val id: Long,
	val userId: Long,
	val firstName: String,
	val lastName: String,
	val avatarUrl: String? = null,
	val createdAt: String,
	val updatedAt: String,
	val userRole: String,
	val phoneNumber: String? = null,
	val location: String? = null,
	val country: String? = null,
	val city: String? = null,
	val dateOfBirth: String? = null,
	val dateDebAbo: String? = null,
	val dateExpAbo: String? = null,
	val typeAbo: String? = null,
	val email: String,
	val createdBy: Long? = null,
	val companyName: String? = null,
	val companyLogo: String? = null
)

@Serializable
data class SubscripNotif(
	val id: Long,
	val clientEmail: String,
	val clientName: String,
	val daysRemaining: Int,
	val sentAt: String,
	val createdAt: String
)

@Serializable
data class Vanne(
    val id: Long,
    val createdAt: String,
    val debit: Double,
    val isAuto: Boolean,
    val isOpen: Boolean,
    val lastAction: String? = null,
    val name: String,
    val nbPlants: Int,
    val parcelId: Long,
    val scheduleDays: List<String>? = null,
    val scheduleEnd: String? = null,
    val scheduleStart: String? = null,
    val updatedAt: String,
    val userId: Long
)
