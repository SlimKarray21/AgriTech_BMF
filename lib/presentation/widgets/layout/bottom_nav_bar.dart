import 'package:flutter/material.dart';
import 'package:uiearth_flutter/core/theme/app_colors.dart';

/// Description d'un onglet de la barre de navigation.
class NavTab {
  final String path;
  final IconData activeIcon;
  final IconData icon;
  final String label;
  const NavTab({
    required this.path,
    required this.activeIcon,
    required this.icon,
    required this.label,
  });
}

class BottomNavBar extends StatelessWidget {
  final List<NavTab> tabs;
  final int currentIndex;
  final ValueChanged<int> onTap;

  const BottomNavBar({
    super.key,
    required this.tabs,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 20),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : Colors.white,
        borderRadius: BorderRadius.circular(28),
        boxShadow: AppColors.navShadow,
        border: Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.lightBorder.withValues(alpha: 0.5),
          width: 0.8,
        ),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: List.generate(tabs.length, (i) {
            final isActive = i == currentIndex;
            return Expanded(
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => onTap(i),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  curve: Curves.easeOutCubic,
                  padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 2),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Icon pill
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 250),
                        curve: Curves.easeOutCubic,
                        width: isActive ? 44 : 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: isActive
                              ? AppColors.farmLeaf
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: isActive ? AppColors.greenShadow : null,
                        ),
                        child: Center(
                          child: AnimatedSwitcher(
                            duration: const Duration(milliseconds: 200),
                            child: Icon(
                              isActive ? tabs[i].activeIcon : tabs[i].icon,
                              key: ValueKey('${i}_$isActive'),
                              size: isActive ? 20 : 20,
                              color: isActive
                                  ? Colors.white
                                  : (isDark ? AppColors.darkMutedForeground : AppColors.neutral400),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 4),
                      // Label
                      AnimatedDefaultTextStyle(
                        duration: const Duration(milliseconds: 200),
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: isActive ? FontWeight.w800 : FontWeight.w500,
                          color: isActive
                              ? AppColors.farmLeaf
                              : (isDark ? AppColors.darkMutedForeground : AppColors.neutral400),
                          letterSpacing: isActive ? 0.2 : 0,
                        ),
                        child: Text(tabs[i].label, maxLines: 1, overflow: TextOverflow.ellipsis),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),
        ),
      ),
    );
  }
}
