import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart' as p;
import 'package:uiearth_flutter/core/l10n/app_localizations.dart';
import 'package:uiearth_flutter/core/theme/app_colors.dart';
import 'package:uiearth_flutter/data/api/api_exception.dart';
import 'package:uiearth_flutter/domain/providers/api_providers.dart';
import 'package:uiearth_flutter/domain/providers/valve_provider.dart';

class ValvesScreen extends ConsumerWidget {
  const ValvesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final langState = ref.watch(languageProvider);
    final valveState = p.Provider.of<ValveProvider>(context);
    final allVannes = valveState.valves;
    final theme = Theme.of(context);

    final openCount = allVannes.where((v) => v.isOpen).length;
    final autoCount = allVannes.where((v) => v.isAuto).length;

    return ListView(
        padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
        children: [
          Text(langState.t('vannes.title'), style: theme.textTheme.headlineMedium),
          const SizedBox(height: 4),
          Text(langState.t('vannes.subtitle'), style: theme.textTheme.bodySmall),
          const SizedBox(height: 16),

          // Stats
          Row(children: [
            _StatMini(langState.t('vannes.total'), '${allVannes.length}', Icons.radio_button_checked, AppColors.farmLeaf, theme),
            const SizedBox(width: 12),
            _StatMini(langState.t('vannes.open'), '$openCount', Icons.power_settings_new, AppColors.farmWater, theme),
            const SizedBox(width: 12),
            _StatMini(langState.t('vannes.auto'), '$autoCount', Icons.flash_on, AppColors.farmSun, theme),
          ]),
          const SizedBox(height: 16),

          // Tab-like buttons: Vannes | Historique
          Container(
            height: 40,
            decoration: BoxDecoration(
              color: theme.colorScheme.secondary,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(children: [
              Expanded(
                child: Container(
                  margin: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surface,
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)],
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.water_drop_outlined, size: 14, color: AppColors.farmLeaf),
                      const SizedBox(width: 6),
                      Text(langState.t('vannes.title'), style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: theme.colorScheme.onSurface)),
                    ],
                  ),
                ),
              ),
              Expanded(
                child: GestureDetector(
                  onTap: () => context.push('/historique'),
                  child: Container(
                    margin: const EdgeInsets.all(3),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.history, size: 14, color: AppColors.farmLeaf.withValues(alpha: 0.4)),
                        const SizedBox(width: 6),
                        Text(langState.t('vannes.history'), style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: theme.colorScheme.onSurface.withValues(alpha: 0.4))),
                      ],
                    ),
                  ),
                ),
              ),
            ]),
          ),
          const SizedBox(height: 16),

          // Valve cards
          ...allVannes.map((v) {
            return GestureDetector(
              onTap: () => _showValveDetail(context, ref, v.id, langState),
              child: Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: theme.colorScheme.outline),
                ),
                child: Column(
                  children: [
                    Row(children: [
                      Container(
                        width: 40, height: 40,
                        decoration: BoxDecoration(
                          color: v.isOpen ? AppColors.farmWater.withValues(alpha: 0.15) : theme.colorScheme.secondary,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Center(child: Text('🚰', style: TextStyle(fontSize: 18))),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(children: [
                              Text(v.name, style: theme.textTheme.titleSmall),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: v.isOpen ? AppColors.farmLeaf : theme.colorScheme.secondary,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  v.isOpen ? langState.t('vannes.opened') : langState.t('vannes.closed'),
                                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: v.isOpen ? Colors.white : theme.colorScheme.onSurface.withValues(alpha: 0.5)),
                                ),
                              ),
                            ]),
                            Text('${v.parcelleName} • ${v.nbPlants} ${langState.t('vannes.plants')}', style: theme.textTheme.bodySmall),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right, size: 18, color: Colors.grey),
                    ]),
                    const SizedBox(height: 12),
                    Row(children: [
                      Expanded(child: _DebitBar(vanne: v, theme: theme, t: langState.t)),
                      const SizedBox(width: 12),
                      Switch(
                        value: v.isOpen,
                        onChanged: (_) async {
                          await _toggleValve(context, ref, v);
                        },
                      ),
                    ]),
                  ],
                ),
              ),
            );
          }),
        ],
      );
  }

  void _showValveDetail(BuildContext context, WidgetRef ref, String valveId, LanguageState langState) {
    final theme = Theme.of(context);
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => p.Consumer<ValveProvider>(builder: (ctx, valveState, __) {
        final currentVanne = valveState.byId(valveId);
        if (currentVanne == null) {
          return const SizedBox.shrink();
        }

        final startTime = currentVanne.startTime;
        final endTime = currentVanne.endTime;
        final activeDays = currentVanne.selectedWeekDays;

        return DraggableScrollableSheet(
          initialChildSize: 0.72,
          maxChildSize: 0.9,
          minChildSize: 0.35,
          expand: false,
          builder: (sheetCtx, sc) => Container(
            decoration: BoxDecoration(
              color: theme.colorScheme.surface,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: ListView(
              controller: sc,
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              children: [
                Center(
                  child: Container(
                    width: 76,
                    height: 8,
                    margin: const EdgeInsets.only(bottom: 14),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.outline.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
                Row(
                  children: [
                    Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: AppColors.farmWater.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(Icons.water_drop_rounded, size: 18, color: AppColors.farmWater),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        '${currentVanne.name} — ${currentVanne.parcelleName}',
                        style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                _buildControlTile(
                  context: sheetCtx,
                  theme: theme,
                  icon: Icons.power_settings_new_rounded,
                  title: langState.t('vannes.state'),
                  subtitle: currentVanne.isOpen ? langState.t('vannes.opened') : langState.t('vannes.closed'),
                  value: currentVanne.isOpen,
                  onChanged: (_) {
                    _toggleValve(context, ref, currentVanne);
                  },
                ),
                const SizedBox(height: 10),
                _buildControlTile(
                  context: sheetCtx,
                  theme: theme,
                  icon: Icons.tune_rounded,
                  title: langState.t('vannes.automation'),
                  subtitle: currentVanne.isAuto ? langState.t('vannes.programmed') : langState.t('vannes.manual'),
                  value: currentVanne.isAuto,
                  onChanged: (_) async {
                    await _setAutoMode(context, ref, currentVanne);
                  },
                ),
                const SizedBox(height: 12),
                if (currentVanne.isOpen)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.farmLeaf.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.calendar_month_rounded, size: 18, color: AppColors.farmLeaf),
                            const SizedBox(width: 8),
                            Text(
                              langState.t('vannes.schedule'),
                              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Text(
                          langState.t('vannes.choose_time'),
                          style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurface.withValues(alpha: 0.65)),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: _buildTimeField(
                                context: sheetCtx,
                                theme: theme,
                                label: langState.t('vannes.start'),
                                time: startTime,
                                onTap: () async {
                                  final selected = await _pickTime(sheetCtx, startTime);
                                  if (selected == null || !sheetCtx.mounted) return;
                                  await _updateScheduleStart(context, ref, currentVanne, selected);
                                },
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: _buildTimeField(
                                context: sheetCtx,
                                theme: theme,
                                label: langState.t('vannes.stop'),
                                time: endTime,
                                onTap: () async {
                                  final selected = await _pickTime(sheetCtx, endTime);
                                  if (selected == null || !sheetCtx.mounted) return;
                                  await _updateScheduleEnd(context, ref, currentVanne, selected);
                                },
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        Text(
                          langState.t('vannes.choose_days'),
                          style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurface.withValues(alpha: 0.65)),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _buildDayChip(theme, langState.t('vannes.days.mon'), activeDays.contains(1), () async => _toggleScheduleDay(context, ref, currentVanne, 1)),
                            _buildDayChip(theme, langState.t('vannes.days.tue'), activeDays.contains(2), () async => _toggleScheduleDay(context, ref, currentVanne, 2)),
                            _buildDayChip(theme, langState.t('vannes.days.wed'), activeDays.contains(3), () async => _toggleScheduleDay(context, ref, currentVanne, 3)),
                            _buildDayChip(theme, langState.t('vannes.days.thu'), activeDays.contains(4), () async => _toggleScheduleDay(context, ref, currentVanne, 4)),
                            _buildDayChip(theme, langState.t('vannes.days.fri'), activeDays.contains(5), () async => _toggleScheduleDay(context, ref, currentVanne, 5)),
                            _buildDayChip(theme, langState.t('vannes.days.sat'), activeDays.contains(6), () async => _toggleScheduleDay(context, ref, currentVanne, 6)),
                            _buildDayChip(theme, langState.t('vannes.days.sun'), activeDays.contains(7), () async => _toggleScheduleDay(context, ref, currentVanne, 7)),
                          ],
                        ),
                      ],
                    ),
                  ),
                if (!currentVanne.isOpen)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Text(
                      langState.t('vannes.schedule_hidden'),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
                      ),
                    ),
                  ),

                // ── Débit capteur + consommation par plante ──────────────────
                const SizedBox(height: 12),
                _DebitDetailCard(vanne: currentVanne, theme: theme, t: langState.t),

                const SizedBox(height: 14),
                Row(
                  children: [
                    Icon(Icons.history_toggle_off, size: 16, color: theme.colorScheme.onSurface.withValues(alpha: 0.55)),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        currentVanne.lastAction,
                        style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurface.withValues(alpha: 0.65)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      }),
    );
  }

  Future<void> _toggleValve(BuildContext context, WidgetRef ref, ValveModel valve) async {
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
    // ────────────────────────────────────────────────────────────────────────

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

  Future<void> _setAutoMode(BuildContext context, WidgetRef ref, ValveModel valve) async {
    final valveProvider = p.Provider.of<ValveProvider>(context, listen: false);
    final nextAuto = !valve.isAuto;

    if (valve.backendId != null) {
      final ok = await _patchValve(context, ref, valve.backendId!, {
        'isAuto': nextAuto,
        'lastAction': nextAuto ? 'Mode auto activé depuis mobile' : 'Mode auto désactivé depuis mobile',
      });
      if (!ok) return;
    }

    valveProvider.setAutoMode(valve.id, enabled: nextAuto);
  }

  Future<void> _updateScheduleStart(
    BuildContext context,
    WidgetRef ref,
    ValveModel valve,
    String start,
  ) async {
    final valveProvider = p.Provider.of<ValveProvider>(context, listen: false);

    if (valve.backendId != null) {
      final ok = await _patchValve(context, ref, valve.backendId!, {
        'scheduleStart': start,
        'lastAction': 'Programmation (heure début) mise à jour depuis mobile',
      });
      if (!ok) return;
    }

    valveProvider.updateSchedule(valve.id, startTime: start);
  }

  Future<void> _updateScheduleEnd(
    BuildContext context,
    WidgetRef ref,
    ValveModel valve,
    String end,
  ) async {
    final valveProvider = p.Provider.of<ValveProvider>(context, listen: false);

    if (valve.backendId != null) {
      final ok = await _patchValve(context, ref, valve.backendId!, {
        'scheduleEnd': end,
        'lastAction': 'Programmation (heure fin) mise à jour depuis mobile',
      });
      if (!ok) return;
    }

    valveProvider.updateSchedule(valve.id, endTime: end);
  }

  Future<void> _toggleScheduleDay(
    BuildContext context,
    WidgetRef ref,
    ValveModel valve,
    int day,
  ) async {
    final valveProvider = p.Provider.of<ValveProvider>(context, listen: false);
    final nextDays = Set<int>.from(valve.selectedWeekDays);
    if (nextDays.contains(day)) {
      nextDays.remove(day);
    } else {
      nextDays.add(day);
    }

    if (valve.backendId != null) {
      final sortedDays = nextDays.toList()..sort();
      final ok = await _patchValve(context, ref, valve.backendId!, {
        'scheduleDays': sortedDays.map((d) => d.toString()).toList(growable: false),
        'lastAction': 'Programmation (jours) mise à jour depuis mobile',
      });
      if (!ok) return;
    }

    valveProvider.toggleWeekDay(valve.id, day);
  }

  Future<bool> _patchValve(
    BuildContext context,
    WidgetRef ref,
    int backendId,
    Map<String, dynamic> body,
  ) async {
    try {
      await ref.read(uiEarthApiProvider).capteurSol.updateVanne(backendId, body);
      return true;
    } on ApiException catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur backend vanne: ${e.message}')),
        );
      }
      return false;
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur réseau vanne: $e')),
        );
      }
      return false;
    }
  }

  Widget _buildControlTile({
    required BuildContext context,
    required ThemeData theme,
    required IconData icon,
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: theme.colorScheme.secondary.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Row(
              children: [
                Icon(icon, size: 22, color: theme.colorScheme.onSurface.withValues(alpha: 0.85)),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurface.withValues(alpha: 0.6)),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: Colors.white,
            activeTrackColor: AppColors.farmLeaf,
            inactiveTrackColor: theme.colorScheme.outline.withValues(alpha: 0.3),
          ),
        ],
      ),
    );
  }

  Widget _buildTimeField({
    required BuildContext context,
    required ThemeData theme,
    required String label,
    required String time,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.6)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: theme.textTheme.labelSmall?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
              ),
            ),
            const SizedBox(height: 3),
            Row(
              children: [
                Expanded(
                  child: Text(
                    time,
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                  ),
                ),
                Icon(Icons.access_time, size: 18, color: theme.colorScheme.onSurface.withValues(alpha: 0.7)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDayChip(ThemeData theme, String label, bool active, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        width: 44,
        height: 42,
        decoration: BoxDecoration(
          color: active ? AppColors.farmLeaf : theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.35)),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            fontWeight: FontWeight.w700,
            color: active ? Colors.white : theme.colorScheme.onSurface.withValues(alpha: 0.45),
          ),
        ),
      ),
    );
  }

  Future<String?> _pickTime(BuildContext context, String initialTime) async {
    final parts = initialTime.split(':');
    final initial = TimeOfDay(
      hour: int.tryParse(parts.first) ?? 6,
      minute: parts.length > 1 ? (int.tryParse(parts[1]) ?? 0) : 0,
    );

    final picked = await showTimePicker(
      context: context,
      initialTime: initial,
      builder: (ctx, child) {
        final theme = Theme.of(ctx);
        return Theme(
          data: theme.copyWith(
            colorScheme: theme.colorScheme.copyWith(primary: AppColors.farmLeaf),
          ),
          child: child ?? const SizedBox.shrink(),
        );
      },
    );

    if (picked == null) return null;
    final hh = picked.hour.toString().padLeft(2, '0');
    final mm = picked.minute.toString().padLeft(2, '0');
    return '$hh:$mm';
  }
}

