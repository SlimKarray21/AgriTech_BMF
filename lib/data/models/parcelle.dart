// Data models mirroring ParcellesContext.tsx types.

class Vanne {
  final int? backendId;
  final String name;
  final bool isOpen;
  final bool isAuto;
  final double debit;
  final String lastAction;
  final String? schedule;
  final int nbPlants;

  const Vanne({
    this.backendId,
    required this.name,
    this.isOpen = false,
    this.isAuto = false,
    this.debit = 0,
    this.lastAction = '',
    this.schedule,
    this.nbPlants = 0,
  });

  Vanne copyWith({
    int? backendId,
    String? name,
    bool? isOpen,
    bool? isAuto,
    double? debit,
    String? lastAction,
    String? schedule,
    int? nbPlants,
  }) {
    return Vanne(
      backendId: backendId ?? this.backendId,
      name: name ?? this.name,
      isOpen: isOpen ?? this.isOpen,
      isAuto: isAuto ?? this.isAuto,
      debit: debit ?? this.debit,
      lastAction: lastAction ?? this.lastAction,
      schedule: schedule ?? this.schedule,
      nbPlants: nbPlants ?? this.nbPlants,
    );
  }

  factory Vanne.fromBackendMap(Map<String, dynamic> map) {
    final start = map['scheduleStart']?.toString();
    final end = map['scheduleEnd']?.toString();
    final schedule = (start != null && start.isNotEmpty && end != null && end.isNotEmpty)
        ? '$start - $end'
        : null;
    return Vanne(
      backendId: (map['id'] as num?)?.toInt(),
      name: map['name']?.toString() ?? 'Vanne',
      isOpen: map['isOpen'] == true,
      isAuto: map['isAuto'] == true,
      debit: (map['debit'] as num?)?.toDouble() ?? 0,
      lastAction: map['lastAction']?.toString() ?? '',
      schedule: schedule,
      nbPlants: (map['nbPlants'] as num?)?.toInt() ?? 0,
    );
  }
}

class PlantInfo {
  final String name;
  final String type;
  final int age;
  final int count;
  final double waterNeedPerPlant;

  const PlantInfo({
    required this.name,
    required this.type,
    this.age = 0,
    this.count = 0,
    this.waterNeedPerPlant = 2,
  });

  factory PlantInfo.fromBackendMap(Map<String, dynamic> map) {
    return PlantInfo(
      name: map['name']?.toString() ?? 'Plante',
      type: map['type']?.toString() ?? 'autre',
      age: (map['age'] as num?)?.toInt() ?? 0,
      count: (map['count'] as num?)?.toInt() ?? 0,
      waterNeedPerPlant: (map['waterNeedPerPlant'] as num?)?.toDouble() ?? 2,
    );
  }
}

class SoilData {
  final String temperature;
  final String humidity;
  final String ph;

  const SoilData({
    this.temperature = '—',
    this.humidity = '—',
    this.ph = '—',
  });
}

class ClimateData {
  final String airTemp;
  final String humidity;
  final String sunshine;
  final String wind;

  const ClimateData({
    this.airTemp = '—',
    this.humidity = '—',
    this.sunshine = '—',
    this.wind = '—',
  });
}

class Operation {
  final String date;
  final String action;
  final String type;

  const Operation({
    required this.date,
    required this.action,
    required this.type,
  });
}

class ParcelleData {
  final int? backendId;
  final String id;
  final String name;
  final String culture;
  final String status; // "connecté" | "non connecté"
  final String area;
  final List<PlantInfo> plants;
  final SoilData soil;
  final ClimateData climate;
  final List<Vanne> vannes;
  final List<Operation> operations;

  const ParcelleData({
    this.backendId,
    required this.id,
    required this.name,
    required this.culture,
    this.status = 'connecté',
    required this.area,
    this.plants = const [],
    this.soil = const SoilData(),
    this.climate = const ClimateData(),
    this.vannes = const [],
    this.operations = const [],
  });

  bool get isConnected => status == 'connecté';

