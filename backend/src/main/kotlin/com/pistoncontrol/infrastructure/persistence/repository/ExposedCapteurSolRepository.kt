package com.pistoncontrol.infrastructure.persistence.repository

import com.pistoncontrol.application.service.capteursol.CapteurSolService
import com.pistoncontrol.domain.repository.CapteurSolRepository
import java.util.UUID

class ExposedCapteurSolRepository(
    private val delegate: CapteurSolService = CapteurSolService(),
) : CapteurSolRepository {
    override suspend fun resolveOrCreateCapteurUserId(authUserId: UUID, authEmail: String?): Long? =
        delegate.resolveOrCreateCapteurUserId(authUserId, authEmail)
}
