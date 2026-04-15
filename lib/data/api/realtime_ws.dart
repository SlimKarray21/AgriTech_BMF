import 'dart:convert';

import 'package:web_socket_channel/web_socket_channel.dart';

import 'api_config.dart';
import 'realtime_channel_impl_io.dart'
    if (dart.library.html) 'realtime_channel_impl_web.dart' as channel_impl;

/// WebSocket `/ws` — sur VM, en-tête `Authorization: Bearer` (voir [channel_impl]).
///
/// Sur **web**, ajouter le JWT en query avec [tokenQueryKey] (ex. `token`) si le serveur
/// l’exige, car le navigateur n’envoie pas toujours les en-têtes personnalisés.
class RealtimeWs {
  RealtimeWs._();

  static WebSocketChannel connect({
    Uri? uri,
    required String userJwt,
    Map<String, String>? extraHeaders,
    /// Ex. `token` — ajoute `?token=<jwt>` à l’URI (utile web + certains proxys).
    String? tokenQueryKey,
  }) {
    var u = uri ?? ApiConfig.websocketUri('/ws');
    if (tokenQueryKey != null && tokenQueryKey.isNotEmpty) {
      u = u.replace(
        queryParameters: {
          ...u.queryParameters,
          tokenQueryKey: userJwt,
        },
      );
    }
    final headers = {
      'Authorization': 'Bearer $userJwt',
      ...?extraHeaders,
    };
    return channel_impl.openRealtimeChannel(u, headers);
  }

  static Stream<dynamic> decodeJsonStream(WebSocketChannel channel) {
    return channel.stream.map((event) {
      if (event is String) {
        try {
          return jsonDecode(event);
        } catch (_) {
          return event;
        }
      }
      return event;
    });
  }
}