// ── Barre débit capteur ───────────────────────────────────────────────────────

class _DebitBar extends StatelessWidget {
  final ValveModel vanne;
  final ThemeData theme;
  final String Function(String) t;

  const _DebitBar({required this.vanne, required this.theme, required this.t});

  static const double _maxDebit = 10.0; // L/min référence capteur

  Color get _barColor {
    if (!vanne.isOpen || vanne.debit <= 0) return Colors.grey.shade300;
    if (vanne.debit >= 3.0) return AppColors.farmLeaf;
    if (vanne.debit >= 1.0) return Colors.orange;
    return Colors.red;
  }

  String get _debitLabel {
    if (!vanne.isOpen || vanne.debit <= 0) return '0.0 L/min';
    return '${vanne.debit.toStringAsFixed(1)} L/min';
  }

  double _waterPerPlantPerHour() {
    if (vanne.nbPlants <= 0 || vanne.debit <= 0) return 0;
    return (vanne.debit * 60) / vanne.nbPlants;
  }

  @override
  Widget build(BuildContext context) {
    final ratio = (vanne.debit / _maxDebit).clamp(0.0, 1.0);
    final wph = _waterPerPlantPerHour();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(children: [
              Icon(Icons.sensors, size: 12, color: theme.colorScheme.onSurface.withValues(alpha: 0.5)),
              const SizedBox(width: 4),
              Text(t('vannes.flow_sensor'), style: theme.textTheme.labelSmall),
            ]),
            Text(
              _debitLabel,
              style: theme.textTheme.labelSmall?.copyWith(
                fontWeight: FontWeight.w700,
                color: _barColor,
              ),
            ),
          ],
        ),
        const SizedBox(height: 5),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: ratio,
            minHeight: 6,
            backgroundColor: theme.colorScheme.secondary,
            valueColor: AlwaysStoppedAnimation<Color>(_barColor),
          ),
        ),
        if (vanne.isOpen && wph > 0) ...[
          const SizedBox(height: 4),
          Row(children: [
            Icon(Icons.water_drop, size: 11, color: AppColors.farmWater),
            const SizedBox(width: 3),
            Text(
              '${wph.toStringAsFixed(1)} L/plante/h',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.farmWater),
            ),
          ]),
        ],
      ],
    );
  }
}

