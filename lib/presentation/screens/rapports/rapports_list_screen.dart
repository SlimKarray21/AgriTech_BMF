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

    final total = rapports.length;
    final alertCount = rapports
        .where((r) => r.interpretations.values.any((i) => i.level == InterpLevel.danger))
        .length;
    final okCount = total - alertCount;
    final headerColor = isEau ? const Color(0xFF0284c7) : const Color(0xFF92400e);
    final headerColor2 = isEau ? const Color(0xFF0369a1) : const Color(0xFF78350f);

    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go('/rapports/$typePath/nouveau'),
        backgroundColor: AppColors.farmLeaf,
        icon: const Icon(Icons.add, color: Colors.white),
        label: Text(t('rapport.new'), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
      ),
      body: RefreshIndicator(
        color: AppColors.farmLeaf,
        onRefresh: () async {
          await _loadParcelleNames();
          await _loadFromBackend();
        },
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // ── Hero Header ────────────────────────────────────────────────
            SliverToBoxAdapter(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [headerColor, headerColor2],
                  ),
                  borderRadius: const BorderRadius.vertical(bottom: Radius.circular(32)),
                ),
                child: SafeArea(
                  bottom: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        GestureDetector(
                          onTap: () => context.go('/rapports'),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.arrow_back_ios_rounded, size: 16, color: Colors.white70),
                              const SizedBox(width: 4),
                              Text(t('rapports.back'), style: const TextStyle(color: Colors.white70, fontSize: 13)),
                            ],
                          ),
                        ),
                        const SizedBox(height: 18),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(title,
                                      style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -0.5)),
                                  const SizedBox(height: 4),
                                  Text(isEau ? "Analyses de la qualité de l'eau" : 'Analyses pédologiques du sol',
                                      style: const TextStyle(color: Colors.white70, fontSize: 12)),
                                ],
                              ),
                            ),
                            Container(
                              width: 48, height: 48,
                              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(16)),
                              child: Icon(isEau ? Icons.water_drop_rounded : Icons.terrain_rounded, color: Colors.white, size: 26),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        // Stats row
                        Row(children: [
                          _StatPill(value: '$total', label: 'Rapports', icon: Icons.description_rounded),
                          const SizedBox(width: 10),
                          _StatPill(value: '$okCount', label: 'Conformes', icon: Icons.check_circle_rounded),
                          const SizedBox(width: 10),
                          _StatPill(value: '$alertCount', label: 'Alertes', icon: Icons.warning_amber_rounded),
                        ]),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // ── Content ────────────────────────────────────────────────────
            if (_loading)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: Center(child: CircularProgressIndicator(color: AppColors.farmLeaf)),
              )
            else if (rapports.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(icon, size: 56, color: color.withValues(alpha: 0.3)),
                      const SizedBox(height: 12),
                      Text(t('rapports.no_rapport'), style: theme.textTheme.titleMedium?.copyWith(color: theme.colorScheme.outline)),
                      const SizedBox(height: 8),
                      Text('Appuyez sur + pour créer un rapport',
                          style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline)),
                    ],
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 100),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (ctx, i) {
                      final r = rapports[i];
                      final dangerCount = r.interpretations.values
                          .where((interp) => interp.level == InterpLevel.danger)
                          .length;
                      final parcelleName = (r.parcelId != null && r.parcelId != 0)
                          ? (_parcelleNames[r.parcelId] ?? 'Parcelle ${r.parcelId}')
                          : null;

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _RapportCard(
                          name: r.name,
                          date: r.date,
                          parcelleName: parcelleName,
                          icon: icon,
                          color: color,
                          dangerCount: dangerCount,
                          onTap: () => context.go('/rapports/$typePath/${r.id}'),
                        ),
                      );
                    },
                    childCount: rapports.length,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ── Stat pill (hero header) ──────────────────────────────────────────────────
class _StatPill extends StatelessWidget {
  final String value, label;
  final IconData icon;
  const _StatPill({required this.value, required this.label, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.14),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
        ),
        child: Column(children: [
          Icon(icon, size: 18, color: Colors.white),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
          Text(label, style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 10)),
        ]),
      ),
    );
  }
}

// ── Rapport card ─────────────────────────────────────────────────────────────
class _RapportCard extends StatelessWidget {
  final String name, date;
  final String? parcelleName;
  final IconData icon;
  final Color color;
  final int dangerCount;
  final VoidCallback onTap;

  const _RapportCard({
    required this.name,
    required this.date,
    required this.parcelleName,
    required this.icon,
    required this.color,
    required this.dangerCount,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasAlert = dangerCount > 0;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.6)),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4))],
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    width: 48, height: 48,
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: color.withValues(alpha: 0.2)),
                    ),
                    child: Icon(icon, size: 24, color: color),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(name,
                            style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
                            maxLines: 1, overflow: TextOverflow.ellipsis),
                        const SizedBox(height: 4),
                        Row(children: [
                          Icon(Icons.calendar_today_rounded, size: 11, color: theme.colorScheme.outline),
                          const SizedBox(width: 4),
                          Text(date, style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline)),
                        ]),
                      ],
                    ),
                  ),
                  // Status badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: (hasAlert ? AppColors.farmDanger : AppColors.farmLeaf).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      Icon(hasAlert ? Icons.warning_amber_rounded : Icons.check_circle_rounded,
                          size: 13, color: hasAlert ? AppColors.farmDanger : AppColors.farmLeaf),
                      const SizedBox(width: 4),
                      Text(hasAlert ? '$dangerCount' : 'OK',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800,
                              color: hasAlert ? AppColors.farmDanger : AppColors.farmLeaf)),
                    ]),
                  ),
                ],
              ),
            ),
            // Parcelle footer
            if (parcelleName != null) ...[
              Divider(height: 1, color: theme.colorScheme.outline.withValues(alpha: 0.4)),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                child: Row(children: [
                  Icon(Icons.place_rounded, size: 14, color: color),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(parcelleName!,
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color),
                        overflow: TextOverflow.ellipsis),
                  ),
                  Icon(Icons.arrow_forward_ios_rounded, size: 12, color: theme.colorScheme.outline),
                ]),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
