import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:provider/provider.dart' as p;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uiearth_flutter/domain/providers/api_providers.dart';
import 'package:uiearth_flutter/domain/providers/theme_provider.dart';
import 'package:uiearth_flutter/domain/providers/valve_provider.dart';
import 'core/theme/app_theme.dart';
import 'core/l10n/app_localizations.dart';
import 'core/router/app_router.dart';
import 'presentation/screens/auth/auth_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  runApp(
    p.MultiProvider(
      providers: [
        p.ChangeNotifierProvider(create: (_) => ThemeProvider()),
        p.ChangeNotifierProvider(create: (_) => ValveProvider()),
      ],
      child: ProviderScope(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
        ],
        child: const AgriTechApp(),
      ),
    ),
  );
}

class AgriTechApp extends ConsumerStatefulWidget {
  const AgriTechApp({super.key});

  @override
  ConsumerState<AgriTechApp> createState() => _AgriTechAppState();
}

class _AgriTechAppState extends ConsumerState<AgriTechApp> {
  static const bool _bypassAuthForDev = true;

  @override
  Widget build(BuildContext context) {
    final langState = ref.watch(languageProvider);
    final themeProvider = p.Provider.of<ThemeProvider>(context);
    final jwt = ref.watch(userJwtProvider);
    final authenticated = jwt != null && jwt.isNotEmpty;

    if (!_bypassAuthForDev && !authenticated) {
      return MaterialApp(
        title: 'AgriTech',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        darkTheme: AppTheme.dark,
        themeMode: themeProvider.themeMode,
        builder: (context, child) {
          return Directionality(
            textDirection: langState.direction,
            child: child!,
          );
        },
        home: const AuthScreen(),
      );
    }

    return MaterialApp.router(
      title: 'AgriTech',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: themeProvider.themeMode,
      routerConfig: appRouter,
      builder: (context, child) {
        return Directionality(
          textDirection: langState.direction,
          child: child!,
        );
      },
    );
  }
}
