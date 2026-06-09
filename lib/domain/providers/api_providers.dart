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
const _jwtLastActiveKey = 'user_jwt_last_active';

/// Délai d'inactivité (app fermée/arrière-plan) au-delà duquel le token expire.
const Duration kJwtInactivityTimeout = Duration(minutes: 5);

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
  int get _nowMs => DateTime.now().millisecondsSinceEpoch;

  @override
  String? build() {
    final prefs = ref.watch(sharedPreferencesProvider);
    final token = prefs.getString(_jwtPrefsKey);
    if (token == null || token.isEmpty) return null;

    // Expiration par inactivité : si l'app est restée fermée > 5 min, on efface.
    final lastActive = prefs.getInt(_jwtLastActiveKey);
    if (lastActive != null && (_nowMs - lastActive) > kJwtInactivityTimeout.inMilliseconds) {
      prefs.remove(_jwtPrefsKey);
      prefs.remove(_jwtLastActiveKey);
      return null;
    }
    // Session encore valide : on rafraîchit l'horodatage d'activité.
    prefs.setInt(_jwtLastActiveKey, _nowMs);
    return token;
  }

  Future<void> setToken(String? token) async {
    final prefs = ref.read(sharedPreferencesProvider);
    final normalized = token
        ?.replaceFirst(RegExp(r'^Bearer\s+', caseSensitive: false), '')
        .trim();
    if (normalized == null || normalized.isEmpty) {
      // Déconnexion : on efface immédiatement token + horodatage.
      await prefs.remove(_jwtPrefsKey);
      await prefs.remove(_jwtLastActiveKey);
      state = null;
    } else {
      await prefs.setString(_jwtPrefsKey, normalized);
      await prefs.setInt(_jwtLastActiveKey, _nowMs);
      state = normalized;
    }
  }

  /// Enregistre l'instant courant comme dernière activité.
  /// À appeler quand l'app passe en arrière-plan : démarre le cooldown de 5 min.
  Future<void> markActivity() async {
    if (state == null || state!.isEmpty) return;
    final prefs = ref.read(sharedPreferencesProvider);
    await prefs.setInt(_jwtLastActiveKey, _nowMs);
  }

  /// Vérifie l'expiration (à appeler au retour au premier plan).
  /// Si l'app est restée en arrière-plan > 5 min, efface le token (re-login requis).
  Future<void> enforceExpiry() async {
    final prefs = ref.read(sharedPreferencesProvider);
    final token = prefs.getString(_jwtPrefsKey);
    if (token == null || token.isEmpty) return;

    final lastActive = prefs.getInt(_jwtLastActiveKey);
    if (lastActive != null && (_nowMs - lastActive) > kJwtInactivityTimeout.inMilliseconds) {
      await prefs.remove(_jwtPrefsKey);
      await prefs.remove(_jwtLastActiveKey);
      state = null;
    } else {
      await prefs.setInt(_jwtLastActiveKey, _nowMs);
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
