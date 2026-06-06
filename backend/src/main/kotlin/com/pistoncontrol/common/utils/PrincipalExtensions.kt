package com.pistoncontrol.common.utils

import io.ktor.server.application.ApplicationCall
import io.ktor.server.auth.jwt.JWTPrincipal
import io.ktor.server.auth.principal

fun JWTPrincipal.claimString(name: String): String? =
    payload.getClaim(name)?.asString()?.takeIf { it.isNotBlank() }

fun ApplicationCall.jwtPrincipal(): JWTPrincipal? = principal<JWTPrincipal>()

fun ApplicationCall.jwtUserIdClaim(): String? =
    jwtPrincipal()?.claimString("userId") ?: jwtPrincipal()?.payload?.subject

fun ApplicationCall.jwtEmailClaim(): String? =
    jwtPrincipal()?.claimString("email")

fun ApplicationCall.jwtRoleClaim(): String? =
    jwtPrincipal()?.claimString("role")

fun ApplicationCall.jwtProfileIdClaim(): Long? =
    jwtPrincipal()?.payload?.getClaim("profileId")?.asLong()

fun ApplicationCall.isAdminJwt(): Boolean =
    jwtRoleClaim()?.equals("ADMIN", ignoreCase = true) == true
