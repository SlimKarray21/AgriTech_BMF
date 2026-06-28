package com.pistoncontrol.application.service.capteursol

import com.pistoncontrol.domain.model.capteursol.Parcelle
import com.pistoncontrol.domain.model.capteursol.RapportEau
import com.pistoncontrol.domain.model.capteursol.RapportSol
import com.pistoncontrol.domain.model.capteursol.Vanne
import com.pistoncontrol.infrastructure.persistence.ParcellePlantes as ParcellePlantesTable
import com.pistoncontrol.infrastructure.persistence.Parcelle as ParcelleTable
import com.pistoncontrol.infrastructure.persistence.Plantes as PlantesTable
import com.pistoncontrol.infrastructure.persistence.RapportEau as RapportEauTable
import com.pistoncontrol.infrastructure.persistence.RapportSol as RapportSolTable
import com.pistoncontrol.infrastructure.persistence.Vannes as VannesTable
import com.pistoncontrol.infrastructure.persistence.Utilisateur as UtilisateurTable
import com.pistoncontrol.infrastructure.persistence.DatabaseFactory
import com.pistoncontrol.infrastructure.messaging.mqtt.MqttManager
import kotlinx.serialization.Serializable
import mu.KotlinLogging
import org.jetbrains.exposed.sql.ResultRow
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.select
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.update
import org.jetbrains.exposed.sql.and
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

private val logger = KotlinLogging.logger {}

data class CreateParcelleInput(
    val nomSurface: String,
    val localisation: String,
    val typeSol: String,
    val fkUser: Long,
    val fkSol: Long? = null,
    val fkClimat: Long? = null,
    val tailleHa: Double,
)

data class UpdateParcelleInput(
    val nomSurface: String? = null,
    val localisation: String? = null,
    val typeSol: String? = null,
    val fkUser: Long? = null,
    val fkSol: Long? = null,
    val fkClimat: Long? = null,
    val tailleHa: Double? = null,
)

data class CreateVanneInput(
    val name: String,
    val parcelId: Long,
    val userId: Long,
    val debit: Double = 0.0,
    val isAuto: Boolean = false,
    val isOpen: Boolean = false,
    val lastAction: String? = null,
    val nbPlants: Int = 0,
    val scheduleDays: List<String>? = null,
    val scheduleStart: String? = null,
    val scheduleEnd: String? = null,
    val deviceId: UUID? = null,
    val pistonNumber: Int? = null,
)

data class UpdateVanneInput(
    val name: String? = null,
    val parcelId: Long? = null,
    val userId: Long? = null,
    val debit: Double? = null,
    val isAuto: Boolean? = null,
    val isOpen: Boolean? = null,
    val lastAction: String? = null,
    val nbPlants: Int? = null,
    val scheduleDays: List<String>? = null,
    val scheduleStart: String? = null,
    val scheduleEnd: String? = null,
    val deviceId: UUID? = null,
    val pistonNumber: Int? = null,
)

data class WizardPlantInput(
    val name: String,
    val type: String,
    val age: Int,
    val count: Int,
    val waterNeedPerPlant: Double,
)

data class WizardVanneInput(
    val name: String,
    val nbPlants: Int = 0,
    val debit: Double = 0.0,
)

data class CreateParcelleWizardInput(
    val nomSurface: String,
    val localisation: String,
    val typeSol: String,
    val fkUser: Long,
    val tailleHa: Double,
    val plants: List<WizardPlantInput>,
    val vannes: List<WizardVanneInput>,
)

data class CreateRapportEauInput(
    val reportName: String,
    val parcelId: Long,
    val userId: Long,
    val analysisDate: String,
    val ph: Double = 0.0,
    val cewDsM: Double = 0.0,
    val residuSecMgL: Double = 0.0,
    val chloruresMeqL: Double = 0.0,
    val sulfatesMeqL: Double = 0.0,
    val bicarbonatesMeqL: Double = 0.0,
    val sodiumMeqL: Double = 0.0,
    val calciumMeqL: Double = 0.0,
    val magnesiumMeqL: Double = 0.0,
    val sarRatio: Double = 0.0,
    val dureteF: Double = 0.0,
    val interpretations: String? = null,
)

