package com.pistoncontrol.domain.repository

import java.util.UUID

interface CapteurSolRepository {
    suspend fun resolveOrCreateCapteurUserId(authUserId: UUID, authEmail: String? = null): Long?
}
