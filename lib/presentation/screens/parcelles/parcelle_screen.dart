import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:provider/provider.dart' as p;
import 'package:uiearth_flutter/core/l10n/app_localizations.dart';
import 'package:uiearth_flutter/core/theme/app_colors.dart';
import 'package:uiearth_flutter/data/api/api_exception.dart';
import 'package:uiearth_flutter/data/models/parcelle.dart';
import 'package:uiearth_flutter/domain/providers/api_providers.dart';
import 'package:uiearth_flutter/domain/providers/parcelle_provider.dart';
import 'package:uiearth_flutter/domain/providers/valve_provider.dart';

class ParcelleScreen extends ConsumerStatefulWidget {
  final String parcelleId;
  final String parcelleName;

  const ParcelleScreen({
    super.key,
    required this.parcelleId,
    required this.parcelleName,
  });

  @override
  ConsumerState<ParcelleScreen> createState() => _ParcelleScreenState();
}

class _ParcelleScreenState extends ConsumerState<ParcelleScreen> {
  bool _loadingVannes = false;

  // Fermeture sécurisée : bloque si c'est la dernière vanne ouverte
  Future<void> _toggleVanne(BuildContext ctx, ValveModel vanne, ValveProvider valveProvider) async {
    final t = ref.read(languageProvider).t;
    final nextOpen = !vanne.isOpen;

    if (!nextOpen) {
      final parcelleValves = valveProvider.byParcelle(vanne.parcelleId);
      final openCount = parcelleValves.where((v) => v.isOpen).length;
      if (openCount <= 1) {
        await showDialog<void>(
          context: ctx,
          builder: (dialogCtx) => AlertDialog(
            icon: const Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 40),
            title: Text(t('vannes.security_title'), textAlign: TextAlign.center),
            content: Text(t('vannes.security_msg'), textAlign: TextAlign.center),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(dialogCtx).pop(),
                child: Text(t('vannes.understood')),
              ),
            ],
          ),
        );
        return;
      }
    }

    setState(() => _loadingVannes = true);
    try {
      if (vanne.backendId != null) {
        await ref.read(uiEarthApiProvider).capteurSol.updateVanne(vanne.backendId!, {
          'isOpen': nextOpen,
          'lastAction': nextOpen ? t('vannes.open_action') : t('vannes.close_action'),
        });
      }
      valveProvider.toggleValve(vanne.id);
    } on ApiException catch (e) {
      if (ctx.mounted) {
        ScaffoldMessenger.of(ctx).showSnackBar(
          SnackBar(content: Text('Erreur: ${e.message}'), backgroundColor: AppColors.farmDanger),
        );
      }
    } finally {
      if (mounted) setState(() => _loadingVannes = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final langState   = ref.watch(languageProvider);
    final t           = langState.t;
    final theme       = Theme.of(context);
    final parcelles   = ref.watch(parcellesProvider);
    final valveState  = p.Provider.of<ValveProvider>(context);

    final ParcelleData? parcelle = parcelles
        .where((p) => p.id == widget.parcelleId)
        .firstOrNull;

    final valves = valveState.byParcelle(widget.parcelleId);
    final openCount = valves.where((v) => v.isOpen).length;

    // Calcul progression irrigation
    final totalWaterNeed = parcelle?.plants.fold<double>(
        0, (s, pl) => s + pl.count * pl.waterNeedPerPlant) ?? 0;
    final totalDebit = valves.where((v) => v.isOpen)
        .fold<double>(0, (s, v) => s + v.debit);
    final progress = totalWaterNeed > 0
        ? ((totalDebit / totalWaterNeed) * 100).round().clamp(0, 100)
        : 0;
    final isOverflow = progress >= 100;
    final isWarning  = progress >= 80 && progress < 100;

    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            // ── AppBar ──────────────────────────────────────────────────────
            SliverAppBar(
              expandedHeight: 120,
              floating: false,
              pinned: true,
              backgroundColor: AppColors.farmLeaf,
              foregroundColor: Colors.white,
              flexibleSpace: FlexibleSpaceBar(
                title: Text(
                  parcelle?.name ?? widget.parcelleName,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16),
                ),
                background: Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [AppColors.farmLeaf, Color(0xFF2d6a4f)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                  ),
                ),
              ),
            ),

            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              sliver: SliverList(
                delegate: SliverChildListDelegate([

                  // ── Infos parcelle ───────────────────────────────────────
                  if (parcelle != null) ...[
                    _InfoRow(icon: Icons.park_outlined, color: AppColors.farmLeaf,
                        label: t('wizard.plant'),
                        value: '${parcelle.plants.fold<int>(0, (s, pl) => s + pl.count)} — ${parcelle.culture}'),
                    const SizedBox(height: 6),
                    _InfoRow(icon: Icons.straighten, color: AppColors.farmEarth,
                        label: t('wizard.area_ha'), value: parcelle.area),
                    const SizedBox(height: 6),
                    _InfoRow(
                      icon: parcelle.isConnected ? Icons.wifi : Icons.wifi_off,
                      color: parcelle.isConnected ? AppColors.farmLeaf : AppColors.farmDanger,
                      label: t('index.connected'),
                      value: parcelle.isConnected ? t('index.connected') : t('index.disconnected'),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // ── Progression irrigation ──────────────────────────────
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    Row(children: [
                      const Icon(Icons.water_drop, size: 14, color: AppColors.farmWater),
                      const SizedBox(width: 6),
                      Text(t('index.irrigation'), style: theme.textTheme.titleSmall),
                    ]),
                    Text(
                      '$progress%',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 16,
                        color: isOverflow ? AppColors.farmDanger : isWarning ? AppColors.farmSun : AppColors.farmLeaf,
                      ),
                    ),
                  ]),
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: LinearProgressIndicator(
                      value: progress / 100,
                      minHeight: 10,
                      backgroundColor: theme.colorScheme.secondary,
                      valueColor: AlwaysStoppedAnimation(
                        isOverflow ? AppColors.farmDanger : isWarning ? AppColors.farmSun : AppColors.farmLeaf,
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text('$openCount/${valves.length} ${t('index.electrovalves')} ${t('index.open')}',
                      style: theme.textTheme.labelSmall),
                  const SizedBox(height: 20),

                  // ── Section vannes ──────────────────────────────────────
                  Row(children: [
                    const Icon(Icons.water_drop_outlined, size: 16, color: AppColors.farmWater),
                    const SizedBox(width: 8),
                    Text(t('vannes.title'), style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                    const Spacer(),
                    Text('$openCount/${valves.length}',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600,
                            color: openCount > 0 ? AppColors.farmLeaf : Colors.grey)),
                  ]),
                  const SizedBox(height: 10),

                  if (valves.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.secondary,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Center(child: Text(t('index.no_results'),
                          style: theme.textTheme.bodySmall)),
                    )
                  else
                    ...valves.map((v) => _VanneCard(
                      vanne: v,
                      theme: theme,
                      t: t,
                      onToggle: () => _toggleVanne(
                          context, v, p.Provider.of<ValveProvider>(context, listen: false)),
                    )),

                  // ── Plantes ──────────────────────────────────────────────
                  if (parcelle != null && parcelle.plants.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    Row(children: [
                      const Icon(Icons.eco_outlined, size: 16, color: AppColors.farmEarth),
                      const SizedBox(width: 8),
                      Text(t('wizard.plant'), style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                    ]),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: parcelle.plants.map((pl) => Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: AppColors.farmEarth.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.farmEarth.withValues(alpha: 0.2)),
                        ),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(pl.name, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13,
                              color: theme.colorScheme.onSurface)),
                          Text('${pl.count} plant. • ${pl.age} ${t('wizard.plant_age_years')}',
                              style: const TextStyle(fontSize: 11, color: Colors.grey)),
                          Text('${pl.waterNeedPerPlant.toStringAsFixed(1)} L/h',
                              style: TextStyle(fontSize: 11, color: AppColors.farmWater,
                                  fontWeight: FontWeight.w600)),
                        ]),
                      )).toList(),
                    ),
                  ],

                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Carte vanne ───────────────────────────────────────────────────────────────

