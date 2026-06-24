import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart' as p;
import 'package:uiearth_flutter/core/l10n/app_localizations.dart';
import 'package:uiearth_flutter/core/theme/app_colors.dart';
import 'package:uiearth_flutter/data/api/api_exception.dart';
import 'package:uiearth_flutter/data/models/parcelle.dart';
import 'package:uiearth_flutter/domain/providers/access_provider.dart';
import 'package:uiearth_flutter/domain/providers/api_providers.dart';
import 'package:uiearth_flutter/domain/providers/parcelle_provider.dart';
import 'package:uiearth_flutter/domain/providers/valve_provider.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  String _search = '';
  String _filter = 'all';
  bool _didBootstrap = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _didBootstrap) return;
      _didBootstrap = true;
      _bootstrapFromBackend();
    });
  }

  Future<void> _bootstrapFromBackend() async {
    final api = ref.read(uiEarthApiProvider);
    try {
      final listAny = await api.capteurSol.listParcelles();
      if (listAny is! List) return;

      final remoteParcelles = <ParcelleData>[];
      for (final item in listAny) {
        if (item is! Map) continue;
        final map = Map<String, dynamic>.from(item);
        final id = (map['id'] as num?)?.toInt();
        if (id == null) continue;

        try {
          final details = await api.capteurSol.getParcelleDetails(id);
          if (details != null) {
            remoteParcelles.add(ParcelleData.fromBackendDetails(details));
            continue;
          }
        } catch (_) {
          // Ignore one item failure and continue with remaining parcelles.
        }
      }

      if (!mounted) return;
      ref.read(parcellesProvider.notifier).replaceAll(remoteParcelles);
      p.Provider.of<ValveProvider>(context, listen: false)
          .replaceFromParcelles(remoteParcelles);
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Chargement backend impossible: ${e.message}')),
      );
    } catch (_) {
      // Keep local fallback data when backend is not reachable.
    }
  }

  @override
  Widget build(BuildContext context) {
    final langState = ref.watch(languageProvider);
    final parcelles = ref.watch(parcellesProvider);
    final valveState = p.Provider.of<ValveProvider>(context);
    final access = ref.watch(accessProvider);
    final theme = Theme.of(context);

    final filtered = parcelles.where((p) {
      final matchSearch = p.name.toLowerCase().contains(_search.toLowerCase()) ||
          p.culture.toLowerCase().contains(_search.toLowerCase());
      final matchFilter = _filter == 'all' ||
          (_filter == 'connected' && p.isConnected) ||
          (_filter == 'disconnected' && !p.isConnected);
      return matchSearch && matchFilter;
    }).toList();

    final totalArea = parcelles
        .fold<double>(0, (sum, p) => sum + double.tryParse(p.area.replaceAll(' ha', ''))!)
        .toStringAsFixed(1);
    final connectedCount = parcelles.where((p) => p.isConnected).length;
    final openVannesTotal = valveState.valves.where((v) => v.isOpen).length;

    return ListView(
      padding: EdgeInsets.zero,
      children: [
        // ── Hero Header ──────────────────────────────────────────────────
        Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF16a34a), Color(0xFF15803d), Color(0xFF166534)],
            ),
            borderRadius: BorderRadius.vertical(bottom: Radius.circular(32)),
          ),
          child: SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(langState.t('index.title'),
                                style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -0.5)),
                            const SizedBox(height: 4),
                            Text('${parcelles.length} ${langState.t('index.parcelles')} • $totalArea ${langState.t('index.total')}',
                                style: const TextStyle(color: Colors.white70, fontSize: 13)),
                          ],
                        ),
                      ),
                      GestureDetector(
                        onTap: () => context.push('/formulaire'),
                        child: Container(
                          width: 48, height: 48,
                          decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(16)),
                          child: const Icon(Icons.add_rounded, color: Colors.white, size: 28),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  // KPI pills
                  Row(children: [
                    _HomeKpi(value: '${parcelles.length}', label: langState.t('index.parcelles'), icon: Icons.grid_view_rounded),
                    const SizedBox(width: 10),
                    _HomeKpi(value: '$openVannesTotal', label: langState.t('index.electrovalves'), icon: Icons.water_drop_rounded),
                    const SizedBox(width: 10),
                    _HomeKpi(value: '$connectedCount/${parcelles.length}', label: langState.t('index.connected'), icon: Icons.wifi_rounded),
                  ]),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 16),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
        // Reports Icon Button
        if (access.canFeature('parcelles', 'parcelles.add_rapport')) ...[
          GestureDetector(
            onTap: () => context.push('/rapports'),
            child: Container(
              height: 48,
              decoration: BoxDecoration(
                color: AppColors.farmLeaf.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.farmLeaf.withValues(alpha: 0.2)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.note_add_outlined, color: AppColors.farmLeaf, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    langState.t('nav.reports'),
                    style: const TextStyle(
                      color: AppColors.farmLeaf,
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Icon(Icons.chevron_right, color: AppColors.farmLeaf.withValues(alpha: 0.6), size: 18),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
        ],

        // Search
        Container(
          height: 42,
          decoration: BoxDecoration(
            color: theme.colorScheme.secondary,
            borderRadius: BorderRadius.circular(12),
          ),
          child: TextField(
            onChanged: (v) => setState(() => _search = v),
            decoration: InputDecoration(
              hintText: langState.t('index.search'),
              hintStyle: TextStyle(fontSize: 13, color: theme.colorScheme.onSurface.withValues(alpha: 0.4)),
              prefixIcon: Icon(Icons.search, size: 18, color: theme.colorScheme.onSurface.withValues(alpha: 0.4)),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(vertical: 10),
            ),
            style: const TextStyle(fontSize: 13),
          ),
        ),
        const SizedBox(height: 12),

        // Connection Filter Tabs
        Container(
          height: 36,
          decoration: BoxDecoration(
            color: theme.colorScheme.secondary,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              _FilterTab(langState.t('index.all'), _filter == 'all', () => setState(() => _filter = 'all')),
              _FilterTab(langState.t('index.connected'), _filter == 'connected', () => setState(() => _filter = 'connected')),
              _FilterTab(langState.t('index.disconnected'), _filter == 'disconnected', () => setState(() => _filter = 'disconnected')),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Parcelle Cards
        ...filtered.map((parcelle) {
          final parcelleValves = valveState.byParcelle(parcelle.id);
          final openVannes = parcelleValves.where((v) => v.isOpen).length;
          final irrigationProgress = _computeParcelleIrrigationProgress(parcelle, parcelleValves);
          return _ParcelleCard(
            parcelle: parcelle,
            langState: langState,
            onTap: () => _showDetail(parcelle),
            onScanQr: () => context.push('/scan-qr?parcelleId=${Uri.encodeQueryComponent(parcelle.id)}'),
            openVannes: openVannes,
            totalVannes: parcelleValves.length,
            irrigationProgress: irrigationProgress,
          );
        }),

        if (filtered.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 32),
            child: Text(
              langState.t('index.no_results'),
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall,
            ),
          ),
            ],
          ),
        ),
      ],
    );
  }

  int _computeParcelleIrrigationProgress(ParcelleData parcelle, List<ValveModel> valves) {
    final totalWaterNeed = parcelle.plants.fold<double>(
      0,
      (sum, plant) => sum + plant.count * plant.waterNeedPerPlant,
    );
    if (totalWaterNeed == 0) return 0;

    final totalDebit = valves.where((v) => v.isOpen).fold<double>(0, (sum, v) => sum + v.debit);
    return ((totalDebit / totalWaterNeed) * 100).round();
  }

  double _computeWaterPerPlant(ValveModel valve, {int durationMinutes = 60}) {
    if (valve.nbPlants == 0) return 0;
    final totalWater = valve.debit * durationMinutes;
    return (totalWater / valve.nbPlants * 10).roundToDouble() / 10;
  }

  void _showDetail(ParcelleData parcelle) {
    final langState = ref.read(languageProvider);
    final access = ref.read(accessProvider);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => p.Consumer<ValveProvider>(
        builder: (ctx, valveState, __) => DraggableScrollableSheet(
          initialChildSize: 0.75,
          maxChildSize: 0.9,
          minChildSize: 0.4,
          expand: false,
          builder: (sheetCtx, scrollController) {
            final parcelleValves = valveState.byParcelle(parcelle.id);
            final progress = _computeParcelleIrrigationProgress(parcelle, parcelleValves);
            final isOverflow = progress >= 100;
            final isWarning = progress >= 80 && progress < 100;
            final theme = Theme.of(sheetCtx);
            final openCount = parcelleValves.where((v) => v.isOpen).length;

            return ListView(
              controller: scrollController,
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.outline,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                Text(parcelle.name, style: theme.textTheme.headlineSmall),
                const SizedBox(height: 4),
                Text('${parcelle.culture} • ${parcelle.area}', style: theme.textTheme.bodySmall),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(children: [
                      const Icon(Icons.water_drop, size: 14, color: AppColors.farmWater),
                      const SizedBox(width: 4),
                      Text(langState.t('index.progression'), style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w500)),
                    ]),
                    Text(
                      '$progress%',
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: isOverflow ? AppColors.farmDanger : isWarning ? AppColors.farmSun : null,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: (progress.clamp(0, 100)) / 100,
                    minHeight: 8,
                    backgroundColor: theme.colorScheme.secondary,
                    valueColor: AlwaysStoppedAnimation(
                      isOverflow ? AppColors.farmDanger : isWarning ? AppColors.farmSun : AppColors.farmLeaf,
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '$openCount/${parcelleValves.length} ${langState.t('index.valves')} ${langState.t('index.open')}',
                  style: theme.textTheme.labelSmall,
                ),
                if (access.canFeature('parcelles', 'parcelles.climat')) ...[
                  const Divider(height: 24),
                  _SectionHeader(icon: Icons.wb_sunny_outlined, color: AppColors.farmSun, title: langState.t('index.climate_data')),
                  const SizedBox(height: 8),
                  Wrap(spacing: 8, runSpacing: 8, children: [
                    _DataChip(parcelle.climate.airTemp, langState.t('index.air_temp'), AppColors.farmSun),
                    _DataChip(parcelle.climate.humidity, langState.t('index.humidity'), AppColors.farmWater),
                    _DataChip(parcelle.climate.sunshine, langState.t('index.sunshine'), AppColors.farmSun),
                    _DataChip(parcelle.climate.wind, langState.t('index.wind'), AppColors.farmWater),
                  ]),
                ],
                if (access.canFeature('parcelles', 'parcelles.controle_vanne')) ...[
                const Divider(height: 24),
                _SectionHeader(icon: Icons.power_settings_new, color: AppColors.farmWater, title: langState.t('index.electrovalves')),
                const SizedBox(height: 8),
                ...parcelleValves.map((v) {
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: v.isOpen ? AppColors.farmWater.withValues(alpha: 0.05) : theme.colorScheme.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: v.isOpen ? AppColors.farmWater.withValues(alpha: 0.3) : theme.colorScheme.outline,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(children: [
                                Text('🚰 ${v.name}', style: theme.textTheme.titleSmall),
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: v.isOpen ? AppColors.farmLeaf : theme.colorScheme.secondary,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    v.isOpen ? 'ON' : 'OFF',
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.w700,
                                      color: v.isOpen ? Colors.white : theme.colorScheme.onSurface.withValues(alpha: 0.5),
                                    ),
                                  ),
                                ),
                              ]),
                              const SizedBox(height: 4),
                              Text('${langState.t('index.flow')}: ${v.debit} L/min • ${v.nbPlants} plantes', style: theme.textTheme.labelSmall),
                              if (v.isOpen)
                                Text('${_computeWaterPerPlant(v)} L/plante/h',
                                    style: theme.textTheme.labelSmall?.copyWith(
                                      color: AppColors.farmLeaf,
                                      fontWeight: FontWeight.w600,
                                    )),
                            ],
                          ),
                        ),
                        Switch(
                          value: v.isOpen,
                          onChanged: (_) => _toggleValveSafe(sheetCtx, v),
                        ),
                        ]),
                        // Données du sol (capteur de la vanne)
                        if (access.canFeature('parcelles', 'parcelles.sol')) ...[
                          const SizedBox(height: 8),
                          Row(children: [
                            Expanded(child: _DataChip(parcelle.soil.temperature, langState.t('index.soil_temp'), AppColors.farmSun)),
                            const SizedBox(width: 8),
                            Expanded(child: _DataChip(parcelle.soil.humidity, langState.t('index.soil_humidity'), AppColors.farmWater)),
                            const SizedBox(width: 8),
                            Expanded(child: _DataChip(parcelle.soil.ph, langState.t('index.soil_ph'), AppColors.farmEarth)),
                          ]),
                        ],
                      ],
                    ),
                  );
                }),
                ],
                const Divider(height: 24),
                _SectionHeader(icon: Icons.calendar_today, color: AppColors.farmSun, title: langState.t('index.next_ops')),
                const SizedBox(height: 8),
                if (parcelle.operations.isEmpty)
                  Text('—', style: theme.textTheme.bodySmall)
                else
                  ...parcelle.operations.asMap().entries.map((entry) {
                    final op = entry.value;
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _opColor(op.type).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(op.date, style: theme.textTheme.labelSmall?.copyWith(fontSize: 10)),
                          const SizedBox(height: 2),
                          Text(op.action, style: theme.textTheme.titleSmall),
                        ],
                      ),
                    );
                  }),
              ],
            );
          },
        ),
      ),
    );
  }

  Color _opColor(String type) {
    switch (type) {
      case 'irrigation': return AppColors.farmWater;
      case 'fertilisation': return AppColors.farmEarth;
      case 'recolte': return AppColors.farmSun;
      default: return AppColors.farmLeaf;
    }
  }

  // Même condition que l'écran Vannes : au moins 1 vanne ouverte par parcelle.
  Future<void> _toggleValveSafe(BuildContext context, ValveModel valve) async {
    final valveProvider = p.Provider.of<ValveProvider>(context, listen: false);
    final nextOpen = !valve.isOpen;

    // ── SÉCURITÉ : au moins 1 vanne ouverte par parcelle ────────────────────
    if (!nextOpen) {
      final parcelleValves = valveProvider.byParcelle(valve.parcelleId);
      final openInParcelle = parcelleValves.where((v) => v.isOpen).length;
      if (openInParcelle <= 1) {
        if (context.mounted) {
          final langS = ref.read(languageProvider);
          await showDialog<void>(
            context: context,
            builder: (ctx) => AlertDialog(
              icon: const Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 40),
              title: Text(langS.t('vannes.security_title'), textAlign: TextAlign.center),
              content: Text(langS.t('vannes.security_msg'), textAlign: TextAlign.center),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: Text(langS.t('vannes.understood')),
                ),
              ],
            ),
          );
        }
        return;
      }
    }

    if (valve.backendId != null) {
      try {
        await ref.read(uiEarthApiProvider).capteurSol.updateVanne(valve.backendId!, {
          'isOpen': nextOpen,
          'lastAction': nextOpen ? 'Ouvert depuis mobile' : 'Fermé depuis mobile',
        });
      } on ApiException catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Erreur backend vanne: ${e.message}')),
          );
        }
        return;
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Erreur réseau vanne: $e')),
          );
        }
        return;
      }
    }

    valveProvider.toggleValve(valve.id);
  }
}

