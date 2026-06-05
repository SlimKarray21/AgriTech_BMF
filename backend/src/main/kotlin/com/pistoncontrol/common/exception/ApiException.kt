package com.pistoncontrol.common.exception

open class ApiException(
    message: String,
    val statusCode: Int = 400,
) : RuntimeException(message)

class ValidationException(message: String) : ApiException(message, 400)

class UnauthorizedException(message: String = "Unauthorized") : ApiException(message, 401)

class NotFoundException(message: String) : ApiException(message, 404)