class _VanneCard extends StatelessWidget {
  final ValveModel vanne;
  final ThemeData theme;
  final String Function(String) t;
  final VoidCallback onToggle;

  const _VanneCard({
    required this.vanne,
    required this.theme,
    required this.t,
    required this.onToggle,
  });

  double get _waterPerHour =>
      vanne.nbPlants > 0 ? (vanne.debit * 60) / vanne.nbPlants : 0;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: vanne.isOpen
            ? AppColors.farmWater.withValues(alpha: 0.05)
            : theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: vanne.isOpen
              ? AppColors.farmWater.withValues(alpha: 0.35)
              : theme.colorScheme.outline,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Nom + badge + switch
          Row(children: [
            Container(
              width: 36, height: 36,
              decoration: BoxDecoration(
                color: vanne.isOpen
                    ? AppColors.farmWater.withValues(alpha: 0.15)
                    : theme.colorScheme.secondary,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Center(child: Text('🚰', style: const TextStyle(fontSize: 18))),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(vanne.name,
                    style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
                Text('${vanne.nbPlants} ${t('vannes.plants')}',
                    style: theme.textTheme.labelSmall),
              ]),
            ),
            Switch(
              value: vanne.isOpen,
              onChanged: (_) => onToggle(),
              activeTrackColor: AppColors.farmLeaf,
              activeThumbColor: Colors.white,
              inactiveTrackColor: theme.colorScheme.outline.withValues(alpha: 0.4),
            ),
          ]),
          const SizedBox(height: 10),

