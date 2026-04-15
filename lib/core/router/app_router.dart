import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:uiearth_flutter/core/router/rapports_routes.dart';
import 'package:uiearth_flutter/presentation/screens/home/home_screen.dart';
import 'package:uiearth_flutter/presentation/screens/health/plant_health_screen.dart';
import 'package:uiearth_flutter/presentation/screens/valves/valves_screen.dart';
import 'package:uiearth_flutter/presentation/screens/weather_screen.dart';
import 'package:uiearth_flutter/presentation/screens/profile/profile_screen.dart';
import 'package:uiearth_flutter/presentation/screens/formulaire/formulaire_screen.dart';
import 'package:uiearth_flutter/presentation/screens/history/history_screen.dart';
import 'package:uiearth_flutter/presentation/screens/home/qr_scanner_screen.dart';
import 'package:uiearth_flutter/presentation/widgets/layout/app_shell.dart';

/// Clé de navigation globale pour le shell.
final rootNavigatorKey = GlobalKey<NavigatorState>();
final shellNavigatorKey = GlobalKey<NavigatorState>();

/// Configuration GoRouter complète de l'application.
final GoRouter appRouter = GoRouter(
  navigatorKey: rootNavigatorKey,
  initialLocation: '/',
  routes: [
    // ─── Shell Route : Bottom Nav ───
    ShellRoute(
      navigatorKey: shellNavigatorKey,
      builder: (context, state, child) => AppShell(child: child),
      routes: [
        GoRoute(
          path: '/',
          name: 'home',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: HomeScreen(),
          ),
        ),
        GoRoute(
          path: '/sante',
          name: 'sante',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: PlantHealthScreen(),
          ),
        ),
        GoRoute(
          path: '/vannes',
          name: 'vannes',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: ValvesScreen(),
          ),
        ),
        GoRoute(
          path: '/meteo',
          name: 'meteo',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: WeatherScreen(),
          ),
        ),
        GoRoute(
          path: '/profil',
          name: 'profil',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: ProfileScreen(),
          ),
        ),
      ],
    ),

    // ─── Routes plein écran (en dehors du shell) ───
    ...rapportsRoutes,

    GoRoute(
      path: '/formulaire',
      name: 'formulaire',
      builder: (context, state) => const FormulaireScreen(),
    ),
    GoRoute(
      path: '/historique',
      name: 'historique',
      builder: (context, state) => const HistoryScreen(),
    ),
    GoRoute(
      path: '/scan-qr',
      name: 'scan_qr',
      builder: (context, state) {
        final parcelleId = state.uri.queryParameters['parcelleId'];
        return QrScannerScreen(parcelleId: parcelleId);
      },
    ),
  ],
);
