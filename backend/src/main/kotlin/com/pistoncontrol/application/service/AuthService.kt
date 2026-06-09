package com.pistoncontrol.application.service

import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import com.pistoncontrol.infrastructure.persistence.DatabaseFactory.dbQuery
import com.pistoncontrol.infrastructure.persistence.Utilisateur
import mu.KotlinLogging
import org.jetbrains.exposed.sql.*
import org.mindrot.jbcrypt.BCrypt
import java.security.MessageDigest
import java.time.Instant
import java.util.Date
import java.util.UUID

private val logger = KotlinLogging.logger {}

class AuthService(
    private val jwtSecret: String,
    private val jwtIssuer: String,
    private val jwtAudience: String,
    private val emailService: EmailService
) {
    companion object {
        private const val TOKEN_EXPIRY_MS = 86400000L // 24 hours
        private const val MIN_PASSWORD_LENGTH = 8
        private const val DEFAULT_OTP_LENGTH = 6
        private const val DEFAULT_OTP_EXPIRY_MINUTES = 10L
        private const val DEFAULT_MAX_VERIFY_ATTEMPTS = 5
        private const val DEFAULT_MAX_RESEND_PER_HOUR = 3
    }

    private val otpLength: Int = System.getenv("OTP_LENGTH")?.toIntOrNull()?.coerceIn(4, 8) ?: DEFAULT_OTP_LENGTH
    private val otpExpiryMinutes: Long = System.getenv("OTP_EXPIRY_MINUTES")?.toLongOrNull()?.coerceIn(5L, 30L) ?: DEFAULT_OTP_EXPIRY_MINUTES
    private val maxVerifyAttempts: Int = System.getenv("OTP_MAX_VERIFY_ATTEMPTS")?.toIntOrNull()?.coerceIn(3, 10) ?: DEFAULT_MAX_VERIFY_ATTEMPTS
    private val maxResendPerHour: Int = System.getenv("OTP_MAX_RESEND_PER_HOUR")?.toIntOrNull()?.coerceIn(1, 10) ?: DEFAULT_MAX_RESEND_PER_HOUR

    sealed class AuthResult {
        data class Success(val token: String, val userId: String, val role: String) : AuthResult()
        data class VerificationRequired(
            val userId: String,
            val message: String,
            val otpLength: Int,
            val expiresInMinutes: Long,
            val otpCode: String? = null,
        ) : AuthResult()
        data class Failure(val error: String, val statusCode: Int = 400) : AuthResult()
    }

    suspend fun register(firstName: String, lastName: String, email: String, phoneNumber: String, password: String, createdBy: Long? = null): AuthResult {
        if (!isValidEmail(email)) {
            return AuthResult.Failure("Invalid email format")
        }

        val passwordError = validatePassword(password)
        if (passwordError != null) {
            return AuthResult.Failure(passwordError)
        }

        val hashedPassword = hashPassword(password)

        // FUSION users+profiles : une SEULE ligne dans "Utilisateur".
        // On génère l'UUID applicatif (identité d'auth) et on insère tout d'un coup.
        val newUuid = UUID.randomUUID()
        val userId = dbQuery {
            val existingUser = findUserByEmail(email)
            if (existingUser != null) {
                return@dbQuery null
            }

            Utilisateur.insert {
                it[Utilisateur.userId] = newUuid
                it[Utilisateur.email] = email
                it[Utilisateur.passwordHash] = hashedPassword
                it[Utilisateur.emailVerified] = true // OTP désactivé : compte actif directement
                it[Utilisateur.firstName] = firstName
                it[Utilisateur.lastName] = lastName
                it[Utilisateur.phoneNumber] = phoneNumber
                it[Utilisateur.userRole] = "CLIENT"
                it[Utilisateur.createdBy] = createdBy
                it[Utilisateur.createdAt] = Instant.now()
                it[Utilisateur.updatedAt] = Instant.now()
            }
            newUuid
        }

        if (userId == null) {
            return AuthResult.Failure("Email already registered", statusCode = 409)
        }

        // OTP désactivé (table email_verification_codes supprimée) :
        // le compte est créé déjà vérifié, on émet directement un token de session.
        val (role, profileId) = dbQuery {
            val p = Utilisateur.select { Utilisateur.userId eq userId }.singleOrNull()
            Pair(p?.get(Utilisateur.userRole) ?: "CLIENT", p?.get(Utilisateur.id))
        }
        val token = generateToken(userId, role, email, profileId)
        return AuthResult.Success(token, userId.toString(), role)
    }

    suspend fun login(email: String, password: String): AuthResult {
        val user = dbQuery {
            findUserByEmail(email)
        }

        val storedHash = user?.get(Utilisateur.passwordHash)
        if (user == null || storedHash == null || !verifyPassword(password, storedHash)) {
            return AuthResult.Failure("Invalid credentials", statusCode = 401)
        }

        val userId = user[Utilisateur.userId]

        if (!user[Utilisateur.emailVerified]) {
            return AuthResult.VerificationRequired(
                userId.toString(),
                "Email not verified. Please verify your email before logging in.",
                otpLength,
                otpExpiryMinutes,
            )
        }

        val (role, profileId) = dbQuery {
            val p = Utilisateur.select { Utilisateur.userId eq userId }.singleOrNull()
            Pair(p?.get(Utilisateur.userRole) ?: "CLIENT", p?.get(Utilisateur.id))
        }
        val token = generateToken(userId, role, user[Utilisateur.email], profileId)
        return AuthResult.Success(token, userId.toString(), role)
    }

    /**
     * Réinitialisation directe du mot de passe (sans email/OTP).
     * Si l'email existe, le mot de passe est remplacé. Pour ne pas révéler
     * l'existence d'un compte, on renvoie un message générique en cas d'email inconnu.
     */
    suspend fun resetPassword(email: String, newPassword: String): AuthResult {
        if (!isValidEmail(email)) {
            return AuthResult.Failure("Invalid email format", statusCode = 400)
        }
        val passwordError = validatePassword(newPassword)
        if (passwordError != null) {
            return AuthResult.Failure(passwordError, statusCode = 400)
        }

        val hashed = hashPassword(newPassword)
        val updated = dbQuery {
            Utilisateur.update({ Utilisateur.email eq email }) {
                it[passwordHash] = hashed
                it[updatedAt] = Instant.now()
            }
        }

        if (updated == 0) {
            return AuthResult.Failure("Aucun compte associé à cet email.", statusCode = 404)
        }
        // Succès : on réutilise VerificationRequired comme simple porteur de message
        // (pas de token émis : l'utilisateur se reconnecte avec son nouveau mot de passe).
        return AuthResult.VerificationRequired(
            userId = "",
            message = "Mot de passe réinitialisé avec succès.",
            otpLength = 0,
            expiresInMinutes = 0,
        )
    }

    // OTP désactivé (table email_verification_codes supprimée).
    // verifyEmail renvoie succès idempotent : on régénère simplement un token.
    suspend fun verifyEmail(userId: String, code: String): AuthResult {
        val userUuid: UUID = try {
            UUID.fromString(userId)
        } catch (e: IllegalArgumentException) {
            return AuthResult.Failure("Invalid user ID format", statusCode = 400)
        }

        return dbQuery {
            val user = Utilisateur.select { Utilisateur.userId eq userUuid }.singleOrNull()
                ?: return@dbQuery AuthResult.Failure("User not found", statusCode = 404)

            // S'assure que le compte est marqué vérifié (no-op si déjà le cas)
            Utilisateur.update({ Utilisateur.userId eq userUuid }) {
                it[emailVerified] = true
                it[updatedAt] = Instant.now()
            }

            val p = Utilisateur.select { Utilisateur.userId eq userUuid }.singleOrNull()
            val role = p?.get(Utilisateur.userRole) ?: "CLIENT"
            val profileId = p?.get(Utilisateur.id)
            val token = generateToken(userUuid, role, user[Utilisateur.email], profileId)
            AuthResult.Success(token, userId, role)
        }
    }

    // OTP désactivé : plus de renvoi de code.
    suspend fun resendVerificationCode(userId: String): AuthResult {
        return AuthResult.Failure("Email verification is disabled.", statusCode = 410)
    }

    private fun generateToken(userId: UUID, role: String, email: String? = null, profileId: Long? = null): String {
        val builder = JWT.create()
            .withAudience(jwtAudience)
            .withIssuer(jwtIssuer)
            .withSubject(userId.toString())
            .withClaim("userId", userId.toString())
            .withClaim("role", role)
            .withClaim("email", email)
            .withExpiresAt(Date(System.currentTimeMillis() + TOKEN_EXPIRY_MS))
        if (profileId != null) builder.withClaim("profileId", profileId)
        return builder.sign(Algorithm.HMAC256(jwtSecret))
    }

    private fun hashPassword(plaintext: String): String {
        return BCrypt.hashpw(plaintext, BCrypt.gensalt())
    }

    private fun verifyPassword(plaintext: String, hash: String): Boolean {
        return BCrypt.checkpw(plaintext, hash)
    }

    private fun findUserByEmail(email: String): ResultRow? {
        return Utilisateur.select { Utilisateur.email eq email }.singleOrNull()
    }

    private fun isValidEmail(email: String): Boolean {
        return email.contains("@")
    }

    private fun validatePassword(password: String): String? {
        if (password.length < MIN_PASSWORD_LENGTH) {
            return "Password must be at least $MIN_PASSWORD_LENGTH characters"
        }
        if (!password.any { it.isDigit() }) {
            return "Password must contain at least one digit"
        }
        if (!password.any { it.isUpperCase() }) {
            return "Password must contain at least one uppercase letter"
        }
        if (!password.any { it.isLowerCase() }) {
            return "Password must contain at least one lowercase letter"
        }
        return null
    }
}