data class CreateRapportSolInput(
    val reportName: String,
    val parcelId: Long,
    val userId: Long,
    val analysisDate: String,
    val argilePercent: Double = 0.0,
    val limonPercent: Double = 0.0,
    val sablePercent: Double = 0.0,
    val ph: Double = 0.0,
    val ceDsM: Double = 0.0,
    val calcaireTotalPercent: Double = 0.0,
    val calcaireActifPercent: Double = 0.0,
    val moPercent: Double = 0.0,
    val rapportCn: Double = 0.0,
    val p2o5Ppm: Double = 0.0,
    val k2oPpm: Double = 0.0,
    val mgoPpm: Double = 0.0,
    val cecMeq100g: Double = 0.0,
    val espPercent: Double = 0.0,
    val interpretations: String? = null,
)

@Serializable
data class WizardCreateResult(
    val parcelle: Parcelle,
    val plantesCreated: Int,
    val vannesCreated: Int,
)

@Serializable
data class ParcellePlantSummary(
    val id: Long,
    val name: String,
    val type: String,
    val age: Int,
    val count: Int,
    val waterNeedPerPlant: Double,
)

@Serializable
data class ParcelleDetails(
    val parcelle: Parcelle,
    val culture: String,
    val status: String,
    val plants: List<ParcellePlantSummary>,
    val vannes: List<Vanne>,
)

class CapteurSolService(private val mqttManager: MqttManager? = null) {
    suspend fun resolveOrCreateCapteurUserId(authUserId: UUID, authEmail: String? = null): Long? = DatabaseFactory.dbQuery {
        logger.info { "[resolveUser] START authUserId=$authUserId, authEmail=$authEmail" }

        // Step 1: Look up the auth user in the 'users' table by UUID
        val authUser = try {
            UtilisateurTable.select { UtilisateurTable.userId eq authUserId }.singleOrNull()
        } catch (e: Exception) {
            logger.error(e) { "[resolveUser] FAILED to query users table for authUserId=$authUserId" }
            null
        }
        logger.info { "[resolveUser] users table lookup: found=${authUser != null}" }

        // Step 2: Resolve email — prefer DB value, fall back to JWT claim
        val email = authUser?.get(UtilisateurTable.email) ?: authEmail
        logger.info { "[resolveUser] resolved email=$email (fromDB=${authUser?.get(UtilisateurTable.email)}, fromJWT=$authEmail)" }

        if (email.isNullOrBlank()) {
            logger.warn { "[resolveUser] ABORT: email is null/blank – cannot resolve CapteurSol user" }
            return@dbQuery null
        }

        // Step 3: Look up existing profile by email
        val existingProfile = try {
            UtilisateurTable
                .slice(UtilisateurTable.id)
                .select { UtilisateurTable.email eq email }
                .singleOrNull()
        } catch (e: Exception) {
            logger.error(e) { "[resolveUser] FAILED to query profiles table for email=$email" }
            null
        }

        if (existingProfile != null) {
            val profileId = existingProfile[UtilisateurTable.id]
            logger.info { "[resolveUser] OK: found existing profile id=$profileId for email=$email" }
            return@dbQuery profileId
        }

        // Step 4: No profile found — after migration all profiles are created at registration
        logger.warn { "[resolveUser] no profile found for email=$email – user may need to re-register" }
        null
    }

    suspend fun listParcelles(userId: Long?): List<Parcelle> = DatabaseFactory.dbQuery {
        val query = if (userId != null) {
            ParcelleTable.select { ParcelleTable.fkUser eq userId }
        } else {
            ParcelleTable.selectAll()
        }
        query.map(::toParcelle)
    }

