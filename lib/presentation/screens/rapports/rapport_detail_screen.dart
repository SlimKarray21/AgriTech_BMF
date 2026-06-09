import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'dart:convert';
import 'package:uiearth_flutter/core/theme/app_colors.dart';
import 'package:uiearth_flutter/data/api/api_exception.dart';
import 'package:uiearth_flutter/data/models/rapport.dart';
import 'package:uiearth_flutter/domain/providers/api_providers.dart';
import 'package:uiearth_flutter/core/l10n/app_localizations.dart';
import 'package:uiearth_flutter/domain/providers/rapport_provider.dart';

/// /rapports/eau/:id ou /rapports/sol/:id — Détail d'un rapport.
class RapportDetailScreen extends ConsumerStatefulWidget {
  final String rapportId;
  final RapportType type;
  const RapportDetailScreen({super.key, required this.rapportId, required this.type});

  @override
  ConsumerState<RapportDetailScreen> createState() => _RapportDetailScreenState();
}

class _RapportDetailScreenState extends ConsumerState<RapportDetailScreen> {
  bool _deleting = false;
  bool _loading = true;
  bool _notFound = false;
  Rapport? _rapport;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _loadFromBackend();
    });
  }

  Rapport _fromBackend(Map<String, dynamic> map) {
    final type = widget.type;
    final id = (map['id'] ?? widget.rapportId).toString();
    final name = map['reportName']?.toString() ?? 'Rapport';
    final date = _formatDate(map['analysisDate']?.toString());
    final data = type == RapportType.eau ? _eauDataFromBackend(map) : _solDataFromBackend(map);
    final interpretations = _interpretationsFromBackend(map['interpretations']);

    return Rapport(
      id: id,
      type: type,
      name: name,
      date: date,
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

  Future<void> _loadFromBackend() async {
    final api = ref.read(uiEarthApiProvider).capteurSol;
    try {
      final raw = widget.type == RapportType.eau
          ? await api.getRapportEauById(widget.rapportId)
          : await api.getRapportSolById(widget.rapportId);

      if (!mounted) return;

      if (raw != null) {
        final rapport = _fromBackend(Map<String, dynamic>.from(raw));
        ref.read(rapportsProvider.notifier).addOrReplace(rapport);
        setState(() {
          _rapport = rapport;
          _notFound = false;
          _loading = false;
        });
        return;
      }

      setState(() {
        _notFound = true;
        _loading = false;
        _rapport = null;
      });
    } on ApiException {
      if (!mounted) return;
      setState(() => _loading = false);
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final localRapport = ref.read(rapportsProvider.notifier).byId(widget.rapportId);
    final rapport = _rapport ?? (_notFound ? null : localRapport);

    if (_loading && rapport == null) {
      return Scaffold(
        body: SafeArea(
          child: Center(
            child: CircularProgressIndicator(color: AppColors.farmLeaf),
          ),
        ),
      );
    }

    if (rapport == null) {
      return Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                GestureDetector(
                  onTap: () => context.go('/rapports'),
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
                const SizedBox(height: 32),
                Center(child: Text('Rapport introuvable',
                    style: theme.textTheme.bodySmall)),
              ],
            ),
          ),
        ),
      );
    }

    final isEau = rapport.type == RapportType.eau;
    final labels = isEau ? eauLabels : solLabels;
    final icon = rapport.icon;
    final typePath = isEau ? 'eau' : 'sol';
    final langState = ref.watch(languageProvider);
    final t = langState.t;

    // Group data by category
    final categories = <String, List<_CategoryItem>>{};
    for (final entry in rapport.data.entries) {
      final key = entry.key;
      final value = entry.value;
      final meta = labels[key];
      if (meta == null) continue;
      categories.putIfAbsent(meta.category, () => []);
      categories[meta.category]!.add(_CategoryItem(
        key: key,
        label: meta.label,
        unit: meta.unit,
        value: value,
      ));
    }

    // Composite interpretations (keys not in labels map)
    final compositeInterpretations = rapport.interpretations.entries
        .where((e) => !labels.containsKey(e.key))
        .toList();

    // Count by level
    final dangerCount = rapport.interpretations.values
        .where((i) => i.level == InterpLevel.danger).length;
    final warningCount = rapport.interpretations.values
        .where((i) => i.level == InterpLevel.warning).length;
    final successCount = rapport.interpretations.values
        .where((i) => i.level == InterpLevel.success).length;

    final headerColor = isEau ? const Color(0xFF0284c7) : const Color(0xFF92400e);
    final headerColor2 = isEau ? const Color(0xFF0369a1) : const Color(0xFF78350f);

    return Scaffold(
      body: ListView(
        padding: EdgeInsets.zero,
        children: [
          // ── Hero header ──────────────────────────────────────────────────
          Container(
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
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        GestureDetector(
                          onTap: () => context.go('/rapports/$typePath'),
                          child: Row(mainAxisSize: MainAxisSize.min, children: [
                            const Icon(Icons.arrow_back_ios_rounded, size: 16, color: Colors.white70),
                            const SizedBox(width: 4),
                            Text(t('rapports.back'), style: const TextStyle(color: Colors.white70, fontSize: 13)),
                          ]),
                        ),
                        GestureDetector(
                          onTap: _deleting ? null : () => _confirmDelete(context, rapport),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.15),
                              border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(mainAxisSize: MainAxisSize.min, children: [
                              const Icon(Icons.delete_outline_rounded, size: 14, color: Colors.white),
                              const SizedBox(width: 6),
                              Text(_deleting ? t('rapports.deleting') : t('rapports.delete'),
                                  style: const TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.w600)),
                            ]),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    Row(children: [
                      Container(
                        width: 52, height: 52,
                        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(16)),
                        child: Icon(icon, size: 26, color: Colors.white),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(rapport.name,
                                style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800),
                                maxLines: 2, overflow: TextOverflow.ellipsis),
                            const SizedBox(height: 4),
                            Text('${rapport.date} • ${isEau ? t('rapports.type_eau') : t('rapports.type_sol')}',
                                style: const TextStyle(color: Colors.white70, fontSize: 12)),
                          ],
                        ),
                      ),
                    ]),
                    const SizedBox(height: 16),
                    // Summary badges (sur fond clair)
                    Wrap(spacing: 8, runSpacing: 8, children: [
                      if (dangerCount > 0)
                        _HeroBadge(icon: Icons.warning_amber_rounded, text: '$dangerCount alerte${dangerCount > 1 ? 's' : ''}'),
                      if (warningCount > 0)
                        _HeroBadge(icon: Icons.info_outline_rounded, text: '$warningCount attention'),
                      if (successCount > 0)
                        _HeroBadge(icon: Icons.check_circle_rounded, text: '$successCount optimal'),
                    ]),
                  ],
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
            // Data by category
            ...categories.entries.map((catEntry) {
              final categoryName = catEntry.key;
              final items = catEntry.value;
              return Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(categoryName,
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700,
                            color: theme.colorScheme.onSurface)),
                    const SizedBox(height: 8),
                    Container(
                      decoration: BoxDecoration(
                        color: theme.colorScheme.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: theme.colorScheme.outline),
                      ),
                      child: Column(
                        children: items.asMap().entries.map((itemEntry) {
                          final idx = itemEntry.key;
                          final item = itemEntry.value;
                          final interp = rapport.interpretations[item.key];
                          final isLast = idx == items.length - 1;
                          return Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            decoration: BoxDecoration(
                              border: isLast ? null : Border(
                                bottom: BorderSide(color: theme.colorScheme.outline),
                              ),
                            ),
                            child: Row(children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(item.label,
                                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600,
                                            color: theme.colorScheme.onSurface)),
                                    const SizedBox(height: 2),
                                    Text('${item.value} ${item.unit}',
                                        style: theme.textTheme.bodySmall),
                                  ],
                                ),
                              ),
                              if (interp != null)
                                _LevelBadge(text: interp.text, level: interp.level),
                            ]),
                          );
                        }).toList(),
                      ),
                    ),
                  ],
                ),
              );
            }),

            // Composite interpretations
            if (compositeInterpretations.isNotEmpty) ...[
              Text(t('rapports.composite'),
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700,
                      color: theme.colorScheme.onSurface)),
              const SizedBox(height: 8),
              Container(
                decoration: BoxDecoration(
                  color: theme.colorScheme.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: theme.colorScheme.outline),
                ),
                child: Column(
                  children: compositeInterpretations.asMap().entries.map((entry) {
                    final idx = entry.key;
                    final e = entry.value;
                    final isLast = idx == compositeInterpretations.length - 1;
                    final displayKey = e.key.replaceAll('_', ' ');
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        border: isLast ? null : Border(
                          bottom: BorderSide(color: theme.colorScheme.outline),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(displayKey[0].toUpperCase() + displayKey.substring(1),
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600,
                                  color: theme.colorScheme.onSurface)),
                          _LevelBadge(text: e.value.text, level: e.value.level),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmDelete(BuildContext context, Rapport rapport) async {
    final t = ref.read(languageProvider).t;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(t('rapports.delete_confirm')),
        content: Text('${t('rapports.delete_confirm_text')} "${rapport.name}" ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(t('rapports.cancel')),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(foregroundColor: AppColors.farmDanger),
            child: Text(t('rapports.delete')),
          ),
        ],
      ),
    );
    if (confirmed == true && context.mounted) {
      _deleteReport(context, rapport);
    }
  }

  Future<void> _deleteReport(BuildContext context, Rapport rapport) async {
    if (_deleting) return;
    setState(() => _deleting = true);

    final api = ref.read(uiEarthApiProvider).capteurSol;
    try {
      if (rapport.type == RapportType.eau) {
        await api.deleteRapportEau(rapport.id);
      } else {
        await api.deleteRapportSol(rapport.id);
      }

      ref.read(rapportsProvider.notifier).removeRapport(rapport.id);
      if (!context.mounted) return;
      context.go('/rapports/${rapport.type == RapportType.eau ? 'eau' : 'sol'}');
    } on ApiException catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Suppression backend échouée: ${e.message}')),
      );
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur réseau lors de la suppression: $e')),
      );
    } finally {
      if (mounted) {
        setState(() => _deleting = false);
      }
    }
  }
}

class _CategoryItem {
  final String key, label, unit;
  final double value;
  _CategoryItem({required this.key, required this.label, required this.unit, required this.value});
}

// Badge affiché sur le hero header coloré (texte blanc sur verre dépoli).
class _HeroBadge extends StatelessWidget {
  final IconData icon;
  final String text;
  const _HeroBadge({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 13, color: Colors.white),
        const SizedBox(width: 5),
        Text(text, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white)),
      ]),
    );
  }
}

class _LevelBadge extends StatelessWidget {
  final String text;
  final InterpLevel level;
  const _LevelBadge({required this.text, required this.level});

  Color get _color {
    switch (level) {
      case InterpLevel.success: return AppColors.lightPrimary;
      case InterpLevel.warning: return AppColors.lightAccent;
      case InterpLevel.danger: return AppColors.lightDestructive;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: _color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: _color.withValues(alpha: 0.3)),
      ),
      child: Text(text,
          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: _color)),
    );
  }
}
