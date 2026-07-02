package com.pistoncontrol.infrastructure.persistence

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.transactions.transaction
import mu.KotlinLogging

private val logger = KotlinLogging.logger {}

object DatabaseFactory {
    fun init() {
        val driverClassName = "org.postgresql.Driver"
        val jdbcURL = System.getenv("DATABASE_URL") 
            ?: throw IllegalStateException("DATABASE_URL not set")
        val user = System.getenv("DATABASE_USER") 
            ?: throw IllegalStateException("DATABASE_USER not set")
        val password = System.getenv("DATABASE_PASSWORD") 
            ?: throw IllegalStateException("DATABASE_PASSWORD not set")
        
        logger.info { "Initializing database connection to $jdbcURL" }

        Database.connect(createHikariDataSource(jdbcURL, driverClassName, user, password))
        runMigrations()
    }

    /**
     * Migrations idempotentes exécutées à chaque démarrage (ADD COLUMN IF NOT
     * EXISTS) : les bases déjà déployées reçoivent les nouvelles colonnes sans
     * intervention manuelle. init-db.sql ne s'applique qu'aux volumes neufs.
     */
    private fun runMigrations() {
        val statements = listOf(
            "ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS requires_qr BOOLEAN NOT NULL DEFAULT FALSE",
        )
        transaction {
            statements.forEach { sql ->
                runCatching { exec(sql) }
                    .onSuccess { logger.info { "Migration OK: $sql" } }
                    .onFailure { logger.error(it) { "Migration failed: $sql" } }
            }
        }
    }
    
    private fun createHikariDataSource(
        url: String,
        driver: String,
        user: String,
        password: String
    ) = HikariDataSource(HikariConfig().apply {
        driverClassName = driver
        jdbcUrl = url
        username = user
        this.password = password
        maximumPoolSize = 10
        minimumIdle = 2
        idleTimeout = 600000
        connectionTimeout = 30000
        maxLifetime = 1800000
        isAutoCommit = false
        transactionIsolation = "TRANSACTION_REPEATABLE_READ"
        
        validate()
    })
    
    suspend fun <T> dbQuery(block: () -> T): T =
        withContext(Dispatchers.IO) {
            transaction { block() }
        }
}
