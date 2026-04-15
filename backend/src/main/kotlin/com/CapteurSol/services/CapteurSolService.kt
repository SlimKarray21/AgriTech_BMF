package com.CapteurSol.services

import com.CapteurSol.models.Parcelle
import com.CapteurSol.models.Vanne
import com.pistoncontrol.database.ParcellePlantes as ParcellePlantesTable
import com.pistoncontrol.database.Parcelle as ParcelleTable
import com.pistoncontrol.database.Plantes as PlantesTable
import com.pistoncontrol.database.TypePlante as TypePlanteTable
import com.pistoncontrol.database.Vannes as VannesTable
import com.pistoncontrol.database.DatabaseFactory
import org.jetbrains.exposed.sql.ResultRow
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.select
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.update
import org.jetbrains.exposed.sql.and
import kotlinx.serialization.Serializable
import java.time.Instant

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

class CapteurSolService {
    suspend fun listParcelles(userId: Long?): List<Parcelle> = DatabaseFactory.dbQuery {
        val query = if (userId != null) {
            ParcelleTable.select { ParcelleTable.fkUser eq userId }
        } else {
            ParcelleTable.selectAll()
        }
        query.map(::toParcelle)
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
        val status = if (vannes.isEmpty()) "non connecté" else "connecté"

        return ParcelleDetails(
            parcelle = parcelle,
            culture = culture,
            status = status,
            plants = plants,
            vannes = vannes,
        )
    }

    suspend fun updateParcelle(id: Long, input: UpdateParcelleInput): Parcelle? = DatabaseFactory.dbQuery {
        val now = Instant.now()
        val updatedRows = ParcelleTable.update({ ParcelleTable.id eq id }) {
            input.nomSurface?.let { value -> it[nomSurface] = value }
            input.localisation?.let { value -> it[localisation] = value }
            input.typeSol?.let { value -> it[typeSol] = value }
            input.fkUser?.let { value -> it[fkUser] = value }
            input.fkSol?.let { value -> it[fkSol] = value }
            input.fkClimat?.let { value -> it[fkClimat] = value }
            input.tailleHa?.let { value -> it[tailleHa] = value }
            it[updatedAt] = now
        }

        if (updatedRows == 0) return@dbQuery null
        ParcelleTable.select { ParcelleTable.id eq id }.singleOrNull()?.let(::toParcelle)
    }

    suspend fun deleteParcelle(id: Long): Boolean = DatabaseFactory.dbQuery {
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

    suspend fun createVanne(input: CreateVanneInput): Vanne = DatabaseFactory.dbQuery {
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
            it[createdAt] = now
            it[updatedAt] = now
        } get VannesTable.id

        toVanne(
            VannesTable.select { VannesTable.id eq id }.single()
        )
    }

    suspend fun updateVanne(id: Long, input: UpdateVanneInput): Vanne? = DatabaseFactory.dbQuery {
        val now = Instant.now()
        val updatedRows = VannesTable.update({ VannesTable.id eq id }) {
            input.name?.let { value -> it[name] = value }
            input.parcelId?.let { value -> it[parcelId] = value }
            input.userId?.let { value -> it[userId] = value }
            input.debit?.let { value -> it[debit] = value }
            input.isAuto?.let { value -> it[isAuto] = value }
            input.isOpen?.let { value -> it[isOpen] = value }
            input.lastAction?.let { value -> it[lastAction] = value }
            input.nbPlants?.let { value -> it[nbPlants] = value }
            if (input.scheduleDays != null) it[scheduleDays] = input.scheduleDays.joinToString(",")
            input.scheduleStart?.let { value -> it[scheduleStart] = value }
            input.scheduleEnd?.let { value -> it[scheduleEnd] = value }
            it[updatedAt] = now
        }

        if (updatedRows == 0) return@dbQuery null
        VannesTable.select { VannesTable.id eq id }.singleOrNull()?.let(::toVanne)
    }

    suspend fun deleteVanne(id: Long): Boolean = DatabaseFactory.dbQuery {
        VannesTable.deleteWhere { VannesTable.id eq id } > 0
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
            // Keep type_plante filled for reporting/catalog use-cases.
            TypePlanteTable.insert {
                it[nomPlante] = plant.name
                it[typePlante] = plant.type
                it[besoinEauParPlante] = plant.waterNeedPerPlant
                it[createdAt] = now
            }

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
    )
}
