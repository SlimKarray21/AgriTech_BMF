import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:uiearth_flutter/core/theme/app_colors.dart';

/// /rapports — Sélection du type de rapport (Eau ou Sol).
class RapportsDashboard extends StatelessWidget {
  const RapportsDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

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
                onTap: () => context.go('/'),
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

              // Title
              Text('Rapports', style: theme.textTheme.headlineMedium),
              const SizedBox(height: 8),
              Text('Sélectionnez le type de rapport',
                  style: theme.textTheme.bodySmall),
              const SizedBox(height: 24),

              // Grid: 2 cards
              Row(
                children: [
                  Expanded(
                    child: _TypeCard(
                      icon: Icons.water_drop,
                      color: AppColors.farmWater,
                      label: 'RAPPORT EAU',
                      onTap: () => context.go('/rapports/eau'),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _TypeCard(
                      icon: Icons.terrain,
                      color: AppColors.farmEarth,
                      label: 'RAPPORT SOL',
                      onTap: () => context.go('/rapports/sol'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TypeCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  final VoidCallback onTap;

  const _TypeCard({
    required this.icon,
    required this.color,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: theme.colorScheme.outline),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(icon, size: 32, color: color),
            ),
            const SizedBox(height: 12),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: theme.colorScheme.onSurface,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