// ── Carte détail débit + consommation (dans le bottom sheet) ──────────────────

class _DebitDetailCard extends StatelessWidget {
  final ValveModel vanne;
  final ThemeData theme;
  final String Function(String) t;

  const _DebitDetailCard({required this.vanne, required this.theme, required this.t});

  static const double _maxDebit = 10.0;

  // Durée de la programmation en minutes
  int _durationMinutes() {
    try {
      final sp = vanne.startTime.split(':');
      final ep = vanne.endTime.split(':');
      final startMin = int.parse(sp[0]) * 60 + int.parse(sp[1]);
      final endMin   = int.parse(ep[0]) * 60 + int.parse(ep[1]);
      final diff = endMin - startMin;
      return diff > 0 ? diff : diff + 1440; // +24h si fin < début
    } catch (_) {
      return 60;
    }
  }

  Color get _barColor {
    if (!vanne.isOpen || vanne.debit <= 0) return Colors.grey.shade400;
    if (vanne.debit >= 3.0) return AppColors.farmLeaf;
    if (vanne.debit >= 1.0) return Colors.orange;
    return Colors.red;
  }

  @override
  Widget build(BuildContext context) {
    final ratio = (vanne.debit / _maxDebit).clamp(0.0, 1.0);
    final durationMin = _durationMinutes();
    final totalLiters = vanne.debit * durationMin;
    final lPerPlantSession = vanne.nbPlants > 0 ? totalLiters / vanne.nbPlants : 0.0;
    final lPerPlantHour = vanne.nbPlants > 0 ? (vanne.debit * 60) / vanne.nbPlants : 0.0;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.farmWater.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.farmWater.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Titre
          Row(children: [
            Icon(Icons.sensors_rounded, size: 18, color: AppColors.farmWater),
            const SizedBox(width: 8),
            Text(t('vannes.flow_detail'), style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
          ]),
          const SizedBox(height: 12),

          // Barre débit capteur
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Débit capteur', style: theme.textTheme.bodySmall),
              Text(
                '${vanne.debit.toStringAsFixed(1)} / ${_maxDebit.toStringAsFixed(0)} L/min',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: _barColor),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: ratio,
              minHeight: 10,
              backgroundColor: theme.colorScheme.secondary,
              valueColor: AlwaysStoppedAnimation<Color>(_barColor),
            ),
          ),
          const SizedBox(height: 12),

