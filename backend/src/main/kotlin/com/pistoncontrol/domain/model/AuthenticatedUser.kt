package com.pistoncontrol.domain.model

import java.util.UUID

data class AuthenticatedUser(
    val userId: UUID,
    val email: String? = null,
    val role: String? = null,
)