  ParcelleData copyWith({
    int? backendId,
    String? id,
    String? name,
    String? culture,
    String? status,
    String? area,
    List<PlantInfo>? plants,
    SoilData? soil,
    ClimateData? climate,
    List<Vanne>? vannes,
    List<Operation>? operations,
  }) {
    return ParcelleData(
      backendId: backendId ?? this.backendId,
      id: id ?? this.id,
      name: name ?? this.name,
      culture: culture ?? this.culture,
      status: status ?? this.status,
      area: area ?? this.area,
      plants: plants ?? this.plants,
      soil: soil ?? this.soil,
      climate: climate ?? this.climate,
      vannes: vannes ?? this.vannes,
      operations: operations ?? this.operations,
    );
  }

  factory ParcelleData.fromBackendMap(Map<String, dynamic> map) {
    final tailleHa = (map['tailleHa'] as num?)?.toDouble() ?? 0.0;
    final nomSurface = map['nomSurface']?.toString() ?? 'Parcelle';
    return ParcelleData(
      backendId: (map['id'] as num?)?.toInt(),
      id: (map['id'] ?? '').toString(),
      name: nomSurface,
      culture: map['culture']?.toString().trim().isNotEmpty == true
          ? map['culture'].toString()
          : 'Culture',
      status: map['status']?.toString() == 'connecté' ? 'connecté' : 'non connecté',
      area: '${tailleHa.toStringAsFixed(1)} ha',
      soil: const SoilData(),
      climate: const ClimateData(),
      operations: const [],
    );
  }

  factory ParcelleData.fromBackendDetails(Map<String, dynamic> details) {
    final parcelle = details['parcelle'] is Map
        ? Map<String, dynamic>.from(details['parcelle'] as Map)
        : <String, dynamic>{};
    final rawPlants = details['plants'] is List ? (details['plants'] as List) : const [];
    final rawVannes = details['vannes'] is List ? (details['vannes'] as List) : const [];

    final plants = rawPlants
        .whereType<Map>()
        .map((e) => PlantInfo.fromBackendMap(Map<String, dynamic>.from(e)))
        .toList(growable: false);
    final vannes = rawVannes
        .whereType<Map>()
        .map((e) => Vanne.fromBackendMap(Map<String, dynamic>.from(e)))
        .toList(growable: false);

    return ParcelleData.fromBackendMap(parcelle).copyWith(
      culture: (details['culture']?.toString().trim().isNotEmpty ?? false)
          ? details['culture'].toString()
          : (plants.isNotEmpty ? plants.first.name : 'Culture'),
      status: details['status']?.toString() == 'connecté' ? 'connecté' : 'non connecté',
      plants: plants,
      vannes: vannes,
      soil: const SoilData(),
      climate: const ClimateData(),
      operations: const [],
    );
  }
}

// ─── Utility functions ───

double getWaterNeed(int age) {
  if (age <= 1) return 2;
  if (age <= 3) return 5;
  if (age <= 5) return 8;
  return 12;
}

int getIrrigationProgress(ParcelleData parcelle) {
  final totalWaterNeed = parcelle.plants.fold<double>(
    0,
    (sum, p) => sum + p.count * p.waterNeedPerPlant,
  );
  if (totalWaterNeed == 0) return 0;
  final totalDebit = parcelle.vannes
      .where((v) => v.isOpen)
      .fold<double>(0, (sum, v) => sum + v.debit);
  return ((totalDebit / totalWaterNeed) * 100).round();
}

double getWaterPerPlant(Vanne vanne, {int durationMinutes = 60}) {
  if (vanne.nbPlants == 0) return 0;
  final totalWater = vanne.debit * durationMinutes;
  return (totalWater / vanne.nbPlants * 10).roundToDouble() / 10;
}

// ─── Initial mock data ───

