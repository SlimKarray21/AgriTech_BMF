/// Extrait un JWT depuis les réponses [LoginResponse] Ktor (`token`) ou variantes courantes.
String? extractAuthTokenFromJson(Map<String, dynamic>? json) {
  if (json == null) return null;
  final dynamic raw =
      json['token'] ?? json['accessToken'] ?? json['access_token'] ?? json['jwt'];
  if (raw is String && raw.isNotEmpty) {
    final cleaned = raw.replaceFirst(RegExp(r'^Bearer\s+', caseSensitive: false), '').trim();
    if (cleaned.isNotEmpty) return cleaned;
  }
  return null;
}
