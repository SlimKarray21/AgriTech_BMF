import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uiearth_flutter/core/theme/app_colors.dart';
import 'package:uiearth_flutter/data/api/api_exception.dart';
import 'package:uiearth_flutter/data/api/auth_token_util.dart';
import 'package:uiearth_flutter/domain/providers/api_providers.dart';

class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key});
  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  /// login | signup | forgot | verify (OTP après inscription ou compte non vérifié)
  String _mode = 'login';
  bool _showPassword = false;
  bool _loading = false;
  final _emailC = TextEditingController();
  final _passwordC = TextEditingController();
  final _codeC = TextEditingController();
  String? _pendingUserId;

  Future<void> _submit() async {
    if (_mode == 'forgot') {
      setState(() => _loading = true);
      await Future<void>.delayed(const Duration(seconds: 1));
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Fonction « mot de passe oublié » : brancher l’API si disponible.')),
      );
      return;
    }

    final email = _emailC.text.trim();
    final password = _passwordC.text;
    if (email.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Renseignez email et mot de passe.')),
      );
      return;
    }

    setState(() => _loading = true);
    final api = ref.read(uiEarthApiProvider);
    final jwt = ref.read(userJwtProvider.notifier);

    try {
      final Map<String, dynamic>? res;
      if (_mode == 'signup') {
        final local = email.contains('@') ? email.split('@').first : email;
        res = await api.auth.register(<String, dynamic>{
          'firstName': local.isNotEmpty ? local : 'Utilisateur',
          'lastName': 'Utilisateur',
          'email': email,
          'phoneNumber': '',
          'password': password,
        });
      } else {
        res = await api.auth.login(<String, dynamic>{'email': email, 'password': password});
      }

      final token = extractAuthTokenFromJson(res);
      if (token == null) {
        if (!mounted) return;
        final uid = res?['userId']?.toString();
        if (uid != null && uid.isNotEmpty) {
          setState(() {
            _pendingUserId = uid;
            _mode = 'verify';
            _codeC.clear();
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Compte créé : entrez le code à 6 chiffres reçu par e-mail.'),
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Réponse serveur sans token : format attendu { "token", "userId" }.'),
            ),
          );
        }
        return;
      }

      await jwt.setToken(token);
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.statusCode == 403 && e.userId != null && e.userId!.isNotEmpty) {
        setState(() {
          _pendingUserId = e.userId;
          _mode = 'verify';
          _codeC.clear();
        });
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message)),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur réseau : $e')),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _verifySubmit() async {
    final uid = _pendingUserId;
    final code = _codeC.text.trim();
    if (uid == null || uid.isEmpty || code.length != 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Code invalide : entrez les 6 chiffres reçus par e-mail.')),
      );
      return;
    }
    setState(() => _loading = true);
    final api = ref.read(uiEarthApiProvider);
    final jwt = ref.read(userJwtProvider.notifier);
    try {
      final res = await api.auth.verifyEmail(<String, dynamic>{'userId': uid, 'code': code});
      final token = extractAuthTokenFromJson(res);
      if (token == null) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Réponse sans token après vérification.')),
        );
        return;
      }
      await jwt.setToken(token);
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur : $e')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resendOtp() async {
    final uid = _pendingUserId;
    if (uid == null || uid.isEmpty) return;
    setState(() => _loading = true);
    final api = ref.read(uiEarthApiProvider);
    try {
      await api.auth.resendCode(<String, dynamic>{'userId': uid});
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nouveau code envoyé (vérifiez la boîte mail / Mailpit).')),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur : $e')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _emailC.dispose();
    _passwordC.dispose();
    _codeC.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 430),
          child: Column(children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(24, 60, 24, 40),
              decoration: const BoxDecoration(
                gradient: AppColors.farmGradient,
                borderRadius: BorderRadius.vertical(bottom: Radius.circular(32)),
              ),
              child: Column(children: [
                Container(
                  width: 64, height: 64,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Icon(Icons.eco, size: 32, color: Colors.white),
                ),
                const SizedBox(height: 16),
                const Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Icon(Icons.eco, size: 24, color: Colors.white),
                  SizedBox(width: 8),
                  Text('Agritech', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Colors.white)),
                ]),
                const SizedBox(height: 4),
                Text('Agriculture intelligente', style: TextStyle(fontSize: 14, color: Colors.white.withValues(alpha: 0.7))),
              ]),
            ),

            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  if (_mode == 'forgot' || _mode == 'verify')
                    GestureDetector(
                      onTap: () => setState(() {
                        _pendingUserId = null;
                        _mode = 'login';
                      }),
                      child: Row(children: [
                        const Icon(Icons.arrow_back, size: 16, color: Colors.grey),
                        const SizedBox(width: 6),
                        Text('Retour', style: theme.textTheme.bodySmall),
                      ]),
                    ),
                  if (_mode == 'forgot' || _mode == 'verify') const SizedBox(height: 16),
                  Text(
                    _mode == 'login'
                        ? 'Connexion'
                        : _mode == 'signup'
                            ? 'Créer un compte'
                            : _mode == 'verify'
                                ? 'Vérification e-mail'
                                : 'Mot de passe oublié',
                    style: theme.textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _mode == 'login'
                        ? 'Accédez à votre exploitation'
                        : _mode == 'signup'
                            ? 'Rejoignez la plateforme Smart Farm'
                            : _mode == 'verify'
                                ? 'Code à 6 chiffres (Mailpit local : http://localhost:8025)'
                                : 'Entrez votre email pour recevoir un lien',
                    style: theme.textTheme.bodySmall,
                  ),
                  const SizedBox(height: 24),
                  if (_mode == 'verify') ...[
                    Text('Code de vérification', style: theme.textTheme.labelMedium),
                    const SizedBox(height: 4),
                    TextField(
                      controller: _codeC,
                      keyboardType: TextInputType.number,
                      maxLength: 6,
                      decoration: const InputDecoration(hintText: '123456', counterText: ''),
                    ),
                  ] else ...[
                    Text('Email', style: theme.textTheme.labelMedium),
                    const SizedBox(height: 4),
                    TextField(controller: _emailC, decoration: const InputDecoration(hintText: 'fermier@exemple.com'), keyboardType: TextInputType.emailAddress),
                    if (_mode != 'forgot') ...[
                      const SizedBox(height: 16),
                      Text('Mot de passe', style: theme.textTheme.labelMedium),
                      const SizedBox(height: 4),
                      TextField(
                        controller: _passwordC,
                        obscureText: !_showPassword,
                        decoration: InputDecoration(
                          hintText: '••••••••',
                          suffixIcon: GestureDetector(
                            onTap: () => setState(() => _showPassword = !_showPassword),
                            child: Icon(_showPassword ? Icons.visibility_off : Icons.visibility, size: 18, color: Colors.grey),
                          ),
                        ),
                      ),
                      if (_mode == 'signup')
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            'Min. 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre.',
                            style: theme.textTheme.labelSmall?.copyWith(color: Colors.grey),
                          ),
                        ),
                    ],
                  ],
                  if (_mode == 'login') ...[
                    const SizedBox(height: 8),
                    GestureDetector(
                      onTap: () => setState(() => _mode = 'forgot'),
                      child: Text('Mot de passe oublié ?', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.farmLeaf)),
                    ),
                  ],
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity, height: 48,
                    child: ElevatedButton(
                      onPressed: _loading
                          ? null
                          : (_mode == 'verify' ? _verifySubmit : _submit),
                      child: Text(
                        _loading
                            ? 'Chargement...'
                            : _mode == 'verify'
                                ? 'Valider le code'
                                : _mode == 'login'
                                    ? 'Se connecter'
                                    : _mode == 'signup'
                                        ? "S'inscrire"
                                        : 'Envoyer le lien',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                  if (_mode == 'verify') ...[
                    const SizedBox(height: 12),
                    Center(
                      child: TextButton(
                        onPressed: _loading ? null : _resendOtp,
                        child: const Text('Renvoyer le code'),
                      ),
                    ),
                  ],
                  const Spacer(),
                  if (_mode != 'forgot' && _mode != 'verify')
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: Wrap(
                          alignment: WrapAlignment.center,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          spacing: 4,
                          runSpacing: 4,
                          children: [
                            Text(
                              _mode == 'login' ? 'Pas encore de compte ?' : 'Déjà un compte ?',
                              style: theme.textTheme.bodySmall,
                              textAlign: TextAlign.center,
                            ),
                            GestureDetector(
                              onTap: () => setState(() => _mode = _mode == 'login' ? 'signup' : 'login'),
                              child: Text(
                                _mode == 'login' ? "S'inscrire" : 'Se connecter',
                                style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.farmLeaf),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ]),
              ),
            ),
          ]),
        ),
      ),
    );
  }
}