List<ParcelleData> initialParcelles = [
  ParcelleData(
    id: '1',
    name: 'Blé-Nord',
    culture: 'Blé tendre',
    status: 'connecté',
    area: '2.5 ha',
    plants: [
      const PlantInfo(name: 'Blé tendre', type: 'cereale', age: 1, count: 500, waterNeedPerPlant: 2),
    ],
    soil: const SoilData(temperature: '18°C', humidity: '45%', ph: '6.8'),
    climate: const ClimateData(airTemp: '24°C', humidity: '72%', sunshine: 'Bon', wind: '12 km/h'),
    vannes: [
      const Vanne(name: 'Vanne 1', isOpen: true, isAuto: true, debit: 2.5, lastAction: 'Ouvert il y a 2h', schedule: '06:00 - 08:00', nbPlants: 250),
      const Vanne(name: 'Vanne 2', isOpen: false, isAuto: false, debit: 0, lastAction: 'Fermé il y a 5h', nbPlants: 250),
    ],
    operations: [
      const Operation(date: "Aujourd'hui 14:00", action: 'Irrigation automatique', type: 'irrigation'),
      const Operation(date: 'Mer. 12 Mars', action: 'Fertilisation NPK', type: 'fertilisation'),
    ],
  ),
  ParcelleData(
    id: '2',
    name: 'Tomates-Sud',
    culture: 'Tomates cerises',
    status: 'connecté',
    area: '0.8 ha',
    plants: [
      const PlantInfo(name: 'Tomate cerise', type: 'legume', age: 0, count: 200, waterNeedPerPlant: 2),
    ],
    soil: const SoilData(temperature: '20°C', humidity: '55%', ph: '6.5'),
    climate: const ClimateData(airTemp: '26°C', humidity: '65%', sunshine: 'Excellent', wind: '8 km/h'),
    vannes: [
      const Vanne(name: 'Vanne 1', isOpen: true, isAuto: true, debit: 1.5, lastAction: 'Ouvert il y a 30min', schedule: '07:00 - 09:30', nbPlants: 200),
    ],
    operations: [
      const Operation(date: 'Demain 06:00', action: 'Ouverture Vanne 1 (auto)', type: 'vanne'),
    ],
  ),
  ParcelleData(
    id: '3',
    name: 'Oliviers-Est',
    culture: 'Olivier',
    status: 'connecté',
    area: '3.2 ha',
    plants: [
      const PlantInfo(name: 'Olivier Chemlali', type: 'arbre', age: 8, count: 120, waterNeedPerPlant: 12),
      const PlantInfo(name: 'Olivier Chétoui', type: 'arbre', age: 5, count: 80, waterNeedPerPlant: 8),
    ],
    soil: const SoilData(temperature: '17°C', humidity: '38%', ph: '7.2'),
    climate: const ClimateData(airTemp: '23°C', humidity: '58%', sunshine: 'Bon', wind: '15 km/h'),
    vannes: [
      const Vanne(name: 'Vanne 1', isOpen: true, isAuto: false, debit: 3.5, lastAction: 'Ouvert il y a 1h', nbPlants: 67),
      const Vanne(name: 'Vanne 2', isOpen: true, isAuto: false, debit: 3.0, lastAction: 'Ouvert il y a 1h', nbPlants: 67),
      const Vanne(name: 'Vanne 3', isOpen: false, isAuto: false, debit: 0, lastAction: 'Fermé hier', nbPlants: 66),
    ],
    operations: [
      const Operation(date: 'Lun. 17 Mars', action: 'Récolte olives', type: 'recolte'),
    ],
  ),
  ParcelleData(
    id: '4',
    name: 'Vigne-Colline',
    culture: 'Raisin',
    status: 'non connecté',
    area: '1.8 ha',
    plants: [
      const PlantInfo(name: 'Muscat', type: 'vigne', age: 4, count: 300, waterNeedPerPlant: 8),
    ],
    soil: const SoilData(temperature: '19°C', humidity: '42%', ph: '6.9'),
    climate: const ClimateData(airTemp: '22°C', humidity: '70%', sunshine: 'Modéré', wind: '10 km/h'),
    vannes: [
      const Vanne(name: 'Vanne 1', isOpen: false, isAuto: false, debit: 0, lastAction: 'Fermé hier', nbPlants: 150),
      const Vanne(name: 'Vanne 2', isOpen: true, isAuto: true, debit: 2.0, lastAction: 'Ouvert il y a 45min', schedule: '08:00 - 10:00', nbPlants: 150),
    ],
    operations: [
      const Operation(date: 'Jeu. 13 Mars', action: 'Taille de formation', type: 'semis'),
    ],
  ),
];
