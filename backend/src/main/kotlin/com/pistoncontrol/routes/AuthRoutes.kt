package com.pistoncontrol.routes

import com.pistoncontrol.services.AuthService
import com.pistoncontrol.services.EmailService
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Route.authRoutes(jwtSecret: String, jwtIssuer: String, jwtAudience: String, emailService: EmailService) {
    val authService = AuthService(jwtSecret, jwtIssuer, jwtAudience, emailService)

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
                    request.password
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
