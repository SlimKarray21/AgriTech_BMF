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
}
