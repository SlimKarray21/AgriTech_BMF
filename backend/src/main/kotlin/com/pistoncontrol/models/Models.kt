package com.pistoncontrol.models

import kotlinx.serialization.Serializable
import java.util.UUID

@Serializable
data class User(
    val id: String,
    val email: String,
    val role: String,
    val firstName: String? = null,
    val lastName: String? = null,
    val createdAt: String = "",
    val updatedAt: String = "",
    val userRole: String = "user",
    val phoneNumber: String? = null,
    val dateOfBirth: String? = null,
    val location: String? = null,
    val typeAbo: String? = null,
    val createdBy: Long? = null,
    val companyName: String? = null,
    val companyLogo: String? = null,
    val avatarUrl: String? = null,
    val preferences: String = "{}"
)

@Serializable
data class UserProfileResponse(
    val id: String,
    val email: String,
    val role: String,
    val firstName: String?,
    val lastName: String?,
    val phoneNumber: String?,
    val dateOfBirth: String?,
    val location: String?,
    val typeAbo: String?,
    val dateDebAbo: String?,
    val dateExpAbo: String?,
    val avatarUrl: String?,
    val preferences: String
)

@Serializable
data class UpdateProfileRequest(
    val firstName: String? = null,
    val lastName: String? = null,
    val phoneNumber: String? = null,
    val dateOfBirth: String? = null,
    val location: String? = null,
    val avatarUrl: String? = null
)

@Serializable
data class UpdatePreferencesRequest(
    val preferences: String
)

@Serializable
data class Device(
    val id: String,
    val name: String,
    val ownerId: String,
    val mqttClientId: String,
    val status: String,
    val createdAt: String
)

@Serializable
data class Piston(
    val id: String,
    val deviceId: String,
    val pistonNumber: Int,
    val state: String,
    val lastTriggered: String?
)

@Serializable
data class TelemetryEvent(
    val id: Long,
    val deviceId: String,
    val pistonId: String?,
    val pistonNumber: Int?,
    val eventType: String,
    val payload: String?,
    val createdAt: String
)

@Serializable
data class Schedule(
    val id: String,
    val name: String,
    val deviceId: String,
    val pistonNumber: Int,
    val action: String, // "ACTIVATE" or "DEACTIVATE"
    val cronExpression: String,
    val enabled: Boolean,
    val userId: String,
    val createdAt: String,
    val updatedAt: String
)

@Serializable
data class CreateScheduleRequest(
    val name: String,
    val deviceId: String,
    val pistonNumber: Int,
    val action: String,
    val cronExpression: String,
    val enabled: Boolean = true
)

@Serializable
data class UpdateScheduleRequest(
    val name: String? = null,
    val action: String? = null,
    val cronExpression: String? = null,
    val enabled: Boolean? = null
)

@Serializable
data class AuditLog(
    val id: String,
    val userId: String,
    val userFullName: String? = null,  // First + Last name of admin who performed action
    val action: String,
    val targetUserId: String? = null,
    val targetUserFullName: String? = null,  // First + Last name of target user
    val targetResourceType: String? = null,
    val targetResourceId: String? = null,
    val details: String? = null,
    val ipAddress: String? = null,
    val userAgent: String? = null,
    val createdAt: String
)

@Serializable
data class UpdateUserRoleRequest(
    val role: String
)

@Serializable
data class AdminStatsResponse(
    val totalUsers: Long,
    val totalAdmins: Long,
    val totalDevices: Long,
    val totalSchedules: Long,
    val recentAuditLogs: List<AuditLog>
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
