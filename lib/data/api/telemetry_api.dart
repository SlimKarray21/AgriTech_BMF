import 'api_client.dart';

class TelemetryApi {
  TelemetryApi(this._c);
  final ApiClient _c;

  /// Query : deviceId, pistonNumber, action, startDate, endDate, limit (1–1000, défaut 100).
  Future<dynamic> getTelemetry({
    String? deviceId,
    String? pistonNumber,
    String? action,
    String? startDate,
    String? endDate,
    int? limit,
  }) {
    final q = <String, String>{};
    if (deviceId != null) q['deviceId'] = deviceId;
    if (pistonNumber != null) q['pistonNumber'] = pistonNumber;
    if (action != null) q['action'] = action;
    if (startDate != null) q['startDate'] = startDate;
    if (endDate != null) q['endDate'] = endDate;
    if (limit != null) q['limit'] = '$limit';
    return _c.getJsonAny('/telemetry', query: q.isEmpty ? null : q);
  }
}
