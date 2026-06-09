import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:uiearth_flutter/presentation/widgets/layout/app_header.dart';
import 'package:uiearth_flutter/presentation/widgets/layout/bottom_nav_bar.dart';

/// Shell with floating bottom nav. Accueil (index 0) manages its own header.
class AppShell extends StatelessWidget {
  final Widget child;
  const AppShell({super.key, required this.child});

  static const _paths = ['/', '/parcelles', '/sante', '/vannes', '/meteo', '/profil'];

  int _currentIndex(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();
    for (int i = _paths.length - 1; i >= 0; i--) {
      if ((_paths[i] != '/' && location.startsWith(_paths[i])) || location == _paths[i]) {
        return i;
      }
    }
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final index = _currentIndex(context);
    final isAccueil = index == 0;

    // Espace réservé sous le contenu pour la barre flottante (qui flotte au-dessus
    // grâce à extendBody: true). On l'ajoute ici une seule fois pour TOUS les
    // écrans du shell, afin qu'aucune carte ne soit jamais masquée par la NavBar.
    // + la safe area du bas (encoche / barre gestuelle).
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
        currentIndex: index,
        onTap: (i) => context.go(_paths[i]),
      ),
      extendBody: true,
    );
  }
}
