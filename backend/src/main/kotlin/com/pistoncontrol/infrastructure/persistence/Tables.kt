package com.pistoncontrol.infrastructure.persistence

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.ReferenceOption
import org.jetbrains.exposed.sql.javatime.date
import org.jetbrains.exposed.sql.javatime.timestamp

// ─────────────────────────────────────────────────────────────────────────────
// Table UNIQUE "Utilisateur" = fusion des anciennes tables users + profiles.
//   - id        : bigint  (PK physique, ancienne profiles.id)
//   - userId    : uuid    (identité d'authentification, ancienne users.id)
//   - colonnes d'auth (password_hash, email_verified) + colonnes de profil
//     (user_role, abonnement, entreprise, coordonnées) sur la MÊME ligne.
// ─────────────────────────────────────────────────────────────────────────────
object Utilisateur : Table("utilisateur") {
    val id = long("id").autoIncrement()                 // PK bigint (ex-profiles.id)
    val userId = uuid("user_id")                        // identité auth (ex-users.id)
    val email = text("email")
    val passwordHash = text("password_hash").nullable()
    val emailVerified = bool("email_verified").default(false)
    val firstName = text("first_name")
    val lastName = text("last_name")
    val avatarUrl = text("avatar_url").nullable()
    val userRole = text("user_role")
    val phoneNumber = text("phone_number").nullable()
    val country = text("country").nullable()
    val city = text("city").nullable()
    val dateOfBirth = date("date_of_birth").nullable()
    val dateDebAbo = date("date_deb_abo").nullable()
    val dateExpAbo = date("date_exp_abo").nullable()
    val typeAbo = text("type_abo").nullable()
    val createdBy = long("created_by").nullable()
    val companyName = text("company_name").nullable()
    val companyLogo = text("company_logo").nullable()
    val createdAt = timestamp("created_at")
    val updatedAt = timestamp("updated_at")

    override val primaryKey = PrimaryKey(id)
}

object Devices : Table("devices") {
    val id = uuid("id").autoGenerate()
    val name = text("name")
    val ownerId = uuid("owner_id")
    val mqttClientId = text("mqtt_client_id")
    val status = text("status")
    val createdAt = timestamp("created_at")
    val updatedAt = timestamp("updated_at")

    override val primaryKey = PrimaryKey(id)
}

// NOTE: la table `pistons` a été supprimée. L'état physique d'un canal vit
// désormais dans `vannes` (is_open / piston_number / device_id).

object Telemetry : Table("telemetry") {
    val id = long("id")
    val deviceId = uuid("device_id")
    // Référence directe au numéro de canal (1-8) au lieu d'une FK vers pistons
    val pistonNumber = integer("piston_number").nullable()
    val eventType = text("event_type")
    
    // ✅ SOLUTION: Use our custom jsonb() function
    // This properly casts to JSONB in PostgreSQL
    val payload = jsonb("payload").nullable()
    
    val createdAt = timestamp("created_at")
    
    override val primaryKey = PrimaryKey(id)
}

object Schedules : Table("schedules") {
    val id = uuid("id").autoGenerate()
    val name = text("name")
    val deviceId = uuid("device_id")
    val pistonNumber = integer("piston_number")
    val action = text("action") // "ACTIVATE" or "DEACTIVATE"
    val cronExpression = text("cron_expression")
    val enabled = bool("enabled").default(true)
    val userId = uuid("user_id")
    val createdAt = timestamp("created_at")
    val updatedAt = timestamp("updated_at")

    override val primaryKey = PrimaryKey(id)
}

// ─────────────────────────────────────────────────────────────────────────────
// CapteurSol tables
// ─────────────────────────────────────────────────────────────────────────────

