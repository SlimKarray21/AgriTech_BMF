import 'dart:convert';

import 'package:http/http.dart' as http;

import 'api_config.dart';
import 'api_exception.dart';

typedef TokenGetter = String? Function();

/// Client HTTP JSON + JWT Bearer pour l’API mobile.
class ApiClient {
  ApiClient({
    required this.client,
    String? baseUrl,
    this.getUserToken,
  }) : baseUrl = baseUrl ?? ApiConfig.baseUrl;

  final http.Client client;
  final String baseUrl;
  final TokenGetter? getUserToken;

  Uri uri(String path, [Map<String, String>? query]) {
    final root = baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;
    final p = path.startsWith('/') ? path : '/$path';
    final u = Uri.parse('$root$p');
    if (query == null || query.isEmpty) return u;
    return u.replace(queryParameters: {...u.queryParameters, ...query});
  }

  String? _bearer({String? bearerOverride, bool useAuth = true}) {
    if (bearerOverride != null) return bearerOverride;
    if (!useAuth) return null;
    return getUserToken?.call();
  }

  Map<String, String> _jsonHeaders({String? bearer}) {
    final h = <String, String>{
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    if (bearer != null && bearer.isNotEmpty) {
      h['Authorization'] = 'Bearer $bearer';
    }
    return h;
  }

  void _throwIfError(http.Response r) {
    if (r.statusCode >= 200 && r.statusCode < 300) return;
    String msg = 'HTTP ${r.statusCode}';
    String? userId;
    int? otpLength;
    int? expiresInMinutes;
    try {
      final map = jsonDecode(r.body);
      if (map is Map) {
        if (map['error'] is String) {
          msg = map['error'] as String;
        } else if (map['message'] is String) {
          msg = map['message'] as String;
        }
        if (map['userId'] is String) {
          userId = map['userId'] as String;
        }
        if (map['otpLength'] is int) {
          otpLength = map['otpLength'] as int;
        }
        if (map['expiresInMinutes'] is int) {
          expiresInMinutes = map['expiresInMinutes'] as int;
        }
      }
    } catch (_) {
      if (r.body.isNotEmpty) msg = r.body;
    }
    throw ApiException(
      msg,
      statusCode: r.statusCode,
      body: r.body,
      userId: userId,
      otpLength: otpLength,
      expiresInMinutes: expiresInMinutes,
    );
  }

  Future<Map<String, dynamic>?> getJson(
    String path, {
    Map<String, String>? query,
    String? bearerOverride,
    bool useAuth = true,
  }) async {
    final r = await client.get(
      uri(path, query),
      headers: _jsonHeaders(bearer: _bearer(bearerOverride: bearerOverride, useAuth: useAuth)),
    );
    _throwIfError(r);
    if (r.body.isEmpty) return null;
    final decoded = jsonDecode(r.body);
    if (decoded is Map<String, dynamic>) return decoded;
    if (decoded is Map) return Map<String, dynamic>.from(decoded);
    return null;
  }

  /// Réponse JSON quelconque (liste, carte, scalaire).
  Future<dynamic> getJsonAny(
    String path, {
    Map<String, String>? query,
    String? bearerOverride,
    bool useAuth = true,
  }) async {
    final r = await client.get(
      uri(path, query),
      headers: _jsonHeaders(bearer: _bearer(bearerOverride: bearerOverride, useAuth: useAuth)),
    );
    _throwIfError(r);
    if (r.body.isEmpty) return null;
    return jsonDecode(r.body);
  }

  Future<void> head(
    String path, {
    String? bearerOverride,
    bool useAuth = true,
  }) async {
    final r = await client.head(
      uri(path),
      headers: _jsonHeaders(bearer: _bearer(bearerOverride: bearerOverride, useAuth: useAuth)),
    );
    _throwIfError(r);
  }

  Future<Map<String, dynamic>?> postJson(
    String path,
    Object? body, {
    String? bearerOverride,
    bool useAuth = true,
  }) async {
    final r = await client.post(
      uri(path),
      headers: _jsonHeaders(bearer: _bearer(bearerOverride: bearerOverride, useAuth: useAuth)),
      body: body == null ? null : jsonEncode(body),
    );
    _throwIfError(r);
    if (r.body.isEmpty) return null;
    final decoded = jsonDecode(r.body);
    if (decoded is Map<String, dynamic>) return decoded;
    if (decoded is Map) return Map<String, dynamic>.from(decoded);
    return null;
  }

  Future<Map<String, dynamic>?> putJson(
    String path,
    Object? body, {
    String? bearerOverride,
    bool useAuth = true,
  }) async {
    final r = await client.put(
      uri(path),
      headers: _jsonHeaders(bearer: _bearer(bearerOverride: bearerOverride, useAuth: useAuth)),
      body: body == null ? null : jsonEncode(body),
    );
    _throwIfError(r);
    if (r.body.isEmpty) return null;
    final decoded = jsonDecode(r.body);
    if (decoded is Map<String, dynamic>) return decoded;
    if (decoded is Map) return Map<String, dynamic>.from(decoded);
    return null;
  }

  Future<Map<String, dynamic>?> patchJson(
    String path,
    Object? body, {
    String? bearerOverride,
    bool useAuth = true,
  }) async {
    final r = await client.patch(
      uri(path),
      headers: _jsonHeaders(bearer: _bearer(bearerOverride: bearerOverride, useAuth: useAuth)),
      body: body == null ? null : jsonEncode(body),
    );
    _throwIfError(r);
    if (r.body.isEmpty) return null;
    final decoded = jsonDecode(r.body);
    if (decoded is Map<String, dynamic>) return decoded;
    if (decoded is Map) return Map<String, dynamic>.from(decoded);
    return null;
  }

  Future<Map<String, dynamic>?> deleteJson(
    String path, {
    String? bearerOverride,
    bool useAuth = true,
  }) async {
    final r = await client.delete(
      uri(path),
      headers: _jsonHeaders(bearer: _bearer(bearerOverride: bearerOverride, useAuth: useAuth)),
    );
    _throwIfError(r);
    if (r.body.isEmpty) return null;
    final decoded = jsonDecode(r.body);
    if (decoded is Map<String, dynamic>) return decoded;
    if (decoded is Map) return Map<String, dynamic>.from(decoded);
    return null;
  }

  /// `multipart/form-data`, champ fichier `avatar` (max 5 Mo côté serveur).
  Future<Map<String, dynamic>?> postMultipartAvatar(
    String path,
    List<int> fileBytes,
    String filename, {
    String? bearerOverride,
  }) async {
    final request = http.MultipartRequest('POST', uri(path));
    final token = bearerOverride ?? getUserToken?.call();
    if (token != null && token.isNotEmpty) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    request.files.add(
      http.MultipartFile.fromBytes(
        'avatar',
        fileBytes,
        filename: filename,
      ),
    );
    final streamed = await client.send(request);
    final r = await http.Response.fromStream(streamed);
    _throwIfError(r);
    if (r.body.isEmpty) return null;
    final decoded = jsonDecode(r.body);
    if (decoded is Map<String, dynamic>) return decoded;
    if (decoded is Map) return Map<String, dynamic>.from(decoded);
    return null;
  }
}
