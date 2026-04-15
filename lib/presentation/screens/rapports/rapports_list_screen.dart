import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:uiearth_flutter/core/theme/app_colors.dart';
import 'package:uiearth_flutter/data/models/rapport.dart';
import 'package:uiearth_flutter/domain/providers/rapport_provider.dart';

/// /rapports/eau ou /rapports/sol — Liste des rapports par type.
/// Miroir exact de RapportHistory.tsx.
class RapportsListScreen extends ConsumerWidget {
  final RapportType type;
  const RapportsListScreen({super.key, required this.type});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(rapportsProvider.notifier);
    final rapports = notifier.byType(type);
    final theme = Theme.of(context);
    final typePath = type == RapportType.eau ? 'eau' : 'sol';
    final isEau = type == RapportType.eau;
    final color = isEau ? AppColors.farmWater : AppColors.farmEarth;
    final icon = isEau ? Icons.water_drop : Icons.terrain;
    final title = isEau ? 'Rapports Eau' : 'Rapports Sol';

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 24),

              // Back button
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
              const SizedBox(height: 16),

              // Title + Nouveau button
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(title, style: theme.textTheme.headlineMedium),
                  GestureDetector(
                    onTap: () => context.go('/rapports/$typePath/nouveau'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.farmLeaf,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.add, size: 14, color: Colors.white),
                          SizedBox(width: 6),
                          Text('Nouveau',
                              style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Content
              Expanded(
                child: rapports.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.description_outlined,
                                size: 40,
                                color: theme.textTheme.bodySmall?.color
                                    ?.withValues(alpha: 0.4)),
                            const SizedBox(height: 12),
                            Text('Aucun rapport enregistré',
                                style: theme.textTheme.bodySmall),
                          ],
                        ),
                      )
                    : ListView.separated(
                        itemCount: rapports.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: 12),
                        itemBuilder: (ctx, i) {
                          final r = rapports[i];
                          final dangerCount = r.interpretations.values
                              .where((interp) =>
                                  interp.level == InterpLevel.danger)
                              .length;

                          return GestureDetector(
                            onTap: () => context
                                .go('/rapports/$typePath/${r.id}'),
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: theme.colorScheme.surface,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                    color: theme.colorScheme.outline),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black
                                        .withValues(alpha: 0.04),
                                    blurRadius: 8,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Row(
                                children: [
                                  // Icon
                                  Container(
                                    width: 40,
                                    height: 40,
                                    decoration: BoxDecoration(
                                      color:
                                          color.withValues(alpha: 0.1),
                                      borderRadius:
                                          BorderRadius.circular(12),
                                    ),
                                    child: Icon(icon,
                                        size: 18, color: color),
                                  ),
                                  const SizedBox(width: 12),

                                  // Name + Date
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(r.name,
                                            style: TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w700,
                                              color: theme.colorScheme
                                                  .onSurface,
                                            )),
                                        const SizedBox(height: 2),
                                        Text(r.date,
                                            style:
                                                theme.textTheme.bodySmall),
                                      ],
                                    ),
                                  ),

                                  // Badges
                                  if (dangerCount > 0)
                                    _InterpBadge(
                                      text: '$dangerCount alertes',
                                      bgColor: AppColors.lightDestructive
                                          .withValues(alpha: 0.1),
                                      textColor:
                                          AppColors.lightDestructive,
                                      borderColor:
                                          AppColors.lightDestructive
                                              .withValues(alpha: 0.3),
                                    )
                                  else
                                    _InterpBadge(
                                      text: 'OK',
                                      bgColor: AppColors.lightPrimary
                                          .withValues(alpha: 0.1),
                                      textColor: AppColors.lightPrimary,
                                      borderColor: AppColors.lightPrimary
                                          .withValues(alpha: 0.3),
                                    ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InterpBadge extends StatelessWidget {
  final String text;
  final Color bgColor;
  final Color textColor;
  final Color borderColor;

  const _InterpBadge({
    required this.text,
    required this.bgColor,
    required this.textColor,
    required this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: borderColor),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 9,
          fontWeight: FontWeight.w600,
          color: textColor,
        ),
      ),
    );
  }
}