class _HomeKpi extends StatelessWidget {
  final String value, label;
  final IconData icon;
  const _HomeKpi({required this.value, required this.label, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
        ),
        child: Row(children: [
          Container(
            width: 28, height: 28,
            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(8)),
            child: Icon(icon, size: 14, color: Colors.white),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(value, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w800), overflow: TextOverflow.ellipsis),
              Text(label, style: TextStyle(color: Colors.white.withValues(alpha: 0.65), fontSize: 9), overflow: TextOverflow.ellipsis),
            ]),
          ),
        ]),
      ),
    );
  }
}

class _FilterTab extends StatelessWidget {
  final String label;
  final bool isActive;
  final VoidCallback onTap;
  const _FilterTab(this.label, this.isActive, this.onTap);

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          alignment: Alignment.center,
          margin: const EdgeInsets.all(3),
          decoration: BoxDecoration(
            color: isActive ? Theme.of(context).colorScheme.surface : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            boxShadow: isActive
                ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)]
                : null,
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: isActive
                  ? Theme.of(context).colorScheme.onSurface
                  : Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.4),
            ),
          ),
        ),
      ),
    );
  }
}

class _ParcelleCard extends StatelessWidget {
  final ParcelleData parcelle;
  final LanguageState langState;
  final VoidCallback onTap;
  final VoidCallback onScanQr;
  final int openVannes;
  final int totalVannes;
  final int irrigationProgress;

