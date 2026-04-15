import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uiearth_flutter/core/l10n/app_localizations.dart';
import 'package:uiearth_flutter/core/theme/app_colors.dart';

class PlantHealthScreen extends ConsumerStatefulWidget {
  const PlantHealthScreen({super.key});

  @override
  ConsumerState<PlantHealthScreen> createState() => _PlantHealthScreenState();
}

class _PlantHealthScreenState extends ConsumerState<PlantHealthScreen> {
  bool _hasImage = false;
  bool _isAnalyzing = false;
  Map<String, dynamic>? _diagnostic;

  void _simulateAnalysis() {
    setState(() {
      _hasImage = true;
      _isAnalyzing = true;
      _diagnostic = null;
    });
    Future.delayed(const Duration(milliseconds: 2500), () {
      if (!mounted) return;
      setState(() {
        _isAnalyzing = false;
        _diagnostic = {
          'plantName': 'Tomate cerise',
          'healthScore': 45,
          'problems': [
            {'name': 'Mildiou', 'severity': 'élevé', 'description': 'Taches brunâtres sur les feuilles inférieures. Champignon favorisé par l\'humidité.'},
            {'name': 'Carence en azote', 'severity': 'moyen', 'description': 'Jaunissement des feuilles basses, croissance ralentie.'},
          ],
          'recommendations': [
            'Appliquer un fongicide à base de cuivre',
            'Améliorer la ventilation entre les plants',
            'Apporter un engrais azoté organique',
            'Retirer les feuilles les plus atteintes',
          ],
        };
      });
    });
  }