          // Barre débit
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Row(children: [
              const Icon(Icons.sensors, size: 12, color: Colors.grey),
              const SizedBox(width: 4),
              Text(t('vannes.flow_sensor'), style: theme.textTheme.labelSmall),
            ]),
            Text(
              '${vanne.debit.toStringAsFixed(1)} L/min',
              style: TextStyle(
                fontSize: 12, fontWeight: FontWeight.w700,
                color: vanne.isOpen
                    ? (vanne.debit >= 3 ? AppColors.farmLeaf : Colors.orange)
                    : Colors.grey,
              ),
            ),
          ]),
          const SizedBox(height: 4),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: (vanne.debit / 10.0).clamp(0.0, 1.0),
              minHeight: 6,
              backgroundColor: theme.colorScheme.secondary,
              valueColor: AlwaysStoppedAnimation(
                !vanne.isOpen ? Colors.grey.shade300
                    : vanne.debit >= 3 ? AppColors.farmLeaf
                    : vanne.debit >= 1 ? Colors.orange
                    : Colors.red,
              ),
            ),
          ),

          // Conso eau par plante
          if (vanne.isOpen && _waterPerHour > 0) ...[
            const SizedBox(height: 6),
            Row(children: [
              const Icon(Icons.eco, size: 12, color: AppColors.farmWater),
              const SizedBox(width: 4),
              Text(
                '${_waterPerHour.toStringAsFixed(1)} L/${t('vannes.plants')}/h',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.farmWater),
              ),
            ]),
          ],

          // Programmation
          if (vanne.isOpen && (vanne.startTime.isNotEmpty || vanne.endTime.isNotEmpty)) ...[
            const SizedBox(height: 6),
            Row(children: [
              const Icon(Icons.schedule, size: 12, color: AppColors.farmSun),
              const SizedBox(width: 4),
              Text('${vanne.startTime} → ${vanne.endTime}',
                  style: TextStyle(fontSize: 11, color: AppColors.farmSun, fontWeight: FontWeight.w600)),
            ]),
          ],
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  final String value;
  const _InfoRow({required this.icon, required this.color, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(children: [
      Icon(icon, size: 14, color: color),
      const SizedBox(width: 8),
      Text('$label : ', style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey)),
      Expanded(child: Text(value,
          style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600),
          overflow: TextOverflow.ellipsis)),
    ]);
  }
}
