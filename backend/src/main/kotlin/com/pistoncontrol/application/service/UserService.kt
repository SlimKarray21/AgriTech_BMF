package com.pistoncontrol.application.service

import com.pistoncontrol.infrastructure.persistence.DatabaseFactory.dbQuery
import com.pistoncontrol.infrastructure.persistence.Profiles
import com.pistoncontrol.infrastructure.persistence.Users
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
            Users.join(Profiles, org.jetbrains.exposed.sql.JoinType.LEFT, onColumn = Users.id, otherColumn = Profiles.userId)
                .select { Users.id eq userUuid }
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

            val existingUser = Users.select { Users.id eq userUuid }.singleOrNull()
            if (existingUser == null) return@dbQuery null

            Users.update({ Users.id eq userUuid }) {
                request.firstName?.let { value -> it[firstName] = value }
                request.lastName?.let { value -> it[lastName] = value }
                it[updatedAt] = java.time.Instant.now()
            }

            Profiles.update({ Profiles.userId eq userUuid }) {
                request.phoneNumber?.let { value -> it[Profiles.phoneNumber] = value }
                request.dateOfBirth?.let { value ->
                    it[Profiles.dateOfBirth] = LocalDate.parse(value, dateFormatter)
                }
                request.avatarUrl?.let { value -> it[Profiles.avatarUrl] = value }
                it[Profiles.updatedAt] = java.time.Instant.now()
            }

            logger.info { "Updated profile for user $userId" }

            Users.join(Profiles, org.jetbrains.exposed.sql.JoinType.LEFT, onColumn = Users.id, otherColumn = Profiles.userId)
                .select { Users.id eq userUuid }
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
            id = row[Users.id].toString(),
            email = row[Users.email],
            userRole = row.getOrNull(Profiles.userRole) ?: "CLIENT",
            profileId = row.getOrNull(Profiles.id),
            firstName = row[Users.firstName],
            lastName = row[Users.lastName],
            phoneNumber = row.getOrNull(Profiles.phoneNumber),
            dateOfBirth = row.getOrNull(Profiles.dateOfBirth)?.format(dateFormatter),
            typeAbo = row.getOrNull(Profiles.typeAbo),
            dateDebAbo = row.getOrNull(Profiles.dateDebAbo)?.format(dateFormatter),
            dateExpAbo = row.getOrNull(Profiles.dateExpAbo)?.format(dateFormatter),
            avatarUrl = row.getOrNull(Profiles.avatarUrl)
        )
    }
}
