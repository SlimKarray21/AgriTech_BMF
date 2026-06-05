import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:uiearth_flutter/presentation/widgets/layout/app_header.dart';
import 'package:uiearth_flutter/presentation/widgets/layout/bottom_nav_bar.dart';

/// Shell widget containing header + content + bottom nav.
/// Used by GoRouter ShellRoute to wrap tabbed pages.
class AppShell extends StatelessWidget {
  final Widget child;
  const AppShell({super.key, required this.child});

  static const _paths = ['/', '/parcelles', '/sante', '/vannes', '/meteo', '/profil'];

  int _currentIndex(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();
    for (int i = _paths.length - 1; i >= 0; i--) {
      if (location.startsWith(_paths[i]) && _paths[i] != '/' || location == _paths[i]) {
        return i;
      }
    }
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final index = _currentIndex(context);

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            const AppHeader(),
            Expanded(child: child),
            BottomNavBar(
              currentIndex: index,
              onTap: (i) => context.go(_paths[i]),
            ),
          ],
        ),
      ),
    );
  }
}
