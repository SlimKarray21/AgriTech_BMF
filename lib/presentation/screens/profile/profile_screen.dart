import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart' as p;
import 'package:uiearth_flutter/core/l10n/app_localizations.dart';
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
  String _farmName     = 'Ferme Soleil';
  String _farmLocation = 'Tunis';
  String _ownerName    = 'Ahmed Fermier';
  bool _loadingProfile = false;
  String? _aboType;
  DateTime? _aboStart;
  DateTime? _aboEnd;

  final TextEditingController _recSujet = TextEditingController();
  final TextEditingController _recMessage = TextEditingController();
  bool _recSubmitting = false;
  bool _savingSettings = false;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  @override
  void dispose() {
    _recSujet.dispose();
    _recMessage.dispose();
    super.dispose();
  }

  Future<void> _saveSettings(String Function(String) t) async {
    final name = _ownerName.trim();
    final parts = name.isEmpty ? <String>[] : name.split(RegExp(r'\s+'));
    final firstName = parts.isNotEmpty ? parts.first : '';
    final lastName = parts.length > 1 ? parts.sublist(1).join(' ') : '';
    setState(() => _savingSettings = true);
    try {
      await ref.read(uiEarthApiProvider).user.updateProfile({
        'firstName': firstName,
        'lastName': lastName,
      });
      if (!mounted) return;
      await _loadProfile();
      if (!mounted) return;
      setState(() => _subPage = null);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(t('profile.saved'))),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(t('profile.save_error'))),
      );
    } finally {
      if (mounted) setState(() => _savingSettings = false);
    }
  }

  Future<void> _submitReclamation(String Function(String) t) async {
    final sujet = _recSujet.text.trim();
    final message = _recMessage.text.trim();
    if (sujet.isEmpty || message.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(t('reclamation.required'))),
      );
      return;
    }
    setState(() => _recSubmitting = true);
    try {
      await ref.read(uiEarthApiProvider).user.createReclamation(sujet, message);
      if (!mounted) return;
      _recSujet.clear();
      _recMessage.clear();
      setState(() => _subPage = null);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(t('reclamation.sent'))),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(t('reclamation.error'))),
      );
    } finally {
      if (mounted) setState(() => _recSubmitting = false);
    }
  }

  Future<void> _loadProfile() async {
    setState(() => _loadingProfile = true);
    try {
      final profile = await ref.read(uiEarthApiProvider).user.getProfile();
      if (!mounted || profile == null) return;

      final firstName = profile['firstName']?.toString().trim();
      final lastName  = profile['lastName']?.toString().trim();
      final location  = profile['location']?.toString().trim();
      final fullName  = [firstName, lastName]
          .where((e) => e != null && e.isNotEmpty)
          .join(' ')
          .trim();

      DateTime? parseDate(String? raw) =>
          (raw == null || raw.trim().isEmpty) ? null : DateTime.tryParse(raw);

      setState(() {
        if (fullName.isNotEmpty) _ownerName = fullName;
        if (location != null && location.isNotEmpty) _farmLocation = location;
        _aboType  = profile['typeAbo']?.toString();
        _aboStart = parseDate(profile['dateDebAbo']?.toString());
        _aboEnd   = parseDate(profile['dateExpAbo']?.toString());
      });
    } catch (_) {
      // Garde les valeurs locales si le backend est inaccessible.
    } finally {
      if (mounted) setState(() => _loadingProfile = false);
    }
  }

  // ── Build principal ───────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final langState = ref.watch(languageProvider);
    final t     = langState.t;
    final isRtl = langState.lang == Lang.ar;
    final theme = Theme.of(context);
    final parcelles = ref.watch(parcellesProvider);
    final totalHa = parcelles
        .fold<double>(0, (s, prc) => s + (double.tryParse(prc.area.replaceAll(' ha', '')) ?? 0))
        .toStringAsFixed(1);

    Widget body;
    if (_subPage == 'parametres') {
      body = _settings(theme, t, isRtl);
    } else if (_subPage == 'aide') {
      body = _help(theme, t);
    } else if (_subPage == 'abonnement') {
      body = _subscription(theme, t);
    } else if (_subPage == 'reclamation') {
      body = _reclamation(theme, t);
    } else {
      body = _home(theme, t, parcelles.length, totalHa, isRtl);
    }

    return Directionality(
      textDirection: langState.direction,
      child: body,
    );
  }

  // ── Page d'accueil du profil ──────────────────────────────────────────────

  Widget _home(ThemeData theme, String Function(String) t, int parcelCount, String totalHa, bool isRtl) {
    return ListView(
      padding: EdgeInsets.zero,
      children: [
        // ── Hero Header ────────────────────────────────────────────────
        _ProfileHero(
          ownerName: _ownerName,
          farmName: _farmName,
          farmLocation: _farmLocation,
          parcelCount: parcelCount,
          totalHa: totalHa,
          parcellesLabel: t('profile.parcelles'),
          hectaresLabel: t('profile.hectares'),
          alertsLabel: t('profile.alerts'),
        ),
        const SizedBox(height: 20),

        Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Bandeau partenaire Tesla
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.6)),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4)),
                  ],
                ),
                child: Row(children: [
                  Image.asset('assets/images/tesla_logo.png', height: 32),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(t('profile.partner'),      style: theme.textTheme.titleSmall?.copyWith(fontSize: 12)),
                    Text(t('profile.smart_irrig'), style: theme.textTheme.labelSmall),
                  ])),
                ]),
              ),
              const SizedBox(height: 12),

              // Menu
              Container(
                decoration: BoxDecoration(
                  color: theme.colorScheme.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.6)),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4)),
                  ],
                ),
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                child: Column(children: [
                  _MenuItem(Icons.settings_outlined,           t('profile.settings'),      () => setState(() => _subPage = 'parametres'), theme),
                  _MenuItem(Icons.shield_outlined,             t('profile.privacy'),       () {},                                         theme),
                  _MenuItem(Icons.workspace_premium_outlined,  t('profile.subscription'),  () => setState(() => _subPage = 'abonnement'), theme),
                  _MenuItem(Icons.report_problem_outlined,     t('profile.complaint'),     () => setState(() => _subPage = 'reclamation'), theme),
                  _MenuItem(Icons.help_outline,                t('profile.help'),          () => setState(() => _subPage = 'aide'),       theme),
                ]),
              ),
              const SizedBox(height: 12),

              // Déconnexion
              GestureDetector(
                onTap: () => ref.read(userJwtProvider.notifier).setToken(null),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                  decoration: BoxDecoration(
                    color: AppColors.farmDanger.withValues(alpha: 0.07),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.farmDanger.withValues(alpha: 0.25)),
                  ),
                  child: Row(children: [
                    const Icon(Icons.logout, size: 20, color: AppColors.farmDanger),
                    const SizedBox(width: 12),
                    Text(t('profile.logout'),
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.farmDanger)),
                  ]),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ── Paramètres ────────────────────────────────────────────────────────────

  Widget _settings(ThemeData theme, String Function(String) t, bool isRtl) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
      children: [
        _backHeader(t('profile.settings'), theme),

        // Mode sombre
        _ToggleRow(
          Icons.dark_mode,
          t('profile.dark_mode'),
          p.Provider.of<ThemeProvider>(context).isDarkMode,
          (v) => p.Provider.of<ThemeProvider>(context, listen: false).setDarkMode(v),
          theme,
        ),
        const SizedBox(height: 16),

        // Sélecteur de langue
        _LangSelector(theme: theme, t: t),
        const SizedBox(height: 16),

        // Section informations
        Text(t('profile.info'),
            style: theme.textTheme.labelSmall?.copyWith(letterSpacing: 1)),
        const SizedBox(height: 12),
        _FieldRow(t('profile.owner'),    _ownerName,    (v) => setState(() => _ownerName    = v)),
        const SizedBox(height: 8),
        _FieldRow(t('profile.farm'),     _farmName,     (v) => setState(() => _farmName     = v)),
        const SizedBox(height: 8),
        _FieldRow(t('profile.location'), _farmLocation, (v) => setState(() => _farmLocation = v)),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          height: 44,
          child: ElevatedButton(
            onPressed: _savingSettings ? null : () => _saveSettings(t),
            child: _savingSettings
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text(t('profile.save')),
          ),
        ),
      ],
    );
  }

  // ── Aide & Support ────────────────────────────────────────────────────────

  Widget _help(ThemeData theme, String Function(String) t) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
      children: [
        _backHeader(t('profile.help'), theme),
        _MenuItem(Icons.chat_bubble_outline,   t('profile.contact'), () {}, theme),
        _MenuItem(Icons.description_outlined,  t('profile.faq'),     () {}, theme),
        _MenuItem(Icons.info_outline,          t('profile.about'),   () {}, theme),
        const SizedBox(height: 24),
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Image.asset('assets/images/agritech_logo.png', height: 48),
          const SizedBox(width: 24),
          Image.asset('assets/images/tesla_logo.png', height: 48),
        ]),
        const SizedBox(height: 16),
        Text(t('profile.agritech_slogan'),
            textAlign: TextAlign.center, style: theme.textTheme.bodySmall),
        Text(t('profile.version'),
            textAlign: TextAlign.center, style: theme.textTheme.labelSmall),
      ],
    );
  }

  // ── Abonnement ────────────────────────────────────────────────────────────

  Widget _subscription(ThemeData theme, String Function(String) t) {
    String formatDate(DateTime? d) =>
        d == null ? '—' : DateFormat('dd/MM/yyyy').format(d);

    String remainingText() {
      if (_aboEnd == null) return t('profile.no_sub');
      final today = DateTime.now();
      final end   = DateTime(_aboEnd!.year, _aboEnd!.month, _aboEnd!.day);
      final now   = DateTime(today.year, today.month, today.day);
      final days  = end.difference(now).inDays;
      if (days < 0) return t('profile.expired');
      if (days == 0) return t('profile.expires_today_short');
      return '$days ${t('profile.days_left')}';
    }

    final typeAbo = (_aboType == null || _aboType!.trim().isEmpty)
        ? t('profile.not_subscribed')
        : _aboType!;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
      children: [
        _backHeader(t('profile.subscription'), theme),
        if (_loadingProfile)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Center(child: CircularProgressIndicator()),
          )
        else
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: theme.colorScheme.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: theme.colorScheme.outline),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  const Icon(Icons.workspace_premium, color: AppColors.farmLeaf),
                  const SizedBox(width: 8),
                  Text('${t('profile.type_label')}: $typeAbo',
                      style: theme.textTheme.titleSmall),
                ]),
                const SizedBox(height: 12),
                Text('${t('profile.sub_start')}: ${formatDate(_aboStart)}',
                    style: theme.textTheme.bodyMedium),
                const SizedBox(height: 6),
                Text('${t('profile.sub_end')}: ${formatDate(_aboEnd)}',
                    style: theme.textTheme.bodyMedium),
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.farmLeaf.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '${t('profile.remaining')}: ${remainingText()}',
                    style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  // ── Réclamation ───────────────────────────────────────────────────────────

  Widget _reclamation(ThemeData theme, String Function(String) t) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
      children: [
        _backHeader(t('profile.complaint'), theme),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: theme.colorScheme.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: theme.colorScheme.outline),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(t('reclamation.subject'), style: theme.textTheme.labelMedium),
              const SizedBox(height: 6),
              TextField(
                controller: _recSujet,
                decoration: InputDecoration(
                  hintText: t('reclamation.subject_hint'),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 16),
              Text(t('reclamation.message'), style: theme.textTheme.labelMedium),
              const SizedBox(height: 6),
              TextField(
                controller: _recMessage,
                maxLines: 5,
                decoration: InputDecoration(
                  hintText: t('reclamation.message_hint'),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _recSubmitting ? null : () => _submitReclamation(t),
                  icon: _recSubmitting
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.send),
                  label: Text(t('reclamation.send')),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.farmLeaf,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ── Header avec retour ────────────────────────────────────────────────────

  Widget _backHeader(String title, ThemeData theme) => Padding(
    padding: const EdgeInsets.only(bottom: 20),
    child: Row(children: [
      GestureDetector(
        onTap: () => setState(() => _subPage = null),
        child: const Icon(Icons.arrow_back, size: 20),
      ),
      const SizedBox(width: 12),
      Text(title, style: theme.textTheme.headlineSmall),
    ]),
  );
}

// ── Hero Header (page profil) ─────────────────────────────────────────────────

class _ProfileHero extends StatelessWidget {
  final String ownerName, farmName, farmLocation, totalHa;
  final int parcelCount;
  final String parcellesLabel, hectaresLabel, alertsLabel;

  const _ProfileHero({
    required this.ownerName,
    required this.farmName,
    required this.farmLocation,
    required this.totalHa,
    required this.parcelCount,
    required this.parcellesLabel,
    required this.hectaresLabel,
    required this.alertsLabel,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
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
              Row(children: [
                Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.3), width: 2),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Image.asset('assets/images/agritech_logo.png',
                        width: 60, height: 60, fit: BoxFit.cover),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(ownerName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.5)),
                      const SizedBox(height: 2),
                      Text('$farmName • $farmLocation',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Colors.white70, fontSize: 13)),
                    ],
                  ),
                ),
              ]),
              const SizedBox(height: 22),
              Row(children: [
                _KpiPill(
                    value: '$parcelCount',
                    label: parcellesLabel,
                    icon: Icons.grid_view_rounded,
                    color: const Color(0xFFbbf7d0)),
                const SizedBox(width: 10),
                _KpiPill(
                    value: totalHa,
                    label: hectaresLabel,
                    icon: Icons.square_foot_rounded,
                    color: const Color(0xFFfef08a)),
                const SizedBox(width: 10),
                _KpiPill(
                    value: '0',
                    label: alertsLabel,
                    icon: Icons.notifications_active_rounded,
                    color: const Color(0xFFfecaca)),
              ]),
            ],
          ),
        ),
      ),
    );
  }
}

