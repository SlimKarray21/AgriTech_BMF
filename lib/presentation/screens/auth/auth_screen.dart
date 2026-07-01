import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uiearth_flutter/core/theme/app_colors.dart';
import 'package:uiearth_flutter/data/api/api_exception.dart';
import 'package:uiearth_flutter/data/api/auth_token_util.dart';
import 'package:uiearth_flutter/core/l10n/app_localizations.dart';
import 'package:uiearth_flutter/domain/providers/api_providers.dart';

class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key});
  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  String _mode = 'login';
  bool _showPassword = false;
  bool _showConfirmPassword = false;
  bool _loading = false;
  bool _logoDim = false;
  final _firstNameC = TextEditingController();
  final _lastNameC = TextEditingController();
  final _emailC = TextEditingController();
  final _birthDateC = TextEditingController();
  final _phoneC = TextEditingController();
  final _passwordC = TextEditingController();
  final _confirmPasswordC = TextEditingController();
  final _codeC = TextEditingController();
  String? _pendingUserId;
  int _otpLength = 6;
  int _otpExpiresInMinutes = 10;

  void _applyOtpMetadata(Map<String, dynamic>? payload) {
    final len = payload?['otpLength'];
    final exp = payload?['expiresInMinutes'];
    if (len is int && len >= 4 && len <= 8) {
      _otpLength = len;
    }
    if (exp is int && exp > 0) {
      _otpExpiresInMinutes = exp;
    }
  }

  Future<void> _pickBirthDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      firstDate: DateTime(1900),
      lastDate: now,
      initialDate: DateTime(now.year - 20, now.month, now.day),
    );
    if (picked == null) return;
    final mm = picked.month.toString().padLeft(2, '0');
    final dd = picked.day.toString().padLeft(2, '0');
    _birthDateC.text = '${picked.year}-$mm-$dd';
  }

  void _setLoading(bool value) {
    if (!mounted) return;
    setState(() {
      _loading = value;
      _logoDim = value;
    });
  }

  Future<void> _submit() async {
    if (_mode == 'forgot') {
      final fEmail = _emailC.text.trim();
      final fPassword = _passwordC.text;
      final fConfirm = _confirmPasswordC.text;
      if (fEmail.isEmpty || fPassword.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Renseignez votre email et un nouveau mot de passe.')),
        );
        return;
      }
      if (fPassword != fConfirm) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Les mots de passe ne correspondent pas.')),
        );
        return;
      }
      _setLoading(true);
      final api = ref.read(uiEarthApiProvider);
      try {
        await api.auth.resetPassword(<String, dynamic>{'email': fEmail, 'newPassword': fPassword});
        if (!mounted) return;
        setState(() {
          _mode = 'login';
          _passwordC.clear();
          _confirmPasswordC.clear();
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Mot de passe réinitialisé. Connectez-vous avec le nouveau.')),
        );
      } on ApiException catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur réseau : $e')));
      } finally {
        _setLoading(false);
      }
      return;
    }

    final email = _emailC.text.trim();
    final password = _passwordC.text;

    if (_mode == 'signup') {
      final firstName = _firstNameC.text.trim();
      final lastName = _lastNameC.text.trim();
      final birthDate = _birthDateC.text.trim();
      final phone = _phoneC.text.trim();
      final confirmPassword = _confirmPasswordC.text;

      final missingField = <String, String>{
        'Nom': lastName,
        'Prénom': firstName,
        'Email': email,
        'Date Naissance': birthDate,
        'Phone': phone,
        'Mot de passe': password,
        'Vérifier mot de passe': confirmPassword,
      }.entries.where((entry) => entry.value.isEmpty).map((entry) => entry.key).firstOrNull;

      if (missingField != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Champ obligatoire non rempli : $missingField.')),
        );
        return;
      }

      if (password != confirmPassword) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Les mots de passe ne correspondent pas.')),
        );
        return;
      }
    } else {
      if (email.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Champ obligatoire non rempli : Email.')),
        );
        return;
      }
      if (password.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Champ obligatoire non rempli : Mot de passe.')),
        );
        return;
      }
    }

    _setLoading(true);
    final api = ref.read(uiEarthApiProvider);
    final jwt = ref.read(userJwtProvider.notifier);

    try {
      final Map<String, dynamic>? res;
      if (_mode == 'signup') {
        res = await api.auth.register(<String, dynamic>{
          'firstName': _firstNameC.text.trim(),
          'lastName': _lastNameC.text.trim(),
          'email': email,
          'phoneNumber': _phoneC.text.trim(),
          'password': password,
        });
      } else {
        res = await api.auth.login(<String, dynamic>{'email': email, 'password': password});
      }

      if (_mode == 'signup') {
        // OTP désactivé côté backend : le compte est actif immédiatement.
        // On connecte donc l'utilisateur automatiquement (aucune étape « code »).
        final loginRes = await api.auth.login(<String, dynamic>{'email': email, 'password': password});
        final loginToken = extractAuthTokenFromJson(loginRes);
        if (loginToken != null) {
          await jwt.setToken(loginToken);
          return;
        }
        if (!mounted) return;
        setState(() {
          _mode = 'login';
          _passwordC.clear();
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Compte créé. Connectez-vous avec votre email et mot de passe.')),
        );
        return;
      }

      final token = extractAuthTokenFromJson(res);
      if (token == null) {
        if (!mounted) return;
        final uid = res?['userId']?.toString();
        _applyOtpMetadata(res);
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
        if (e.otpLength != null && e.otpLength! >= 4 && e.otpLength! <= 8) {
          _otpLength = e.otpLength!;
        }
        if (e.expiresInMinutes != null && e.expiresInMinutes! > 0) {
          _otpExpiresInMinutes = e.expiresInMinutes!;
        }
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
      _setLoading(false);
    }
  }

  Future<void> _verifySubmit() async {
    final uid = _pendingUserId;
    final code = _codeC.text.trim();
    if (uid == null || uid.isEmpty || code.length != _otpLength) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Code invalide : entrez les $_otpLength chiffres recus par e-mail.')),
      );
      return;
    }
    _setLoading(true);
    final api = ref.read(uiEarthApiProvider);
    final jwt = ref.read(userJwtProvider.notifier);
    try {
      final res = await api.auth.verifyEmail(<String, dynamic>{'userId': uid, 'code': code});
      _applyOtpMetadata(res);
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
      _setLoading(false);
    }
  }

  Future<void> _resendOtp() async {
    final uid = _pendingUserId;
    if (uid == null || uid.isEmpty) return;
    _setLoading(true);
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
      _setLoading(false);
    }
  }

  @override
  void dispose() {
    _firstNameC.dispose();
    _lastNameC.dispose();
    _emailC.dispose();
    _birthDateC.dispose();
    _phoneC.dispose();
    _passwordC.dispose();
    _confirmPasswordC.dispose();
    _codeC.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final langState = ref.watch(languageProvider);
    final t = langState.t;
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
                AnimatedOpacity(
                  opacity: _loading && _logoDim ? 0.25 : 1,
                  duration: const Duration(milliseconds: 450),
                  onEnd: () {
                    if (!mounted || !_loading) return;
                    setState(() {
                      _logoDim = !_logoDim;
                    });
                  },
                  child: Column(
                    children: [
                      Image.asset(
                        'assets/images/tesla_logo.png',
                        height: 90,
                        fit: BoxFit.contain,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 4),
                const SizedBox(height: 8),
                Text(t('profile.partner'), style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.75))),
              ]),
            ),

            Expanded(
              child: SingleChildScrollView(
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
                    _mode == 'login'  ? t('auth.login')  :
                    _mode == 'signup' ? t('auth.signup') :
                    _mode == 'verify' ? t('auth.verify') : t('auth.forgot'),
                    style: theme.textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _mode == 'login'  ? t('auth.login_desc')  :
                    _mode == 'signup' ? t('auth.signup_desc') :
                    _mode == 'verify' ? '${t('auth.verify_desc')} ($_otpLength chiffres) - expiration: $_otpExpiresInMinutes min' :
                                        t('auth.forgot_desc'),
                    style: theme.textTheme.bodySmall,
                  ),
                  const SizedBox(height: 24),
                  if (_mode == 'verify') ...[
                    Text('Code de vérification', style: theme.textTheme.labelMedium),
                    const SizedBox(height: 4),
                    TextField(
                      controller: _codeC,
                      keyboardType: TextInputType.number,
                      maxLength: _otpLength,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      textAlign: TextAlign.center,
                      style: theme.textTheme.headlineSmall?.copyWith(
                        letterSpacing: 8,
                        fontWeight: FontWeight.w700,
                      ),
                      decoration: InputDecoration(
                        counterText: '',
                        hintText: List.filled(_otpLength, '0').join(),
                        filled: true,
                        fillColor: AppColors.lightSecondary.withValues(alpha: 0.35),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(color: AppColors.farmLeaf.withValues(alpha: 0.5)),
                        ),
                      ),
                    ),
                  ] else ...[
                    if (_mode == 'signup') ...[
                      Text(t('auth.last_name'), style: theme.textTheme.labelMedium),
                      const SizedBox(height: 4),
                      TextField(
                        controller: _lastNameC,
                        textInputAction: TextInputAction.next,
                        decoration: const InputDecoration(),
                      ),
                      const SizedBox(height: 16),
                      Text(t('auth.first_name'), style: theme.textTheme.labelMedium),
                      const SizedBox(height: 4),
                      TextField(
                        controller: _firstNameC,
                        textInputAction: TextInputAction.next,
                        decoration: const InputDecoration(),
                      ),
                      const SizedBox(height: 16),
                    ],
                    Text(t('auth.email'), style: theme.textTheme.labelMedium),
                    const SizedBox(height: 4),
                    TextField(controller: _emailC, decoration: const InputDecoration(), keyboardType: TextInputType.emailAddress),
                    if (_mode == 'signup') ...[
                      const SizedBox(height: 16),
                      Text(t('auth.birthdate'), style: theme.textTheme.labelMedium),
                      const SizedBox(height: 4),
                      TextField(
                        controller: _birthDateC,
                        readOnly: true,
                        onTap: _pickBirthDate,
                        decoration: const InputDecoration(
                          suffixIcon: Icon(Icons.calendar_today_outlined, size: 18),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(t('auth.phone'), style: theme.textTheme.labelMedium),
                      const SizedBox(height: 4),
                      TextField(
                        controller: _phoneC,
                        keyboardType: TextInputType.phone,
                        textInputAction: TextInputAction.next,
                        decoration: const InputDecoration(),
                      ),
                    ],
                    if (_mode != 'verify') ...[
                      const SizedBox(height: 16),
                      Text(
                        _mode == 'forgot' ? 'Nouveau mot de passe' : t('auth.password'),
                        style: theme.textTheme.labelMedium,
                      ),
                      const SizedBox(height: 4),
                      TextField(
                        controller: _passwordC,
                        obscureText: !_showPassword,
                        decoration: InputDecoration(
                          suffixIcon: GestureDetector(
                            onTap: () => setState(() => _showPassword = !_showPassword),
                            child: Icon(_showPassword ? Icons.visibility_off : Icons.visibility, size: 18, color: Colors.grey),
                          ),
                        ),
                      ),
                      if (_mode == 'forgot') ...[
                        const SizedBox(height: 16),
                        Text(t('auth.confirm_password'), style: theme.textTheme.labelMedium),
                        const SizedBox(height: 4),
                        TextField(
                          controller: _confirmPasswordC,
                          obscureText: !_showConfirmPassword,
                          decoration: InputDecoration(
                            suffixIcon: GestureDetector(
                              onTap: () => setState(() => _showConfirmPassword = !_showConfirmPassword),
                              child: Icon(_showConfirmPassword ? Icons.visibility_off : Icons.visibility, size: 18, color: Colors.grey),
                            ),
                          ),
                        ),
                      ],
                      if (_mode == 'signup') ...[
                        const SizedBox(height: 16),
                        Text(t('auth.confirm_password'), style: theme.textTheme.labelMedium),
                        const SizedBox(height: 4),
                        TextField(
                          controller: _confirmPasswordC,
                          obscureText: !_showConfirmPassword,
                          decoration: InputDecoration(
                            suffixIcon: GestureDetector(
                              onTap: () => setState(() => _showConfirmPassword = !_showConfirmPassword),
                              child: Icon(_showConfirmPassword ? Icons.visibility_off : Icons.visibility, size: 18, color: Colors.grey),
                            ),
                          ),
                        ),
                      ],
                      if (_mode == 'signup')
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            t('auth.password_hint'),
                            style: theme.textTheme.labelSmall?.copyWith(color: Colors.grey),
                          ),
                        ),
                    ],
                  ],
                  if (_mode == 'login') ...[
                    const SizedBox(height: 8),
                    GestureDetector(
                      onTap: () => setState(() => _mode = 'forgot'),
                      child: Text('${t('auth.forgot')} ?', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.farmLeaf)),
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
                        _loading           ? t('auth.loading')       :
                        _mode == 'verify'  ? t('auth.submit_verify') :
                        _mode == 'login'   ? t('auth.submit_login')  :
                        _mode == 'signup'  ? t('auth.submit_signup') :
                                             t('auth.submit_forgot'),
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
                  const SizedBox(height: 24),
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
                              _mode == 'login' ? t('auth.no_account') : t('auth.has_account'),
                              style: theme.textTheme.bodySmall,
                              textAlign: TextAlign.center,
                            ),
                            GestureDetector(
                              onTap: () => setState(() => _mode = _mode == 'login' ? 'signup' : 'login'),
                              child: Text(
                                _mode == 'login' ? t('auth.submit_signup') : t('auth.submit_login'),
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