          // Stats consommation
          if (vanne.isOpen && vanne.debit > 0) ...[
            _StatRow(icon: Icons.timer_outlined,       label: t('vannes.duration'),           value: '${durationMin}min (${vanne.startTime} → ${vanne.endTime})', color: AppColors.farmLeaf,  theme: theme),
            const SizedBox(height: 6),
            _StatRow(icon: Icons.water_drop_outlined,  label: t('vannes.total_volume'),       value: '${totalLiters.toStringAsFixed(0)} L',                       color: AppColors.farmWater, theme: theme),
            const SizedBox(height: 6),
            _StatRow(icon: Icons.eco_outlined,         label: t('vannes.per_plant_session'),  value: vanne.nbPlants > 0 ? '${lPerPlantSession.toStringAsFixed(1)} L' : '—', color: AppColors.farmEarth, theme: theme),
            const SizedBox(height: 6),
            _StatRow(icon: Icons.schedule,             label: t('vannes.per_plant_hour'),     value: vanne.nbPlants > 0 ? '${lPerPlantHour.toStringAsFixed(1)} L/h' : '—', color: AppColors.farmSun, theme: theme),
          ] else
            Text(
              t('vannes.open_water'),
              style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurface.withValues(alpha: 0.5)),
            ),
        ],
      ),
    );
  }
}

class _StatRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  final ThemeData theme;

  const _StatRow({required this.icon, required this.label, required this.value, required this.color, required this.theme});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 28, height: 28,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 15, color: color),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(label, style: theme.textTheme.bodySmall),
        ),
        Text(
          value,
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: color),
        ),
      ],
    );
  }
}

class _StatMini extends StatelessWidget {
  final String label, value;
  final IconData icon;
  final Color color;
  final ThemeData theme;
  const _StatMini(this.label, this.value, this.icon, this.color, this.theme);

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: theme.colorScheme.outline),
        ),
        child: Column(children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(height: 4),
          Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: color)),
          Text(label, style: theme.textTheme.labelSmall),
        ]),
      ),
    );
  }
}