    // Parcelles visibles par un partenaire : les siennes + celles de ses clients (profiles.created_by = partenaire).
    suspend fun listParcellesForPartenaire(partenaireProfileId: Long): List<Parcelle> = DatabaseFactory.dbQuery {
        ParcelleTable.select { ParcelleTable.fkUser inList partenaireScopeIds(partenaireProfileId) }.map(::toParcelle)
    }

    // IDs des profils gérés par un partenaire : lui-même + ses clients (profiles.created_by = partenaire).
    private fun partenaireScopeIds(partenaireProfileId: Long): List<Long> {
        val clientIds = UtilisateurTable
            .slice(UtilisateurTable.id)
            .select { UtilisateurTable.createdBy eq partenaireProfileId }
            .map { it[UtilisateurTable.id] }
        return (clientIds + partenaireProfileId).distinct()
    }

    // Vrai si la parcelle appartient au périmètre du partenaire (lui ou un de ses clients).
    suspend fun isParcelleInPartenaireScope(parcelId: Long, partenaireProfileId: Long): Boolean = DatabaseFactory.dbQuery {
        val scope = partenaireScopeIds(partenaireProfileId)
        ParcelleTable
            .select { (ParcelleTable.id eq parcelId) and (ParcelleTable.fkUser inList scope) }
            .limit(1)
            .any()
    }

    suspend fun createParcelle(input: CreateParcelleInput): Parcelle = DatabaseFactory.dbQuery {
        val now = Instant.now()
        val id = ParcelleTable.insert {
            it[nomSurface] = input.nomSurface
            it[localisation] = input.localisation
            it[typeSol] = input.typeSol
            it[fkUser] = input.fkUser
            it[fkSol] = input.fkSol
            it[fkClimat] = input.fkClimat
            it[tailleHa] = input.tailleHa
            it[createdAt] = now
            it[updatedAt] = now
        } get ParcelleTable.id

        toParcelle(
            ParcelleTable.select { ParcelleTable.id eq id }.single()
        )
    }

    suspend fun getParcelleById(id: Long): Parcelle? = DatabaseFactory.dbQuery {
        ParcelleTable.select { ParcelleTable.id eq id }
            .singleOrNull()
            ?.let(::toParcelle)
    }

    suspend fun getParcelleDetails(id: Long, userId: Long? = null): ParcelleDetails? {
        val parcelleRow = DatabaseFactory.dbQuery {
            if (userId != null) {
                ParcelleTable.select { (ParcelleTable.id eq id) and (ParcelleTable.fkUser eq userId) }.singleOrNull()
            } else {
                ParcelleTable.select { ParcelleTable.id eq id }.singleOrNull()
            }
        } ?: return null

        val parcelle = toParcelle(parcelleRow)
        val plants = listPlantsByParcelleId(id)
        val vannes = listVannes(parcelId = id, userId = userId)

        val culture = plants.firstOrNull()?.name ?: "-"
        // A parcelle is connected only when linked to soil/climate data sources.
        // Having configured valves alone should not mark it as connected.
        val status = if (parcelle.fkSol != null || parcelle.fkClimat != null) {
            "connecté"
        } else {
            "non connecté"
        }

        return ParcelleDetails(
            parcelle = parcelle,
            culture = culture,
            status = status,
            plants = plants,
            vannes = vannes,
        )
    }

    suspend fun updateParcelle(id: Long, ownerUserId: Long?, input: UpdateParcelleInput): Parcelle? = DatabaseFactory.dbQuery {
        val now = Instant.now()
        val condition = if (ownerUserId != null)
            (ParcelleTable.id eq id) and (ParcelleTable.fkUser eq ownerUserId)
        else
            ParcelleTable.id eq id
        val updatedRows = ParcelleTable.update({ condition }) {
            input.nomSurface?.let { value -> it[nomSurface] = value }
            input.localisation?.let { value -> it[localisation] = value }
            input.typeSol?.let { value -> it[typeSol] = value }
            input.fkSol?.let { value -> it[fkSol] = value }
            input.fkClimat?.let { value -> it[fkClimat] = value }
            input.tailleHa?.let { value -> it[tailleHa] = value }
            it[updatedAt] = now
        }

        if (updatedRows == 0) return@dbQuery null
        val fetchCond = if (ownerUserId != null)
            (ParcelleTable.id eq id) and (ParcelleTable.fkUser eq ownerUserId)
        else
            ParcelleTable.id eq id
        ParcelleTable.select { fetchCond }.singleOrNull()?.let(::toParcelle)
    }

