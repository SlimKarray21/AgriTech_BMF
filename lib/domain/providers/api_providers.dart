import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../../data/api/api_client.dart';
import '../../data/api/auth_api.dart';
import '../../data/api/capteur_sol_api.dart';
import '../../data/api/devices_api.dart';
import '../../data/api/health_api.dart';
import '../../data/api/schedules_api.dart';
import '../../data/api/telemetry_api.dart';
import '../../data/api/user_api.dart';

const _jwtPrefsKey = 'user_jwt';

/// Fourni depuis [main] via [ProviderScope.overrides].
final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('sharedPreferencesProvider must be overridden in main.dart');
});

final _httpClientProvider = Provider<http.Client>((ref) {
  final c = http.Client();
  ref.onDispose(c.close);
  return c;
});

class UserJwtNotifier extends Notifier<String?> {
  @override
  String? build() {
    final prefs = ref.watch(sharedPreferencesProvider);
    return prefs.getString(_jwtPrefsKey);
  }

  Future<void> setToken(String? token) async {
    final prefs = ref.read(sharedPreferencesProvider);
    final normalized = token
        ?.replaceFirst(RegExp(r'^Bearer\s+', caseSensitive: false), '')
        .trim();
    if (normalized == null || normalized.isEmpty) {
      await prefs.remove(_jwtPrefsKey);
      state = null;
    } else {
      await prefs.setString(_jwtPrefsKey, normalized);
      state = normalized;
    }
  }
}

final userJwtProvider = NotifierProvider<UserJwtNotifier, String?>(UserJwtNotifier.new);

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(
    client: ref.watch(_httpClientProvider),
    getUserToken: () => ref.read(userJwtProvider),
  );
});

/// Façade API alignée sur les routes Ktor (`/auth`, `/user`, `/devices`, etc.).
class UiEarthApi {
  UiEarthApi(ApiClient c)
      : auth = AuthApi(c),
        user = UserApi(c),
        devices = DevicesApi(c),
        capteurSol = CapteurSolApi(c),
        schedules = SchedulesApi(c),
        telemetry = TelemetryApi(c),
        health = HealthApi(c);

  final AuthApi auth;
  final UserApi user;
  final DevicesApi devices;
  final CapteurSolApi capteurSol;
  final SchedulesApi schedules;
  final TelemetryApi telemetry;
  final HealthApi health;
}

final uiEarthApiProvider = Provider<UiEarthApi>((ref) {
  return UiEarthApi(ref.watch(apiClientProvider));
});
