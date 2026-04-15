import 'dart:math';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uiearth_flutter/data/models/parcelle.dart';

class VanneInfo {
  final Vanne vanne;
  final String parcelleId;
  final String parcelleName;
  final int vanneIndex;
  const VanneInfo({
    required this.vanne,
    required this.parcelleId,
    required this.parcelleName,
    required this.vanneIndex,
  });
}

class ParcellesNotifier extends StateNotifier<List<ParcelleData>> {
  ParcellesNotifier() : super(initialParcelles);

  void replaceAll(List<ParcelleData> parcelles) {
    state = List<ParcelleData>.from(parcelles);
  }

  void toggleVanne(String parcelleId, int vanneIndex) {
    state = [
      for (final p in state)
        if (p.id != parcelleId)
          p
        else
          _toggleVanneInParcelle(p, vanneIndex),
    ];
  }

  ParcelleData _toggleVanneInParcelle(ParcelleData p, int vanneIndex) {
    final vanne = p.vannes[vanneIndex];
    final openCount = p.vannes.where((v) => v.isOpen).length;
    if (vanne.isOpen && openCount <= 1) return p;

    final rng = Random();
    final newVannes = List<Vanne>.from(p.vannes);
    final newOpen = !vanne.isOpen;
    newVannes[vanneIndex] = vanne.copyWith(
      isOpen: newOpen,
      debit: newOpen ? (rng.nextDouble() * 2 + 1.5) : 0,
      lastAction: '${newOpen ? "Ouvert" : "Fermé"} à l\'instant',
    );
    return p.copyWith(vannes: newVannes);
  }

  void toggleVanneAuto(String parcelleId, int vanneIndex) {
    state = [
      for (final p in state)
        if (p.id != parcelleId)
          p
        else
          p.copyWith(
            vannes: [
              for (int i = 0; i < p.vannes.length; i++)
                if (i != vanneIndex)
                  p.vannes[i]
                else
                  p.vannes[i].copyWith(isAuto: !p.vannes[i].isAuto),
            ],
          ),
    ];
  }

  void connectParcelle(String parcelleId) {
    state = [
      for (final p in state)
        if (p.id != parcelleId) p else p.copyWith(status: 'connecté'),
    ];
  }

  void addParcelle(ParcelleData parcelle) {
    state = [...state, parcelle];
  }

  List<VanneInfo> getAllVannes() {
    final result = <VanneInfo>[];
    for (final p in state) {
      for (int i = 0; i < p.vannes.length; i++) {
        result.add(VanneInfo(
          vanne: p.vannes[i],
          parcelleId: p.id,
          parcelleName: p.name,
          vanneIndex: i,
        ));
      }
    }
    return result;
  }
}

final parcellesProvider =
    StateNotifierProvider<ParcellesNotifier, List<ParcelleData>>((ref) {
  return ParcellesNotifier();
});
