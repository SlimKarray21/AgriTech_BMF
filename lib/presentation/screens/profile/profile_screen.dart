import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:provider/provider.dart' as p;
import 'package:uiearth_flutter/core/theme/app_colors.dart';
import 'package:uiearth_flutter/domain/providers/api_providers.dart';
import 'package:uiearth_flutter/domain/providers/parcelle_provider.dart';
import 'package:uiearth_flutter/domain/providers/theme_provider.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});
  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  String? _subPage;
  String _farmName = 'Ferme Soleil';
  String _farmLocation = 'Tunis';
  String _ownerName = 'Ahmed Fermier';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final parcelles = ref.watch(parcellesProvider);
    final totalHa = parcelles.fold<double>(0, (s, p) => s + double.tryParse(p.area.replaceAll(' ha', ''))!).toStringAsFixed(1);

    if (_subPage == 'parametres') return _settings(theme);
    if (_subPage == 'aide') return _help(theme);

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
      children: [
        Row(children: [
          ClipRRect(borderRadius: BorderRadius.circular(16), child: Image.asset('assets/images/agritech_logo.png', width: 64, height: 64, fit: BoxFit.cover)),
          const SizedBox(width: 16),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(_ownerName, style: theme.textTheme.headlineSmall),
            Text('$_farmName • $_farmLocation', style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w500)),
          ]),
        ]),
        const SizedBox(height: 16),
        Row(children: [
          _Stat('${parcelles.length}', 'Parcelles', theme),
          const SizedBox(width: 12),
          _Stat(totalHa, 'Hectares', theme),
          const SizedBox(width: 12),
          _Stat('0', 'Alertes', theme),
        ]),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: theme.colorScheme.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: theme.colorScheme.outline)),
          child: Row(children: [
            Image.asset('assets/images/tesla_logo.png', height: 32),
            const SizedBox(width: 12),
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Partenaire Tesla Energie', style: theme.textTheme.titleSmall?.copyWith(fontSize: 12)),
              Text("Système d'irrigation intelligent", style: theme.textTheme.labelSmall),
            ]),
          ]),
        ),
        const Divider(height: 32),
        _Menu(Icons.settings_outlined, 'Paramètres', () => setState(() => _subPage = 'parametres'), theme),
        _Menu(Icons.shield_outlined, 'Confidentialité', () {}, theme),
        _Menu(Icons.help_outline, 'Aide & Support', () => setState(() => _subPage = 'aide'), theme),
        const Divider(height: 32),
        GestureDetector(
          onTap: () => ref.read(userJwtProvider.notifier).setToken(null),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
            child: Row(children: [
              const Icon(Icons.logout, size: 20, color: AppColors.farmDanger),
              const SizedBox(width: 12),
              Text('Déconnexion', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.farmDanger)),
            ]),
          ),
        ),
      ],
    );
  }

  Widget _header(String title, ThemeData theme) => Padding(
    padding: const EdgeInsets.only(bottom: 20),
    child: Row(children: [
      GestureDetector(onTap: () => setState(() => _subPage = null), child: const Icon(Icons.arrow_back, size: 20)),
      const SizedBox(width: 12),
      Text(title, style: theme.textTheme.headlineSmall),
    ]),
  );

  Widget _settings(ThemeData theme) => ListView(
    padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
    children: [
      _header('Paramètres', theme),
      _Toggle(
        Icons.dark_mode,
        'Mode sombre',
        p.Provider.of<ThemeProvider>(context).isDarkMode,
        (v) => p.Provider.of<ThemeProvider>(context, listen: false).setDarkMode(v),
        theme,
      ),
      const SizedBox(height: 16),
      Text('INFORMATIONS', style: theme.textTheme.labelSmall?.copyWith(letterSpacing: 1)),
      const SizedBox(height: 12),
      _Field('Propriétaire', _ownerName, (v) => setState(() => _ownerName = v)),
      const SizedBox(height: 8),
      _Field('Ferme', _farmName, (v) => setState(() => _farmName = v)),
      const SizedBox(height: 8),
      _Field('Localisation', _farmLocation, (v) => setState(() => _farmLocation = v)),
      const SizedBox(height: 16),
      SizedBox(width: double.infinity, height: 44, child: ElevatedButton(onPressed: () => setState(() => _subPage = null), child: const Text('Sauvegarder'))),
    ],
  );

  Widget _help(ThemeData theme) => ListView(
    padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
    children: [
      _header('Aide & Support', theme),
      _Menu(Icons.chat_bubble_outline, 'Nous contacter', () {}, theme),
      _Menu(Icons.description_outlined, 'FAQ', () {}, theme),
      _Menu(Icons.info_outline, 'À propos', () {}, theme),
      const SizedBox(height: 24),
      Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        Image.asset('assets/images/agritech_logo.png', height: 48),
        const SizedBox(width: 24),
        Image.asset('assets/images/tesla_logo.png', height: 48),
      ]),
      const SizedBox(height: 16),
      Text('AgriTech — Agriculture Intelligente', textAlign: TextAlign.center, style: theme.textTheme.bodySmall),
      Text('Version 1.0.0 • © 2026', textAlign: TextAlign.center, style: theme.textTheme.labelSmall),
    ],
  );
}

class _Stat extends StatelessWidget {
  final String v, l; final ThemeData t;
  const _Stat(this.v, this.l, this.t);
  @override
  Widget build(BuildContext context) => Expanded(child: Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(color: t.colorScheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: t.colorScheme.outline)),
    child: Column(children: [Text(v, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: t.colorScheme.onSurface)), Text(l, style: t.textTheme.labelSmall)]),
  ));
}

class _Menu extends StatelessWidget {
  final IconData i; final String t; final VoidCallback f; final ThemeData th;
  const _Menu(this.i, this.t, this.f, this.th);
  @override
  Widget build(BuildContext context) => GestureDetector(onTap: f, child: Padding(
    padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
    child: Row(children: [
      Icon(i, size: 20, color: th.colorScheme.onSurface.withValues(alpha: 0.5)),
      const SizedBox(width: 12),
      Expanded(child: Text(t, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: th.colorScheme.onSurface))),
      Icon(Icons.chevron_right, size: 18, color: th.colorScheme.onSurface.withValues(alpha: 0.3)),
    ]),
  ));
}

class _Toggle extends StatelessWidget {
  final IconData i; final String t; final bool v; final ValueChanged<bool> c; final ThemeData th;
  const _Toggle(this.i, this.t, this.v, this.c, this.th);
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: th.colorScheme.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: th.colorScheme.outline)),
    child: Row(children: [
      Icon(i, size: 18), const SizedBox(width: 12),
      Expanded(child: Text(t, style: th.textTheme.titleSmall)),
      Switch(value: v, onChanged: c),
    ]),
  );
}

class _Field extends StatelessWidget {
  final String l, v; final ValueChanged<String> c;
  const _Field(this.l, this.v, this.c);
  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text(l, style: Theme.of(context).textTheme.labelMedium),
    const SizedBox(height: 4),
    TextFormField(initialValue: v, onChanged: c),
  ]);
}
