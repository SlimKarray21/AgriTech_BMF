import 'api_client.dart';

class HealthApi {
  HealthApi(this._c);
  final ApiClient _c;

  Future<Map<String, dynamic>?> getHealth() =>
      _c.getJson('/health', useAuth: false);

  Future<void> headHealth() => _c.head('/health', useAuth: false);
}
