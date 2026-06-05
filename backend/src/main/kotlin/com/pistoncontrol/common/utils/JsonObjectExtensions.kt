package com.pistoncontrol.common.utils

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

fun JsonObject.stringValue(key: String, default: String = ""): String {
    val value = this[key] as? JsonPrimitive ?: return default
    return value.content.trim().ifEmpty { default }
}

fun JsonObject.intValue(key: String, default: Int = 0): Int {
    val value = this[key] as? JsonPrimitive ?: return default
    return value.content.toIntOrNull() ?: default
}

fun JsonObject.doubleValue(key: String, default: Double = 0.0): Double {
    val value = this[key] as? JsonPrimitive ?: return default
    return value.content.replace(',', '.').toDoubleOrNull() ?: default
}

fun JsonObject.arrayValue(key: String): JsonArray {
    val value = this[key]
    return if (value is JsonArray) value else JsonArray(emptyList())
}
