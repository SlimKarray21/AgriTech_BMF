import 'api_client.dart';

class UserApi {
  UserApi(this._c);
  final ApiClient _c;

  Future<Map<String, dynamic>?> getProfile() => _c.getJson('/user/profile');

  Future<Map<String, dynamic>?> updateProfile(Map<String, dynamic> body) =>
      _c.putJson('/user/profile', body);

  Future<Map<String, dynamic>?> updatePreferences(Map<String, dynamic> body) =>
      _c.putJson('/user/preferences', body);

  Future<Map<String, dynamic>?> uploadAvatar(List<int> bytes, String filename) =>
      _c.postMultipartAvatar('/user/avatar', bytes, filename);

  Future<Map<String, dynamic>?> deleteAvatar() => _c.deleteJson('/user/avatar');
}
