import 'api_client.dart';

class DevicesApi {
  DevicesApi(this._c);
  final ApiClient _c;

  Future<Map<String, dynamic>?> createDevice(Map<String, dynamic> body) =>
      _c.postJson('/devices', body);

  Future<dynamic> listDevices() => _c.getJsonAny('/devices');

  Future<Map<String, dynamic>?> getDevice(String id) =>
      _c.getJson('/devices/$id');

  Future<Map<String, dynamic>?> pistonCommand(
    String deviceId,
    int pistonNumber,
    Map<String, dynamic> body,
  ) =>
      _c.postJson('/devices/$deviceId/pistons/$pistonNumber', body);

  Future<dynamic> listPistons(String deviceId) =>
      _c.getJsonAny('/devices/$deviceId/pistons');

  Future<dynamic> getDeviceStats(String deviceId) =>
      _c.getJsonAny('/devices/$deviceId/stats');
}
