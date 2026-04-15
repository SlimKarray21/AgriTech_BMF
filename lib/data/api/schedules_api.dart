import 'api_client.dart';

class SchedulesApi {
  SchedulesApi(this._c);
  final ApiClient _c;

  Future<Map<String, dynamic>?> create(Map<String, dynamic> body) =>
      _c.postJson('/schedules', body);

  Future<dynamic> list() => _c.getJsonAny('/schedules');

  Future<Map<String, dynamic>?> getById(String id) => _c.getJson('/schedules/$id');

  Future<dynamic> listForDevice(String deviceId) =>
      _c.getJsonAny('/schedules/device/$deviceId');

  Future<Map<String, dynamic>?> patch(String id, Map<String, dynamic> body) =>
      _c.patchJson('/schedules/$id', body);

  Future<Map<String, dynamic>?> delete(String id) => _c.deleteJson('/schedules/$id');
}
