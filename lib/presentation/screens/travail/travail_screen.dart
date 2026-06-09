import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart' as p;
import 'package:uiearth_flutter/core/l10n/app_localizations.dart';
import 'package:uiearth_flutter/core/theme/app_colors.dart';
import 'package:uiearth_flutter/data/api/api_exception.dart';
import 'package:uiearth_flutter/data/models/parcelle.dart';
import 'package:uiearth_flutter/domain/providers/api_providers.dart';
import 'package:uiearth_flutter/domain/providers/parcelle_provider.dart';
import 'package:uiearth_flutter/domain/providers/valve_provider.dart';

class TravailScreen extends ConsumerStatefulWidget {
  const TravailScreen({super.key});

  @override
  ConsumerState<TravailScreen> createState() => _TravailScreenState();
}

class _TravailScreenState extends ConsumerState<TravailScreen> {
  String _search = '';
  bool _isLoading = false;

  Future<void> _refresh() async {
    if (_isLoading) return;
    setState(() => _isLoading = true);
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
          }
        } catch (_) {}
      }

      if (!mounted) return;
      ref.read(parcellesProvider.notifier).replaceAll(remoteParcelles);
      p.Provider.of<ValveProvider>(context, listen: false)
          .replaceFromParcelles(remoteParcelles);
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur chargement: ${e.message}')),
      );
    } catch (_) {}
    if (mounted) setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(languageProvider); // rebuild au changement de langue
    final parcelles = ref.watch(parcellesProvider);
    final valveState = p.Provider.of<ValveProvider>(context);
    final theme = Theme.of(context);

    final filtered = _search.isEmpty
        ? parcelles
        : parcelles
            .where((p) =>
                p.name.toLowerCase().contains(_search.toLowerCase()) ||
                p.culture.toLowerCase().contains(_search.toLowerCase()))
            .toList();

    final allVannes = valveState.valves;
    final openVannes = allVannes.where((v) => v.isOpen).length;
    final connectedCount = parcelles.where((pc) => pc.isConnected).length;
    final totalHa = parcelles.fold<double>(
      0,
      (s, pc) => s + (double.tryParse(pc.area.replaceAll(RegExp(r'[^\d.]'), '')) ?? 0),
    );

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _refresh,
        color: AppColors.farmLeaf,
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            // ── Hero Header ──────────────────────────────────────────────
            _HeroHeader(
              parcelleCount: parcelles.length,
              openVannes: openVannes,
              totalVannes: allVannes.length,
              connectedCount: connectedCount,
              totalHa: totalHa,
              loading: _isLoading,
            ),
            const SizedBox(height: 20),

            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
            // Barre de recherche
            Container(
              height: 42,
              decoration: BoxDecoration(
                color: theme.colorScheme.secondary,
                borderRadius: BorderRadius.circular(12),
              ),
              child: TextField(
                onChanged: (v) => setState(() => _search = v),
                decoration: InputDecoration(
                  hintText: 'Rechercher un projet...',
                  hintStyle: TextStyle(
                      fontSize: 13,
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.4)),
                  prefixIcon: Icon(Icons.search,
                      size: 18,
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.4)),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(vertical: 10),
                ),
                style: const TextStyle(fontSize: 13),
              ),
            ),
            const SizedBox(height: 16),

            if (filtered.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 48),
                child: Column(
                  children: [
                    Icon(Icons.agriculture_outlined,
                        size: 48,
                        color: theme.colorScheme.onSurface.withValues(alpha: 0.2)),
                    const SizedBox(height: 12),
                    Text(
                      'Aucun projet trouvé.\nAppuyez sur + pour créer un projet.',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
              )
            else
              ...filtered.map((parcelle) {
                final vannes = valveState.byParcelle(parcelle.id);
                return _ProjetCard(
                  parcelle: parcelle,
                  vannes: vannes,
                  theme: theme,
                  onToggleVanne: (v) => _toggleVanne(context, v, valveState),
                );
              }),
                  const SizedBox(height: 100),
                ],
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/formulaire'),
        backgroundColor: AppColors.farmLeaf,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Nouveau Projet',
            style: TextStyle(fontWeight: FontWeight.w700)),
      ),
    );
  }

  Future<void> _toggleVanne(
      BuildContext context, ValveModel valve, ValveProvider valveState) async {
    final nextOpen = !valve.isOpen;

    if (!nextOpen) {
      final parcelleValves = valveState.byParcelle(valve.parcelleId);
      final openCount = parcelleValves.where((v) => v.isOpen).length;
      if (openCount <= 1) {
        if (context.mounted) {
          await showDialog<void>(
            context: context,
            builder: (ctx) => AlertDialog(
              icon: const Icon(Icons.warning_amber_rounded,
                  color: Colors.orange, size: 40),
              title: const Text('Sécurité', textAlign: TextAlign.center),
              content: const Text(
                  'Au moins une vanne doit rester ouverte par parcelle.',
                  textAlign: TextAlign.center),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text('Compris'),
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
        await ref.read(uiEarthApiProvider).capteurSol.updateVanne(
          valve.backendId!,
          {
            'isOpen': nextOpen,
            'lastAction': nextOpen
                ? 'Ouvert depuis mobile'
                : 'Fermé depuis mobile',
          },
        );
      } on ApiException catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Erreur vanne: ${e.message}')),
          );
        }
        return;
      } catch (_) {}
    }

    valveState.toggleValve(valve.id);
  }
}

