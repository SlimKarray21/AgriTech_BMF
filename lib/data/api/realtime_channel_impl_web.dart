import 'package:web_socket_channel/web_socket_channel.dart';

/// Sur web, les en-têtes WebSocket ne sont pas fiables : l’URI doit déjà contenir le token en query si le serveur le supporte.
WebSocketChannel openRealtimeChannel(Uri uri, Map<String, String> headers) {
  return WebSocketChannel.connect(uri);
}
