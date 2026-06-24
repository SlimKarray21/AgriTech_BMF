import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_providers.dart';

/// Pages mobiles toujours accessibles, quel que soit l'abonnement de l'utilisateur.
const Set<String> kAlwaysAllowedPages = {'meteo', 'profil'};

/// Catalogue des fonctionnalités gateables par page (clés `page.fonction`).
/// Doit rester aligné avec l'arbre du sélecteur côté admin (FinancePage.tsx).
const Map<String, List<String>> kPageFeatures = {
  'accueil': [
    'accueil.ia',           // Assistant IA (chatbot)
    'accueil.add_rapport',  // Bouton "Rapports"
    'accueil.add_parcelle', // Bouton "+ Parcelle"
  ],
  'parcelles': [
    'parcelles.add_rapport',     // Bouton "Rapports"
    'parcelles.climat',          // Section données climat
    'parcelles.sol',             // Données du sol (capteur)
    'parcelles.controle_vanne',  // Contrôle des électrovannes
  ],
};

/// Droits d'accès de l'utilisateur connecté, dérivés de son abonnement.
class UserAccess {
  /// `true` si l'utilisateur possède un abonnement non expiré.
  final bool aboValid;

  /// Clés des pages mobiles autorisées (pages du plan + [kAlwaysAllowedPages]).
  final Set<String> allowedPages;

  final String? aboType;
  final DateTime? aboEnd;

  const UserAccess({
    required this.aboValid,
    required this.allowedPages,
    this.aboType,
    this.aboEnd,
  });

  /// La page [pageKey] est-elle accessible (onglet visible) ?
  bool canPage(String pageKey) =>
      kAlwaysAllowedPages.contains(pageKey) || allowedPages.contains(pageKey);

  /// La fonctionnalité [featureKey] de [pageKey] est-elle visible ?
  ///
  /// Repli de compatibilité : si la page est accordée mais qu'AUCUNE de ses
  /// fonctionnalités n'est explicitement listée, toutes sont visibles
  /// (les anciens plans « page entière » continuent de tout afficher).
  bool canFeature(String pageKey, String featureKey) {
    if (!canPage(pageKey)) return false;
    final feats = kPageFeatures[pageKey] ?? const <String>[];
    final anyListed = feats.any(allowedPages.contains);
    if (!anyListed) return true;
    return allowedPages.contains(featureKey);
  }
}

/// Accès courant, sous forme synchrone, pour les écrans.
/// Avant chargement (rare : la garde du login a déjà résolu l'abonnement),
/// on reste permissif sur les pages toujours autorisées.
final accessProvider = Provider<UserAccess>((ref) {
  return ref.watch(userAccessProvider).valueOrNull ??
      const UserAccess(aboValid: true, allowedPages: kAlwaysAllowedPages);
});

DateTime? _parseDate(String? s) {
  if (s == null || s.isEmpty) return null;
  return DateTime.tryParse(s);
}

/// Charge le profil de l'utilisateur connecté et en déduit ses droits d'accès.
///
/// Se recharge automatiquement à chaque changement de token (connexion /
/// déconnexion). Sert à :
///  - bloquer l'accès à l'app quand l'abonnement est expiré/absent ;
///  - filtrer les pages visibles selon le plan souscrit.
final userAccessProvider = FutureProvider<UserAccess>((ref) async {
  // Recharger quand le token change (login / logout).
  final token = ref.watch(userJwtProvider);
  if (token == null || token.isEmpty) {
    return const UserAccess(aboValid: false, allowedPages: kAlwaysAllowedPages);
  }

  final api = ref.watch(uiEarthApiProvider);
  final profile = await api.user.getProfile();

  final aboType = profile?['typeAbo']?.toString();
  final aboEnd = _parseDate(profile?['dateExpAbo']?.toString());

  // Abonnement valide : un type est renseigné et la date d'expiration
  // (comparée en jour calendaire) n'est pas dépassée.
  final now = DateTime.now();
  final todayDateOnly = DateTime(now.year, now.month, now.day);
  final aboValid = aboType != null &&
      aboType.isNotEmpty &&
      aboEnd != null &&
      !aboEnd.isBefore(todayDateOnly);

  // Pages déverrouillées par le plan, fusionnées avec celles toujours autorisées.
  final raw = profile?['pageAccess'];
  final planPages = <String>{};
  if (raw is List) {
    for (final e in raw) {
      final s = e?.toString();
      if (s != null && s.isNotEmpty) planPages.add(s);
    }
  }

  return UserAccess(
    aboValid: aboValid,
    allowedPages: {...planPages, ...kAlwaysAllowedPages},
    aboType: aboType,
    aboEnd: aboEnd,
  );
});