// ── Hero Header ─────────────────────────────────────────────────────────────

class _HeroHeader extends StatelessWidget {
  final int parcelleCount;
  final int openVannes;
  final int totalVannes;
  final int connectedCount;
  final double totalHa;
  final bool loading;

  const _HeroHeader({
    required this.parcelleCount,
    required this.openVannes,
    required this.totalVannes,
    required this.connectedCount,
    required this.totalHa,
    required this.loading,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
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
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Travail',
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 28,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.5)),
                      const SizedBox(height: 2),
                      Text(
                        '$parcelleCount projet${parcelleCount > 1 ? 's' : ''} agricole${parcelleCount > 1 ? 's' : ''}',
                        style: const TextStyle(color: Colors.white70, fontSize: 14),
                      ),
                    ],
                  ),
                  loading
                      ? Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(16)),
                          child: const Center(
                            child: SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white),
                            ),
                          ),
                        )
                      : Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(16)),
                          child: const Icon(Icons.agriculture_rounded,
                              color: Colors.white, size: 26),
                        ),
                ],
              ),
              const SizedBox(height: 22),
              Row(children: [
                _KpiPill(
                    value: '$parcelleCount',
                    label: 'Parcelles',
                    icon: Icons.grid_view_rounded,
                    color: const Color(0xFFbbf7d0)),
                const SizedBox(width: 10),
                _KpiPill(
                    value: '$openVannes/$totalVannes',
                    label: 'Vannes ouvertes',
                    icon: Icons.water_drop_rounded,
                    color: const Color(0xFFbae6fd)),
                const SizedBox(width: 10),
                _KpiPill(
                    value: '$connectedCount/$parcelleCount',
                    label: 'Connectées',
                    icon: Icons.wifi_rounded,
                    color: const Color(0xFFfef08a)),
              ]),
            ],
          ),
        ),
      ),
    );
  }
}

class _KpiPill extends StatelessWidget {
  final String value, label;
  final IconData icon;
  final Color color;
  const _KpiPill(
      {required this.value,
      required this.label,
      required this.icon,
      required this.color});

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
            width: 28,
            height: 28,
            decoration: BoxDecoration(
                color: color.withValues(alpha: 0.25),
                borderRadius: BorderRadius.circular(8)),
            child: Icon(icon, size: 14, color: color),
          ),
          const SizedBox(width: 8),
          Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(value,
                style: const TextStyle(
                    color: Colors.white, fontSize: 12, fontWeight: FontWeight.w800),
                overflow: TextOverflow.ellipsis),
            Text(label,
                style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.65), fontSize: 9),
                overflow: TextOverflow.ellipsis),
          ])),
        ]),
      ),
    );
  }
}

class _ProjetCard extends StatefulWidget {
  final ParcelleData parcelle;
  final List<ValveModel> vannes;
  final ThemeData theme;
  final Future<void> Function(ValveModel) onToggleVanne;

  const _ProjetCard({
    required this.parcelle,
    required this.vannes,
    required this.theme,
    required this.onToggleVanne,
  });

  @override
  State<_ProjetCard> createState() => _ProjetCardState();
}

class _ProjetCardState extends State<_ProjetCard> {
  bool _expanded = true;

