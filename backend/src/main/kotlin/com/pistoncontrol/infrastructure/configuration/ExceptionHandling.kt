package com.pistoncontrol.infrastructure.configuration

import com.pistoncontrol.common.exception.ApiException
import com.pistoncontrol.common.response.ApiError
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.plugins.statuspages.StatusPages
import io.ktor.server.response.respond
import mu.KotlinLogging

private val logger = KotlinLogging.logger {}

fun Application.configureApiExceptionHandling() {
    install(StatusPages) {
        exception<ApiException> { call, cause ->
            call.respond(HttpStatusCode.fromValue(cause.statusCode), ApiError(error = cause.message ?: "Error", code = cause.statusCode))
        }

        exception<IllegalArgumentException> { call, cause ->
            call.respond(HttpStatusCode.BadRequest, ApiError(error = cause.message ?: "Invalid request", code = 400))
        }

        exception<Throwable> { call, cause ->
            logger.error(cause) { "Unhandled backend error" }
            call.respond(HttpStatusCode.InternalServerError, ApiError(error = "Internal server error", code = 500))
        }
    }
}
