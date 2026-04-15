import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:uiearth_flutter/core/theme/app_colors.dart';
import 'package:uiearth_flutter/data/models/rapport.dart';
import 'package:uiearth_flutter/domain/providers/rapport_provider.dart';

/// /rapports/eau/:id ou /rapports/sol/:id — Détail d'un rapport.
class RapportDetailScreen extends ConsumerWidget {
  final String rapportId;
  const RapportDetailScreen({super.key, required this.rapportId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(rapportsProvider.notifier);
    final rapport = notifier.byId(rapportId);
    final theme = Theme.of(context);

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
    final color = rapport.color;
    final icon = rapport.icon;
    final typePath = isEau ? 'eau' : 'sol';

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

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
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
                GestureDetector(
                  onTap: () {
                    ref.read(rapportsProvider.notifier).removeRapport(rapport.id);
                    context.go('/rapports/$typePath');
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      border: Border.all(color: AppColors.farmDanger.withValues(alpha: 0.3)),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.delete_outline, size: 14, color: AppColors.farmDanger),
                        const SizedBox(width: 6),
                        Text('Supprimer',
                            style: TextStyle(fontSize: 12, color: AppColors.farmDanger)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Title card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: theme.colorScheme.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: theme.colorScheme.outline),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Container(
                      width: 48, height: 48,
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(icon, size: 24, color: color),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(rapport.name,
                              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800,
                                  color: theme.colorScheme.onSurface)),
                          const SizedBox(height: 2),
                          Text('${rapport.date} • Rapport ${isEau ? "Eau" : "Sol"}',
                              style: theme.textTheme.bodySmall),
                        ],
                      ),
                    ),
                  ]),
                  const SizedBox(height: 12),
                  Wrap(spacing: 6, runSpacing: 6, children: [
                    if (dangerCount > 0)
                      _SummaryBadge(
                        text: '$dangerCount alerte${dangerCount > 1 ? 's' : ''}',
                        color: AppColors.lightDestructive,
                      ),
                    if (warningCount > 0)
                      _SummaryBadge(
                        text: '$warningCount attention',
                        color: AppColors.lightAccent,
                      ),
                    if (successCount > 0)
                      _SummaryBadge(
                        text: '$successCount optimal',
                        color: AppColors.lightPrimary,
                      ),
                  ]),
                ],
              ),
            ),
            const SizedBox(height: 20),

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
              Text('Diagnostics composites',
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
    );
  }
}

class _CategoryItem {
  final String key, label, unit;
  final double value;
  _CategoryItem({required this.key, required this.label, required this.unit, required this.value});
}

class _SummaryBadge extends StatelessWidget {
  final String text;
  final Color color;
  const _SummaryBadge({required this.text, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(text,
          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: color)),
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
