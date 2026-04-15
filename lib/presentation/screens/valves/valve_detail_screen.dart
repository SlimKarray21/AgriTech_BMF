import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uiearth_flutter/core/theme/app_colors.dart';
import 'package:uiearth_flutter/domain/providers/valve_provider.dart';

class ValveDetailScreen extends StatelessWidget {
  final String valveId;

  const ValveDetailScreen({super.key, required this.valveId});

  @override
  Widget build(BuildContext context) {
    return Consumer<ValveProvider>(
      builder: (context, valveProvider, _) {
        final valve = valveProvider.byId(valveId);
        if (valve == null) {
          return const Scaffold(
            body: Center(child: Text('Vanne introuvable')),
          );
        }

        return Scaffold(
          appBar: AppBar(title: Text('${valve.name} - ${valve.parcelleName}')),
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Card(
                child: ListTile(
                  leading: const Icon(Icons.power_settings_new),
                  title: const Text('Etat'),
                  subtitle: Text(valve.isOpen ? 'Ouverte' : 'Fermee'),
                  trailing: Switch(
                    value: valve.isOpen,
                    onChanged: (_) => context.read<ValveProvider>().toggleValve(valve.id),
                  ),
                ),
              ),
              Card(
                child: ListTile(
                  leading: const Icon(Icons.tune),
                  title: const Text('Automatisation'),
                  subtitle: Text(valve.isAuto ? 'Programmee' : 'Manuel'),
                  trailing: Switch(
                    value: valve.isAuto,
                    onChanged: (_) => context.read<ValveProvider>().setAutoMode(valve.id),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              if (valve.isOpen)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Programmation',
                          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: _TimeTile(
                                label: 'Heure de démarrage',
                                value: valve.startTime,
                                onTap: () async {
                                  final picked = await _pickTime(context, valve.startTime);
                                  if (picked == null || !context.mounted) return;
                                  context.read<ValveProvider>().updateSchedule(valve.id, startTime: picked);
                                },
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: _TimeTile(
                                label: 'Heure de fermeture',
                                value: valve.endTime,
                                onTap: () async {
                                  final picked = await _pickTime(context, valve.endTime);
                                  if (picked == null || !context.mounted) return;
                                  context.read<ValveProvider>().updateSchedule(valve.id, endTime: picked);
                                },
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _DayChip(label: 'Lun', active: valve.selectedWeekDays.contains(1), onTap: () => context.read<ValveProvider>().toggleWeekDay(valve.id, 1)),
                            _DayChip(label: 'Mar', active: valve.selectedWeekDays.contains(2), onTap: () => context.read<ValveProvider>().toggleWeekDay(valve.id, 2)),
                            _DayChip(label: 'Mer', active: valve.selectedWeekDays.contains(3), onTap: () => context.read<ValveProvider>().toggleWeekDay(valve.id, 3)),
                            _DayChip(label: 'Jeu', active: valve.selectedWeekDays.contains(4), onTap: () => context.read<ValveProvider>().toggleWeekDay(valve.id, 4)),
                            _DayChip(label: 'Ven', active: valve.selectedWeekDays.contains(5), onTap: () => context.read<ValveProvider>().toggleWeekDay(valve.id, 5)),
                            _DayChip(label: 'Sam', active: valve.selectedWeekDays.contains(6), onTap: () => context.read<ValveProvider>().toggleWeekDay(valve.id, 6)),
                            _DayChip(label: 'Dim', active: valve.selectedWeekDays.contains(7), onTap: () => context.read<ValveProvider>().toggleWeekDay(valve.id, 7)),
                          ],
                        ),
                      ],
                    ),
                  ),
                )
              else
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                  child: Text('Programmation masquée: ouvrez la vanne pour la configurer.'),
                ),
              const SizedBox(height: 16),
              Text('Progression irrigation: ${valve.irrigationProgress.toStringAsFixed(0)}%'),
              const SizedBox(height: 8),
              LinearProgressIndicator(
                value: valve.irrigationProgress / 100,
                color: AppColors.farmLeaf,
              ),
              const SizedBox(height: 16),
              Text('Debit: ${valve.debit.toStringAsFixed(1)} L/min'),
              const SizedBox(height: 8),
              Slider(
                value: valve.irrigationProgress,
                min: 0,
                max: 100,
                onChanged: (value) => context.read<ValveProvider>().updateProgress(valve.id, value),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<String?> _pickTime(BuildContext context, String initialTime) async {
    final parts = initialTime.split(':');
    final initial = TimeOfDay(
      hour: int.tryParse(parts.first) ?? 6,
      minute: parts.length > 1 ? (int.tryParse(parts[1]) ?? 0) : 0,
    );
    final picked = await showTimePicker(context: context, initialTime: initial);
    if (picked == null) return null;
    final hh = picked.hour.toString().padLeft(2, '0');
    final mm = picked.minute.toString().padLeft(2, '0');
    return '$hh:$mm';
  }
}

class _TimeTile extends StatelessWidget {
  final String label;
  final String value;
  final VoidCallback onTap;

  const _TimeTile({required this.label, required this.value, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 12, color: Colors.black54)),
            const SizedBox(height: 4),
            Row(
              children: [
                Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w600))),
                const Icon(Icons.access_time, size: 16),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _DayChip extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _DayChip({required this.label, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        width: 44,
        height: 40,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: active ? AppColors.farmLeaf : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontWeight: FontWeight.w700,
            color: active ? Colors.white : Colors.black54,
          ),
        ),
      ),
    );
  }
}
