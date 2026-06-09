package com.pistoncontrol.application.service

import com.pistoncontrol.domain.model.AuditLog
import java.util.UUID

/**
 * AuditLogService — NEUTRALISÉ.
 *
 * La table `audit_logs` a été retirée du schéma. Ce service est conservé pour
 * préserver les signatures appelées par les routes admin, mais toutes les
 * opérations sont des no-op : aucune écriture en base, lecture toujours vide.
 */
class AuditLogService {

    /** No-op : la journalisation d'audit est désactivée. */
    @Suppress("UNUSED_PARAMETER")
    suspend fun logAction(
        userId: UUID,
        action: String,
        targetUserId: UUID? = null,
        targetResourceType: String? = null,
        targetResourceId: String? = null,
        details: Map<String, String>? = null,
        ipAddress: String? = null,
        userAgent: String? = null
    ) {
        // intentionnellement vide
    }

    /** Journal d'audit désactivé : toujours vide. */
    @Suppress("UNUSED_PARAMETER")
    suspend fun getAuditLogs(
        limit: Int = 100,
        offset: Long = 0,
        userId: UUID? = null,
        action: String? = null
    ): List<AuditLog> = emptyList()

    /** Journal d'audit désactivé : aucun enregistrement. */
    suspend fun getAuditLogCount(): Long = 0L
}