  @override
  Widget build(BuildContext context) {
    final parcelle = widget.parcelle;
    final vannes = widget.vannes;
    final theme = widget.theme;
    final openCount = vannes.where((v) => v.isOpen).length;

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.6)),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 12,
              offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        children: [
          // En-tête parcelle
          InkWell(
            onTap: () => setState(() => _expanded = !_expanded),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: parcelle.isConnected
                          ? AppColors.farmLeaf.withValues(alpha: 0.12)
                          : AppColors.farmDanger.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      parcelle.isConnected ? Icons.wifi : Icons.wifi_off,
                      size: 20,
                      color: parcelle.isConnected
                          ? AppColors.farmLeaf
                          : AppColors.farmDanger,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(parcelle.name,
                            style: theme.textTheme.titleMedium
                                ?.copyWith(fontWeight: FontWeight.w700)),
                        const SizedBox(height: 2),
                        Text(
                          '${parcelle.culture} • ${parcelle.area}',
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.farmWater.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          '🚰 $openCount/${vannes.length}',
                          style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppColors.farmWater),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Icon(
                        _expanded
                            ? Icons.keyboard_arrow_up
                            : Icons.keyboard_arrow_down,
                        size: 18,
                        color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // Liste des vannes (expansible)
          if (_expanded && vannes.isNotEmpty) ...[
            Divider(
                height: 1,
                color: theme.colorScheme.outline.withValues(alpha: 0.5)),
            ...vannes.asMap().entries.map((entry) {
              final i = entry.key;
              final v = entry.value;
              final isLast = i == vannes.length - 1;
              return _VanneRow(
                vanne: v,
                theme: theme,
                isLast: isLast,
                onToggle: () => widget.onToggleVanne(v),
              );
            }),
          ],

          if (_expanded && vannes.isEmpty) ...[
            Divider(
                height: 1,
                color: theme.colorScheme.outline.withValues(alpha: 0.5)),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.info_outline,
                      size: 14,
                      color:
                          theme.colorScheme.onSurface.withValues(alpha: 0.4)),
                  const SizedBox(width: 6),
                  Text('Aucune vanne associée',
                      style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurface
                              .withValues(alpha: 0.4))),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _VanneRow extends StatelessWidget {
  final ValveModel vanne;
  final ThemeData theme;
  final bool isLast;
  final VoidCallback onToggle;

  const _VanneRow({
    required this.vanne,
    required this.theme,
    required this.isLast,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    final waterPerPlant = vanne.nbPlants > 0 && vanne.debit > 0
        ? (vanne.debit * 60 / vanne.nbPlants).toStringAsFixed(1)
        : null;

    return Container(
      decoration: BoxDecoration(
        color: vanne.isOpen
            ? AppColors.farmWater.withValues(alpha: 0.04)
            : Colors.transparent,
        borderRadius: isLast
            ? const BorderRadius.vertical(bottom: Radius.circular(20))
            : BorderRadius.zero,
      ),
      child: Padding(
        padding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        child: Row(
          children: [
            // Icône vanne
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: vanne.isOpen
                    ? AppColors.farmWater.withValues(alpha: 0.15)
                    : theme.colorScheme.secondary,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Center(
                  child: Text('🚰', style: TextStyle(fontSize: 14))),
            ),
            const SizedBox(width: 10),

            // Infos vanne
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(vanne.name, style: theme.textTheme.titleSmall),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 5, vertical: 2),
                        decoration: BoxDecoration(
                          color: vanne.isOpen
                              ? AppColors.farmLeaf
                              : theme.colorScheme.secondary,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          vanne.isOpen ? 'ON' : 'OFF',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            color: vanne.isOpen
                                ? Colors.white
                                : theme.colorScheme.onSurface
                                    .withValues(alpha: 0.5),
                          ),
                        ),
                      ),
                      if (vanne.isAuto) ...[
                        const SizedBox(width: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 5, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.farmSun.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            'AUTO',
                            style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w700,
                                color: AppColors.farmSun),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${vanne.debit.toStringAsFixed(1)} L/min • ${vanne.nbPlants} plantes',
                    style: theme.textTheme.labelSmall,
                  ),
                  if (vanne.isOpen && waterPerPlant != null)
                    Text(
                      '$waterPerPlant L/plante/h',
                      style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: AppColors.farmLeaf),
                    ),
                  if (vanne.schedule != null &&
                      vanne.schedule!.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Row(children: [
                      const Icon(Icons.schedule,
                          size: 10, color: AppColors.farmSun),
                      const SizedBox(width: 3),
                      Text(
                        vanne.schedule!,
                        style: const TextStyle(
                            fontSize: 10, color: AppColors.farmSun),
                      ),
                    ]),
                  ],
                ],
              ),
            ),

            // Switch
            Transform.scale(
              scale: 0.85,
              child: Switch(
                value: vanne.isOpen,
                onChanged: (_) => onToggle(),
                activeTrackColor: AppColors.farmLeaf,
                activeThumbColor: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
