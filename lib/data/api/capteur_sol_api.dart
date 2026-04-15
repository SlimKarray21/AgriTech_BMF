import 'api_client.dart';

class CapteurSolApi {
  CapteurSolApi(this._c);
  final ApiClient _c;

  Future<Map<String, dynamic>?> createWizardParcelle(Map<String, dynamic> body) =>
      _c.postJson('/wizard/parcelles', body);

  Future<dynamic> listParcelles({int? userId}) {
    final q = <String, String>{};
    if (userId != null) q['userId'] = '$userId';
    return _c.getJsonAny('/parcelles', query: q.isEmpty ? null : q);
  }

  Future<dynamic> listVannes({int? parcelId, int? userId}) {
    final q = <String, String>{};
    if (parcelId != null) q['parcelId'] = '$parcelId';
    if (userId != null) q['userId'] = '$userId';
    return _c.getJsonAny('/vannes', query: q.isEmpty ? null : q);
  }

  Future<Map<String, dynamic>?> getParcelleDetails(int id, {int? userId}) {
    final q = <String, String>{};
    if (userId != null) q['userId'] = '$userId';
    return _c.getJson('/parcelles/$id', query: q.isEmpty ? null : q);
  }

  Future<Map<String, dynamic>?> updateVanne(int id, Map<String, dynamic> body) {
    return _c.patchJson('/vannes/$id', body);
  }
}
