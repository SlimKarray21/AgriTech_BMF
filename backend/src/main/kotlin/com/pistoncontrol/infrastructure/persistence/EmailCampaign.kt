package com.pistoncontrol.infrastructure.persistence

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.timestamp

/**
 * Campagne d'email automatique (« Mail automatique »).
 *
 * L'admin définit un mail, une cible (audience), un déclencheur optionnel
 * (abonnement expirant dans X jours) et une fréquence (tous les N jours).
 * Un planificateur envoie le mail aux destinataires correspondants.
 */
object EmailCampaign : Table("email_campaign") {
    val id = long("id").autoIncrement()
    val name = text("name")
    val subject = text("subject")
    val body = text("body")
    // all | client | partenaire | abonnement | nom
    val audience = text("audience")
    // audience = abonnement : filtre par type d'abonnement (type_abo)
    val planName = text("plan_name").nullable()
    // audience = nom : recherche par nom / email
    val searchName = text("search_name").nullable()
    // Restreint aux clients dont date_exp_abo est dans <= X jours (null = ignoré)
    val expiryWithinDays = integer("expiry_within_days").nullable()
    // Envoi automatique tous les N jours
    val frequencyDays = integer("frequency_days").default(4)
    val active = bool("active").default(true)
    val lastSentAt = timestamp("last_sent_at").nullable()
    val createdAt = timestamp("created_at")

    override val primaryKey = PrimaryKey(id)
}
