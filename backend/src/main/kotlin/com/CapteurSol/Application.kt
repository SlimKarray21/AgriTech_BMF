package com.CapteurSol

import com.CapteurSol.routes.capteurSolRoutes
import io.ktor.server.application.Application
import io.ktor.server.routing.routing

/**
 * CapteurSol entry module scaffold.
 * Wire routes/plugins here when this domain is implemented.
 */
fun Application.capteurSolModule() {
    routing {
        capteurSolRoutes()
    }
}
