/// Erreur API alignée sur `{ "error": "...", "userId": "..." }` côté serveur.
class ApiException implements Exception {
  ApiException(
    this.message, {
    this.statusCode,
    this.body,
    this.userId,
    this.otpLength,
    this.expiresInMinutes,
  });

  final String message;
  final int? statusCode;
  final String? body;
  final String? userId;
  final int? otpLength;
  final int? expiresInMinutes;

  @override
  String toString() => 'ApiException($statusCode): $message';
}
