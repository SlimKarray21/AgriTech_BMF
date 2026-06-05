import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart' as p;
import 'package:uiearth_flutter/core/theme/app_colors.dart';
import 'package:uiearth_flutter/data/models/parcelle.dart';
import 'package:uiearth_flutter/domain/providers/api_providers.dart';
import 'package:uiearth_flutter/domain/providers/parcelle_provider.dart';
import 'package:uiearth_flutter/domain/providers/valve_provider.dart';
import 'package:uiearth_flutter/data/api/api_exception.dart';

class AccueilScreen extends ConsumerStatefulWidget {
  const AccueilScreen({super.key});

  @override
  ConsumerState<AccueilScreen> createState() => _AccueilScreenState();
}

class _AccueilScreenState extends ConsumerState<AccueilScreen> {
  bool _didBootstrap = false;
  bool _loading = false;

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
    if (!mounted) return;
    setState(() => _loading = true);
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
          if (details != null) remoteParcelles.add(ParcelleData.fromBackendDetails(details));
        } catch (_) {}
      }
      if (!mounted) return;
      ref.read(parcellesProvider.notifier).replaceAll(remoteParcelles);
      p.Provider.of<ValveProvider>(context, listen: false).replaceFromParcelles(remoteParcelles);
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: ${e.message}')));
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  void _toggleValve(BuildContext context, ValveModel valve) {
    final valveProvider = p.Provider.of<ValveProvider>(context, listen: false);
    final nextOpen = !valve.isOpen;
    if (!nextOpen) {
      final parcelleValves = valveProvider.byParcelle(valve.parcelleId);
      if (parcelleValves.where((v) => v.isOpen).length <= 1) {
        showDialog<void>(
          context: context,
          builder: (ctx) => AlertDialog(
            icon: const Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 36),
            title: const Text('Sécurité irrigation', textAlign: TextAlign.center),
            content: const Text('Au moins une vanne doit rester ouverte par parcelle.', textAlign: TextAlign.center),
            actions: [TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Compris'))],
          ),
        );
        return;
      }
    }
    if (valve.backendId != null) {
      ref.read(uiEarthApiProvider).capteurSol.updateVanne(valve.backendId!, {
        'isOpen': nextOpen,
        'lastAction': nextOpen ? 'Ouvert depuis mobile' : 'Fermé depuis mobile',
      }).catchError((_) => null);
    }
    valveProvider.toggleValve(valve.id);
  }

  @override
  Widget build(BuildContext context) {
    final parcelles = ref.watch(parcellesProvider);
    final valveState = p.Provider.of<ValveProvider>(context);
    final theme = Theme.of(context);
    final allVannes = valveState.valves;

    final totalHa = parcelles.fold<double>(
      0, (s, pc) => s + (double.tryParse(pc.area.replaceAll(RegExp(r'[^\d.]'), '')) ?? 0),
    );
    final openCount = allVannes.where((v) => v.isOpen).length;
    final connectedCount = parcelles.where((pc) => pc.isConnected).length;
    final totalPlants = parcelles.fold<int>(0, (s, pc) => s + pc.plants.fold<int>(0, (ss, pl) => ss + pl.count));

    return RefreshIndicator(
      color: AppColors.farmLeaf,
      onRefresh: _bootstrapFromBackend,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          // ── Hero Header ──────────────────────────────────────────────────
          SliverToBoxAdapter(
            child: _HeroHeader(
              parcelles: parcelles,
              totalHa: totalHa,
              openCount: openCount,
              connectedCount: connectedCount,
              totalPlants: totalPlants,
              totalVannes: allVannes.length,
              loading: _loading,
              onAddParcelle: () => context.push('/formulaire'),
              onReports: () => context.push('/rapports'),
            ),
          ),

          // ── Parcelles section title ──────────────────────────────────────
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 10),
            sliver: SliverToBoxAdapter(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Parcelles & Électrovannes',
                      style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
                  if (_loading)
                    const SizedBox(width: 16, height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.farmLeaf))
                  else
                    GestureDetector(
                      onTap: _bootstrapFromBackend,
                      child: Icon(Icons.refresh_rounded, size: 18, color: theme.colorScheme.outline),
                    ),
                ],
              ),
            ),
          ),

          // ── Empty state ──────────────────────────────────────────────────
          if (parcelles.isEmpty && !_loading)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 32),
                child: Column(
                  children: [
                    Icon(Icons.terrain_outlined, size: 56, color: theme.colorScheme.outline),
                    const SizedBox(height: 12),
                    Text('Aucune parcelle', style: theme.textTheme.titleMedium?.copyWith(color: theme.colorScheme.outline)),
                    const SizedBox(height: 8),
                    ElevatedButton.icon(
                      onPressed: () => context.push('/formulaire'),
                      icon: const Icon(Icons.add),
                      label: const Text('Ajouter une parcelle'),
                    ),
                  ],
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (ctx, i) {
                    final parcelle = parcelles[i];
                    final parcelleValves = valveState.byParcelle(parcelle.id);
                    return _ParcelleVannesCard(
                      parcelle: parcelle,
                      vannes: parcelleValves,
                      onScanQr: () => context.push('/scan-qr?parcelleId=${Uri.encodeQueryComponent(parcelle.id)}'),
                      onToggleVanne: (v) => _toggleValve(context, v),
                    );
                  },
                  childCount: parcelles.length,
                ),
              ),
            ),

          // ── Chatbot section ──────────────────────────────────────────────
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
            sliver: SliverToBoxAdapter(child: _ChatbotWidget()),
          ),
        ],
      ),
    );
  }
}

