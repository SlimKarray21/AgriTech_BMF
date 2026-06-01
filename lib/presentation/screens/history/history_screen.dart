import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uiearth_flutter/core/l10n/app_localizations.dart';
import 'package:uiearth_flutter/core/theme/app_colors.dart';
import 'package:uiearth_flutter/domain/providers/parcelle_provider.dart';

class HistoryScreen extends ConsumerWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final langState = ref.watch(languageProvider);
    final parcelles = ref.watch(parcellesProvider);
    final theme = Theme.of(context);

    // Gather all operations from all parcelles
    final allOps = <Map<String, String>>[];
    for (final p in parcelles) {
      for (final op in p.operations) {
        allOps.add({
          'parcelle': p.name,
          'date': op.date,
          'action': op.action,
          'type': op.type,
        });
      }
    }

    // Gather valve actions
    final allVanneActions = <Map<String, String>>[];
    for (final p in parcelles) {
      for (final v in p.vannes) {
        allVanneActions.add({
          'parcelle': p.name,
          'vanne': v.name,
          'action': v.lastAction,
          'state': v.isOpen
              ? langState.t('vannes.opened')
              : langState.t('vannes.closed'),
          'debit': '${v.debit.toStringAsFixed(1)} L/min',
        });
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: Row(children: [
          const Icon(Icons.history, size: 22),
          const SizedBox(width: 8),
          Text(langState.t('vannes.history')),
        ]),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: DefaultTabController(
        length: 2,
        child: Column(
          children: [
            // Tabs
            Container(
              margin: const EdgeInsets.fromLTRB(20, 8, 20, 0),
              height: 40,
              decoration: BoxDecoration(
                color: theme.colorScheme.secondary,
                borderRadius: BorderRadius.circular(12),
              ),
              child: TabBar(
                indicator: BoxDecoration(
                  color: theme.colorScheme.surface,
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: [
                    BoxShadow(
                        color: Colors.black.withValues(alpha: 0.05),
                        blurRadius: 4)
                  ],
                ),
                indicatorPadding: const EdgeInsets.all(3),
                labelColor: theme.colorScheme.onSurface,
                unselectedLabelColor:
                    theme.colorScheme.onSurface.withValues(alpha: 0.4),
                labelStyle:
                    const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                dividerHeight: 0,
                tabs: [
                  Tab(
                      child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                        Icon(Icons.agriculture, size: 14, color: AppColors.farmLeaf),
                        const SizedBox(width: 6),
                        Text(langState.t('history.operations')),
                      ])),
                  Tab(
                      child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                        Icon(Icons.water_drop_outlined, size: 14, color: AppColors.farmLeaf),
                        const SizedBox(width: 6),
                        Text(langState.t('history.valve_actions')),
                      ])),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: TabBarView(
                children: [
                  // Operations tab
                  allOps.isEmpty
                      ? Center(
                          child: Text(langState.t('history.no_data'),
                              style: theme.textTheme.bodySmall))
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
                          itemCount: allOps.length,
                          itemBuilder: (ctx, i) {
                            final op = allOps[i];
                            return Container(
                              margin: const EdgeInsets.only(bottom: 10),
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: _opColor(op['type']!)
                                    .withValues(alpha: 0.08),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                    color: _opColor(op['type']!)
                                        .withValues(alpha: 0.2)),
                              ),
                              child: Row(children: [
                                Container(
                                  width: 36,
                                  height: 36,
                                  decoration: BoxDecoration(
                                    color: _opColor(op['type']!)
                                        .withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Icon(_opIcon(op['type']!),
                                      size: 18,
                                      color: _opColor(op['type']!)),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(op['action']!,
                                          style: theme.textTheme.titleSmall),
                                      const SizedBox(height: 2),
                                      Text(
                                        '${op['parcelle']} • ${op['date']}',
                                        style: theme.textTheme.labelSmall,
                                      ),
                                    ],
                                  ),
                                ),
                              ]),
                            );
                          },
                        ),

                  // Valve actions tab
                  allVanneActions.isEmpty
                      ? Center(
                          child: Text(langState.t('history.no_data'),
                              style: theme.textTheme.bodySmall))
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
                          itemCount: allVanneActions.length,
                          itemBuilder: (ctx, i) {
                            final va = allVanneActions[i];
                            final isOpen =
                                va['state'] == langState.t('vannes.opened');
                            return Container(
                              margin: const EdgeInsets.only(bottom: 10),
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: theme.colorScheme.surface,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                    color: theme.colorScheme.outline),
                              ),
                              child: Row(children: [
                                Container(
                                  width: 36,
                                  height: 36,
                                  decoration: BoxDecoration(
                                    color: isOpen
                                        ? AppColors.farmWater
                                            .withValues(alpha: 0.15)
                                        : theme.colorScheme.secondary,
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Center(
                                      child: Text('🚰',
                                          style: TextStyle(fontSize: 16))),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(children: [
                                        Text(va['vanne']!,
                                            style:
                                                theme.textTheme.titleSmall),
                                        const SizedBox(width: 6),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: isOpen
                                                ? AppColors.farmLeaf
                                                : theme.colorScheme.secondary,
                                            borderRadius:
                                                BorderRadius.circular(4),
                                          ),
                                          child: Text(
                                            va['state']!,
                                            style: TextStyle(
                                              fontSize: 9,
                                              fontWeight: FontWeight.w700,
                                              color: isOpen
                                                  ? Colors.white
                                                  : theme
                                                      .colorScheme.onSurface
                                                      .withValues(alpha: 0.5),
                                            ),
                                          ),
                                        ),
                                      ]),
                                      const SizedBox(height: 2),
                                      Text(
                                        '${va['parcelle']} • ${va['action']} • ${va['debit']}',
                                        style: theme.textTheme.labelSmall,
                                      ),
                                    ],
                                  ),
                                ),
                              ]),
                            );
                          },
                        ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _opColor(String type) {
    switch (type) {
      case 'irrigation':
        return AppColors.farmWater;
      case 'fertilisation':
        return AppColors.farmEarth;
      case 'recolte':
        return AppColors.farmSun;
      case 'vanne':
        return AppColors.farmWater;
      default:
        return AppColors.farmLeaf;
    }
  }

  IconData _opIcon(String type) {
    switch (type) {
      case 'irrigation':
        return Icons.water_drop;
      case 'fertilisation':
        return Icons.science;
      case 'recolte':
        return Icons.agriculture;
      case 'vanne':
        return Icons.power_settings_new;
      default:
        return Icons.event;
    }
  }
}
