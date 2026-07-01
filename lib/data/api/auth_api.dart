import 'api_client.dart';

class AuthApi {
  AuthApi(this._c);
  final ApiClient _c;

  Future<Map<String, dynamic>?> register(Map<String, dynamic> body) =>
      _c.postJson('/auth/register', body, useAuth: false);

  Future<Map<String, dynamic>?> login(Map<String, dynamic> body) =>
      _c.postJson('/auth/login', body, useAuth: false);

  Future<Map<String, dynamic>?> verifyEmail(Map<String, dynamic> body) =>
      _c.postJson('/auth/verify-email', body, useAuth: false);

  Future<Map<String, dynamic>?> resendCode(Map<String, dynamic> body) =>
      _c.postJson('/auth/resend-code', body, useAuth: false);

  /// Réinitialisation directe du mot de passe (sans email/OTP).
  /// body attendu : { "email": ..., "newPassword": ... }
  Future<Map<String, dynamic>?> resetPassword(Map<String, dynamic> body) =>
      _c.postJson('/auth/reset-password', body, useAuth: false);

  // ── Flux OTP « mot de passe oublié » (email → code → nouveau mot de passe) ──

  /// Étape 1 : demande l'envoi d'un code. body : { "email" }
  Future<Map<String, dynamic>?> forgotPassword(Map<String, dynamic> body) =>
      _c.postJson('/auth/forgot-password', body, useAuth: false);

  /// Étape 2 : vérifie le code. body : { "email", "code" }
  Future<Map<String, dynamic>?> verifyResetCode(Map<String, dynamic> body) =>
      _c.postJson('/auth/verify-reset-code', body, useAuth: false);

  /// Étape 3 : applique le nouveau mot de passe. body : { "email", "code", "newPassword" }
  Future<Map<String, dynamic>?> resetPasswordConfirm(Map<String, dynamic> body) =>
      _c.postJson('/auth/reset-password-confirm', body, useAuth: false);
}
