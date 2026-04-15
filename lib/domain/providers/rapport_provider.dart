import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uiearth_flutter/data/models/rapport.dart';

class RapportsNotifier extends StateNotifier<List<Rapport>> {
  RapportsNotifier() : super(initialRapports);

  List<Rapport> byType(RapportType type) =>
      state.where((r) => r.type == type).toList();

  Rapport? byId(String id) {
    try {
      return state.firstWhere((r) => r.id == id);
    } catch (_) {
      return null;
    }
  }

  void addRapport(Rapport rapport) {
    state = [rapport, ...state];
  }

  void removeRapport(String id) {
    state = state.where((r) => r.id != id).toList();
  }
}

final rapportsProvider =
    StateNotifierProvider<RapportsNotifier, List<Rapport>>((ref) {
  return RapportsNotifier();
});
