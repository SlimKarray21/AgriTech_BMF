import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:uiearth_flutter/data/api/api_exception.dart';
import 'package:uiearth_flutter/core/theme/app_colors.dart';
import 'package:uiearth_flutter/data/models/rapport.dart';
import 'package:uiearth_flutter/domain/providers/api_providers.dart';
import 'package:uiearth_flutter/domain/providers/rapport_provider.dart';
import 'package:intl/intl.dart';
import 'dart:convert';

/// /rapports/eau/nouveau ou /rapports/sol/nouveau
class RapportFormScreen extends ConsumerStatefulWidget {
  final RapportType type;
  const RapportFormScreen({super.key, required this.type});

  @override
  ConsumerState<RapportFormScreen> createState() => _RapportFormScreenState();
}

class _RapportFormScreenState extends ConsumerState<RapportFormScreen> {
  final _nameCtrl = TextEditingController();
  final Map<String, TextEditingController> _controllers = {};
  final Map<String, String> _values = {};
  bool _isSaving = false;

  bool get isEau => widget.type == RapportType.eau;
  List<FormSection> get sections => isEau ? eauFormSections : solFormSections;
  Color get accentColor => isEau ? AppColors.farmWater : AppColors.farmEarth;
  IconData get typeIcon => isEau ? Icons.water_drop : Icons.terrain;
  String get formTitle => isEau ? 'Nouveau Rapport Eau' : 'Nouveau Rapport Sol';
  String get typePath => isEau ? 'eau' : 'sol';

  Map<String, double> get numericValues {
    final nv = <String, double>{};
    for (final entry in _values.entries) {
      final n = double.tryParse(entry.value);
      if (n != null) nv[entry.key] = n;
    }
    return nv;
  }

  Map<String, Interpretation> get interpretations =>
      isEau ? interpretEau(numericValues) : interpretSol(numericValues);

  @override
  void dispose() {
    _nameCtrl.dispose();
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _handleSave() async {
    if (_isSaving) return;
    if (_nameCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Veuillez saisir un nom de rapport'),
        backgroundColor: AppColors.farmDanger,
      ));
      return;
    }

    setState(() => _isSaving = true);

    final now = DateTime.now();
    final displayDate = DateFormat('dd/MM/yyyy').format(now);
    final analysisDate = DateFormat('yyyy-MM-dd').format(now);
    final data = numericValues;