object RapportSol : Table("rapport_sol") {
    val id = long("id").autoIncrement()
    val reportName = text("report_name")
    val parcelId = long("parcel_id").references(Parcelle.id, onDelete = ReferenceOption.CASCADE)
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
    val parcelId = long("parcel_id").references(Parcelle.id, onDelete = ReferenceOption.CASCADE)
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

// ── Commerce & Stock tables ───────────────────────────────────────────────────

object SubscriptionPlans : Table("subscription_plans") {
    val id = long("id").autoIncrement()
    val name = text("name")
    val priceDt = double("price_dt").default(0.0)
    val durationDays = integer("duration_days").default(30)
    val features = text("features").default("{}")
    // Liste JSON des clés de pages mobiles autorisées par ce plan, ex: ["accueil","vannes"].
    // Météo et Profil restent toujours accessibles côté app, hors de cette liste.
    val pageAccess = text("page_access").default("[]")
    val active = bool("active").default(true)
    val createdAt = timestamp("created_at")
    override val primaryKey = PrimaryKey(id)
}

object SubscriptionPayments : Table("subscription_payments") {
    val id = long("id").autoIncrement()
    val profileId = long("profile_id")
    val planId = long("plan_id")
    val amountDt = double("amount_dt").default(0.0)
    val paymentMethod = text("payment_method").default("cash")
    val status = text("status").default("pending")
    val dateStart = date("date_start").nullable()
    val dateExp = date("date_exp").nullable()
    val validatedAt = timestamp("validated_at").nullable()
    val validatedBy = long("validated_by").nullable()
    val createdAt = timestamp("created_at")
    override val primaryKey = PrimaryKey(id)
}

object MaterialReservations : Table("material_reservations") {
    val id = long("id").autoIncrement()
    val profileId = long("profile_id").nullable()
    val surfaceId = long("surface_id").nullable()
    val subscriptionPlanId = long("subscription_plan_id").nullable()
    val status = text("status").default("pending")
    val totalDevicesPriceDt = double("total_devices_price_dt").default(0.0)
    val notes = text("notes").nullable()
    val createdBy = long("created_by").nullable()
    val createdAt = timestamp("created_at")
    val updatedAt = timestamp("updated_at")
    override val primaryKey = PrimaryKey(id)
}

object ClientSales : Table("client_sales") {
    val id = long("id").autoIncrement()
    val profileId = long("profile_id")
    val subscriptionPlanId = long("subscription_plan_id").nullable()
    val reservationId = long("reservation_id").nullable()
    val subscriptionPriceDt = double("subscription_price_dt").default(0.0)
    val equipmentPriceDt = double("equipment_price_dt").default(0.0)
    val totalDt = double("total_dt").default(0.0)
    val paymentMethod = text("payment_method").default("cash")
    val status = text("status").default("pending")
    val confirmedBy = long("confirmed_by").nullable()
    val confirmedAt = timestamp("confirmed_at").nullable()
    val createdAt = timestamp("created_at")
    override val primaryKey = PrimaryKey(id)
}

object DeviceSales : Table("device_sales") {
    val id = long("id").autoIncrement()
    val buyerProfileId = long("buyer_profile_id")
    val deviceId = long("device_id")
    val quantity = integer("quantity").default(1)
    val unitPriceDt = double("unit_price_dt").default(0.0)
    val totalDt = double("total_dt").default(0.0)
    val paymentMethod = text("payment_method").default("cash")
    val status = text("status").default("pending")
    val validatedAt = timestamp("validated_at").nullable()
    val validatedBy = long("validated_by").nullable()
    val createdAt = timestamp("created_at")
    override val primaryKey = PrimaryKey(id)
}

object StockItems : Table("stock_items") {
    val id = long("id").autoIncrement()
    val name = text("name")
    val category = text("category").default("general")
    val quantity = integer("quantity").default(0)
    val purchasePriceDt = double("purchase_price_dt").default(0.0)
    val lowStockThreshold = integer("low_stock_threshold").default(5)
    val features = text("features").nullable()
    val createdAt = timestamp("created_at")
    val updatedAt = timestamp("updated_at")
    override val primaryKey = PrimaryKey(id)
}

object StockMovements : Table("stock_movements") {
    val id = long("id").autoIncrement()
    val stockItemId = long("stock_item_id")
    val movementType = text("movement_type").default("out")
    val quantity = integer("quantity").default(0)
    val reason = text("reason").nullable()
    val reservationId = long("reservation_id").nullable()
    val createdBy = long("created_by").nullable()
    val createdAt = timestamp("created_at")
    override val primaryKey = PrimaryKey(id)
}

object ReservationItems : Table("reservation_items") {
    val id = long("id").autoIncrement()
    val reservationId = long("reservation_id")
    val stockItemId = long("stock_item_id")
    val quantity = integer("quantity").default(1)
    val unitPriceDt = double("unit_price_dt").default(0.0)
    val createdAt = timestamp("created_at")
    override val primaryKey = PrimaryKey(id)
}

object Reclamations : Table("reclamations") {
    val id = long("id").autoIncrement()
    val userId = long("user_id")
    val profileId = long("profile_id").nullable()
    val sujet = text("sujet")
    val message = text("message")
    val statut = text("statut").default("ouvert")
    val traiteBy = long("traite_by").nullable()
    val traiteAt = timestamp("traite_at").nullable()
    val createdAt = timestamp("created_at")
    val updatedAt = timestamp("updated_at")
    override val primaryKey = PrimaryKey(id)
}

object Plantes : Table("plantes") {
    val id = long("id").autoIncrement()
    val name = text("name")
    val type = text("type")
    val age = integer("age").default(1)
    val count = integer("count").default(0)
    val waterNeedPerPlant = double("water_need_per_plant").default(0.0)
    val createdAt = timestamp("created_at")

    override val primaryKey = PrimaryKey(id)
}

object ParcellePlantes : Table("parcelle_plantes") {
    val id = long("id").autoIncrement()
    val parcelleId = long("parcelle_id").references(Parcelle.id)
    val planteId = long("plante_id").references(Plantes.id)

    override val primaryKey = PrimaryKey(id)
}

// ─────────────────────────────────────────────────────────────────────────────
// Vannes (schema demandé côté frontend/tRPC)
// ─────────────────────────────────────────────────────────────────────────────
object Vannes : Table("vannes") {
    // Schéma fourni: id: string, created_at: string, updated_at: string…
    // Ici on utilise des types PostgreSQL standards (long/timestamp) pour Exposed.
    val id = long("id").autoIncrement()
    val name = text("name")
    val debit = double("debit").default(0.0)
    val isAuto = bool("is_auto").default(false)
    val isOpen = bool("is_open").default(false)
    val lastAction = text("last_action").nullable()
    val nbPlants = integer("nb_plants").default(0)

    // Relation avec la parcelle
    val parcelId = long("parcel_id").references(Parcelle.id)

    // Stockage simple (text) pour éviter la dépendance à un type array Exposed.
    // Exemple: "['Mon','Tue']" ou "Mon, Tue" (selon ton usage backend).
    val scheduleDays = text("schedule_days").nullable()
    val scheduleStart = text("schedule_start").nullable()
    val scheduleEnd = text("schedule_end").nullable()

    val userId = long("user_id")

    // Lien vers le device physique ESP32 et le numéro de piston (1-8)
    val deviceId = uuid("device_id").references(Devices.id, onDelete = ReferenceOption.SET_NULL).nullable()
    val pistonNumber = integer("piston_number").nullable()

    val createdAt = timestamp("created_at")
    val updatedAt = timestamp("updated_at")

    override val primaryKey = PrimaryKey(id)
}
