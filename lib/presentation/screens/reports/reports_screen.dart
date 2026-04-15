import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uiearth_flutter/core/l10n/app_localizations.dart';
import 'package:uiearth_flutter/core/theme/app_colors.dart';
import 'package:uiearth_flutter/data/models/parcelle.dart';
import 'package:uiearth_flutter/domain/providers/parcelle_provider.dart';

class ReportsScreen extends ConsumerWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final langState = ref.watch(languageProvider);
    final parcelles = ref.watch(parcellesProvider);
    final theme = Theme.of(context);

    final totalArea = parcelles
        .fold<double>(0, (s, p) => s + double.tryParse(p.area.replaceAll(' ha', ''))!)
        .toStringAsFixed(1);
    final totalVannes = parcelles.fold<int>(0, (s, p) => s + p.vannes.length);
    final openVannes = parcelles.fold<int>(
        0, (s, p) => s + p.vannes.where((v) => v.isOpen).length);
    final totalPlants = parcelles.fold<int>(
        0, (s, p) => s + p.plants.fold<int>(0, (ps, pl) => ps + pl.count));

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const Icon(Icons.description_outlined, size: 22),
            const SizedBox(width: 8),
            Text(langState.t('nav.reports')),
          ],
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        children: [
          // Global stats
          Text(langState.t('reports.overview'),
              style: theme.textTheme.titleMedium),
          const SizedBox(height: 12),
          Row(children: [
            _StatCard('${parcelles.length}', langState.t('reports.parcelles'),
                Icons.terrain, AppColors.farmLeaf, theme),
            const SizedBox(width: 10),
            _StatCard('$totalArea ha', langState.t('reports.area'),
                Icons.square_foot, AppColors.farmEarth, theme),
          ]),
          const SizedBox(height: 10),
          Row(children: [
            _StatCard('$totalPlants', langState.t('reports.plants'),
                Icons.park_outlined, AppColors.farmLeaf, theme),
            const SizedBox(width: 10),
            _StatCard('$openVannes/$totalVannes',
                langState.t('reports.valves_open'), Icons.water_drop,
                AppColors.farmWater, theme),
          ]),
          const SizedBox(height: 24),

          // Per-parcelle reports
          Text(langState.t('reports.per_parcelle'),
              style: theme.textTheme.titleMedium),
          const SizedBox(height: 12),
          ...parcelles.map((p) => _ParcelleReport(parcelle: p, langState: langState)),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String value, label;
  final IconData icon;
  final Color color;
  final ThemeData theme;
  const _StatCard(this.value, this.label, this.icon, this.color, this.theme);

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: theme.colorScheme.outline),
        ),
        child: Row(children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(value,
                    style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: theme.colorScheme.onSurface)),
                Text(label,
                    style: theme.textTheme.labelSmall,
                    overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
        ]),
      ),
    );
  }
}

class _ParcelleReport extends StatelessWidget {
  final ParcelleData parcelle;
  final LanguageState langState;
  const _ParcelleReport({required this.parcelle, required this.langState});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final progress = getIrrigationProgress(parcelle);
    final isOverflow = progress >= 100;
    final openV = parcelle.vannes.where((v) => v.isOpen).length;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.colorScheme.outline),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(children: [
            Icon(parcelle.isConnected ? Icons.wifi : Icons.wifi_off,
                size: 14,
                color: parcelle.isConnected
                    ? AppColors.farmLeaf
                    : AppColors.farmDanger),
            const SizedBox(width: 8),
            Expanded(
              child: Text(parcelle.name,
                  style: theme.textTheme.titleSmall),
            ),
            Text(parcelle.area, style: theme.textTheme.bodySmall),
          ]),
          const Divider(height: 16),

          // Irrigation
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(langState.t('index.irrigation'),
                  style: theme.textTheme.labelSmall
                      ?.copyWith(fontWeight: FontWeight.w500)),
              Text('$progress%',
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: isOverflow
                          ? AppColors.farmDanger
                          : AppColors.farmLeaf)),
            ],
          ),
          const SizedBox(height: 4),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: (progress.clamp(0, 100)) / 100,
              minHeight: 6,
              backgroundColor: theme.colorScheme.secondary,
              valueColor: AlwaysStoppedAnimation(
                  isOverflow ? AppColors.farmDanger : AppColors.farmLeaf),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '$openV/${parcelle.vannes.length} ${langState.t('index.valves')} ${langState.t('index.open')}',
            style: const TextStyle(fontSize: 10, color: Colors.grey),
          ),
          const SizedBox(height: 8),

          // Soil data
          Row(children: [
            _MiniData(parcelle.soil.temperature, langState.t('index.soil_temp'),
                theme),
            const SizedBox(width: 6),
            _MiniData(parcelle.soil.humidity,
                langState.t('index.soil_humidity'), theme),
            const SizedBox(width: 6),
            _MiniData(parcelle.soil.ph, langState.t('index.soil_ph'), theme),
          ]),
          const SizedBox(height: 8),

          // Operations
          if (parcelle.operations.isNotEmpty) ...[
            Text(langState.t('index.next_ops'),
                style: theme.textTheme.labelSmall
                    ?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            ...parcelle.operations.map((op) => Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: Row(children: [
                    Icon(Icons.circle, size: 6, color: _opColor(op.type)),
                    const SizedBox(width: 6),
                    Text('${op.date} — ${op.action}',
                        style: const TextStyle(fontSize: 11)),
                  ]),
                )),
          ],
        ],
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
      default:
        return AppColors.farmLeaf;
    }
  }
}

class _MiniData extends StatelessWidget {
  final String value, label;
  final ThemeData theme;
  const _MiniData(this.value, this.label, this.theme);

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 6),
        decoration: BoxDecoration(
          color: theme.colorScheme.secondary,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(children: [
          Text(value,
              style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: theme.colorScheme.onSurface)),
          Text(label, style: const TextStyle(fontSize: 8, color: Colors.grey)),
        ]),
      ),
    );
  }
}
