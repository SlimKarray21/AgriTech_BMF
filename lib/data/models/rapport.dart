import 'package:flutter/material.dart';
import 'package:uiearth_flutter/core/theme/app_colors.dart';

// ─── Enums & Types ───

enum RapportType { eau, sol }

enum InterpLevel { success, warning, danger }

class Interpretation {
  final String text;
  final InterpLevel level;
  const Interpretation({required this.text, required this.level});
}

// ─── Modèle Rapport ───

class Rapport {
  final String id;
  final RapportType type;
  final String name;
  final String date;
  final Map<String, double> data;
  final Map<String, Interpretation> interpretations;

  const Rapport({
    required this.id,
    required this.type,
    required this.name,
    required this.date,
    this.data = const {},
    this.interpretations = const {},
  });

  Color get color =>
      type == RapportType.eau ? AppColors.farmWater : AppColors.farmEarth;
  IconData get icon =>
      type == RapportType.eau ? Icons.water_drop : Icons.terrain;
  String get typeLabel => type == RapportType.eau ? 'Eau' : 'Sol';
}

// ─── Champs de formulaire ───

class FormField {
  final String key;
  final String label;
  final String unit;
  final String placeholder;
  const FormField(
      {required this.key,
      required this.label,
      required this.unit,
      required this.placeholder});
}

class FormSection {
  final String title;
  final List<FormField> fields;
  const FormSection({required this.title, required this.fields});
}

// ─── Sections Eau (RapportEauForm.tsx) ───

final List<FormSection> eauFormSections = [
  FormSection(title: 'Paramètres généraux', fields: [
    FormField(key: 'ph', label: 'pH', unit: '', placeholder: 'ex: 7.2'),
    FormField(
        key: 'ce', label: 'CE', unit: 'dS/m', placeholder: 'ex: 1.5'),
    FormField(
        key: 'residu_sec',
        label: 'Résidu sec',
        unit: 'mg/L',
        placeholder: 'ex: 500'),
  ]),
  FormSection(title: 'Anions & Cations', fields: [
    FormField(
        key: 'chlorures',
        label: 'Chlorures',
        unit: 'meq/L',
        placeholder: 'ex: 3'),
    FormField(
        key: 'sulfates',
        label: 'Sulfates',
        unit: 'meq/L',
        placeholder: 'ex: 2'),
    FormField(
        key: 'bicarbonates',
        label: 'Bicarbonates',
        unit: 'meq/L',
        placeholder: 'ex: 4'),
    FormField(
        key: 'sodium',
        label: 'Sodium',
        unit: 'meq/L',
        placeholder: 'ex: 5'),
    FormField(
        key: 'calcium',
        label: 'Calcium',
        unit: 'meq/L',
        placeholder: 'ex: 3'),
    FormField(
        key: 'magnesium',
        label: 'Magnésium',
        unit: 'meq/L',
        placeholder: 'ex: 2'),
    FormField(
        key: 'potassium',
        label: 'Potassium',
        unit: 'meq/L',
        placeholder: 'ex: 0.5'),
  ]),
  FormSection(title: 'Indices', fields: [
    FormField(key: 'sar', label: 'SAR', unit: '', placeholder: 'ex: 3.5'),
    FormField(
        key: 'durete',
        label: 'Dureté',
        unit: '°F',
        placeholder: 'ex: 25'),
  ]),
];

// ─── Sections Sol (RapportSolForm.tsx) ───

final List<FormSection> solFormSections = [
  FormSection(title: 'Physique (Texture)', fields: [
    FormField(
        key: 'argile', label: 'Argile', unit: '%', placeholder: 'ex: 30'),
    FormField(
        key: 'limon', label: 'Limon', unit: '%', placeholder: 'ex: 40'),
    FormField(
        key: 'sable', label: 'Sable', unit: '%', placeholder: 'ex: 30'),
  ]),
  FormSection(title: 'Chimie', fields: [
    FormField(key: 'ph', label: 'pH', unit: '', placeholder: 'ex: 7.5'),
    FormField(
        key: 'ce', label: 'CE', unit: 'dS/m', placeholder: 'ex: 0.8'),
    FormField(
        key: 'calcaire',
        label: 'Calcaire total',
        unit: '%',
        placeholder: 'ex: 12'),
    FormField(
        key: 'mo',
        label: 'Matière organique',
        unit: '%',
        placeholder: 'ex: 2.5'),
    FormField(
        key: 'cn',
        label: 'Rapport C/N',
        unit: '',
        placeholder: 'ex: 10'),
  ]),
  FormSection(title: 'Fertilité', fields: [
    FormField(
        key: 'p2o5',
        label: 'P₂O₅',
        unit: 'ppm',
        placeholder: 'ex: 25'),
    FormField(
        key: 'k2o', label: 'K₂O', unit: 'ppm', placeholder: 'ex: 200'),
    FormField(
        key: 'mgo', label: 'MgO', unit: 'ppm', placeholder: 'ex: 150'),
  ]),
  FormSection(title: 'Complexe absorbant', fields: [
    FormField(
        key: 'cec',
        label: 'CEC',
        unit: 'meq/100g',
        placeholder: 'ex: 20'),
    FormField(
        key: 'esp', label: 'ESP', unit: '%', placeholder: 'ex: 5'),
  ]),
];

