package com.pistoncontrol.application.service

import com.pistoncontrol.infrastructure.persistence.DatabaseFactory.dbQuery
import com.pistoncontrol.infrastructure.persistence.Utilisateur
import com.pistoncontrol.domain.model.*
import org.jetbrains.exposed.sql.*
import mu.KotlinLogging
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.UUID

private val logger = KotlinLogging.logger {}

/**
 * UserService - Centralized User Profile Management Business Logic
 *
 * This service handles all user profile-related operations including:
 * - User profile retrieval
 * - Profile details update with validation
 * - Preferences management with JSON validation
 *
 * All methods return sealed UserResult types for type-safe error handling
 */
class UserService {

    private val dateFormatter = DateTimeFormatter.ISO_LOCAL_DATE

    /**
     * Sealed class for type-safe user operation results
     * Eliminates null checks and provides clear error states
     */
    sealed class UserResult {
        data class Success(val profile: UserProfileResponse) : UserResult()
        data class Failure(val error: String, val statusCode: Int = 400) : UserResult()
    }

    /**
     * Get user profile by user ID
     *
     * @param userId User's UUID
     * @return UserResult.Success with profile, or Failure if not found
     */
    suspend fun getUserById(userId: String): UserResult {
        val userUuid = try { UUID.fromString(userId) } catch (e: Exception) {
            return UserResult.Failure("Invalid user ID", statusCode = 400)
        }
        val profile = dbQuery {
            // users + profiles fusionnés dans "Utilisateur" -> sélection directe
            Utilisateur.select { Utilisateur.userId eq userUuid }
                .singleOrNull()
                ?.let { rowToUserProfile(it) }
        }

        return if (profile != null) {
            UserResult.Success(profile)
        } else {
            UserResult.Failure("User not found", statusCode = 404)
        }
    }

    /**
     * Update user profile details
     *
     * Process:
     * 1. Validate date format if provided
     * 2. Check if user exists
     * 3. Update only provided (non-null) fields
     * 4. Return updated profile
     *
     * @param userId User's UUID
     * @param request Update request with optional fields
     * @return UserResult.Success with updated profile, or Failure with error
     */
    suspend fun updateUserDetails(userId: String, request: UpdateProfileRequest): UserResult {
        // Validate date format if provided
        if (request.dateOfBirth != null) {
            try {
                LocalDate.parse(request.dateOfBirth, dateFormatter)
            } catch (e: Exception) {
                logger.warn { "Invalid date format for dateOfBirth: ${request.dateOfBirth}" }
                return UserResult.Failure(
                    "Invalid date format. Expected ISO format (YYYY-MM-DD)",
                    statusCode = 400
                )
            }
        }

        val updatedProfile = dbQuery {
            val userUuid = UUID.fromString(userId)

            val existingUser = Utilisateur.select { Utilisateur.userId eq userUuid }.singleOrNull()
            if (existingUser == null) return@dbQuery null

            // Une seule table "Utilisateur" : un seul UPDATE pour tous les champs
            Utilisateur.update({ Utilisateur.userId eq userUuid }) {
                request.firstName?.let { value -> it[Utilisateur.firstName] = value }
                request.lastName?.let { value -> it[Utilisateur.lastName] = value }
                request.phoneNumber?.let { value -> it[Utilisateur.phoneNumber] = value }
                request.dateOfBirth?.let { value ->
                    it[Utilisateur.dateOfBirth] = LocalDate.parse(value, dateFormatter)
                }
                request.avatarUrl?.let { value -> it[Utilisateur.avatarUrl] = value }
                it[Utilisateur.updatedAt] = java.time.Instant.now()
            }

            logger.info { "Updated profile for user $userId" }

            Utilisateur.select { Utilisateur.userId eq userUuid }
                .singleOrNull()
                ?.let { rowToUserProfile(it) }
        }

        return if (updatedProfile != null) {
            UserResult.Success(updatedProfile)
        } else {
            UserResult.Failure("User not found", statusCode = 404)
        }
    }

    private fun rowToUserProfile(row: ResultRow): UserProfileResponse {
        return UserProfileResponse(
            id = row[Utilisateur.userId].toString(),
            email = row[Utilisateur.email],
            userRole = row.getOrNull(Utilisateur.userRole) ?: "CLIENT",
            profileId = row.getOrNull(Utilisateur.id),
            firstName = row[Utilisateur.firstName],
            lastName = row[Utilisateur.lastName],
            phoneNumber = row.getOrNull(Utilisateur.phoneNumber),
            dateOfBirth = row.getOrNull(Utilisateur.dateOfBirth)?.format(dateFormatter),
            typeAbo = row.getOrNull(Utilisateur.typeAbo),
            dateDebAbo = row.getOrNull(Utilisateur.dateDebAbo)?.format(dateFormatter),
            dateExpAbo = row.getOrNull(Utilisateur.dateExpAbo)?.format(dateFormatter),
            avatarUrl = row.getOrNull(Utilisateur.avatarUrl)
        )
    }
}
