package com.pistoncontrol.plugins

import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import io.ktor.http.*
import io.ktor.http.auth.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.auth.jwt.*
import io.ktor.server.response.*
import kotlinx.serialization.Serializable

@Serializable
data class UnauthorizedResponse(val error: String)

fun Application.configureSecurity() {
    val jwtSecret = environment.config.property("jwt.secret").getString()
    val jwtIssuer = environment.config.property("jwt.issuer").getString()
    val jwtAudience = environment.config.property("jwt.audience").getString()
    val jwtRealm = "Piston Control"
    val algorithm = Algorithm.HMAC256(jwtSecret)

    // Temporary testing mode: if DISABLE_AUTH=true, protected routes remain accessible
    // by injecting a signed test JWT when no/invalid header is provided.
    val disableAuth = (System.getenv("DISABLE_AUTH") ?: "false").toBooleanStrictOrNull() == true
    val testUserId = System.getenv("TEST_AUTH_USER_ID") ?: "00000000-0000-0000-0000-000000000001"
    val testEmail = System.getenv("TEST_AUTH_EMAIL") ?: "admin@test.local"
    val testAuthToken = JWT.create()
        .withAudience(jwtAudience)
        .withIssuer(jwtIssuer)
        .withClaim("userId", testUserId)
        .withClaim("role", "admin")
        .withClaim("email", testEmail)
        .sign(algorithm)

    install(Authentication) {
        // Standard JWT authentication for all authenticated users
        jwt("auth-jwt") {
            realm = jwtRealm
            if (disableAuth) {
                authHeader {
                    HttpAuthHeader.Single("Bearer", testAuthToken)
                }
            }
            verifier(
                JWT.require(algorithm)
                    .withAudience(jwtAudience)
                    .withIssuer(jwtIssuer)
                    .build()
            )
            validate { credential ->
                val userId = credential.payload.getClaim("userId").asString() ?: credential.payload.subject
                if (userId != null) {
                    JWTPrincipal(credential.payload)
                } else null
            }
            challenge { _, _ ->
                call.respond(
                    HttpStatusCode.Unauthorized,
                    UnauthorizedResponse("Token missing or invalid. Please login again.")
                )
            }
        }

        // Admin-only JWT authentication
        jwt("admin-jwt") {
            realm = jwtRealm
            if (disableAuth) {
                authHeader {
                    HttpAuthHeader.Single("Bearer", testAuthToken)
                }
            }
            verifier(
                JWT.require(algorithm)
                    .withAudience(jwtAudience)
                    .withIssuer(jwtIssuer)
                    .build()
            )
            validate { credential ->
                val userId = credential.payload.getClaim("userId").asString() ?: credential.payload.subject
                val role = credential.payload.getClaim("role").asString()

                if (userId != null && role == "admin") {
                    JWTPrincipal(credential.payload)
                } else null
            }
            challenge { _, _ ->
                call.respond(
                    HttpStatusCode.Forbidden,
                    UnauthorizedResponse("Admin access required")
                )
            }
        }
    }
}