// ─── Labels / Metadata pour le détail ───

class FieldMeta {
  final String label;
  final String unit;
  final String category;
  const FieldMeta(
      {required this.label, required this.unit, required this.category});
}

final Map<String, FieldMeta> eauLabels = {
  'ph': FieldMeta(label: 'pH', unit: '', category: 'Paramètres généraux'),
  'ce': FieldMeta(label: 'CE', unit: 'dS/m', category: 'Paramètres généraux'),
  'residu_sec': FieldMeta(
      label: 'Résidu sec', unit: 'mg/L', category: 'Paramètres généraux'),
  'chlorures':
      FieldMeta(label: 'Chlorures', unit: 'meq/L', category: 'Anions & Cations'),
  'sulfates':
      FieldMeta(label: 'Sulfates', unit: 'meq/L', category: 'Anions & Cations'),
  'bicarbonates': FieldMeta(
      label: 'Bicarbonates', unit: 'meq/L', category: 'Anions & Cations'),
  'sodium':
      FieldMeta(label: 'Sodium', unit: 'meq/L', category: 'Anions & Cations'),
  'calcium':
      FieldMeta(label: 'Calcium', unit: 'meq/L', category: 'Anions & Cations'),
  'magnesium': FieldMeta(
      label: 'Magnésium', unit: 'meq/L', category: 'Anions & Cations'),
  'potassium': FieldMeta(
      label: 'Potassium', unit: 'meq/L', category: 'Anions & Cations'),
  'sar': FieldMeta(label: 'SAR', unit: '', category: 'Indices'),
  'durete': FieldMeta(label: 'Dureté', unit: '°F', category: 'Indices'),
};

final Map<String, FieldMeta> solLabels = {
  'argile':
      FieldMeta(label: 'Argile', unit: '%', category: 'Physique (Texture)'),
  'limon':
      FieldMeta(label: 'Limon', unit: '%', category: 'Physique (Texture)'),
  'sable':
      FieldMeta(label: 'Sable', unit: '%', category: 'Physique (Texture)'),
  'ph': FieldMeta(label: 'pH', unit: '', category: 'Chimie'),
  'ce': FieldMeta(label: 'CE', unit: 'dS/m', category: 'Chimie'),
  'calcaire':
      FieldMeta(label: 'Calcaire total', unit: '%', category: 'Chimie'),
  'mo': FieldMeta(label: 'Matière organique', unit: '%', category: 'Chimie'),
  'cn': FieldMeta(label: 'Rapport C/N', unit: '', category: 'Chimie'),
  'p2o5': FieldMeta(label: 'P₂O₅', unit: 'ppm', category: 'Fertilité'),
  'k2o': FieldMeta(label: 'K₂O', unit: 'ppm', category: 'Fertilité'),
  'mgo': FieldMeta(label: 'MgO', unit: 'ppm', category: 'Fertilité'),
  'cec': FieldMeta(
      label: 'CEC', unit: 'meq/100g', category: 'Complexe absorbant'),
  'esp': FieldMeta(label: 'ESP', unit: '%', category: 'Complexe absorbant'),
};

// ─── Interprétation Sol (reportStorage.ts → interpretSol) ───