    suspend fun deleteParcelle(id: Long, ownerUserId: Long?): Boolean = DatabaseFactory.dbQuery {
        val checkCond = if (ownerUserId != null)
            (ParcelleTable.id eq id) and (ParcelleTable.fkUser eq ownerUserId)
        else
            ParcelleTable.id eq id
        val ownedParcelleExists = ParcelleTable
            .select { checkCond }
            .limit(1)
            .any()

        if (!ownedParcelleExists) {
            return@dbQuery false
        }

        val linkedPlantIds = ParcellePlantesTable
            .slice(ParcellePlantesTable.planteId)
            .select { ParcellePlantesTable.parcelleId eq id }
            .map { it[ParcellePlantesTable.planteId] }

        VannesTable.deleteWhere { VannesTable.parcelId eq id }
        ParcellePlantesTable.deleteWhere { ParcellePlantesTable.parcelleId eq id }
        val deletedParcelle = ParcelleTable.deleteWhere { ParcelleTable.id eq id } > 0

        // Remove orphan plants no longer linked to any parcelle.
        linkedPlantIds.forEach { plantId ->
            val isStillLinked = ParcellePlantesTable
                .select { ParcellePlantesTable.planteId eq plantId }
                .limit(1)
                .any()
            if (!isStillLinked) {
                PlantesTable.deleteWhere { PlantesTable.id eq plantId }
            }
        }

        deletedParcelle
    }

    suspend fun listVannes(parcelId: Long?, userId: Long?): List<Vanne> = DatabaseFactory.dbQuery {
        val query = when {
            parcelId != null && userId != null ->
                VannesTable.select { (VannesTable.parcelId eq parcelId) and (VannesTable.userId eq userId) }
            parcelId != null ->
                VannesTable.select { VannesTable.parcelId eq parcelId }
            userId != null ->
                VannesTable.select { VannesTable.userId eq userId }
            else -> VannesTable.selectAll()
        }
        query.map(::toVanne)
    }

    suspend fun createVanne(input: CreateVanneInput, skipOwnerCheck: Boolean = false): Vanne? = DatabaseFactory.dbQuery {
        if (!skipOwnerCheck) {
            val ownedParcelleExists = ParcelleTable
                .select { (ParcelleTable.id eq input.parcelId) and (ParcelleTable.fkUser eq input.userId) }
                .limit(1)
                .any()
            if (!ownedParcelleExists) {
                return@dbQuery null
            }
        }

        val now = Instant.now()
        val id = VannesTable.insert {
            it[name] = input.name
            it[parcelId] = input.parcelId
            it[userId] = input.userId
            it[debit] = input.debit
            it[isAuto] = input.isAuto
            it[isOpen] = input.isOpen
            it[lastAction] = input.lastAction
            it[nbPlants] = input.nbPlants
            it[scheduleDays] = input.scheduleDays?.joinToString(",")
            it[scheduleStart] = input.scheduleStart
            it[scheduleEnd] = input.scheduleEnd
            it[deviceId] = input.deviceId
            it[pistonNumber] = input.pistonNumber
            it[createdAt] = now
            it[updatedAt] = now
        } get VannesTable.id

        toVanne(
            VannesTable.select { VannesTable.id eq id }.single()
        )
    }

