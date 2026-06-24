import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:uiearth_flutter/core/l10n/app_localizations.dart';
import 'package:uiearth_flutter/domain/providers/access_provider.dart';
import 'package:uiearth_flutter/presentation/widgets/layout/app_header.dart';
import 'package:uiearth_flutter/presentation/widgets/layout/bottom_nav_bar.dart';

/// Onglet de navigation avec sa clé de page (pour le filtrage par abonnement).
class _ShellTab {
  final String path;
  final String pageKey;
  final IconData activeIcon;
  final IconData icon;
  final String labelKey;
  const _ShellTab(this.path, this.pageKey, this.activeIcon, this.icon, this.labelKey);
}

/// Shell with floating bottom nav. Accueil (path '/') manages its own header.
class AppShell extends ConsumerWidget {
  final Widget child;
  const AppShell({super.key, required this.child});

  // Ordre canonique des onglets du shell, avec leur clé de page.
  static const List<_ShellTab> _allTabs = [
    _ShellTab('/',          'accueil',   Icons.home_rounded,          Icons.home_outlined,          'nav.accueil'),
    _ShellTab('/parcelles', 'parcelles', Icons.terrain_rounded,       Icons.terrain_outlined,       'nav.home'),
    _ShellTab('/sante',     'sante',     Icons.monitor_heart_rounded, Icons.monitor_heart_outlined, 'nav.health'),
    _ShellTab('/vannes',    'vannes',    Icons.water_drop_rounded,    Icons.water_drop_outlined,    'nav.valves'),
    _ShellTab('/meteo',     'meteo',     Icons.cloud_rounded,         Icons.cloud_outlined,         'nav.weather'),
    _ShellTab('/profil',    'profil',    Icons.person_rounded,        Icons.person_outline_rounded, 'nav.profile'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final langState = ref.watch(languageProvider);

    // Pages autorisées par l'abonnement (défaut : pages toujours autorisées).
    final allowed = ref.watch(userAccessProvider).valueOrNull?.allowedPages ??
        kAlwaysAllowedPages;

    final visibleTabs =
        _allTabs.where((t) => allowed.contains(t.pageKey)).toList();

    final location = GoRouterState.of(context).uri.toString();

    // Index actif dans la liste filtrée (match du préfixe le plus long).
    int activeIndex = -1;
    for (int i = visibleTabs.length - 1; i >= 0; i--) {
      final p = visibleTabs[i].path;
      if ((p != '/' && location.startsWith(p)) || location == p) {
        activeIndex = i;
        break;
      }
    }

    // L'utilisateur est sur une page non autorisée par son plan : on le renvoie
    // vers la première page disponible.
    if (activeIndex == -1 && visibleTabs.isNotEmpty) {
      final fallback = visibleTabs.first.path;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted) context.go(fallback);
      });
    }

    final index = activeIndex < 0 ? 0 : activeIndex;
    final isAccueil = visibleTabs.isNotEmpty && visibleTabs[index].path == '/';

    final bottomInset = MediaQuery.of(context).padding.bottom + 96.0;

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            // Masquer le header sur Accueil (il a son propre hero)
            if (!isAccueil) const AppHeader(),
            Expanded(
              child: Padding(
                padding: EdgeInsets.only(bottom: bottomInset),
                child: child,
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: BottomNavBar(
        tabs: [
          for (final t in visibleTabs)
            NavTab(
              path: t.path,
              activeIcon: t.activeIcon,
              icon: t.icon,
              label: langState.t(t.labelKey),
            ),
        ],
        currentIndex: index,
        onTap: (i) => context.go(visibleTabs[i].path),
      ),
      extendBody: true,
    );
  }
}