// ── Hero Header ───────────────────────────────────────────────────────────────

class _HeroHeader extends StatelessWidget {
  final List<ParcelleData> parcelles;
  final double totalHa;
  final int openCount, connectedCount, totalPlants, totalVannes;
  final bool loading;
  final VoidCallback onAddParcelle, onReports;

  const _HeroHeader({
    required this.parcelles,
    required this.totalHa,
    required this.openCount,
    required this.connectedCount,
    required this.totalPlants,
    required this.totalVannes,
    required this.loading,
    required this.onAddParcelle,
    required this.onReports,
  });

  @override
  Widget build(BuildContext context) {
    final hour = DateTime.now().hour;
    final greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bonne journée' : 'Bonsoir';

    return Container(
      margin: const EdgeInsets.only(bottom: 20),
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
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(greeting, style: const TextStyle(color: Colors.white70, fontSize: 14)),
                  const Text('AgriTech', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: -0.5)),
                ]),
                Container(
                  width: 48, height: 48,
                  decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(16)),
                  child: const Icon(Icons.terrain_rounded, color: Colors.white, size: 26),
                ),
              ]),
              const SizedBox(height: 22),
              Row(children: [
                _KpiCard(value: '${parcelles.length}', label: 'Parcelles', icon: Icons.grid_view_rounded, color: const Color(0xFFbbf7d0)),
                const SizedBox(width: 10),
                _KpiCard(value: '$openCount/$totalVannes', label: 'Vannes ouvertes', icon: Icons.water_drop_rounded, color: const Color(0xFFbae6fd)),
                const SizedBox(width: 10),
                _KpiCard(value: '${totalHa.toStringAsFixed(1)} ha', label: 'Superficie', icon: Icons.square_foot_rounded, color: const Color(0xFFfef08a)),
              ]),
              const SizedBox(height: 10),
              Row(children: [
                _KpiCard(value: '$connectedCount/${parcelles.length}', label: 'Connectées', icon: Icons.wifi_rounded, color: const Color(0xFFbbf7d0)),
                const SizedBox(width: 10),
                _KpiCard(value: '$totalPlants', label: 'Plantes', icon: Icons.eco_rounded, color: const Color(0xFFd9f99d)),
                const SizedBox(width: 10),
                _KpiCard(value: '$totalVannes', label: 'Total vannes', icon: Icons.settings_input_component_rounded, color: const Color(0xFFfed7aa)),
              ]),
              const SizedBox(height: 20),
              Row(children: [
                Expanded(child: _ActionBtn(label: '+ Parcelle', icon: Icons.add_circle_outline, onTap: onAddParcelle, filled: true)),
                const SizedBox(width: 10),
                Expanded(child: _ActionBtn(label: 'Rapports', icon: Icons.note_add_outlined, onTap: onReports, filled: false)),
              ]),
            ],
          ),
        ),
      ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  final String value, label;
  final IconData icon;
  final Color color;
  const _KpiCard({required this.value, required this.label, required this.icon, required this.color});

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
            decoration: BoxDecoration(color: color.withValues(alpha: 0.25), borderRadius: BorderRadius.circular(8)),
            child: Icon(icon, size: 14, color: color),
          ),
          const SizedBox(width: 8),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(value, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w800), overflow: TextOverflow.ellipsis),
            Text(label, style: TextStyle(color: Colors.white.withValues(alpha: 0.65), fontSize: 9), overflow: TextOverflow.ellipsis),
          ])),
        ]),
      ),
    );
  }
}