  const _ParcelleCard({
    required this.parcelle,
    required this.langState,
    required this.onTap,
    required this.onScanQr,
    required this.openVannes,
    required this.totalVannes,
    required this.irrigationProgress,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final progress = irrigationProgress;
    final isOverflow = progress >= 100;
    final isWarning = progress >= 80 && progress < 100;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.6)),
          boxShadow: AppColors.cardShadow,
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: IntrinsicHeight(
            child: Row(
              children: [
                // Accent strip gauche
                Container(
                  width: 4,
                  color: parcelle.isConnected ? AppColors.farmLeaf : AppColors.farmDanger,
                ),
                Expanded(
        child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(children: [
                  Icon(
                    parcelle.isConnected ? Icons.wifi : Icons.wifi_off,
                    size: 16,
                    color: parcelle.isConnected ? AppColors.farmLeaf : AppColors.farmDanger,
                  ),
                  const SizedBox(width: 8),
                  Text(parcelle.name, style: theme.textTheme.titleMedium),
                ]),
                Row(children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: parcelle.isConnected
                          ? AppColors.farmLeaf.withValues(alpha: 0.1)
                          : AppColors.farmDanger.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                        color: parcelle.isConnected
                            ? AppColors.farmLeaf.withValues(alpha: 0.3)
                            : AppColors.farmDanger.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Text(
                      parcelle.isConnected
                          ? '🟢 ${langState.t('index.connected')}'
                          : '🔴 ${langState.t('index.disconnected')}',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: parcelle.isConnected ? AppColors.farmLeaf : AppColors.farmDanger,
                      ),
                    ),
                  ),
                  if (!parcelle.isConnected) ...[
                    const SizedBox(width: 6),
                    GestureDetector(
                      onTap: onScanQr,
                      child: Container(
                        width: 28, height: 28,
                        decoration: BoxDecoration(
                          color: AppColors.farmLeaf,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.qr_code, size: 14, color: Colors.white),
                      ),
                    ),
                  ],
                ]),
              ],
            ),
            const SizedBox(height: 8),

            // Culture + Area
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(parcelle.culture, style: theme.textTheme.bodySmall),
                Text(parcelle.area, style: theme.textTheme.bodySmall),
              ],
            ),
            const SizedBox(height: 8),

            if (parcelle.isConnected) ...[
              // Irrigation progress
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(children: [
                    const Icon(Icons.water_drop, size: 10, color: AppColors.farmWater),
                    const SizedBox(width: 4),
                    Text(langState.t('index.irrigation'),
                        style: theme.textTheme.labelSmall?.copyWith(fontWeight: FontWeight.w500)),
                  ]),
                  Text(
                    '$progress%${isOverflow ? ' ⚠️' : ''}',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: isOverflow ? AppColors.farmDanger : isWarning ? AppColors.farmSun : theme.colorScheme.onSurface,
                    ),
                  ),
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
                    isOverflow ? AppColors.farmDanger : isWarning ? AppColors.farmSun : AppColors.farmLeaf,
                  ),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                '$openVannes/$totalVannes ${langState.t('index.valves')} ${langState.t('index.open')}',
                style: const TextStyle(fontSize: 9, color: Colors.grey),
              ),
              const SizedBox(height: 8),

              // Sensor mini grid
              Row(
                children: [
                  _MiniSensor(parcelle.soil.humidity, langState.t('index.soil_humidity'), theme),
                  const SizedBox(width: 6),
                  _MiniSensor(parcelle.soil.temperature, langState.t('index.soil_temp'), theme),
                  const SizedBox(width: 6),
                  _MiniSensor(parcelle.soil.ph, langState.t('index.soil_ph'), theme),
                ],
              ),
            ] else
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.farmDanger.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.farmDanger.withValues(alpha: 0.2)),
                ),
                child: Column(
                  children: [
                    const Icon(Icons.qr_code, size: 20, color: AppColors.farmDanger),
                    const SizedBox(height: 4),
                    Text(
                      langState.t('index.scan_to_connect'),
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.farmDanger),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      height: 32,
                      child: ElevatedButton.icon(
                        onPressed: onScanQr,
                        icon: const Icon(Icons.qr_code_scanner, size: 14),
                        label: Text(langState.t('index.scan_qr'), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.farmLeaf,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 8),

            // Footer
            Row(children: [
              const Icon(Icons.calendar_today, size: 10, color: Colors.grey),
              const SizedBox(width: 4),
              Text(
                '${parcelle.operations.length} ${parcelle.operations.length > 1 ? langState.t('index.operations_plural') : langState.t('index.operations')}',
                style: const TextStyle(fontSize: 10, color: Colors.grey),
              ),
              const SizedBox(width: 12),
              const Icon(Icons.park_outlined, size: 10, color: Colors.grey),
              const SizedBox(width: 4),
              Text(
                '${parcelle.plants.fold<int>(0, (s, pl) => s + pl.count)} ${langState.t('wizard.plant_count')}',
                style: const TextStyle(fontSize: 10, color: Colors.grey),
              ),
            ]),
          ],
        ),
        ),  // Padding
        ),  // Expanded
      ],
      ),  // Row
      ),  // IntrinsicHeight
      ),  // ClipRRect
      ),  // Container child
    );   // GestureDetector
  }
}

class _MiniSensor extends StatelessWidget {
  final String value;
  final String label;
  final ThemeData theme;
  const _MiniSensor(this.value, this.label, this.theme);

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 6),
        decoration: BoxDecoration(
          color: theme.colorScheme.secondary,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          children: [
            Text(value, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: theme.colorScheme.onSurface)),
            Text(label, style: const TextStyle(fontSize: 8, color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  const _SectionHeader({required this.icon, required this.color, required this.title});

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Icon(icon, size: 14, color: color),
      const SizedBox(width: 8),
      Text(title, style: Theme.of(context).textTheme.titleSmall),
    ]);
  }
}

class _DataChip extends StatelessWidget {
  final String value;
  final String label;
  final Color iconColor;
  const _DataChip(this.value, this.label, this.iconColor);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
      decoration: BoxDecoration(
        color: theme.colorScheme.secondary,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(value,
              style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 9, color: Colors.grey)),
        ],
      ),
    );
  }
}