class _KpiPill extends StatelessWidget {
  final String value, label;
  final IconData icon;
  final Color color;
  const _KpiPill(
      {required this.value,
      required this.label,
      required this.icon,
      required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
        ),
        child: Row(children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
                color: color.withValues(alpha: 0.25),
                borderRadius: BorderRadius.circular(8)),
            child: Icon(icon, size: 14, color: color),
          ),
          const SizedBox(width: 8),
          Expanded(
              child:
                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(value,
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w800),
                overflow: TextOverflow.ellipsis),
            Text(label,
                style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.65), fontSize: 9),
                maxLines: 1,
                overflow: TextOverflow.ellipsis),
          ])),
        ]),
      ),
    );
  }
}

class _MenuItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final ThemeData theme;
  const _MenuItem(this.icon, this.label, this.onTap, this.theme);

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Padding(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
      child: Row(children: [
        Icon(icon, size: 20, color: theme.colorScheme.onSurface.withValues(alpha: 0.5)),
        const SizedBox(width: 12),
        Expanded(child: Text(label,
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: theme.colorScheme.onSurface))),
        Icon(Icons.chevron_right, size: 18, color: theme.colorScheme.onSurface.withValues(alpha: 0.3)),
      ]),
    ),
  );
}

class _ToggleRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;
  final ThemeData theme;
  const _ToggleRow(this.icon, this.label, this.value, this.onChanged, this.theme);

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: theme.colorScheme.surface,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: theme.colorScheme.outline),
    ),
    child: Row(children: [
      Icon(icon, size: 18),
      const SizedBox(width: 12),
      Expanded(child: Text(label, style: theme.textTheme.titleSmall)),
      Switch(value: value, onChanged: onChanged),
    ]),
  );
}