    suspend fun updateVanne(id: Long, ownerUserId: Long?, input: UpdateVanneInput): Vanne? {
        val now = Instant.now()
        val uid = ownerUserId

        // Lire l'état actuel avant mise à jour (pour détecter changement isOpen)
        val currentRow = DatabaseFactory.dbQuery {
            val cond = if (uid != null) (VannesTable.id eq id) and (VannesTable.userId eq uid) else VannesTable.id eq id
            VannesTable.select { cond }.singleOrNull()
        } ?: return null

        val updated = DatabaseFactory.dbQuery {
            val condition = if (uid != null)
                (VannesTable.id eq id) and (VannesTable.userId eq uid)
            else
                VannesTable.id eq id
            val updatedRows = VannesTable.update({ condition }) {
                input.name?.let { value -> it[name] = value }
                input.parcelId?.let { value -> it[parcelId] = value }
                if (uid != null) it[userId] = uid
                input.debit?.let { value -> it[debit] = value }
                input.isAuto?.let { value -> it[isAuto] = value }
                input.isOpen?.let { value -> it[isOpen] = value }
                input.lastAction?.let { value -> it[lastAction] = value }
                input.nbPlants?.let { value -> it[nbPlants] = value }
                if (input.scheduleDays != null) it[scheduleDays] = input.scheduleDays.joinToString(",")
                input.scheduleStart?.let { value -> it[scheduleStart] = value }
                input.scheduleEnd?.let { value -> it[scheduleEnd] = value }
                input.deviceId?.let { value -> it[deviceId] = value }
                input.pistonNumber?.let { value -> it[pistonNumber] = value }
                it[updatedAt] = now
            }
            if (updatedRows == 0) return@dbQuery null
            val fetchCond = if (ownerUserId != null)
                (VannesTable.id eq id) and (VannesTable.userId eq ownerUserId)
            else
                VannesTable.id eq id
            VannesTable.select { fetchCond }.singleOrNull()?.let(::toVanne)
        } ?: return null

        // Envoyer commande MQTT si isOpen a changé et que le device est configuré
        if (input.isOpen != null && input.isOpen != currentRow[VannesTable.isOpen]) {
            val devId = updated.deviceId?.let { runCatching { UUID.fromString(it) }.getOrNull() }
                ?: currentRow[VannesTable.deviceId]
            val piston = updated.pistonNumber ?: currentRow[VannesTable.pistonNumber]
            if (devId != null && piston != null) {
                val action = if (input.isOpen) "activate" else "deactivate"
                logger.info { "[MQTT] Vanne ${updated.id} → $action piston $piston on device $devId" }
                mqttManager?.publishCommand(devId.toString(), "$action:$piston", useBinary = true)
            }
        }

        return updated
    }

    suspend fun deleteVanne(id: Long, ownerUserId: Long?): Boolean = DatabaseFactory.dbQuery {
        val condition = if (ownerUserId != null)
            (VannesTable.id eq id) and (VannesTable.userId eq ownerUserId)
        else
            VannesTable.id eq id
        VannesTable.deleteWhere { condition } > 0
    }

    suspend fun listRapportsEau(userId: Long?, parcelId: Long?): List<RapportEau> = DatabaseFactory.dbQuery {
        val query = when {
            userId != null && parcelId != null ->
                RapportEauTable.select { (RapportEauTable.userId eq userId) and (RapportEauTable.parcelId eq parcelId) }
            userId != null ->
                RapportEauTable.select { RapportEauTable.userId eq userId }
            parcelId != null ->
                RapportEauTable.select { RapportEauTable.parcelId eq parcelId }
            else -> RapportEauTable.selectAll()
        }
        query.map(::toRapportEau)
    }

    suspend fun getRapportEauById(id: Long): RapportEau? = DatabaseFactory.dbQuery {
        RapportEauTable.select { RapportEauTable.id eq id }
            .singleOrNull()
            ?.let(::toRapportEau)
    }

