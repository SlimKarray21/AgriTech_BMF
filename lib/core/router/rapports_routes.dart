import 'package:go_router/go_router.dart';
import 'package:uiearth_flutter/data/models/rapport.dart';
import 'package:uiearth_flutter/presentation/screens/rapports/rapports_dashboard.dart';
import 'package:uiearth_flutter/presentation/screens/rapports/rapports_list_screen.dart';
import 'package:uiearth_flutter/presentation/screens/rapports/rapport_form_screen.dart';
import 'package:uiearth_flutter/presentation/screens/rapports/rapport_detail_screen.dart';

/// Routes du module Rapports, à intégrer dans le GoRouter principal.
List<RouteBase> rapportsRoutes = [
  GoRoute(
    path: '/rapports',
    name: 'rapports',
    builder: (context, state) => const RapportsDashboard(),
    routes: [
      // ─── Eau ───
      GoRoute(
        path: 'eau',
        name: 'rapports-eau',
        builder: (context, state) =>
            const RapportsListScreen(type: RapportType.eau),
        routes: [
          GoRoute(
            path: 'nouveau',
            name: 'rapports-eau-nouveau',
            builder: (context, state) =>
                const RapportFormScreen(type: RapportType.eau),
          ),
          GoRoute(
            path: ':id',
            name: 'rapports-eau-detail',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return RapportDetailScreen(rapportId: id);
            },
          ),
        ],
      ),
      // ─── Sol ───
      GoRoute(
        path: 'sol',
        name: 'rapports-sol',
        builder: (context, state) =>
            const RapportsListScreen(type: RapportType.sol),
        routes: [
          GoRoute(
            path: 'nouveau',
            name: 'rapports-sol-nouveau',
            builder: (context, state) =>
                const RapportFormScreen(type: RapportType.sol),
          ),
          GoRoute(
            path: ':id',
            name: 'rapports-sol-detail',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return RapportDetailScreen(rapportId: id);
            },
          ),
        ],
      ),
    ],
  ),
];
