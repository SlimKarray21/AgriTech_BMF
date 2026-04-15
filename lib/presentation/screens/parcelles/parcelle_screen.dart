import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uiearth_flutter/domain/providers/valve_provider.dart';

class ParcelleScreen extends StatelessWidget {
  final String parcelleId;
  final String parcelleName;

  const ParcelleScreen({
    super.key,
    required this.parcelleId,
    required this.parcelleName,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<ValveProvider>(
      builder: (context, valveProvider, _) {
        final valves = valveProvider.byParcelle(parcelleId);
        final opened = valves.where((v) => v.isOpen).length;

        return Scaffold(
          appBar: AppBar(title: Text('Parcelle: $parcelleName')),
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text('Vannes ouvertes: $opened/${valves.length}'),
              const SizedBox(height: 12),
              ...valves.map(
                (v) => Card(
                  child: ListTile(
                    title: Text(v.name),
                    subtitle: Text('Progression: ${v.irrigationProgress.toStringAsFixed(0)}%'),
                    trailing: Switch(
                      value: v.isOpen,
                      onChanged: (_) => context.read<ValveProvider>().toggleValve(v.id),
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