    suspend fun createRapportEau(input: CreateRapportEauInput): RapportEau = DatabaseFactory.dbQuery {
        require(input.reportName.isNotBlank()) { "reportName is required" }

        val analysisDate = LocalDate.parse(input.analysisDate)
        val now = Instant.now()
        val id = RapportEauTable.insert {
            it[reportName] = input.reportName
            it[parcelId] = input.parcelId
            it[userId] = input.userId
            it[RapportEauTable.analysisDate] = analysisDate
            it[ph] = input.ph
            it[cewDsM] = input.cewDsM
            it[residuSecMgL] = input.residuSecMgL
            it[chloruresMeqL] = input.chloruresMeqL
            it[sulfatesMeqL] = input.sulfatesMeqL
            it[bicarbonatesMeqL] = input.bicarbonatesMeqL
            it[sodiumMeqL] = input.sodiumMeqL
            it[calciumMeqL] = input.calciumMeqL
            it[magnesiumMeqL] = input.magnesiumMeqL
            it[sarRatio] = input.sarRatio
            it[dureteF] = input.dureteF
            it[interpretations] = input.interpretations
            it[createdAt] = now
            it[updatedAt] = now
        } get RapportEauTable.id

        toRapportEau(RapportEauTable.select { RapportEauTable.id eq id }.single())
    }

    suspend fun deleteRapportEau(id: Long): Boolean = DatabaseFactory.dbQuery {
        RapportEauTable.deleteWhere { RapportEauTable.id eq id } > 0
    }

    suspend fun listRapportsSol(userId: Long?, parcelId: Long?): List<RapportSol> = DatabaseFactory.dbQuery {
        val query = when {
            userId != null && parcelId != null ->
                RapportSolTable.select { (RapportSolTable.userId eq userId) and (RapportSolTable.parcelId eq parcelId) }
            userId != null ->
                RapportSolTable.select { RapportSolTable.userId eq userId }
            parcelId != null ->
                RapportSolTable.select { RapportSolTable.parcelId eq parcelId }
            else -> RapportSolTable.selectAll()
        }
        query.map(::toRapportSol)
    }

    suspend fun getRapportSolById(id: Long): RapportSol? = DatabaseFactory.dbQuery {
        RapportSolTable.select { RapportSolTable.id eq id }
            .singleOrNull()
            ?.let(::toRapportSol)
    }

    suspend fun createRapportSol(input: CreateRapportSolInput): RapportSol = DatabaseFactory.dbQuery {
        require(input.reportName.isNotBlank()) { "reportName is required" }

        val analysisDate = LocalDate.parse(input.analysisDate)
        val now = Instant.now()
        val id = RapportSolTable.insert {
            it[reportName] = input.reportName
            it[parcelId] = input.parcelId
            it[userId] = input.userId
            it[RapportSolTable.analysisDate] = analysisDate
            it[argilePercent] = input.argilePercent
            it[limonPercent] = input.limonPercent
            it[sablePercent] = input.sablePercent
            it[ph] = input.ph
            it[ceDsM] = input.ceDsM
            it[calcaireTotalPercent] = input.calcaireTotalPercent
            it[calcaireActifPercent] = input.calcaireActifPercent
            it[moPercent] = input.moPercent
            it[rapportCn] = input.rapportCn
            it[p2o5Ppm] = input.p2o5Ppm
            it[k2oPpm] = input.k2oPpm
            it[mgoPpm] = input.mgoPpm
            it[cecMeq100g] = input.cecMeq100g
            it[espPercent] = input.espPercent
            it[interpretations] = input.interpretations
            it[createdAt] = now
            it[updatedAt] = now
        } get RapportSolTable.id

        toRapportSol(RapportSolTable.select { RapportSolTable.id eq id }.single())
    }

    suspend fun deleteRapportSol(id: Long): Boolean = DatabaseFactory.dbQuery {
        RapportSolTable.deleteWhere { RapportSolTable.id eq id } > 0
    }

