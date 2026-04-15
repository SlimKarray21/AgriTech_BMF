package com.CapteurSol.database

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.date
import org.jetbrains.exposed.sql.javatime.timestamp

object RapportSol : Table("rapport_sol") {
	val id = long("id").autoIncrement()
	val reportName = text("report_name")
	val parcelId = long("parcel_id")
	val userId = long("user_id")
	val analysisDate = date("analysis_date")
	val argilePercent = double("argile_percent")
	val limonPercent = double("limon_percent")
	val sablePercent = double("sable_percent")
	val ph = double("ph")
	val ceDsM = double("ce_ds_m")
	val calcaireTotalPercent = double("calcaire_total_percent")
	val calcaireActifPercent = double("calcaire_actif_percent")
	val moPercent = double("mo_percent")
	val rapportCn = double("rapport_cn")
	val p2o5Ppm = double("p2o5_ppm")
	val k2oPpm = double("k2o_ppm")
	val mgoPpm = double("mgo_ppm")
	val cecMeq100g = double("cec_meq_100g")
	val espPercent = double("esp_percent")
	val interpretations = text("interpretations").nullable()
	val createdAt = timestamp("created_at")
	val updatedAt = timestamp("updated_at")

	override val primaryKey = PrimaryKey(id)
}

object RapportEau : Table("rapport_eau") {
	val id = long("id").autoIncrement()
	val reportName = text("report_name")
	val parcelId = long("parcel_id")
	val userId = long("user_id")
	val analysisDate = date("analysis_date")
	val ph = double("ph")
	val cewDsM = double("cew_ds_m")
	val residuSecMgL = double("residu_sec_mg_l")
	val chloruresMeqL = double("chlorures_meq_l")
	val sulfatesMeqL = double("sulfates_meq_l")
	val bicarbonatesMeqL = double("bicarbonates_meq_l")
	val sodiumMeqL = double("sodium_meq_l")
	val calciumMeqL = double("calcium_meq_l")
	val magnesiumMeqL = double("magnesium_meq_l")
	val sarRatio = double("sar_ratio")
	val dureteF = double("durete_f")
	val interpretations = text("interpretations").nullable()
	val createdAt = timestamp("created_at")
	val updatedAt = timestamp("updated_at")

	override val primaryKey = PrimaryKey(id)
}

object RapportFiles : Table("rapport_files") {
	val id = long("id").autoIncrement()
	val reportType = text("report_type")
	val reportId = long("report_id")
	val userId = long("user_id")
	val fileUrl = text("file_url")
	val uploadedAt = timestamp("uploaded_at")

	override val primaryKey = PrimaryKey(id)
}

object TypePlante : Table("type_plante") {
	val id = long("id").autoIncrement()
	val nomPlante = text("nom_plante")
	val typePlante = text("type_plante")
	val besoinEauParPlante = double("besoin_eau_par_plante")
	val createdAt = timestamp("created_at")

	override val primaryKey = PrimaryKey(id)
}

object Parcelle : Table("parcelle") {
	val id = long("id").autoIncrement()
	val nomSurface = text("nom_surface")
	val localisation = text("localisation")
	val typeSol = text("type_sol")
	val fkUser = long("fk_user")
	val fkSol = long("fk_sol").nullable()
	val fkClimat = long("fk_climat").nullable()
	val createdAt = timestamp("created_at")
	val updatedAt = timestamp("updated_at")
	val tailleHa = double("taille_ha")

	override val primaryKey = PrimaryKey(id)
}

object SolExpo : Table("sol_expo") {
	val id = long("id").autoIncrement()
	val nature = text("nature")
	val humidite = double("humidite")
	val salinite = double("salinite")
	val ph = double("ph")
	val temperature = double("temperature")
	val dateMesure = timestamp("date_mesure")
	val createdAt = timestamp("created_at")

	override val primaryKey = PrimaryKey(id)
}

object ClimatsExpo : Table("climats_expo") {
	val id = long("id").autoIncrement()
	val temperatureC = double("temperature_c")
	val humiditeC = double("humidite_c")
	val vitesseVent = double("vitesse_vent")
	val puissanceEnsoleillement = double("puissance_ensoleillement")
	val createdAt = timestamp("created_at")

	override val primaryKey = PrimaryKey(id)
}

object Profiles : Table("profiles") {
	val id = long("id").autoIncrement()
	val userId = long("user_id")
	val firstName = text("first_name")
	val lastName = text("last_name")
	val avatarUrl = text("avatar_url").nullable()
	val createdAt = timestamp("created_at")
	val updatedAt = timestamp("updated_at")
	val userRole = text("user_role")
	val phoneNumber = text("phone_number").nullable()
	val location = text("location").nullable()
	val country = text("country").nullable()
	val city = text("city").nullable()
	val dateOfBirth = date("date_of_birth").nullable()
	val dateDebAbo = date("date_deb_abo").nullable()
	val dateExpAbo = date("date_exp_abo").nullable()
	val typeAbo = text("type_abo").nullable()
	val email = text("email")
	val createdBy = long("created_by").nullable()
	val companyName = text("company_name").nullable()
	val companyLogo = text("company_logo").nullable()

	override val primaryKey = PrimaryKey(id)
}

object SubscripNotif : Table("subscrip_notif") {
	val id = long("id").autoIncrement()
	val clientEmail = text("client_email")
	val clientName = text("client_name")
	val daysRemaining = integer("days_remaining")
	val sentAt = timestamp("sent_at")
	val createdAt = timestamp("created_at")

	override val primaryKey = PrimaryKey(id)
}
