/// Erreur API alignée sur `{ "error": "...", "userId": "..." }` côté serveur.
class ApiException implements Exception {
  ApiException(this.message, {this.statusCode, this.body, this.userId});

  final String message;
  final int? statusCode;
  final String? body;
  final String? userId;

  @override
  String toString() => 'ApiException($statusCode): $message';
}
