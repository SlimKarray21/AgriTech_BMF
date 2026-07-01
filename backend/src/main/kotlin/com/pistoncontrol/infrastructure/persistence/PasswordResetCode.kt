package com.pistoncontrol.infrastructure.persistence

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.timestamp

/** Code OTP de réinitialisation de mot de passe (envoyé par email). */
object PasswordResetCode : Table("password_reset_code") {
    val id = long("id").autoIncrement()
    val email = text("email")
    val code = text("code")
    val expiresAt = timestamp("expires_at")
    val createdAt = timestamp("created_at")

    override val primaryKey = PrimaryKey(id)
}
