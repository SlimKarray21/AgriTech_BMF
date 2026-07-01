package com.pistoncontrol.presentation.controller

import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(
    val email: String,
    val password: String
)

@Serializable
data class RegisterRequest(
    val firstName: String,
    val lastName: String,
    val email: String,
    val phoneNumber: String,
    val password: String,
    val createdBy: Long? = null
)

@Serializable
data class LoginResponse(
    val token: String,
    val userId: String,
    val role: String? = null,
)

@Serializable
data class ErrorResponse(
    val error: String? = null,
    val message: String? = null,
    /** Présent quand la connexion est refusée tant que l’e-mail n’est pas vérifié (ex. 403). */
    val userId: String? = null,
    val otpLength: Int? = null,
    val expiresInMinutes: Long? = null,
) {
    constructor(errorMessage: String) : this(error = errorMessage, message = errorMessage, userId = null, otpLength = null, expiresInMinutes = null)
}

@Serializable
data class ResetPasswordRequest(val email: String, val newPassword: String)

// Flux OTP « mot de passe oublié » : email → code → nouveau mot de passe.
@Serializable
data class ForgotPasswordRequest(val email: String)

@Serializable
data class VerifyResetCodeRequest(val email: String, val code: String)

@Serializable
data class ResetPasswordConfirmRequest(val email: String, val code: String, val newPassword: String)

@Serializable
data class VerifyEmailRequest(val userId: String, val code: String)

@Serializable
data class ResendCodeRequest(val userId: String)

@Serializable
data class RegisterResponse(
    val userId: String,
    val message: String,
    val otpLength: Int? = null,
    val expiresInMinutes: Long? = null,
    val otpCode: String? = null,
)

@Serializable
data class PistonCommand(
    val action: String
)

@Serializable
data class CommandResponse(
    val success: Boolean,
    val message: String,
    val deviceId: String,
    val pistonNumber: Int,
    val action: String
)

@Serializable
data class CreateDeviceRequest(
    val name: String,
    val mqttClientId: String
)

@Serializable
data class DeviceResponse(
    val id: String,
    val name: String,
    val mqttClientId: String,
    val status: String
)

@Serializable
data class PistonResponse(
    val piston_number: Int,
    val state: String,
    val last_triggered: String?
)

@Serializable
data class DeviceWithPistonsResponse(
    val id: String,
    val name: String,
    val device_id: String,  // Maps to mqttClientId, matches mobile expectations
    val status: String,
    val last_seen: String? = null,  // TODO: implement timestamp tracking
    val pistons: List<PistonResponse>
)

@Serializable
data class DevicesListResponse(
    val devices: List<DeviceWithPistonsResponse>
)

@Serializable
data class PistonControlResponse(
    val message: String,
    val piston: PistonWithIdResponse
)

@Serializable
data class PistonWithIdResponse(
    val id: String,
    val piston_number: Int,
    val state: String,
    val last_triggered: String?
)

@Serializable
data class DeviceStatsResponse(
    val deviceId: String,
    val deviceName: String,
    val status: String,
    val activePistons: Int,
    val totalPistons: Int,
    val totalEvents: Long,
    val lastActivity: String?
)

@Serializable
data class TelemetryEventResponse(
    val id: Long,
    val deviceId: String,
    val pistonId: String?,
    val eventType: String,
    val payload: String?,
    val createdAt: String
)

@Serializable
data class TelemetryListResponse(
    val telemetry: List<TelemetryEventResponse>
)