class _ActionBtn extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;
  final bool filled;
  const _ActionBtn({required this.label, required this.icon, required this.onTap, required this.filled});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 44,
        decoration: BoxDecoration(
          color: filled ? Colors.white : Colors.white.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withValues(alpha: filled ? 0 : 0.3)),
        ),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, size: 16, color: filled ? AppColors.farmLeaf : Colors.white),
          const SizedBox(width: 6),
          Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: filled ? AppColors.farmLeaf : Colors.white)),
        ]),
      ),
    );
  }
}

// ── Parcelle + Vannes Card ────────────────────────────────────────────────────

class _ParcelleVannesCard extends StatefulWidget {
  final ParcelleData parcelle;
  final List<ValveModel> vannes;
  final VoidCallback onScanQr;
  final void Function(ValveModel) onToggleVanne;

  const _ParcelleVannesCard({
    required this.parcelle,
    required this.vannes,
    required this.onScanQr,
    required this.onToggleVanne,
  });

  @override
  State<_ParcelleVannesCard> createState() => _ParcelleVannesCardState();
}

class _ParcelleVannesCardState extends State<_ParcelleVannesCard> {
  bool _expanded = false;

  int get _openVannes => widget.vannes.where((v) => v.isOpen).length;

  int get _irrigationProgress {
    final need = widget.parcelle.plants.fold<double>(0, (s, pl) => s + pl.count * pl.waterNeedPerPlant);
    if (need == 0) return 0;
    final debit = widget.vannes.where((v) => v.isOpen).fold<double>(0, (s, v) => s + v.debit);
    return ((debit / need) * 100).round();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final pc = widget.parcelle;
    final progress = _irrigationProgress.clamp(0, 100);
    final isOverflow = _irrigationProgress >= 100;
    final isWarning = _irrigationProgress >= 80 && _irrigationProgress < 100;
    final progressColor = isOverflow ? AppColors.farmDanger : isWarning ? AppColors.farmSun : AppColors.farmLeaf;

    // Regrouper les types de plantes
    final plantTypeMap = <String, int>{};
    for (final pl in pc.plants) {
      plantTypeMap[pl.type] = (plantTypeMap[pl.type] ?? 0) + pl.count;
    }
    final totalPlants = pc.plants.fold<int>(0, (s, pl) => s + pl.count);

    // Vannes ouvertes
    final openVannes = widget.vannes.where((v) => v.isOpen).toList();

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.6)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4))],
      ),
      child: Column(
        children: [
          // ── Header (toujours visible) ────────────────────────────────────
          GestureDetector(
            onTap: () => setState(() => _expanded = !_expanded),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Nom + statut + badge vannes
                  Row(children: [
                    Container(
                      width: 10, height: 10,
                      decoration: BoxDecoration(
                        color: pc.isConnected ? AppColors.farmLeaf : AppColors.farmDanger,
                        shape: BoxShape.circle,
                        boxShadow: [BoxShadow(color: (pc.isConnected ? AppColors.farmLeaf : AppColors.farmDanger).withValues(alpha: 0.4), blurRadius: 6)],
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(child: Text(pc.name, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700))),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.farmWater.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.farmWater.withValues(alpha: 0.3)),
                      ),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        const Text('🚰', style: TextStyle(fontSize: 11)),
                        const SizedBox(width: 4),
                        Text('$_openVannes/${widget.vannes.length}',
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.farmWater)),
                      ]),
                    ),
                    const SizedBox(width: 8),
                    AnimatedRotation(
                      turns: _expanded ? 0.5 : 0,
                      duration: const Duration(milliseconds: 200),
                      child: Icon(Icons.keyboard_arrow_down_rounded, color: theme.colorScheme.outline, size: 20),
                    ),
                  ]),
                  const SizedBox(height: 10),

                  // ── Vannes ouvertes résumé ────────────────────────────────
                  if (openVannes.isNotEmpty) ...[
                    Row(children: [
                      Icon(Icons.water_drop, size: 13, color: AppColors.farmWater),
                      const SizedBox(width: 6),
                      Text('Vannes ouvertes',
                          style: theme.textTheme.labelSmall?.copyWith(fontWeight: FontWeight.w700, color: AppColors.farmWater)),
                    ]),
                    const SizedBox(height: 6),
                    Wrap(spacing: 6, runSpacing: 4, children: openVannes.map((v) => _VanneBadge(vanne: v, theme: theme)).toList()),
                    const SizedBox(height: 10),
                  ] else if (pc.isConnected) ...[
                    Row(children: [
                      Icon(Icons.water_drop_outlined, size: 13, color: theme.colorScheme.outline),
                      const SizedBox(width: 6),
                      Text('Aucune vanne ouverte', style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.outline)),
                    ]),
                    const SizedBox(height: 10),
                  ],

                  // ── Plantes résumé ────────────────────────────────────────
                  if (totalPlants > 0) ...[
                    Row(children: [
                      Icon(Icons.eco, size: 13, color: AppColors.farmLeaf),
                      const SizedBox(width: 6),
                      Text('$totalPlants plantes',
                          style: theme.textTheme.labelSmall?.copyWith(fontWeight: FontWeight.w700, color: AppColors.farmLeaf)),
                    ]),
                    const SizedBox(height: 6),
                    Wrap(spacing: 6, runSpacing: 4, children: plantTypeMap.entries.map((e) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.farmLeaf.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.farmLeaf.withValues(alpha: 0.2)),
                        ),
                        child: Row(mainAxisSize: MainAxisSize.min, children: [
                          const Text('🌱', style: TextStyle(fontSize: 11)),
                          const SizedBox(width: 4),
                          Text('${e.key}', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.farmLeaf)),
                          const SizedBox(width: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                            decoration: BoxDecoration(color: AppColors.farmLeaf, borderRadius: BorderRadius.circular(4)),
                            child: Text('×${e.value}', style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Colors.white)),
                          ),
                        ]),
                      );
                    }).toList()),
                    const SizedBox(height: 10),
                  ],

                  // Tags culture / superficie / statut
                  Wrap(spacing: 6, children: [
                    _Tag(label: pc.culture, color: AppColors.farmLeaf),
                    _Tag(label: pc.area, color: AppColors.farmEarth),
                    _Tag(label: pc.isConnected ? 'Connectée' : 'Non connectée',
                        color: pc.isConnected ? AppColors.farmLeaf : AppColors.farmDanger),
                  ]),

                  // Barre irrigation
                  if (pc.isConnected) ...[
                    const SizedBox(height: 10),
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      Row(children: [
                        const Icon(Icons.water_drop, size: 11, color: AppColors.farmWater),
                        const SizedBox(width: 4),
                        Text('Irrigation', style: theme.textTheme.labelSmall?.copyWith(fontWeight: FontWeight.w600)),
                      ]),
                      Text('$_irrigationProgress%${isOverflow ? ' ⚠️' : ''}',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: progressColor)),
                    ]),
                    const SizedBox(height: 4),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: progress / 100, minHeight: 6,
                        backgroundColor: theme.colorScheme.secondary,
                        valueColor: AlwaysStoppedAnimation(progressColor),
                      ),
                    ),
                  ],

                  // Scan QR
                  if (!pc.isConnected)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: GestureDetector(
                        onTap: widget.onScanQr,
                        child: Container(
                          height: 34,
                          decoration: BoxDecoration(
                            color: AppColors.farmDanger.withValues(alpha: 0.07),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.farmDanger.withValues(alpha: 0.25)),
                          ),
                          child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                            const Icon(Icons.qr_code_scanner, size: 14, color: AppColors.farmDanger),
                            const SizedBox(width: 6),
                            const Text('Scanner QR pour connecter',
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.farmDanger)),
                          ]),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),

          // ── Vannes détail (expandable) ───────────────────────────────────
          AnimatedCrossFade(
            duration: const Duration(milliseconds: 250),
            crossFadeState: _expanded ? CrossFadeState.showSecond : CrossFadeState.showFirst,
            firstChild: const SizedBox.shrink(),
            secondChild: Column(children: [
              Divider(height: 1, color: theme.colorScheme.outline.withValues(alpha: 0.4)),
              if (widget.vannes.isEmpty)
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(children: [
                    Icon(Icons.info_outline, size: 14, color: theme.colorScheme.outline),
                    const SizedBox(width: 8),
                    Text('Aucune vanne configurée', style: theme.textTheme.bodySmall),
                  ]),
                )
              else
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Contrôle des électrovannes',
                        style: theme.textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w700, color: AppColors.farmWater)),
                    const SizedBox(height: 10),
                    ...widget.vannes.map((v) => _VanneRow(vanne: v, theme: theme, onToggle: () => widget.onToggleVanne(v))),
                  ]),
                ),
              // Données sol
              if (pc.isConnected)
                Container(
                  margin: const EdgeInsets.fromLTRB(16, 0, 16, 14),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.farmEarth.withValues(alpha: 0.06),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.farmEarth.withValues(alpha: 0.15)),
                  ),
                  child: Row(children: [
                    _SoilChip(value: pc.soil.temperature, label: 'Temp. sol', icon: Icons.thermostat, color: AppColors.farmSun),
                    const SizedBox(width: 8),
                    _SoilChip(value: pc.soil.humidity, label: 'Humidité', icon: Icons.water_drop_outlined, color: AppColors.farmWater),
                    const SizedBox(width: 8),
                    _SoilChip(value: pc.soil.ph, label: 'pH sol', icon: Icons.science_outlined, color: AppColors.farmEarth),
                  ]),
                ),
            ]),
          ),
        ],
      ),
    );
  }
}

