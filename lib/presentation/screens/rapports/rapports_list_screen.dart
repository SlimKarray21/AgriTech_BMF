import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:uiearth_flutter/core/theme/app_colors.dart';
import 'package:uiearth_flutter/core/l10n/app_localizations.dart';
import 'package:uiearth_flutter/data/api/api_exception.dart';
import 'package:uiearth_flutter/data/models/rapport.dart';
import 'package:uiearth_flutter/domain/providers/api_providers.dart';
import 'package:uiearth_flutter/domain/providers/rapport_provider.dart';
import 'dart:convert';

/// /rapports/eau ou /rapports/sol — Liste des rapports par type.
/// Miroir exact de RapportHistory.tsx.
class RapportsListScreen extends ConsumerStatefulWidget {
  final RapportType type;
  const RapportsListScreen({super.key, required this.type});

  @override
  ConsumerState<RapportsListScreen> createState() => _RapportsListScreenState();
}

class _RapportsListScreenState extends ConsumerState<RapportsListScreen> {
  bool _loading = true;
  // id de parcelle -> nom, pour afficher la parcelle d'un rapport.
  Map<int, String> _parcelleNames = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _loadParcelleNames();
      _loadFromBackend();
    });
  }

  Future<void> _loadParcelleNames() async {
    try {
      final api = ref.read(uiEarthApiProvider).capteurSol;
      final raw = await api.listParcelles();
      if (raw is List) {
        final map = <int, String>{};
        for (final e in raw.whereType<Map>()) {
          final id = (e['id'] as num?)?.toInt();
          final name = e['nomSurface']?.toString() ?? e['nom_surface']?.toString();
          if (id != null && name != null) map[id] = name;
        }
        if (mounted) setState(() => _parcelleNames = map);
      }
    } catch (_) {
      // Pas bloquant : on affiche juste sans le nom de parcelle.
    }
  }

  Future<void> _loadFromBackend() async {
    try {
      final api = ref.read(uiEarthApiProvider).capteurSol;
      final raw = widget.type == RapportType.eau
          ? await api.listRapportsEau()
          : await api.listRapportsSol();

      if (raw is List) {
        final reports = raw
            .whereType<Map>()
            .map((e) => _fromBackend(widget.type, Map<String, dynamic>.from(e)))
            .toList(growable: false);
        ref.read(rapportsProvider.notifier).replaceByType(widget.type, reports);
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Chargement backend échoué: ${e.message}')),
      );
    } catch (_) {
      // Keep local fallback when backend is unreachable.
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Rapport _fromBackend(RapportType type, Map<String, dynamic> map) {
    final id = (map['id'] ?? '').toString();
    final name = map['reportName']?.toString() ?? 'Rapport';
    final date = _formatDate(map['analysisDate']?.toString());
    final parcelId = (map['parcelId'] ?? map['parcel_id']) as num?;
    final data = type == RapportType.eau ? _eauDataFromBackend(map) : _solDataFromBackend(map);
    final interpretations = _interpretationsFromBackend(map['interpretations']);

    return Rapport(
      id: id,
      type: type,
      name: name,
      date: date,
      parcelId: parcelId?.toInt(),
      data: data,
      interpretations: interpretations,
    );
  }

  String _formatDate(String? isoDate) {
    if (isoDate == null || isoDate.isEmpty) return '';
    final parts = isoDate.split('-');
    if (parts.length != 3) return isoDate;
    return '${parts[2]}/${parts[1]}/${parts[0]}';
  }

  Map<String, double> _eauDataFromBackend(Map<String, dynamic> m) {
    double n(String k) => (m[k] as num?)?.toDouble() ?? 0.0;
    return {
      'ph': n('ph'),
      'ce': n('cewDsM'),
      'residu_sec': n('residuSecMgL'),
      'chlorures': n('chloruresMeqL'),
      'sulfates': n('sulfatesMeqL'),
      'bicarbonates': n('bicarbonatesMeqL'),
      'sodium': n('sodiumMeqL'),
      'calcium': n('calciumMeqL'),
      'magnesium': n('magnesiumMeqL'),
      'sar': n('sarRatio'),
      'durete': n('dureteF'),
    };
  }

  Map<String, double> _solDataFromBackend(Map<String, dynamic> m) {
    double n(String k) => (m[k] as num?)?.toDouble() ?? 0.0;
    return {
      'argile': n('argilePercent'),
      'limon': n('limonPercent'),
      'sable': n('sablePercent'),
      'ph': n('ph'),
      'ce': n('ceDsM'),
      'calcaire': n('calcaireTotalPercent'),
      'mo': n('moPercent'),
      'cn': n('rapportCn'),
      'p2o5': n('p2o5Ppm'),
      'k2o': n('k2oPpm'),
      'mgo': n('mgoPpm'),
      'cec': n('cecMeq100g'),
      'esp': n('espPercent'),
    };
  }

  Map<String, Interpretation> _interpretationsFromBackend(dynamic raw) {
    if (raw is! String || raw.trim().isEmpty) return {};
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map) return {};

      final out = <String, Interpretation>{};
      decoded.forEach((key, value) {
        if (key is! String || value is! Map) return;
        final text = value['text']?.toString();
        final levelRaw = value['level']?.toString();
        if (text == null || levelRaw == null) return;
        out[key] = Interpretation(
          text: text,
          level: _interpLevelFromString(levelRaw),
        );
      });
      return out;
    } catch (_) {
      return {};
    }
  }

  InterpLevel _interpLevelFromString(String level) {
    switch (level) {
      case 'danger':
        return InterpLevel.danger;
      case 'warning':
        return InterpLevel.warning;
      default:
        return InterpLevel.success;
    }
  }

  @override
  Widget build(BuildContext context) {
    final rapports = ref
        .watch(rapportsProvider)
        .where((r) => r.type == widget.type)
        .toList(growable: false);
    final theme = Theme.of(context);
    final langState = ref.watch(languageProvider);
    final t = langState.t;
    final typePath = widget.type == RapportType.eau ? 'eau' : 'sol';
    final isEau = widget.type == RapportType.eau;
    final color = isEau ? AppColors.farmWater : AppColors.farmEarth;
    final icon = isEau ? Icons.water_drop : Icons.terrain;
    final title = isEau ? t('rapports.type_eau') : t('rapports.type_sol');

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 24),

              // Back button
              GestureDetector(
                onTap: () => context.go('/rapports'),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.arrow_back_ios, size: 16,
                        color: theme.textTheme.bodySmall?.color),
                    const SizedBox(width: 4),
                    Text(t('rapports.back'), style: theme.textTheme.bodySmall),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Title + Nouveau button
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(title, style: theme.textTheme.headlineMedium),
                  GestureDetector(
                    onTap: () => context.go('/rapports/$typePath/nouveau'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.farmLeaf,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.add, size: 14, color: Colors.white),
                          const SizedBox(width: 6),
                          Text(t('rapport.new'),
                              style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Content
              Expanded(
                child: _loading
                    ? const Center(child: CircularProgressIndicator())
                    : rapports.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.description_outlined,
                                size: 40,
                                color: theme.textTheme.bodySmall?.color
                                    ?.withValues(alpha: 0.4)),
                            const SizedBox(height: 12),
                            Text(t('rapports.no_rapport'),
                                style: theme.textTheme.bodySmall),
                          ],
                        ),
                      )
                    : ListView.separated(
                        itemCount: rapports.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: 12),
                        itemBuilder: (ctx, i) {
                          final r = rapports[i];
                          final dangerCount = r.interpretations.values
                              .where((interp) =>
                                  interp.level == InterpLevel.danger)
                              .length;

                          return GestureDetector(
                            onTap: () => context
                                .go('/rapports/$typePath/${r.id}'),
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: theme.colorScheme.surface,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                    color: theme.colorScheme.outline),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black
                                        .withValues(alpha: 0.04),
                                    blurRadius: 8,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Row(
                                children: [
                                  // Icon
                                  Container(
                                    width: 40,
                                    height: 40,
                                    decoration: BoxDecoration(
                                      color:
                                          color.withValues(alpha: 0.1),
                                      borderRadius:
                                          BorderRadius.circular(12),
                                    ),
                                    child: Icon(icon,
                                        size: 18, color: color),
                                  ),
                                  const SizedBox(width: 12),

                                  // Name + Date
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(r.name,
                                            style: TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w700,
                                              color: theme.colorScheme
                                                  .onSurface,
                                            )),
                                        const SizedBox(height: 2),
                                        Row(
                                          children: [
                                            Text(r.date,
                                                style: theme
                                                    .textTheme.bodySmall),
                                            if (r.parcelId != null &&
                                                r.parcelId != 0) ...[
                                              const SizedBox(width: 8),
                                              Flexible(
                                                child: Row(
                                                  mainAxisSize:
                                                      MainAxisSize.min,
                                                  children: [
                                                    Icon(Icons.place_outlined,
                                                        size: 12,
                                                        color: color),
                                                    const SizedBox(width: 2),
                                                    Flexible(
                                                      child: Text(
                                                        _parcelleNames[r
                                                                .parcelId] ??
                                                            'Parcelle ${r.parcelId}',
                                                        overflow: TextOverflow
                                                            .ellipsis,
                                                        style: TextStyle(
                                                          fontSize: 11,
                                                          fontWeight:
                                                              FontWeight.w600,
                                                          color: color,
                                                        ),
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            ],
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),

                                  // Badges
                                  if (dangerCount > 0)
                                    _InterpBadge(
                                      text: '$dangerCount alertes',
                                      bgColor: AppColors.lightDestructive
                                          .withValues(alpha: 0.1),
                                      textColor:
                                          AppColors.lightDestructive,
                                      borderColor:
                                          AppColors.lightDestructive
                                              .withValues(alpha: 0.3),
                                    )
                                  else
                                    _InterpBadge(
                                      text: 'OK',
                                      bgColor: AppColors.lightPrimary
                                          .withValues(alpha: 0.1),
                                      textColor: AppColors.lightPrimary,
                                      borderColor: AppColors.lightPrimary
                                          .withValues(alpha: 0.3),
                                    ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InterpBadge extends StatelessWidget {
  final String text;
  final Color bgColor;
  final Color textColor;
  final Color borderColor;

  const _InterpBadge({
    required this.text,
    required this.bgColor,
    required this.textColor,
    required this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: borderColor),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 9,
          fontWeight: FontWeight.w600,
          color: textColor,
        ),
      ),
    );
  }
}
