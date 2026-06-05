import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:provider/provider.dart' as p;
import 'package:uiearth_flutter/core/l10n/app_localizations.dart';
import 'package:uiearth_flutter/core/theme/app_colors.dart';
import 'package:uiearth_flutter/domain/providers/theme_provider.dart';

class AppHeader extends ConsumerWidget {
  const AppHeader({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final langState = ref.watch(languageProvider);
    final langNotifier = ref.read(languageProvider.notifier);
    final themeProvider = p.Provider.of<ThemeProvider>(context);
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 10),
      decoration: BoxDecoration(
        color: theme.scaffoldBackgroundColor,
      ),
      child: Row(
        children: [
          // Logo + wordmark
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(
              gradient: AppColors.farmGradient,
              borderRadius: BorderRadius.circular(10),
              boxShadow: AppColors.greenShadow,
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Image.asset('assets/images/agritech_logo.png', fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const Icon(Icons.terrain_rounded, color: Colors.white, size: 20)),
            ),
          ),
          const SizedBox(width: 10),
          Text('AgriTech',
              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900, letterSpacing: -0.3)),

          const Spacer(),

          // Language pill
          Container(
            decoration: BoxDecoration(
              color: theme.colorScheme.secondary,
              borderRadius: BorderRadius.circular(20),
            ),
            padding: const EdgeInsets.all(3),
            child: Row(
              children: [
                _LangBtn(label: 'FR', isActive: langState.lang == Lang.fr, onTap: () => langNotifier.setLang(Lang.fr)),
                const SizedBox(width: 2),
                _LangBtn(label: 'عربي', isActive: langState.lang == Lang.ar, onTap: () => langNotifier.setLang(Lang.ar)),
              ],
            ),
          ),
          const SizedBox(width: 8),

          // Dark mode toggle
          GestureDetector(
            onTap: () => themeProvider.toggleTheme(),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 250),
              width: 36, height: 36,
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSecondary : AppColors.lightSecondary,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
              ),
              child: Icon(
                isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
                size: 18,
                color: isDark ? AppColors.farmSun : AppColors.neutral600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LangBtn extends StatelessWidget {
  final String label;
  final bool isActive;
  final VoidCallback onTap;
  const _LangBtn({required this.label, required this.isActive, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: isActive ? AppColors.farmLeaf : Colors.transparent,
          borderRadius: BorderRadius.circular(17),
          boxShadow: isActive ? [BoxShadow(color: AppColors.farmLeaf.withValues(alpha: 0.3), blurRadius: 4)] : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11, fontWeight: FontWeight.w700,
            color: isActive ? Colors.white : Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.45),
          ),
        ),
      ),
    );
  }
}