// ── Vanne badge (résumé des vannes ouvertes) ─────────────────────────────────

class _VanneBadge extends StatelessWidget {
  final ValveModel vanne;
  final ThemeData theme;
  const _VanneBadge({required this.vanne, required this.theme});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.farmWater.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.farmWater.withValues(alpha: 0.3)),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        const Text('🚰', style: TextStyle(fontSize: 10)),
        const SizedBox(width: 4),
        Text(vanne.name, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.farmWater)),
        const SizedBox(width: 4),
        Text('${vanne.debit.toStringAsFixed(1)}L/m', style: TextStyle(fontSize: 9, color: AppColors.farmWater.withValues(alpha: 0.7))),
      ]),
    );
  }
}

// ── Vanne row (dans le détail expandé) ───────────────────────────────────────

class _VanneRow extends StatelessWidget {
  final ValveModel vanne;
  final ThemeData theme;
  final VoidCallback onToggle;
  const _VanneRow({required this.vanne, required this.theme, required this.onToggle});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: vanne.isOpen ? AppColors.farmWater.withValues(alpha: 0.06) : theme.colorScheme.secondary.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: vanne.isOpen ? AppColors.farmWater.withValues(alpha: 0.3) : theme.colorScheme.outline.withValues(alpha: 0.3),
        ),
      ),
      child: Row(children: [
        Container(
          width: 32, height: 32,
          decoration: BoxDecoration(
            color: vanne.isOpen ? AppColors.farmWater.withValues(alpha: 0.15) : theme.colorScheme.secondary,
            borderRadius: BorderRadius.circular(9),
          ),
          child: const Center(child: Text('🚰', style: TextStyle(fontSize: 15))),
        ),
        const SizedBox(width: 10),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Text(vanne.name, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
              decoration: BoxDecoration(
                color: vanne.isOpen ? AppColors.farmLeaf : theme.colorScheme.outline.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(vanne.isOpen ? 'ON' : 'OFF',
                  style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800,
                      color: vanne.isOpen ? Colors.white : theme.colorScheme.onSurface.withValues(alpha: 0.4))),
            ),
          ]),
          Text('${vanne.debit.toStringAsFixed(1)} L/min • ${vanne.nbPlants} plantes', style: theme.textTheme.labelSmall),
        ])),
        Switch(
          value: vanne.isOpen,
          onChanged: (_) => onToggle(),
          activeTrackColor: AppColors.farmLeaf,
          activeThumbColor: Colors.white,
          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
        ),
      ]),
    );
  }
}