class _FieldRow extends StatelessWidget {
  final String label, value;
  final ValueChanged<String> onChanged;
  const _FieldRow(this.label, this.value, this.onChanged);

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: Theme.of(context).textTheme.labelMedium),
      const SizedBox(height: 4),
      TextFormField(initialValue: value, onChanged: onChanged),
    ],
  );
}

// ── Sélecteur de langue ───────────────────────────────────────────────────────

class _LangSelector extends ConsumerWidget {
  final ThemeData theme;
  final String Function(String) t;
  const _LangSelector({required this.theme, required this.t});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final current = ref.watch(languageProvider).lang;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.colorScheme.outline),
      ),
      child: Row(children: [
        const Icon(Icons.language, size: 18),
        const SizedBox(width: 12),
        Expanded(child: Text(t('profile.language'), style: theme.textTheme.titleSmall)),
        Row(children: [
          _LangBtn(label: t('profile.lang_fr'), active: current == Lang.fr,
              onTap: () => ref.read(languageProvider.notifier).setLang(Lang.fr), theme: theme),
          const SizedBox(width: 8),
          _LangBtn(label: t('profile.lang_ar'), active: current == Lang.ar,
              onTap: () => ref.read(languageProvider.notifier).setLang(Lang.ar), theme: theme),
        ]),
      ]),
    );
  }
}

class _LangBtn extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;
  final ThemeData theme;
  const _LangBtn({required this.label, required this.active, required this.onTap, required this.theme});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: active ? AppColors.farmLeaf : theme.colorScheme.secondary,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: active ? Colors.white : theme.colorScheme.onSurface.withValues(alpha: 0.6),
          )),
    ),
  );
}