    suspend fun createParcelleWizard(input: CreateParcelleWizardInput): WizardCreateResult = DatabaseFactory.dbQuery {
        require(input.nomSurface.isNotBlank()) { "nomSurface is required" }
        require(input.localisation.isNotBlank()) { "localisation is required" }
        require(input.typeSol.isNotBlank()) { "typeSol is required" }
        require(input.tailleHa > 0.0) { "tailleHa must be > 0" }
        require(input.plants.isNotEmpty()) { "At least one plant is required" }
        require(input.vannes.isNotEmpty()) { "At least one vanne is required" }

        val now = Instant.now()
        val parcelleId = ParcelleTable.insert {
            it[nomSurface] = input.nomSurface
            it[localisation] = input.localisation
            it[typeSol] = input.typeSol
            it[fkUser] = input.fkUser
            it[fkSol] = null
            it[fkClimat] = null
            it[tailleHa] = input.tailleHa
            it[createdAt] = now
            it[updatedAt] = now
        } get ParcelleTable.id

        var createdPlants = 0
        for (plant in input.plants) {
            // (table type_plante supprimée : la plante est stockée uniquement dans `plantes`)
            val planteId = PlantesTable.insert {
                it[name] = plant.name
                it[type] = plant.type
                it[age] = plant.age
                it[count] = plant.count
                it[waterNeedPerPlant] = plant.waterNeedPerPlant
                it[createdAt] = now
            } get PlantesTable.id

            ParcellePlantesTable.insert {
                it[ParcellePlantesTable.parcelleId] = parcelleId
                it[ParcellePlantesTable.planteId] = planteId
            }

            createdPlants += 1
        }

        var createdVannes = 0
        for (vanne in input.vannes) {
            VannesTable.insert {
                it[name] = vanne.name
                it[parcelId] = parcelleId
                it[userId] = input.fkUser
                it[debit] = vanne.debit
                it[isAuto] = false
                it[isOpen] = false
                it[lastAction] = "Créée à l'instant"
                it[nbPlants] = vanne.nbPlants
                it[scheduleDays] = null
                it[scheduleStart] = null
                it[scheduleEnd] = null
                it[createdAt] = now
                it[updatedAt] = now
            }
            createdVannes += 1
        }

        val parcelle = toParcelle(ParcelleTable.select { ParcelleTable.id eq parcelleId }.single())
        WizardCreateResult(parcelle = parcelle, plantesCreated = createdPlants, vannesCreated = createdVannes)
    }

    suspend fun listPlantsByParcelleId(parcelleId: Long): List<ParcellePlantSummary> = DatabaseFactory.dbQuery {
        (ParcellePlantesTable innerJoin PlantesTable)
            .select { ParcellePlantesTable.parcelleId eq parcelleId }
            .map {
                ParcellePlantSummary(
                    id = it[PlantesTable.id],
                    name = it[PlantesTable.name],
                    type = it[PlantesTable.type],
                    age = it[PlantesTable.age],
                    count = it[PlantesTable.count],
                    waterNeedPerPlant = it[PlantesTable.waterNeedPerPlant],
                )
            }
    }

    // Crée une plante et la rattache à la parcelle (table de liaison parcelle_plantes).
    // Utilisé par POST /parcelles/{id}/plants (ajout d'une plante depuis l'admin).
    suspend fun addPlantToParcelle(parcelleId: Long, input: WizardPlantInput): ParcellePlantSummary =
        DatabaseFactory.dbQuery {
            val now = Instant.now()
            val planteId = PlantesTable.insert {
                it[name] = input.name
                it[type] = input.type
                it[age] = input.age
                it[count] = input.count
                it[waterNeedPerPlant] = input.waterNeedPerPlant
                it[createdAt] = now
            } get PlantesTable.id

            ParcellePlantesTable.insert {
                it[ParcellePlantesTable.parcelleId] = parcelleId
                it[ParcellePlantesTable.planteId] = planteId
            }

            ParcellePlantSummary(
                id = planteId,
                name = input.name,
                type = input.type,
                age = input.age,
                count = input.count,
                waterNeedPerPlant = input.waterNeedPerPlant,
            )
        }

    private fun toParcelle(row: ResultRow): Parcelle = Parcelle(
        id = row[ParcelleTable.id],
        nomSurface = row[ParcelleTable.nomSurface],
        localisation = row[ParcelleTable.localisation],
        typeSol = row[ParcelleTable.typeSol],
        fkUser = row[ParcelleTable.fkUser],
        fkSol = row[ParcelleTable.fkSol],
        fkClimat = row[ParcelleTable.fkClimat],
        createdAt = row[ParcelleTable.createdAt].toString(),
        updatedAt = row[ParcelleTable.updatedAt].toString(),
        tailleHa = row[ParcelleTable.tailleHa],
    )