class _SoilChip extends StatelessWidget {
  final String value, label;
  final IconData icon;
  final Color color;
  const _SoilChip({required this.value, required this.label, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(child: Column(children: [
      Icon(icon, size: 14, color: color),
      const SizedBox(height: 3),
      Text(value, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: color)),
      Text(label, style: const TextStyle(fontSize: 8, color: Colors.grey)),
    ]));
  }
}

class _Tag extends StatelessWidget {
  final String label;
  final Color color;
  const _Tag({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: color)),
    );
  }
}

// ── Chatbot Widget ────────────────────────────────────────────────────────────

class _ChatMessage {
  final String text;
  final bool isUser;
  _ChatMessage({required this.text, required this.isUser});
}

class _ChatbotWidget extends StatefulWidget {
  @override
  State<_ChatbotWidget> createState() => _ChatbotWidgetState();
}

class _ChatbotWidgetState extends State<_ChatbotWidget> {
  final _ctrl = TextEditingController();
  final _scroll = ScrollController();
  final List<_ChatMessage> _messages = [
    _ChatMessage(text: 'Bonjour ! Je suis votre assistant agricole 🌱\nJe peux vous aider sur l\'irrigation, les plantes, les vannes et la gestion de vos parcelles.', isUser: false),
  ];
  bool _isTyping = false;

