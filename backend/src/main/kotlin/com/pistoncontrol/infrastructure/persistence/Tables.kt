package com.pistoncontrol.infrastructure.persistence

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.date
import org.jetbrains.exposed.sql.javatime.timestamp

object Users : Table("users") {
    val id = uuid("id").autoGenerate()
    val email = text("email")
    val passwordHash = text("password_hash")
    val role = text("role")
    val firstName = text("first_name").nullable()
    val lastName = text("last_name").nullable()
    val phoneNumber = text("phone_number").nullable()
    val dateOfBirth = date("date_of_birth").nullable()
    val location = text("location").nullable()
    val avatarUrl = text("avatar_url").nullable()
    val preferences = jsonb("preferences").default("{}")
    val createdAt = timestamp("created_at")
    val updatedAt = timestamp("updated_at")
    val emailVerified = bool("email_verified").default(false)

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

object Pistons : Table("pistons") {
    val id = uuid("id").autoGenerate()
    val deviceId = uuid("device_id")
    val pistonNumber = integer("piston_number")
    val state = text("state")
    val lastTriggered = timestamp("last_triggered").nullable()

    override val primaryKey = PrimaryKey(id)
}

object Telemetry : Table("telemetry") {
    val id = long("id")
    val deviceId = uuid("device_id")
    val pistonId = uuid("piston_id").nullable()
    val eventType = text("event_type")
    
    // ✅ SOLUTION: Use our custom jsonb() function
    // This properly casts to JSONB in PostgreSQL
    val payload = jsonb("payload").nullable()
    
    val createdAt = timestamp("created_at")
    
    override val primaryKey = PrimaryKey(id)
}

object AuthTokens : Table("auth_tokens") {
    val id = uuid("id")
    val userId = uuid("user_id")
    val refreshToken = text("refresh_token")
    val expiresAt = timestamp("expires_at")
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

object AuditLogs : Table("audit_logs") {
    val id = uuid("id").autoGenerate()
    val userId = uuid("user_id") // Admin who performed the action
    val action = text("action") // e.g., "UPDATE_USER_ROLE", "DELETE_USER", "VIEW_AUDIT_LOGS"
    val targetUserId = uuid("target_user_id").nullable() // User affected by the action (if applicable)
    val targetResourceType = text("target_resource_type").nullable() // e.g., "USER", "DEVICE", "SCHEDULE"
    val targetResourceId = text("target_resource_id").nullable() // ID of the affected resource
    val details = jsonb("details").nullable() // Additional context (old values, new values, etc.)
    val ipAddress = text("ip_address").nullable()
    val userAgent = text("user_agent").nullable()
    val createdAt = timestamp("created_at")

    override val primaryKey = PrimaryKey(id)
}

object EmailVerificationCodes : Table("email_verification_codes") {
    val id = uuid("id").autoGenerate()
    val userId = uuid("user_id")
    val codeHash = text("code_hash")
    val attempts = integer("attempts").default(0)
    val expiresAt = timestamp("expires_at")
    val createdAt = timestamp("created_at")

    override val primaryKey = PrimaryKey(id)
}

// ─────────────────────────────────────────────────────────────────────────────
// CapteurSol tables (intégrées ici pour avoir un seul fichier Tables.kt)
// ─────────────────────────────────────────────────────────────────────────────
// NOTE:
// - Ces tables existaient déjà dans `com.pistoncontrol.infrastructure.persistence.capteursol.Tables`.
// - On les copie ici dans `com.pistoncontrol.infrastructure.persistence` pour faciliter l’intégration.

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
    val userId = varchar("user_id", 36).nullable()
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
    val aboCapSol = bool("abo_capteur_sol").default(true)
    val aboElectrovanne = bool("abo_electrovanne").default(false)
    val aboSantePlante = bool("abo_sante_plante").default(false)

    override val primaryKey = PrimaryKey(id)
}

// ── Commerce & Stock tables ───────────────────────────────────────────────────

object SubscriptionPlans : Table("subscription_plans") {
    val id = long("id").autoIncrement()
    val name = text("name")
    val priceDt = double("price_dt").default(0.0)
    val durationDays = integer("duration_days").default(30)
    val features = text("features").default("{}")
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

object DeviceCatalog : Table("device_catalog") {
    val id = long("id").autoIncrement()
    val name = text("name")
    val deviceType = text("device_type")
    val priceDt = double("price_dt").default(0.0)
    val stock = integer("stock").default(0)
    val available = bool("available").default(true)
    val connectedState = text("connected_state").default("disconnected")
    val info = text("info").nullable()
    val createdAt = timestamp("created_at")
    val updatedAt = timestamp("updated_at")
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

object SupportNotifications : Table("support_notifications") {
    val id = long("id").autoIncrement()
    val title = text("title")
    val message = text("message").nullable()
    val notifType = text("notif_type").default("info")
    val isRead = bool("is_read").default(false)
    val link = text("link").nullable()
    val createdForRole = text("created_for_role").nullable()
    val createdAt = timestamp("created_at")
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

    val createdAt = timestamp("created_at")
    val updatedAt = timestamp("updated_at")

    override val primaryKey = PrimaryKey(id)
}