    private fun toVanne(row: ResultRow): Vanne = Vanne(
        id = row[VannesTable.id],
        createdAt = row[VannesTable.createdAt].toString(),
        debit = row[VannesTable.debit],
        isAuto = row[VannesTable.isAuto],
        isOpen = row[VannesTable.isOpen],
        lastAction = row[VannesTable.lastAction],
        name = row[VannesTable.name],
        nbPlants = row[VannesTable.nbPlants],
        parcelId = row[VannesTable.parcelId],
        scheduleDays = row[VannesTable.scheduleDays]
            ?.split(",")
            ?.map { it.trim() }
            ?.filter { it.isNotBlank() },
        scheduleEnd = row[VannesTable.scheduleEnd],
        scheduleStart = row[VannesTable.scheduleStart],
        updatedAt = row[VannesTable.updatedAt].toString(),
        userId = row[VannesTable.userId],
        deviceId = row[VannesTable.deviceId]?.toString(),
        pistonNumber = row[VannesTable.pistonNumber],
    )

    private fun toRapportEau(row: ResultRow): RapportEau = RapportEau(
        id = row[RapportEauTable.id],
        reportName = row[RapportEauTable.reportName],
        parcelId = row[RapportEauTable.parcelId],
        userId = row[RapportEauTable.userId],
        analysisDate = row[RapportEauTable.analysisDate].toString(),
        ph = row[RapportEauTable.ph],
        cewDsM = row[RapportEauTable.cewDsM],
        residuSecMgL = row[RapportEauTable.residuSecMgL],
        chloruresMeqL = row[RapportEauTable.chloruresMeqL],
        sulfatesMeqL = row[RapportEauTable.sulfatesMeqL],
        bicarbonatesMeqL = row[RapportEauTable.bicarbonatesMeqL],
        sodiumMeqL = row[RapportEauTable.sodiumMeqL],
        calciumMeqL = row[RapportEauTable.calciumMeqL],
        magnesiumMeqL = row[RapportEauTable.magnesiumMeqL],
        sarRatio = row[RapportEauTable.sarRatio],
        dureteF = row[RapportEauTable.dureteF],
        interpretations = row[RapportEauTable.interpretations],
        createdAt = row[RapportEauTable.createdAt].toString(),
        updatedAt = row[RapportEauTable.updatedAt].toString(),
    )

    private fun toRapportSol(row: ResultRow): RapportSol = RapportSol(
        id = row[RapportSolTable.id],
        reportName = row[RapportSolTable.reportName],
        parcelId = row[RapportSolTable.parcelId],
        userId = row[RapportSolTable.userId],
        analysisDate = row[RapportSolTable.analysisDate].toString(),
        argilePercent = row[RapportSolTable.argilePercent],
        limonPercent = row[RapportSolTable.limonPercent],
        sablePercent = row[RapportSolTable.sablePercent],
        ph = row[RapportSolTable.ph],
        ceDsM = row[RapportSolTable.ceDsM],
        calcaireTotalPercent = row[RapportSolTable.calcaireTotalPercent],
        calcaireActifPercent = row[RapportSolTable.calcaireActifPercent],
        moPercent = row[RapportSolTable.moPercent],
        rapportCn = row[RapportSolTable.rapportCn],
        p2o5Ppm = row[RapportSolTable.p2o5Ppm],
        k2oPpm = row[RapportSolTable.k2oPpm],
        mgoPpm = row[RapportSolTable.mgoPpm],
        cecMeq100g = row[RapportSolTable.cecMeq100g],
        espPercent = row[RapportSolTable.espPercent],
        interpretations = row[RapportSolTable.interpretations],
        createdAt = row[RapportSolTable.createdAt].toString(),
        updatedAt = row[RapportSolTable.updatedAt].toString(),
    )
}