  static const _suggestions = [
    'Comment optimiser l\'irrigation ?',
    'Quand irriguer mes plantes ?',
    'Comment régler le débit d\'une vanne ?',
    'Conseils pour économiser l\'eau',
  ];

  static const Map<String, String> _responses = {
    'irrigation': 'Pour optimiser l\'irrigation, arrosez tôt le matin (6h-9h) pour réduire l\'évaporation. Vérifiez que la barre de progression de chaque parcelle reste entre 60% et 90% pour un apport idéal. Un taux > 100% indique un excès d\'eau.',
    'arros': 'La fréquence d\'arrosage dépend du type de plante et du sol. En général : végétaux maraîchers tous les 1-2 jours, arbres fruitiers toutes les semaines. Consultez l\'humidité du sol dans chaque fiche parcelle.',
    'débit': 'Le débit d\'une vanne se règle mécaniquement sur le boîtier physique. Sur l\'app, le débit affiché (L/min) est mesuré par le capteur. Un débit < 1 L/min (rouge) signale un problème de pression ou d\'obstruction.',
    'eau': 'Pour économiser l\'eau : activez le mode automatique sur vos vannes pour n\'irriguer que selon les besoins, regroupez l\'arrosage en dehors des heures chaudes (12h-16h), et vérifiez régulièrement le pH du sol (optimal 6.0-7.5).',
    'ph': 'Un pH de sol entre 6.0 et 7.5 est idéal pour la plupart des cultures. En dessous de 6.0, ajoutez de la chaux. Au-dessus de 7.5, du soufre agricole peut aider. Consultez la section Santé des plantes pour plus de détails.',
    'vanne': 'Pour activer/désactiver une vanne : utilisez le switch ON/OFF dans chaque carte de parcelle. Attention : la sécurité empêche de fermer toutes les vannes d\'une même parcelle simultanément.',
    'parcelle': 'Une parcelle regroupe vos plants et leurs vannes d\'irrigation. Chaque parcelle a un capteur sol qui mesure température, humidité et pH. Connectez votre capteur via le QR code pour accéder aux données en temps réel.',
    'plante': 'La santé de vos plantes dépend de l\'irrigation, du pH du sol et de la température. Rendez-vous dans la section Santé des plantes pour analyser vos cultures par photo.',
    'temperature': 'La température du sol idéale pour la plupart des cultures est entre 15°C et 25°C. En dessous de 10°C, la croissance ralentit. Au-dessus de 30°C, réduisez l\'arrosage pour éviter le pourrissement des racines.',
    'default': 'Je n\'ai pas de réponse précise pour cette question. Je vous conseille de consulter un agronome ou de vérifier les données de vos capteurs dans les fiches parcelles. Essayez de me poser une question sur l\'irrigation, les vannes, le pH ou les plantes.',
  };

  String _generateResponse(String input) {
    final q = input.toLowerCase();
    for (final entry in _responses.entries) {
      if (entry.key != 'default' && q.contains(entry.key)) return entry.value;
    }
    return _responses['default']!;
  }

