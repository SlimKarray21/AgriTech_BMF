package com.pistoncontrol.application.usecase

import com.pistoncontrol.domain.repository.CapteurSolRepository
import java.util.UUID

class ResolveCapteurSolUserUseCase(
    private val repository: CapteurSolRepository,
) {
    suspend operator fun invoke(authUserId: UUID, authEmail: String? = null): Long? =
        repository.resolveOrCreateCapteurUserId(authUserId, authEmail)
}