    try {
      final api = ref.read(uiEarthApiProvider).capteurSol;
      final payloadBase = <String, dynamic>{
        'reportName': _nameCtrl.text.trim(),
        // TODO: replace with selected parcelle and authenticated user mapping.
        'parcelId': 1,
        'userId': 1,
        'analysisDate': analysisDate,
        'interpretations': _serializeInterpretations(interpretations),
      };

      if (isEau) {
        await api.createRapportEau({
          ...payloadBase,
          'ph': data['ph'] ?? 0.0,
          'cewDsM': data['ce'] ?? 0.0,
          'residuSecMgL': data['residu_sec'] ?? 0.0,
          'chloruresMeqL': data['chlorures'] ?? 0.0,
          'sulfatesMeqL': data['sulfates'] ?? 0.0,
          'bicarbonatesMeqL': data['bicarbonates'] ?? 0.0,
          'sodiumMeqL': data['sodium'] ?? 0.0,
          'calciumMeqL': data['calcium'] ?? 0.0,
          'magnesiumMeqL': data['magnesium'] ?? 0.0,
          'sarRatio': data['sar'] ?? 0.0,
          'dureteF': data['durete'] ?? 0.0,
        });
      } else {
        final calcaire = data['calcaire'] ?? 0.0;
        await api.createRapportSol({
          ...payloadBase,
          'argilePercent': data['argile'] ?? 0.0,
          'limonPercent': data['limon'] ?? 0.0,
          'sablePercent': data['sable'] ?? 0.0,
          'ph': data['ph'] ?? 0.0,
          'ceDsM': data['ce'] ?? 0.0,
          'calcaireTotalPercent': calcaire,
          'calcaireActifPercent': calcaire,
          'moPercent': data['mo'] ?? 0.0,
          'rapportCn': data['cn'] ?? 0.0,
          'p2o5Ppm': data['p2o5'] ?? 0.0,
          'k2oPpm': data['k2o'] ?? 0.0,
          'mgoPpm': data['mgo'] ?? 0.0,
          'cecMeq100g': data['cec'] ?? 0.0,
          'espPercent': data['esp'] ?? 0.0,
        });
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Sauvegarde backend échouée: ${e.message}'),
        backgroundColor: AppColors.farmDanger,
      ));
      setState(() => _isSaving = false);
      return;
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Erreur backend rapport: $e'),
        backgroundColor: AppColors.farmDanger,
      ));
      setState(() => _isSaving = false);
      return;
    }

    final id = DateTime.now().millisecondsSinceEpoch.toString();
    final rapport = Rapport(
      id: id,
      type: widget.type,
      name: _nameCtrl.text.trim(),
      date: displayDate,
      data: numericValues,
      interpretations: interpretations,
    );

    ref.read(rapportsProvider.notifier).addRapport(rapport);

    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(isEau
          ? 'Le rapport eau a été sauvegardé.'
          : 'Le rapport sol a été sauvegardé.'),
      backgroundColor: AppColors.farmLeaf,
    ));
    if (mounted) {
      setState(() => _isSaving = false);
    }
    context.go('/rapports/$typePath');
  }

  String _serializeInterpretations(Map<String, Interpretation> interpretations) {
    final serializable = interpretations.map(
      (k, v) => MapEntry(k, <String, String>{
        'text': v.text,
        'level': v.level.name,
      }),
    );
    return jsonEncode(serializable);
  }

  TextEditingController _controllerFor(String key) {
    return _controllers.putIfAbsent(key, () => TextEditingController());
  }

  Color _levelColor(InterpLevel level) {
    switch (level) {
      case InterpLevel.success: return AppColors.lightPrimary;
      case InterpLevel.warning: return AppColors.lightAccent;
      case InterpLevel.danger: return AppColors.lightDestructive;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final interps = interpretations;

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
                children: [
                  // Back button
                  GestureDetector(
                    onTap: () => context.go('/rapports/$typePath'),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.arrow_back_ios, size: 16,
                            color: theme.textTheme.bodySmall?.color),
                        const SizedBox(width: 4),
                        Text('Retour', style: theme.textTheme.bodySmall),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Title
                  Row(children: [
                    Container(
                      width: 40, height: 40,
                      decoration: BoxDecoration(
                        color: accentColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(typeIcon, size: 20, color: accentColor),
                    ),
                    const SizedBox(width: 8),
                    Text(formTitle, style: theme.textTheme.headlineMedium),
                  ]),
                  const SizedBox(height: 20),

                  // Report name
                  Text('Nom du rapport',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700,
                          color: theme.textTheme.bodySmall?.color)),
                  const SizedBox(height: 4),
                  TextField(
                    controller: _nameCtrl,
                    decoration: InputDecoration(
                      hintText: isEau
                          ? 'ex: Puits principal - Mars 2026'
                          : 'ex: Parcelle Nord - Mars 2026',
                      hintStyle: TextStyle(fontSize: 14,
                          color: theme.textTheme.bodySmall?.color?.withValues(alpha: 0.5)),
                      filled: true,
                      fillColor: theme.colorScheme.secondary,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    ),
                    style: const TextStyle(fontSize: 14),
                  ),
                  const SizedBox(height: 20),

                  // Sections
                  ...sections.map((section) => _buildSection(section, theme, interps)),
                ],
              ),
            ),

            // Save button
            Container(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
              decoration: BoxDecoration(
                color: theme.colorScheme.surface,
                border: Border(top: BorderSide(color: theme.colorScheme.outline, width: 0.5)),
              ),
              child: SizedBox(
                width: double.infinity,
                height: 44,
                child: ElevatedButton.icon(
                  onPressed: _isSaving ? null : _handleSave,
                  icon: _isSaving
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.save, size: 16),
                  label: Text(
                    _isSaving ? 'Enregistrement...' : 'Enregistrer le rapport',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.farmLeaf,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSection(FormSection section, ThemeData theme, Map<String, Interpretation> interps) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(section.title,
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700,
                  color: theme.colorScheme.onSurface)),
          const SizedBox(height: 12),
          ...section.fields.map((field) {
            final interp = interps[field.key];
            final hasValue = _values[field.key] != null && _values[field.key]!.isNotEmpty;
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Expanded(
                      child: RichText(
                        text: TextSpan(
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600,
                              color: theme.textTheme.bodySmall?.color),
                          children: [
                            TextSpan(text: field.label),
                            if (field.unit.isNotEmpty)
                              TextSpan(text: ' (${field.unit})',
                                  style: TextStyle(
                                      color: theme.textTheme.bodySmall?.color
                                          ?.withValues(alpha: 0.6))),
                          ],
                        ),
                      ),
                    ),
                    if (interp != null && hasValue)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: _levelColor(interp.level).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                              color: _levelColor(interp.level).withValues(alpha: 0.3)),
                        ),
                        child: Text(interp.text,
                            style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600,
                                color: _levelColor(interp.level))),
                      ),
                  ]),
                  const SizedBox(height: 4),
                  TextField(
                    controller: _controllerFor(field.key),
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    onChanged: (val) => setState(() => _values[field.key] = val),
                    decoration: InputDecoration(
                      hintText: field.placeholder,
                      hintStyle: TextStyle(fontSize: 13,
                          color: theme.textTheme.bodySmall?.color?.withValues(alpha: 0.4)),
                      filled: true,
                      fillColor: theme.colorScheme.secondary,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                    style: const TextStyle(fontSize: 13),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}
