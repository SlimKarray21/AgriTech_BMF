package com.pistoncontrol.common.response

import kotlinx.serialization.Serializable

@Serializable
data class ApiResponse<T>(
    val success: Boolean = true,
    val data: T? = null,
    val message: String? = null,
)

@Serializable
data class ApiError(
    val success: Boolean = false,
    val error: String,
    val message: String? = null,
    val code: Int? = null,
)
