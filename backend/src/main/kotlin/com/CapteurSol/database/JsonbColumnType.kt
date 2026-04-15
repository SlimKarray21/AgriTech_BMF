package com.CapteurSol.database

import org.jetbrains.exposed.sql.Column
import org.jetbrains.exposed.sql.ColumnType
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.statements.api.PreparedStatementApi
import org.postgresql.util.PGobject

class JsonbColumnType : ColumnType() {
    override fun sqlType(): String = "JSONB"

    override fun valueFromDB(value: Any): Any {
        return when (value) {
            is PGobject -> value.value ?: ""
            is String -> value
            else -> ""
        }
    }

    override fun notNullValueToDB(value: Any): Any {
        val jsonString = when (value) {
            is String -> value
            else -> value.toString()
        }

        return PGobject().apply {
            type = "jsonb"
            this.value = jsonString
        }
    }

    override fun setParameter(stmt: PreparedStatementApi, index: Int, value: Any?) {
        if (value == null) {
            stmt.setNull(index, this)
        } else {
            stmt[index] = notNullValueToDB(value)
        }
    }
}

fun Table.jsonb(name: String): Column<String> {
    return registerColumn(name, JsonbColumnType())
}
