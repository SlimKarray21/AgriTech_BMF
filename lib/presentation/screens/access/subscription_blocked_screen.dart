import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uiearth_flutter/core/l10n/app_localizations.dart';
import 'package:uiearth_flutter/core/theme/app_colors.dart';
import 'package:uiearth_flutter/domain/providers/api_providers.dart';

/// Écran affiché lorsqu'un utilisateur authentifié n'a pas d'abonnement valide.
/// Il bloque l'accès à l'application et invite à contacter le support.
class SubscriptionBlockedScreen extends ConsumerWidget {
  const SubscriptionBlockedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final t = ref.watch(languageProvider).t;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.farmLeaf.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.workspace_premium_outlined,
                      size: 56, color: AppColors.farmLeaf),
                ),
                const SizedBox(height: 24),
                Text(
                  t('access.expired_title'),
                  style: theme.textTheme.headlineSmall,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                Text(
                  t('access.expired_message'),
                  style: theme.textTheme.bodyMedium
                      ?.copyWith(color: theme.hintColor),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: () =>
                        ref.read(userJwtProvider.notifier).setToken(null),
                    icon: const Icon(Icons.logout, size: 18),
                    label: Text(t('access.logout')),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
