import 'api_client.dart';

/// Routes `/admin/*` : JWT avec `role: "admin"` (schéma admin-jwt).
///
/// Hors périmètre UI mobile classique ; exposé pour outillage / future console admin.
class AdminApi {
  AdminApi(this._c, {required this.adminToken});
  final ApiClient _c;
  final String adminToken;

  String get _a => adminToken;

  Future<dynamic> listUsers({int? limit, int? offset}) {
    final q = <String, String>{};
    if (limit != null) q['limit'] = '$limit';
    if (offset != null) q['offset'] = '$offset';
    return _c.getJsonAny('/admin/users', query: q.isEmpty ? null : q, bearerOverride: _a);
  }

  Future<Map<String, dynamic>?> getUser(String id) =>
      _c.getJson('/admin/users/$id', bearerOverride: _a);

  Future<Map<String, dynamic>?> patchUserRole(String id, Map<String, dynamic> body) =>
      _c.patchJson('/admin/users/$id/role', body, bearerOverride: _a);

  Future<Map<String, dynamic>?> deleteUser(String id) =>
      _c.deleteJson('/admin/users/$id', bearerOverride: _a);

  Future<Map<String, dynamic>?> purgeUserHistory(String id) =>
      _c.deleteJson('/admin/users/$id/history', bearerOverride: _a);

  Future<Map<String, dynamic>?> dashboardStats() =>
      _c.getJson('/admin/stats', bearerOverride: _a);

  Future<dynamic> auditLogs({
    int? limit,
    int? offset,
    String? userId,
    String? action,
  }) {
    final q = <String, String>{};
    if (limit != null) q['limit'] = '$limit';
    if (offset != null) q['offset'] = '$offset';
    if (userId != null) q['userId'] = userId;
    if (action != null) q['action'] = action;
    return _c.getJsonAny('/admin/audit-logs', query: q.isEmpty ? null : q, bearerOverride: _a);
  }

  Future<dynamic> userDevices(String userId) =>
      _c.getJsonAny('/admin/users/$userId/devices', bearerOverride: _a);

  Future<Map<String, dynamic>?> adminPistonCommand(
    String userId,
    String deviceId,
    int pistonNumber,
    Map<String, dynamic> body,
  ) =>
      _c.postJson(
        '/admin/users/$userId/devices/$deviceId/pistons/$pistonNumber',
        body,
        bearerOverride: _a,
      );

  Future<Map<String, dynamic>?> createUserDevice(
    String userId,
    Map<String, dynamic> body,
  ) =>
      _c.postJson('/admin/users/$userId/devices', body, bearerOverride: _a);

  Future<dynamic> userTelemetry(String userId, {int? limit}) {
    final q = limit != null ? {'limit': '$limit'} : null;
    return _c.getJsonAny('/admin/users/$userId/telemetry', query: q, bearerOverride: _a);
  }
}