  void _reset() {
    setState(() {
      _hasImage = false;
      _isAnalyzing = false;
      _diagnostic = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final langState = ref.watch(languageProvider);
    final theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
      children: [
        Row(children: [
          const Icon(Icons.eco, size: 22, color: AppColors.farmLeaf),
          const SizedBox(width: 8),
          Text(langState.t('health.title'), style: theme.textTheme.headlineMedium),
        ]),
        const SizedBox(height: 4),
        Text(langState.t('health.subtitle'), style: theme.textTheme.bodySmall),
        const SizedBox(height: 20),

        if (!_hasImage) ...[
          // Upload zone
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: theme.colorScheme.secondary,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: theme.colorScheme.outline, style: BorderStyle.solid, width: 2),
            ),
            child: Column(
              children: [
                Icon(Icons.camera_alt_outlined, size: 48, color: theme.colorScheme.onSurface.withValues(alpha: 0.3)),
                const SizedBox(height: 16),
                Text(langState.t('health.photo_title'), style: theme.textTheme.titleMedium),
                const SizedBox(height: 4),
                Text(langState.t('health.photo_subtitle'), style: theme.textTheme.bodySmall, textAlign: TextAlign.center),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    ElevatedButton.icon(
                      onPressed: _simulateAnalysis,
                      icon: const Icon(Icons.camera_alt, size: 16),
                      label: Text(langState.t('health.camera')),
                    ),
                    const SizedBox(width: 12),
                    OutlinedButton.icon(
                      onPressed: _simulateAnalysis,
                      icon: const Icon(Icons.photo_library_outlined, size: 16),
                      label: Text(langState.t('health.gallery')),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // How it works
          Text(langState.t('health.how'), style: theme.textTheme.titleMedium),
          const SizedBox(height: 12),
          ...[
            {'step': '1', 'text': langState.t('health.step1')},
            {'step': '2', 'text': langState.t('health.step2')},
            {'step': '3', 'text': langState.t('health.step3')},
          ].map((item) => Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: theme.colorScheme.outline),
                ),
                child: Row(children: [
                  Container(
                    width: 32, height: 32,
                    decoration: BoxDecoration(
                      color: AppColors.farmLeaf.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(item['step']!, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.farmLeaf)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Text(item['text']!, style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w500, color: theme.colorScheme.onSurface))),
                ]),
              )),
        ] else ...[
          // Image preview
          Container(
            height: 192,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              color: AppColors.farmLeaf.withValues(alpha: 0.1),
              image: const DecorationImage(
                image: AssetImage('assets/images/agritech_logo.png'),
                fit: BoxFit.contain,
              ),
            ),
            child: _isAnalyzing
                ? Container(
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surface.withValues(alpha: 0.8),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const CircularProgressIndicator(color: AppColors.farmLeaf),
                        const SizedBox(height: 12),
                        Text(langState.t('health.analyzing'), style: theme.textTheme.titleSmall),
                        Text(langState.t('health.detecting'), style: theme.textTheme.bodySmall),
                      ],
                    ),
                  )
                : null,
          ),
          const SizedBox(height: 12),
          OutlinedButton(
            onPressed: _reset,
            child: Text(langState.t('health.new_analysis')),
          ),
          const SizedBox(height: 16),
        ],

        if (_diagnostic != null) ...[
          // Health score card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: theme.colorScheme.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: theme.colorScheme.outline),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(_diagnostic!['plantName'], style: theme.textTheme.titleMedium),
                    Row(children: [
                      Icon(
                        _diagnostic!['healthScore'] >= 70 ? Icons.check_circle : Icons.warning_amber,
                        size: 16,
                        color: _diagnostic!['healthScore'] >= 70 ? AppColors.farmLeaf : AppColors.farmDanger,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${_diagnostic!['healthScore']}%',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: _diagnostic!['healthScore'] >= 70
                              ? AppColors.farmLeaf
                              : _diagnostic!['healthScore'] >= 50
                                  ? AppColors.farmSun
                                  : AppColors.farmDanger,
                        ),
                      ),
                    ]),
                  ],
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: _diagnostic!['healthScore'] / 100,
                    minHeight: 6,
                    backgroundColor: theme.colorScheme.secondary,
                    valueColor: AlwaysStoppedAnimation(
                      _diagnostic!['healthScore'] >= 70
                          ? AppColors.farmLeaf
                          : _diagnostic!['healthScore'] >= 50
                              ? AppColors.farmSun
                              : AppColors.farmDanger,
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(langState.t('health.score'), style: theme.textTheme.labelSmall),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Problems
          Row(children: [
            const Icon(Icons.warning_amber, size: 14, color: AppColors.farmDanger),
            const SizedBox(width: 8),
            Text(langState.t('health.problems'), style: theme.textTheme.titleSmall),
          ]),
          const SizedBox(height: 8),
          ...(_diagnostic!['problems'] as List).map((prob) {
            final sevColor = prob['severity'] == 'élevé'
                ? AppColors.farmDanger
                : prob['severity'] == 'moyen'
                    ? Colors.orange
                    : AppColors.farmSun;
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: theme.colorScheme.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: theme.colorScheme.outline),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(prob['name'], style: theme.textTheme.titleSmall),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: sevColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: sevColor.withValues(alpha: 0.3)),
                        ),
                        child: Text(prob['severity'], style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: sevColor)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(prob['description'], style: theme.textTheme.bodySmall),
                ],
              ),
            );
          }),
          const Divider(height: 24),

          // Recommendations
          Row(children: [
            const Icon(Icons.check_circle, size: 14, color: AppColors.farmLeaf),
            const SizedBox(width: 8),
            Text(langState.t('health.recommendations'), style: theme.textTheme.titleSmall),
          ]),
          const SizedBox(height: 8),
          ...(_diagnostic!['recommendations'] as List).asMap().entries.map((e) => Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: theme.colorScheme.secondary,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${e.key + 1}.', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.farmLeaf)),
                    const SizedBox(width: 8),
                    Expanded(child: Text(e.value, style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w500, color: theme.colorScheme.onSurface))),
                  ],
                ),
              )),
        ],
      ],
    );
  }
}
