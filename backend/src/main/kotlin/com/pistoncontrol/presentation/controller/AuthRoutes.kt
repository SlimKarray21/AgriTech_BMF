package com.pistoncontrol.presentation.controller

import com.pistoncontrol.application.service.AuthService
import com.pistoncontrol.application.service.EmailService
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Route.authRoutes(jwtSecret: String, jwtIssuer: String, jwtAudience: String, emailService: EmailService) {
    val authService = AuthService(jwtSecret, jwtIssuer, jwtAudience, emailService)
    runCatching { authService.ensureResetSchema() } // crée la table des codes si absente

    route("/auth") {
        // Navigateur = GET : sans ceci, Chrome affiche « HTTP 405 ». L’authentification se fait en POST + JSON.
        get {
            val json = """
                {
                  "service": "Piston Control / AgriTech API",
                  "auth": {
                    "login": { "method": "POST", "path": "/auth/login", "body": { "email": "string", "password": "string" } },
                    "register": { "method": "POST", "path": "/auth/register", "body": { "firstName": "string", "lastName": "string", "email": "string", "phoneNumber": "string", "password": "string" } },
                    "verifyEmail": { "method": "POST", "path": "/auth/verify-email" },
                    "resendCode": { "method": "POST", "path": "/auth/resend-code" }
                  },
                  "health": "GET /health"
                }
            """.trimIndent()
            call.respondText(json, ContentType.Application.Json, HttpStatusCode.OK)
        }

        get("/login") {
            val json = """
                {
                  "message": "Cette URL est une API : le navigateur envoie GET, or la connexion exige POST + JSON.",
                  "method": "POST",
                  "path": "/auth/login",
                  "contentType": "application/json",
                  "bodyExample": { "email": "vous@exemple.com", "password": "votreMotDePasse" }
                }
            """.trimIndent()
            call.respondText(json, ContentType.Application.Json, HttpStatusCode.OK)
        }

        get("/register") {
            val json = """
                {
                  "message": "Inscription : utilisez POST + JSON, pas une simple visite dans le navigateur.",
                  "method": "POST",
                  "path": "/auth/register",
                  "contentType": "application/json",
                  "bodyExample": {
                    "firstName": "Prénom",
                    "lastName": "Nom",
                    "email": "vous@exemple.com",
                    "phoneNumber": "+21600000000",
                    "password": "minimum8caracteres"
                  }
                }
            """.trimIndent()
            call.respondText(json, ContentType.Application.Json, HttpStatusCode.OK)
        }

        post("/register") {
            try {
                val request = call.receive<RegisterRequest>()

                when (val result = authService.register(
                    request.firstName,
                    request.lastName,
                    request.email,
                    request.phoneNumber,
                    request.password,
                    request.createdBy
                )) {
                    is AuthService.AuthResult.Success -> {
                        call.respond(
                            HttpStatusCode.Created,
                            RegisterResponse(
                                result.userId,
                                "Registration successful. Please verify your email with the code sent to your mailbox.",
                            )
                        )
                    }
                    is AuthService.AuthResult.VerificationRequired -> {
                        call.respond(
                            HttpStatusCode.Created,
                            RegisterResponse(
                                userId = result.userId,
                                message = result.message,
                                otpLength = result.otpLength,
                                expiresInMinutes = result.expiresInMinutes,
                                otpCode = result.otpCode,
                            )
                        )
                    }
                    is AuthService.AuthResult.Failure -> {
                        call.respond(
                            HttpStatusCode.fromValue(result.statusCode),
                            ErrorResponse(result.error)
                        )
                    }
                }
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ErrorResponse("Registration failed: ${e.message}")
                )
            }
        }

        post("/login") {
            try {
                val request = call.receive<LoginRequest>()

                when (val result = authService.login(request.email, request.password)) {
                    is AuthService.AuthResult.Success -> {
                        call.respond(
                            HttpStatusCode.OK,
                            LoginResponse(result.token, result.userId, result.role)
                        )
                    }
                    is AuthService.AuthResult.VerificationRequired -> {
                        call.respond(
                            HttpStatusCode.Forbidden,
                            ErrorResponse(
                                error = result.message,
                                message = result.message,
                                userId = result.userId,
                                otpLength = result.otpLength,
                                expiresInMinutes = result.expiresInMinutes,
                            )
                        )
                    }
                    is AuthService.AuthResult.Failure -> {
                        call.respond(
                            HttpStatusCode.fromValue(result.statusCode),
                            ErrorResponse(result.error)
                        )
                    }
                }
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ErrorResponse("Login failed: ${e.message}")
                )
            }
        }

        // Mot de passe oublié : réinitialisation directe (sans email/OTP).
        post("/reset-password") {
            try {
                val request = call.receive<ResetPasswordRequest>()
                when (val result = authService.resetPassword(request.email, request.newPassword)) {
                    is AuthService.AuthResult.VerificationRequired -> {
                        call.respond(HttpStatusCode.OK, mapOf("message" to result.message))
                    }
                    is AuthService.AuthResult.Failure -> {
                        call.respond(HttpStatusCode.fromValue(result.statusCode), ErrorResponse(result.error))
                    }
                    is AuthService.AuthResult.Success -> {
                        call.respond(HttpStatusCode.OK, mapOf("message" to "Mot de passe réinitialisé avec succès."))
                    }
                }
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Reset failed: ${e.message}"))
            }
        }

        // ── Flux OTP « mot de passe oublié » ──
        // Étape 1 : demander un code (envoyé par email)
        post("/forgot-password") {
            try {
                val request = call.receive<ForgotPasswordRequest>()
                when (val result = authService.requestPasswordReset(request.email)) {
                    is AuthService.AuthResult.VerificationRequired ->
                        call.respond(HttpStatusCode.OK, RegisterResponse(userId = "", message = result.message, otpLength = result.otpLength, expiresInMinutes = result.expiresInMinutes))
                    is AuthService.AuthResult.Failure ->
                        call.respond(HttpStatusCode.fromValue(result.statusCode), ErrorResponse(result.error))
                    is AuthService.AuthResult.Success ->
                        call.respond(HttpStatusCode.OK, mapOf("message" to "OK"))
                }
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Forgot-password failed: ${e.message}"))
            }
        }

        // Étape 2 (optionnelle) : vérifier le code
        post("/verify-reset-code") {
            try {
                val request = call.receive<VerifyResetCodeRequest>()
                when (val result = authService.verifyResetCode(request.email, request.code)) {
                    is AuthService.AuthResult.VerificationRequired ->
                        call.respond(HttpStatusCode.OK, mapOf("message" to result.message))
                    is AuthService.AuthResult.Failure ->
                        call.respond(HttpStatusCode.fromValue(result.statusCode), ErrorResponse(result.error))
                    is AuthService.AuthResult.Success ->
                        call.respond(HttpStatusCode.OK, mapOf("message" to "OK"))
                }
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Verify-reset-code failed: ${e.message}"))
            }
        }

        // Étape 3 : confirmer (email + code + nouveau mot de passe)
        post("/reset-password-confirm") {
            try {
                val request = call.receive<ResetPasswordConfirmRequest>()
                when (val result = authService.confirmPasswordReset(request.email, request.code, request.newPassword)) {
                    is AuthService.AuthResult.VerificationRequired ->
                        call.respond(HttpStatusCode.OK, mapOf("message" to result.message))
                    is AuthService.AuthResult.Failure ->
                        call.respond(HttpStatusCode.fromValue(result.statusCode), ErrorResponse(result.error))
                    is AuthService.AuthResult.Success ->
                        call.respond(HttpStatusCode.OK, mapOf("message" to "Mot de passe réinitialisé avec succès."))
                }
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Reset-confirm failed: ${e.message}"))
            }
        }

        post("/verify-email") {
            try {
                val request = call.receive<VerifyEmailRequest>()

                when (val result = authService.verifyEmail(request.userId, request.code)) {
                    is AuthService.AuthResult.Success -> {
                        call.respond(
                            HttpStatusCode.OK,
                            LoginResponse(result.token, result.userId, result.role)
                        )
                    }
                    is AuthService.AuthResult.VerificationRequired -> {
                        call.respond(
                            HttpStatusCode.OK,
                            RegisterResponse(
                                userId = result.userId,
                                message = result.message,
                                otpLength = result.otpLength,
                                expiresInMinutes = result.expiresInMinutes,
                            )
                        )
                    }
                    is AuthService.AuthResult.Failure -> {
                        call.respond(
                            HttpStatusCode.fromValue(result.statusCode),
                            ErrorResponse(result.error)
                        )
                    }
                }
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ErrorResponse("Email verification failed: ${e.message}")
                )
            }
        }

        post("/resend-code") {
            try {
                val request = call.receive<ResendCodeRequest>()

                when (val result = authService.resendVerificationCode(request.userId)) {
                    is AuthService.AuthResult.Success -> {
                        call.respond(
                            HttpStatusCode.OK,
                            LoginResponse(result.token, result.userId, result.role)
                        )
                    }
                    is AuthService.AuthResult.VerificationRequired -> {
                        call.respond(
                            HttpStatusCode.OK,
                            RegisterResponse(
                                userId = result.userId,
                                message = result.message,
                                otpLength = result.otpLength,
                                expiresInMinutes = result.expiresInMinutes,
                            )
                        )
                    }
                    is AuthService.AuthResult.Failure -> {
                        call.respond(
                            HttpStatusCode.fromValue(result.statusCode),
                            ErrorResponse(result.error)
                        )
                    }
                }
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ErrorResponse("Failed to resend code: ${e.message}")
                )
            }
        }
    }
}
