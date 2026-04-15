import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

/// Base URL du backend Ktor (sans slash final recommandé).
///
/// `flutter run --dart-define=API_BASE_URL=https://api.example.com`
///
/// Sans `--dart-define` : émulateur Android → `10.0.2.2`, navigateur (web) → `localhost`.
class ApiConfig {
  ApiConfig._();

  static const String _fromEnv = String.fromEnvironment('API_BASE_URL');

  static String get baseUrl {
    if (_fromEnv.isNotEmpty) return _fromEnv;
    if (kIsWeb) return 'http://localhost:8080';
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:8080';
    }
    return 'http://localhost:8080';
  }

  static Uri _rootUri() => Uri.parse(
        baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl,
      );

  /// WebSocket temps réel (`/ws`).
  static Uri websocketUri([String path = '/ws']) {
    final u = _rootUri();
    final scheme = u.scheme == 'https' ? 'wss' : 'ws';
    final p = path.startsWith('/') ? path : '/$path';
    final basePath = u.path.isEmpty || u.path == '/' ? '' : u.path.replaceAll(RegExp(r'/$'), '');
    final fullPath = '$basePath$p'.replaceAll('//', '/');
    return Uri(scheme: scheme, userInfo: u.userInfo, host: u.host, port: u.hasPort ? u.port : null, path: fullPath.isEmpty ? '/' : fullPath);
  }

  /// `GET /avatars/{filename}` (public).
  static Uri avatarPublicUrl(String filename) {
    final root = _rootUri();
    final basePath = root.path.isEmpty || root.path == '/' ? '' : root.path.replaceAll(RegExp(r'/$'), '');
    final path = '$basePath/avatars/$filename'.replaceAll('//', '/');
    return root.replace(path: path);
  }
}
