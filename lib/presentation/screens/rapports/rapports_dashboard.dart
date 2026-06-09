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
      body: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          // ── Hero Header ──────────────────────────────────────────────────
          SliverToBoxAdapter(
            child: Container(
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
                      // Back
                      GestureDetector(
                        onTap: () => context.go('/'),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: const [
                            Icon(Icons.arrow_back_ios_rounded, size: 16, color: Colors.white70),
                            SizedBox(width: 4),
                            Text('Retour', style: TextStyle(color: Colors.white70, fontSize: 13)),
                          ],
                        ),
                      ),
                      const SizedBox(height: 18),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: const [
                              Text('Rapports',
                                  style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: -0.5)),
                              SizedBox(height: 4),
                              Text("Analyses de sol et d'eau",
                                  style: TextStyle(color: Colors.white70, fontSize: 13)),
                            ],
                          ),
                          Container(
                            width: 48, height: 48,
                            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(16)),
                            child: const Icon(Icons.insert_chart_outlined_rounded, color: Colors.white, size: 26),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // ── Section title ────────────────────────────────────────────────
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
            sliver: SliverToBoxAdapter(
              child: Text('Sélectionnez le type de rapport',
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
            ),
          ),

          // ── Cards ────────────────────────────────────────────────────────
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
            sliver: SliverToBoxAdapter(
              child: Column(
                children: [
                  _TypeCard(
                    icon: Icons.water_drop_rounded,
                    color: AppColors.farmWater,
                    title: 'Rapport Eau',
                    subtitle: "Qualité de l'eau d'irrigation : pH, salinité, SAR…",
                    onTap: () => context.go('/rapports/eau'),
                  ),
                  const SizedBox(height: 14),
                  _TypeCard(
                    icon: Icons.terrain_rounded,
                    color: AppColors.farmEarth,
                    title: 'Rapport Sol',
                    subtitle: 'Analyse pédologique : texture, pH, matière organique…',
                    onTap: () => context.go('/rapports/sol'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TypeCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _TypeCard({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.6)),
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4)),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 56, height: 56,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: color.withValues(alpha: 0.2)),
              ),
              child: Icon(icon, size: 28, color: color),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  Text(subtitle, style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline), maxLines: 2),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Icon(Icons.arrow_forward_ios_rounded, size: 16, color: color),
          ],
        ),
      ),
    );
  }
}
