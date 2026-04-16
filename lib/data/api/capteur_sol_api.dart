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

  Future<Map<String, dynamic>?> createRapportEau(Map<String, dynamic> body) {
    return _c.postJson('/rapports/eau', body);
  }

  Future<Map<String, dynamic>?> createRapportSol(Map<String, dynamic> body) {
    return _c.postJson('/rapports/sol', body);
  }

  Future<dynamic> listRapportsEau({int? userId, int? parcelId}) {
    final q = <String, String>{};
    if (userId != null) q['userId'] = '$userId';
    if (parcelId != null) q['parcelId'] = '$parcelId';
    return _c.getJsonAny('/rapports/eau', query: q.isEmpty ? null : q);
  }

  Future<Map<String, dynamic>?> getRapportEauById(String id) {
    return _c.getJson('/rapports/eau/$id');
  }

  Future<dynamic> listRapportsSol({int? userId, int? parcelId}) {
    final q = <String, String>{};
    if (userId != null) q['userId'] = '$userId';
    if (parcelId != null) q['parcelId'] = '$parcelId';
    return _c.getJsonAny('/rapports/sol', query: q.isEmpty ? null : q);
  }

  Future<Map<String, dynamic>?> getRapportSolById(String id) {
    return _c.getJson('/rapports/sol/$id');
  }

  Future<Map<String, dynamic>?> deleteRapportEau(String id) {
    return _c.deleteJson('/rapports/eau/$id');
  }

  Future<Map<String, dynamic>?> deleteRapportSol(String id) {
    return _c.deleteJson('/rapports/sol/$id');
  }
}