Map<String, Interpretation> interpretSol(Map<String, double> d) {
  final r = <String, Interpretation>{};

  // Texture
  final sable = d['sable'];
  final argile = d['argile'];
  final limon = d['limon'];
  if (sable != null && argile != null && limon != null) {
    if (argile > 40) {
      r['texture'] =
          Interpretation(text: 'Sol argileux (lourd)', level: InterpLevel.warning);
    } else if (sable > 70) {
      r['texture'] =
          Interpretation(text: 'Sol sableux (léger)', level: InterpLevel.warning);
    } else {
      r['texture'] =
          Interpretation(text: 'Texture équilibrée', level: InterpLevel.success);
    }
  }

  // pH
  final ph = d['ph'];
  if (ph != null) {
    if (ph < 5.5) {
      r['ph'] = Interpretation(text: 'Très acide', level: InterpLevel.danger);
    } else if (ph < 6.5) {
      r['ph'] = Interpretation(text: 'Acide', level: InterpLevel.warning);
    } else if (ph <= 7.5) {
      r['ph'] = Interpretation(text: 'Optimal', level: InterpLevel.success);
    } else if (ph <= 8.5) {
      r['ph'] = Interpretation(text: 'Alcalin', level: InterpLevel.warning);
    } else {
      r['ph'] =
          Interpretation(text: 'Très alcalin', level: InterpLevel.danger);
    }
  }

  // CE sol
  final ce = d['ce'];
  if (ce != null) {
    if (ce < 0.5) {
      r['ce'] = Interpretation(text: 'Non salin', level: InterpLevel.success);
    } else if (ce < 2) {
      r['ce'] =
          Interpretation(text: 'Peu salin', level: InterpLevel.success);
    } else if (ce < 4) {
      r['ce'] =
          Interpretation(text: 'Modérément salin', level: InterpLevel.warning);
    } else {
      r['ce'] =
          Interpretation(text: 'Très salin', level: InterpLevel.danger);
    }
  }

  // Matière organique
  final mo = d['mo'];
  if (mo != null) {
    if (mo < 1) {
      r['mo'] = Interpretation(text: 'Très faible', level: InterpLevel.danger);
    } else if (mo < 2) {
      r['mo'] = Interpretation(text: 'Faible', level: InterpLevel.warning);
    } else if (mo <= 4) {
      r['mo'] = Interpretation(text: 'Moyen à bon', level: InterpLevel.success);
    } else {
      r['mo'] = Interpretation(text: 'Élevé', level: InterpLevel.success);
    }
  }

  // C/N
  final cn = d['cn'];
  if (cn != null) {
    if (cn < 8) {
      r['cn'] = Interpretation(
          text: 'Minéralisation rapide', level: InterpLevel.warning);
    } else if (cn <= 12) {
      r['cn'] = Interpretation(text: 'Équilibré', level: InterpLevel.success);
    } else {
      r['cn'] = Interpretation(
          text: 'Minéralisation lente', level: InterpLevel.warning);
    }
  }

  // Fertilité
  final p = d['p2o5'];
  final k = d['k2o'];
  final mg = d['mgo'];
  if (p != null || k != null || mg != null) {
    final low = (p != null && p < 15) || (k != null && k < 100);
    if (low) {
      r['fertilite'] = Interpretation(
          text: 'Fertilité faible', level: InterpLevel.danger);
    } else {
      r['fertilite'] = Interpretation(
          text: 'Fertilité correcte', level: InterpLevel.success);
    }
  }

  // CEC
  final cec = d['cec'];
  if (cec != null) {
    if (cec < 10) {
      r['cec'] = Interpretation(text: 'CEC faible', level: InterpLevel.warning);
    } else if (cec <= 25) {
      r['cec'] = Interpretation(text: 'CEC moyenne', level: InterpLevel.success);
    } else {
      r['cec'] = Interpretation(text: 'CEC élevée', level: InterpLevel.success);
    }
  }

  // ESP
  final esp = d['esp'];
  if (esp != null) {
    if (esp < 5) {
      r['esp'] = Interpretation(text: 'Non sodique', level: InterpLevel.success);
    } else if (esp < 15) {
      r['esp'] = Interpretation(text: 'Peu sodique', level: InterpLevel.warning);
    } else {
      r['esp'] = Interpretation(text: 'Sodique', level: InterpLevel.danger);
    }
  }

  return r;
}

// ─── Interprétation Eau (reportStorage.ts → interpretEau) ───