  void _send(String text) {
    if (text.trim().isEmpty) return;
    setState(() {
      _messages.add(_ChatMessage(text: text.trim(), isUser: true));
      _isTyping = true;
    });
    _ctrl.clear();
    _scrollToBottom();

    Future.delayed(const Duration(milliseconds: 800), () {
      if (!mounted) return;
      setState(() {
        _messages.add(_ChatMessage(text: _generateResponse(text), isUser: false));
        _isTyping = false;
      });
      _scrollToBottom();
    });
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(_scroll.position.maxScrollExtent,
            duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
      }
    });
  }

  @override
  void dispose() {
    _ctrl.dispose();
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.6)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF16a34a), Color(0xFF15803d)],
              ),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: Row(children: [
              Container(
                width: 36, height: 36,
                decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(12)),
                child: const Center(child: Text('🤖', style: TextStyle(fontSize: 18))),
              ),
              const SizedBox(width: 12),
              const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Assistant AgriTech', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14)),
                Text('Conseils irrigation & gestion', style: TextStyle(color: Colors.white70, fontSize: 11)),
              ])),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(8)),
                child: const Row(children: [
                  Icon(Icons.circle, size: 6, color: Color(0xFF86efac)),
                  SizedBox(width: 4),
                  Text('En ligne', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600)),
                ]),
              ),
            ]),
          ),

          // Messages
          SizedBox(
            height: 220,
            child: ListView.builder(
              controller: _scroll,
              padding: const EdgeInsets.all(12),
              itemCount: _messages.length + (_isTyping ? 1 : 0),
              itemBuilder: (ctx, i) {
                if (i == _messages.length) {
                  // Typing indicator
                  return Align(
                    alignment: Alignment.centerLeft,
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 8, right: 60),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: AppColors.farmLeaf.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        _DotIndicator(delay: 0),
                        const SizedBox(width: 4),
                        _DotIndicator(delay: 200),
                        const SizedBox(width: 4),
                        _DotIndicator(delay: 400),
                      ]),
                    ),
                  );
                }
                final msg = _messages[i];
                return Align(
                  alignment: msg.isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: EdgeInsets.only(
                      bottom: 8,
                      left: msg.isUser ? 48 : 0,
                      right: msg.isUser ? 0 : 48,
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: msg.isUser ? AppColors.farmLeaf : AppColors.farmLeaf.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(16).copyWith(
                        bottomRight: msg.isUser ? const Radius.circular(4) : null,
                        bottomLeft: !msg.isUser ? const Radius.circular(4) : null,
                      ),
                      border: msg.isUser ? null : Border.all(color: AppColors.farmLeaf.withValues(alpha: 0.2)),
                    ),
                    child: Text(
                      msg.text,
                      style: TextStyle(
                        fontSize: 12,
                        color: msg.isUser ? Colors.white : theme.colorScheme.onSurface,
                        height: 1.4,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          // Suggestions
          SizedBox(
            height: 36,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: _suggestions.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (ctx, i) => GestureDetector(
                onTap: () => _send(_suggestions[i]),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.farmLeaf.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.farmLeaf.withValues(alpha: 0.25)),
                  ),
                  child: Text(_suggestions[i],
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.farmLeaf),
                      maxLines: 1),
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),

          // Input
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 14),
            child: Row(children: [
              Expanded(
                child: Container(
                  height: 42,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.secondary,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: TextField(
                    controller: _ctrl,
                    style: const TextStyle(fontSize: 13),
                    onSubmitted: _send,
                    decoration: InputDecoration(
                      hintText: 'Posez votre question...',
                      hintStyle: TextStyle(fontSize: 12, color: theme.colorScheme.onSurface.withValues(alpha: 0.4)),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: () => _send(_ctrl.text),
                child: Container(
                  width: 42, height: 42,
                  decoration: const BoxDecoration(color: AppColors.farmLeaf, shape: BoxShape.circle),
                  child: const Icon(Icons.send_rounded, color: Colors.white, size: 18),
                ),
              ),
            ]),
          ),
        ],
      ),
    );
  }
}

class _DotIndicator extends StatefulWidget {
  final int delay;
  const _DotIndicator({required this.delay});
  @override
  State<_DotIndicator> createState() => _DotIndicatorState();
}

class _DotIndicatorState extends State<_DotIndicator> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 600));
    Future.delayed(Duration(milliseconds: widget.delay), () {
      if (mounted) _ctrl.repeat(reverse: true);
    });
    _anim = Tween<double>(begin: 0.3, end: 1.0).animate(_ctrl);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _anim,
      child: Container(
        width: 7, height: 7,
        decoration: const BoxDecoration(color: AppColors.farmLeaf, shape: BoxShape.circle),
      ),
    );
  }
}
