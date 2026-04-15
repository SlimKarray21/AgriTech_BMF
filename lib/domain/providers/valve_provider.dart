import 'dart:collection';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:uiearth_flutter/data/models/parcelle.dart';

class ValveModel {
  final String id;
  final int? backendId;
  final String parcelleId;
  final String parcelleName;
  final String name;
  final bool isOpen;
  final bool isAuto;
  final String? schedule;
  final String startTime;
  final String endTime;
  final Set<int> selectedWeekDays;
  final int nbPlants;
  final double debit;
  final String lastAction;
  final double irrigationProgress;

  const ValveModel({
    required this.id,
    this.backendId,
    required this.parcelleId,
    required this.parcelleName,
    required this.name,
    required this.isOpen,
    required this.isAuto,
    required this.schedule,
    required this.startTime,
    required this.endTime,
    required this.selectedWeekDays,
    required this.nbPlants,
    required this.debit,
    required this.lastAction,
    required this.irrigationProgress,
  });

  String get status => isOpen ? 'open' : 'close';

  String get scheduleLabel => '$startTime - $endTime';

  ValveModel copyWith({
    String? id,
    int? backendId,
    String? parcelleId,
    String? parcelleName,
    String? name,
    bool? isOpen,
    bool? isAuto,
    String? schedule,
    String? startTime,
    String? endTime,
    Set<int>? selectedWeekDays,
    int? nbPlants,
    double? debit,
    String? lastAction,
    double? irrigationProgress,
  }) {
    return ValveModel(
      id: id ?? this.id,
      backendId: backendId ?? this.backendId,
      parcelleId: parcelleId ?? this.parcelleId,
      parcelleName: parcelleName ?? this.parcelleName,
      name: name ?? this.name,
      isOpen: isOpen ?? this.isOpen,
      isAuto: isAuto ?? this.isAuto,
      schedule: schedule ?? this.schedule,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      selectedWeekDays: selectedWeekDays ?? this.selectedWeekDays,
      nbPlants: nbPlants ?? this.nbPlants,
      debit: debit ?? this.debit,
      lastAction: lastAction ?? this.lastAction,
      irrigationProgress: irrigationProgress ?? this.irrigationProgress,
    );
  }
}

class ValveProvider extends ChangeNotifier {
  ValveProvider() : _valves = _buildInitialValves();

  final List<ValveModel> _valves;

  UnmodifiableListView<ValveModel> get valves => UnmodifiableListView(_valves);

  ValveModel? byId(String id) {
    try {
      return _valves.firstWhere((v) => v.id == id);
    } catch (_) {
      return null;
    }
  }

  List<ValveModel> byParcelle(String parcelleId) {
    return _valves.where((v) => v.parcelleId == parcelleId).toList(growable: false);
  }

  void toggleValve(String id) {
    final index = _valves.indexWhere((v) => v.id == id);
    if (index == -1) return;

    final current = _valves[index];
    final nextOpen = !current.isOpen;
    final nextDebit = nextOpen
        ? (current.debit > 0 ? current.debit : (Random().nextDouble() * 2 + 1.5))
        : 0.0;

    _valves[index] = current.copyWith(
      isOpen: nextOpen,
      debit: nextDebit,
      lastAction: '${nextOpen ? "Ouvert" : "Fermé"} à l\'instant',
      irrigationProgress: _computeProgress(nextDebit),
    );
    notifyListeners();
  }

  void setAutoMode(String id, {String? schedule, bool? enabled}) {
    final index = _valves.indexWhere((v) => v.id == id);
    if (index == -1) return;

    final current = _valves[index];
    final nextAuto = enabled ?? !current.isAuto;
    _valves[index] = current.copyWith(
      isAuto: nextAuto,
      schedule: schedule ?? current.schedule,
      lastAction: nextAuto ? 'Mode auto activé' : 'Mode auto désactivé',
    );
    notifyListeners();
  }

  void updateSchedule(
    String id, {
    String? startTime,
    String? endTime,
    Set<int>? selectedWeekDays,
  }) {
    final index = _valves.indexWhere((v) => v.id == id);
    if (index == -1) return;

    final current = _valves[index];
    final nextStart = startTime ?? current.startTime;
    final nextEnd = endTime ?? current.endTime;
    final nextDays = selectedWeekDays ?? current.selectedWeekDays;

    _valves[index] = current.copyWith(
      startTime: nextStart,
      endTime: nextEnd,
      selectedWeekDays: Set<int>.from(nextDays),
      schedule: '$nextStart - $nextEnd',
      lastAction: 'Programmation mise à jour',
    );
    notifyListeners();
  }

  void toggleWeekDay(String id, int day) {
    final index = _valves.indexWhere((v) => v.id == id);
    if (index == -1) return;

    final current = _valves[index];
    final nextDays = Set<int>.from(current.selectedWeekDays);
    if (nextDays.contains(day)) {
      nextDays.remove(day);
    } else {
      nextDays.add(day);
    }

    updateSchedule(id, selectedWeekDays: nextDays);
  }

  void updateProgress(String id, double value) {
    final index = _valves.indexWhere((v) => v.id == id);
    if (index == -1) return;

    _valves[index] = _valves[index].copyWith(
      irrigationProgress: value.clamp(0, 100).toDouble(),
    );
    notifyListeners();
  }

  void replaceFromParcelles(List<ParcelleData> parcelles) {
    _valves
      ..clear()
      ..addAll(_buildValvesFromParcelles(parcelles));
    notifyListeners();
  }

  static double _computeProgress(double debit) {
    if (debit <= 0) return 0;
    return ((debit / 5) * 100).clamp(0, 100).toDouble();
  }

  static List<ValveModel> _buildInitialValves() {
    return _buildValvesFromParcelles(initialParcelles);
  }

  static List<ValveModel> _buildValvesFromParcelles(List<ParcelleData> parcelles) {
    final result = <ValveModel>[];
    for (final parcelle in parcelles) {
      for (var i = 0; i < parcelle.vannes.length; i++) {
        final v = parcelle.vannes[i];
        final localId = v.backendId != null
            ? 'backend_${v.backendId}'
            : '${parcelle.id}_${i + 1}';
        result.add(
          ValveModel(
            id: localId,
            backendId: v.backendId,
            parcelleId: parcelle.id,
            parcelleName: parcelle.name,
            name: v.name,
            isOpen: v.isOpen,
            isAuto: v.isAuto,
            schedule: v.schedule,
            startTime: _parseSchedule(v.schedule).$1,
            endTime: _parseSchedule(v.schedule).$2,
            selectedWeekDays: v.isAuto ? <int>{1, 3, 5} : <int>{},
            nbPlants: v.nbPlants,
            debit: v.debit,
            lastAction: v.lastAction,
            irrigationProgress: _computeProgress(v.debit),
          ),
        );
      }
    }
    return result;
  }

  static (String, String) _parseSchedule(String? schedule) {
    if (schedule == null || schedule.trim().isEmpty) {
      return ('06:00', '08:00');
    }

    final match = RegExp(r'(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})').firstMatch(schedule);
    if (match == null) {
      return ('06:00', '08:00');
    }

    final rawStart = match.group(1) ?? '06:00';
    final rawEnd = match.group(2) ?? '08:00';
    final start = rawStart.length == 4 ? '0$rawStart' : rawStart;
    final end = rawEnd.length == 4 ? '0$rawEnd' : rawEnd;
    return (start, end);
  }
}
