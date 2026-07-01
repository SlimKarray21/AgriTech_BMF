package com.pistoncontrol.application.service

import com.pistoncontrol.infrastructure.persistence.EmailCampaign
import com.pistoncontrol.infrastructure.persistence.Utilisateur
import mu.KotlinLogging
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.update
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.Instant
import java.time.LocalDate
import java.time.temporal.ChronoUnit

private val logger = KotlinLogging.logger {}

data class Recipient(val email: String, val firstName: String?)

/**
 * Logique métier des campagnes « Mail automatique » :
 * résolution des destinataires, envoi, et planification (tous les N jours).
 */
class EmailCampaignService(private val emailService: EmailService) {

    /** Crée la table si elle n'existe pas (base VM déjà initialisée sans cette table). */
    fun ensureSchema() {
        transaction { SchemaUtils.createMissingTablesAndColumns(EmailCampaign) }
        logger.info { "✅ email_campaign table ensured" }
    }

    /**
     * Résout la liste des destinataires selon la cible d'une campagne.
     * Filtrage fait en mémoire (volumétrie utilisateurs faible côté admin).
     */
    fun resolveRecipients(
        audience: String,
        planName: String?,
        searchName: String?,
        expiryWithinDays: Int?,
    ): List<Recipient> = transaction {
        val today = LocalDate.now()
        Utilisateur.selectAll().mapNotNull { row ->
            val email = row[Utilisateur.email]
            if (email.isBlank()) return@mapNotNull null
            val role = row[Utilisateur.userRole]
            val typeAbo = row[Utilisateur.typeAbo]
            val dateExp = row[Utilisateur.dateExpAbo]
            val first = row[Utilisateur.firstName]
            val last = row[Utilisateur.lastName]

            val audienceOk = when (audience) {
                "client" -> role == "CLIENT"
                "partenaire" -> role == "PARTENAIRE"
                "abonnement" -> role == "CLIENT" && planName != null && typeAbo == planName
                "nom" -> {
                    val q = (searchName ?: "").trim().lowercase()
                    q.isNotEmpty() &&
                        ("$first $last".lowercase().contains(q) || email.lowercase().contains(q))
                }
                else -> true // "all"
            }
            if (!audienceOk) return@mapNotNull null

            // Déclencheur : abonnement expirant dans <= X jours (et pas déjà expiré).
            if (expiryWithinDays != null) {
                if (dateExp == null) return@mapNotNull null
                val limit = today.plusDays(expiryWithinDays.toLong())
                if (dateExp.isBefore(today) || dateExp.isAfter(limit)) return@mapNotNull null
            }

            Recipient(email, first)
        }
    }

    /** Enveloppe le texte de l'admin dans un template HTML AgriTech. */
    private fun wrapHtml(body: String, firstName: String?): String {
        val name = firstName?.takeIf { it.isNotBlank() } ?: "cher client"
        val safeBody = body.replace("{name}", name).replace("\n", "<br/>")
        return """
            <!DOCTYPE html><html><head><meta charset="UTF-8"></head>
            <body style="margin:0;padding:0;background:#f3f7f4;font-family:Arial,sans-serif;color:#1f2937;">
              <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;"><tr><td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
                  <tr><td style="background:linear-gradient(135deg,#1f7a42,#2ea15f);padding:22px;text-align:center;color:#fff;">
                    <div style="font-size:22px;font-weight:700;">AgriTech</div>
                  </td></tr>
                  <tr><td style="padding:24px;font-size:15px;line-height:1.6;">
                    <p style="margin:0 0 12px 0;">Bonjour $name,</p>
                    <div>$safeBody</div>
                  </td></tr>
                  <tr><td style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;text-align:center;">
                    AgriTech — email automatique
                  </td></tr>
                </table>
              </td></tr></table>
            </body></html>
        """.trimIndent()
    }

    /** Envoie immédiatement une campagne à tous ses destinataires. Retourne le nb envoyé. */
    fun sendCampaign(id: Long): Int {
        val row = transaction {
            EmailCampaign.selectAll().firstOrNull { it[EmailCampaign.id] == id }
        } ?: return 0

        val recipients = resolveRecipients(
            row[EmailCampaign.audience],
            row[EmailCampaign.planName],
            row[EmailCampaign.searchName],
            row[EmailCampaign.expiryWithinDays],
        )
        val subject = row[EmailCampaign.subject]
        val body = row[EmailCampaign.body]

        var sent = 0
        recipients.forEach { r ->
            try {
                emailService.sendHtml(r.email, subject, wrapHtml(body, r.firstName))
                sent++
            } catch (e: Exception) {
                logger.error(e) { "Campaign $id: failed to send to ${r.email}" }
            }
        }

        transaction {
            EmailCampaign.update({ EmailCampaign.id eq id }) { it[lastSentAt] = Instant.now() }
        }
        logger.info { "📧 Campaign $id sent to $sent recipient(s)" }
        return sent
    }

    /**
     * Parcourt les campagnes actives et envoie celles qui sont « dues »
     * (jamais envoyées, ou dernier envoi >= frequency_days).
     */
    fun runDue() {
        val now = Instant.now()
        val dueIds = transaction {
            EmailCampaign.selectAll()
                .filter { it[EmailCampaign.active] }
                .filter { row ->
                    val last = row[EmailCampaign.lastSentAt]
                    val freq = row[EmailCampaign.frequencyDays].toLong().coerceAtLeast(1)
                    last == null || ChronoUnit.DAYS.between(last, now) >= freq
                }
                .map { it[EmailCampaign.id] }
        }
        if (dueIds.isNotEmpty()) {
            logger.info { "⏰ ${dueIds.size} email campaign(s) due — sending" }
        }
        dueIds.forEach { id ->
            runCatching { sendCampaign(id) }
                .onFailure { logger.error(it) { "runDue: campaign $id failed" } }
        }
    }
}