Map<String, Interpretation> interpretEau(Map<String, double> d) {
  final r = <String, Interpretation>{};

  // pH
  final ph = d['ph'];
  if (ph != null) {
    if (ph < 6.5) {
      r['ph'] = Interpretation(text: 'Acide', level: InterpLevel.danger);
    } else if (ph <= 8.5) {
      r['ph'] = Interpretation(text: 'Normal', level: InterpLevel.success);
    } else {
      r['ph'] = Interpretation(text: 'Alcalin', level: InterpLevel.danger);
    }
  }

  // CE eau
  final ce = d['ce'];
  if (ce != null) {
    if (ce < 0.75) {
      r['ce'] =
          Interpretation(text: 'Pas de risque', level: InterpLevel.success);
    } else if (ce < 1.5) {
      r['ce'] = Interpretation(
          text: 'Risque croissant', level: InterpLevel.warning);
    } else if (ce < 3) {
      r['ce'] =
          Interpretation(text: 'Risque élevé', level: InterpLevel.warning);
    } else {
      r['ce'] =
          Interpretation(text: 'Risque sévère', level: InterpLevel.danger);
    }
  }

  // Chlorures
  final cl = d['chlorures'];
  if (cl != null) {
    if (cl < 4) {
      r['chlorures'] =
          Interpretation(text: 'Pas de risque', level: InterpLevel.success);
    } else if (cl < 10) {
      r['chlorures'] = Interpretation(
          text: 'Risque modéré', level: InterpLevel.warning);
    } else {
      r['chlorures'] =
          Interpretation(text: 'Risque sévère', level: InterpLevel.danger);
    }
  }

  // Mg/Ca ratio
  final mg = d['magnesium'];
  final ca = d['calcium'];
  if (mg != null && ca != null && ca > 0) {
    final ratio = mg / ca;
    if (ratio < 1) {
      r['mg_ca'] = Interpretation(text: 'Équilibré', level: InterpLevel.success);
    } else if (ratio < 2) {
      r['mg_ca'] = Interpretation(
          text: 'Déséquilibre modéré', level: InterpLevel.warning);
    } else {
      r['mg_ca'] = Interpretation(
          text: 'Déséquilibre sévère', level: InterpLevel.danger);
    }
  }

  // SAR
  final sar = d['sar'];
  if (sar != null) {
    if (sar < 6) {
      r['sar'] =
          Interpretation(text: 'Pas de risque', level: InterpLevel.success);
    } else if (sar < 12) {
      r['sar'] = Interpretation(
          text: 'Risque modéré', level: InterpLevel.warning);
    } else {
      r['sar'] =
          Interpretation(text: 'Risque élevé', level: InterpLevel.danger);
    }
  }

  // Résidu sec
  final rs = d['residu_sec'];
  if (rs != null) {
    if (rs < 500) {
      r['residu_sec'] = Interpretation(text: 'Bon', level: InterpLevel.success);
    } else if (rs < 1500) {
      r['residu_sec'] =
          Interpretation(text: 'Acceptable', level: InterpLevel.warning);
    } else {
      r['residu_sec'] =
          Interpretation(text: 'Excessif', level: InterpLevel.danger);
    }
  }

  // Dureté
  final dur = d['durete'];
  if (dur != null) {
    if (dur < 15) {
      r['durete'] = Interpretation(text: 'Eau douce', level: InterpLevel.success);
    } else if (dur < 30) {
      r['durete'] =
          Interpretation(text: 'Eau dure', level: InterpLevel.warning);
    } else {
      r['durete'] =
          Interpretation(text: 'Eau très dure', level: InterpLevel.danger);
    }
  }

  return r;
}

// ─── Données mock ───

final List<Rapport> initialRapports = [
  Rapport(
    id: '1',
    type: RapportType.eau,
    name: 'Puits principal - Mars 2026',
    date: '28/03/2026',
    data: {'ph': 7.2, 'ce': 1.8, 'chlorures': 5, 'sar': 4.2, 'residu_sec': 620, 'durete': 22},
    interpretations: interpretEau({'ph': 7.2, 'ce': 1.8, 'chlorures': 5, 'sar': 4.2, 'residu_sec': 620, 'durete': 22}),
  ),
  Rapport(
    id: '2',
    type: RapportType.sol,
    name: 'Parcelle Nord - Mars 2026',
    date: '27/03/2026',
    data: {'ph': 7.8, 'ce': 0.9, 'mo': 2.1, 'cn': 10, 'argile': 35, 'limon': 40, 'sable': 25, 'p2o5': 22, 'k2o': 180, 'cec': 18, 'esp': 4},
    interpretations: interpretSol({'ph': 7.8, 'ce': 0.9, 'mo': 2.1, 'cn': 10, 'argile': 35, 'limon': 40, 'sable': 25, 'p2o5': 22, 'k2o': 180, 'cec': 18, 'esp': 4}),
  ),
  Rapport(
    id: '3',
    type: RapportType.eau,
    name: 'Forage Sud - Février 2026',
    date: '15/02/2026',
    data: {'ph': 8.9, 'ce': 3.5, 'chlorures': 12, 'sar': 14, 'residu_sec': 2100, 'durete': 35},
    interpretations: interpretEau({'ph': 8.9, 'ce': 3.5, 'chlorures': 12, 'sar': 14, 'residu_sec': 2100, 'durete': 35}),
  ),
];
