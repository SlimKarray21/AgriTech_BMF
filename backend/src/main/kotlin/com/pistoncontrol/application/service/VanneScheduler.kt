package com.pistoncontrol.application.service

import com.pistoncontrol.infrastructure.messaging.mqtt.MqttManager
import com.pistoncontrol.infrastructure.persistence.DatabaseFactory.dbQuery
import com.pistoncontrol.infrastructure.persistence.Vannes as VannesTable
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import mu.KotlinLogging
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime

private val logger = KotlinLogging.logger {}

private data class VanneState(
    val id: Long,
    val deviceId: String,
    val piston: Int,
    val isAuto: Boolean,
    val isOpen: Boolean,
    val startMin: Int?,
    val endMin: Int?,
    val days: Set<Int>,
)

/**
 * Automatisation des vannes.
 *
 * Toutes les 30 s, pour chaque vanne en mode auto (is_auto = true) reliée à une
 * carte (device_id + piston_number), calcule si elle DOIT être ouverte
 * maintenant (jour sélectionné + heure dans [start, end]) et publie la commande
 * MQTT uniquement quand l'état change. Réconciliation idempotente : une vanne
 * fermée à la main avant l'heure de démarrage s'ouvrira quand même à l'heure.
 *
 * SÉCURITÉ ANTI-FERMETURE TOTALE : sur une même carte, l'automatisation ne
 * ferme jamais la dernière vanne encore ouverte. Si toutes les vannes sont
 * programmées pour se fermer en même temps, celle dont l'heure de fermeture
 * est la plus tardive (à égalité : le piston le plus haut) reste ouverte de
 * force, puis se ferme dès qu'une autre vanne s'ouvre.
 *
 * Jours : entiers 1..7 (1 = Lundi … 7 = Dimanche), comme envoyés par l'app.
 * Heures : "HH:mm". Fuseau : Africa/Tunis (le backend tourne en UTC).
 */
class VanneScheduler(private val mqttManager: MqttManager) {
    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    private val zone = ZoneId.of("Africa/Tunis")

    fun start() {
        scope.launch {
            while (isActive) {
                runCatching { tick() }.onFailure { logger.error(it) { "Vanne scheduler tick error" } }
                delay(30_000)
            }
        }
        logger.info { "🕒 Vanne auto-scheduler démarré (zone Africa/Tunis, garde anti-fermeture totale)" }
    }

    private fun parseMinutes(v: String?): Int? {
        if (v.isNullOrBlank()) return null
        val parts = v.split(":")
        val h = parts.getOrNull(0)?.trim()?.toIntOrNull() ?: return null
        val m = parts.getOrNull(1)?.trim()?.toIntOrNull() ?: return null
        return h * 60 + m
    }

    /** État voulu par le planning ; les vannes manuelles gardent leur état courant. */
    private fun desiredOpen(v: VanneState, today: Int, nowMin: Int): Boolean {
        if (!v.isAuto || v.startMin == null || v.endMin == null) return v.isOpen
        if (!v.days.contains(today)) return false
        return if (v.endMin > v.startMin)
            nowMin >= v.startMin && nowMin < v.endMin
        else
            nowMin >= v.startMin || nowMin < v.endMin   // plage qui passe minuit
    }

    private suspend fun tick() {
        val now = ZonedDateTime.now(zone)
        val today = now.dayOfWeek.value       // 1 = Lundi … 7 = Dimanche
        val nowMin = now.hour * 60 + now.minute

        // 1. Lire toutes les vannes reliées à une carte (auto ET manuelles :
        //    les manuelles comptent pour la garde "au moins une ouverte").
        val vannes: List<VanneState> = dbQuery {
            VannesTable.select { VannesTable.deviceId.isNotNull() and VannesTable.pistonNumber.isNotNull() }
                .mapNotNull { row ->
                    val dev = row[VannesTable.deviceId] ?: return@mapNotNull null
                    val piston = row[VannesTable.pistonNumber] ?: return@mapNotNull null
                    VanneState(
                        id = row[VannesTable.id],
                        deviceId = dev.toString(),
                        piston = piston,
                        isAuto = row[VannesTable.isAuto],
                        isOpen = row[VannesTable.isOpen],
                        startMin = parseMinutes(row[VannesTable.scheduleStart]),
                        endMin = parseMinutes(row[VannesTable.scheduleEnd]),
                        days = (row[VannesTable.scheduleDays] ?: "")
                            .split(",").mapNotNull { it.trim().toIntOrNull() }.toSet(),
                    )
                }
        }

        // 2. Réconcilier carte par carte pour appliquer la garde de sécurité.
        for ((_, group) in vannes.groupBy { it.deviceId }) {
            val desired = group.associate { it.id to desiredOpen(it, today, nowMin) }
            val toOpen = group.filter { desired.getValue(it.id) && !it.isOpen }
            var toClose = group.filter { !desired.getValue(it.id) && it.isOpen }

            // Garde : si après ce tick plus AUCUNE vanne de la carte ne serait
            // ouverte, on retire de la fermeture celle qui ferme le plus tard.
            val openAfter = group.count { desired.getValue(it.id) }
            if (openAfter == 0 && toClose.isNotEmpty()) {
                val forced = toClose.maxWith(compareBy({ it.endMin ?: -1 }, { it.piston }))
                toClose = toClose.filter { it.id != forced.id }
                logger.info {
                    "[AUTO] 🛡️ Garde sécurité : vanne ${forced.id} (piston ${forced.piston}) " +
                        "reste ouverte — dernière vanne ouverte de la carte ${forced.deviceId}"
                }
            }

            // Ouvertures d'abord pour ne jamais passer par un état tout-fermé.
            for (v in toOpen) applyChange(v, open = true)
            for (v in toClose) applyChange(v, open = false)
        }
    }

    private suspend fun applyChange(v: VanneState, open: Boolean) {
        dbQuery {
            VannesTable.update({ VannesTable.id eq v.id }) {
                it[isOpen] = open
                it[lastAction] = if (open) "auto:open" else "auto:close"
                it[updatedAt] = Instant.now()
            }
        }
        val action = if (open) "activate" else "deactivate"
        logger.info { "[AUTO] Vanne ${v.id} → $action piston ${v.piston} (device ${v.deviceId})" }
        runCatching { mqttManager.publishCommand(v.deviceId, "$action:${v.piston}", useBinary = true) }
            .onFailure { logger.error(it) { "[AUTO] publish échoué vanne ${v.id}" } }
    }
}
