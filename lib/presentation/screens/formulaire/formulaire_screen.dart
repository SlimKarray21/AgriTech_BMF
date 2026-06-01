import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:provider/provider.dart' as p;
import 'package:uiearth_flutter/core/l10n/app_localizations.dart';
import 'package:uiearth_flutter/core/theme/app_colors.dart';
import 'package:uiearth_flutter/data/api/api_exception.dart';
import 'package:uiearth_flutter/data/models/parcelle.dart';
import 'package:uiearth_flutter/domain/providers/api_providers.dart';
import 'package:uiearth_flutter/domain/providers/parcelle_provider.dart';
import 'package:uiearth_flutter/domain/providers/valve_provider.dart';

class FormulaireScreen extends ConsumerStatefulWidget {
  const FormulaireScreen({super.key});

  @override
  ConsumerState<FormulaireScreen> createState() => _FormulaireScreenState();
}

class _FormulaireScreenState extends ConsumerState<FormulaireScreen> {
  int _step = 0;
  bool _isSaving = false;

  final _nameCtrl = TextEditingController();
  final _areaCtrl = TextEditingController();
  final String _country = 'Tunisie';
  final _gouvernoratCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();

  static const Map<String, List<String>> _tunisiaGovernoratesCities = {
    'Ariana': ['Ariana Ville', 'Raoued', 'Soukra', 'Kalaat Landalous', 'Mnihla', 'Ettadhamen'],
    'Béja': ['Béja', 'Amdoun', 'Testour', 'Medjez El Bab', 'Nefza', 'Teboursouk'],
    'Ben Arous': ['Ben Arous', 'Hammam Lif', 'Hammam Chott', 'Ezzahra', 'Fouchana', 'Mornag', 'Rades', 'Boumhel'],
    'Bizerte': ['Bizerte', 'Menzel Bourguiba', 'Mateur', 'Ras Jebel', 'Sejnane', 'Ghar El Melh', 'Tinja'],
    'Gabès': ['Gabès Ville', 'Ghannouch', 'Matmata', 'Mareth', 'El Hamma', 'Métouia'],
    'Gafsa': ['Gafsa', 'Métlaoui', 'Redeyef', 'Moularès', 'Sened', 'El Ksar'],
    'Jendouba': ['Jendouba', 'Tabarka', 'Aïn Draham', 'Fernana', 'Ghardimaou', 'Bou Salem'],
    'Kairouan': ['Kairouan', 'Chebika', 'Sbikha', 'Haffouz', 'Oueslatia', 'Nasrallah'],
    'Kasserine': ['Kasserine', 'Sbeitla', 'Foussana', 'Thala', 'Feriana', 'Sbiba'],
    'Kébili': ['Kébili', 'Douz', 'Souk Lahad', 'El Faouar'],
    'Kef': ['Le Kef', 'Tajerouine', 'Dahmani', 'Sakiet Sidi Youssef', 'Kalaat Senan'],
    'Mahdia': ['Mahdia', 'Ksour Essef', 'Chebba', 'El Jem', 'Melloulèche', 'Boumerdès'],
    'Manouba': ['Manouba', 'Oued Ellil', 'Tebourba', 'Borj El Amri', 'Douar Hicher'],
    'Médenine': ['Médenine', 'Djerba Midoun', 'Djerba Houmt Souk', 'Zarzis', 'Ben Guerdane', 'Ajim'],
    'Monastir': ['Monastir', 'Moknine', 'Ksibet El Mediouni', 'Jemmal', 'Bekalta', 'Ksar Hellal', 'Teboulba'],
    'Nabeul': ['Nabeul', 'Hammamet', 'Dar Chaabane', 'Kelibia', 'Korba', 'Menzel Temime', 'Soliman'],
    'Sfax': ['Sfax Ville', 'Sakiet Ezzit', 'Sakiet Eddaier', 'Agareb', 'Menzel Chaker', 'El Amra', 'Jebeniana', 'Mahres', 'Kerkennah', 'Thyna', 'Bir Ali Ben Khalifa', 'Skhira'],
    'Sidi Bouzid': ['Sidi Bouzid', 'Meknassy', 'Regueb', 'Menzel Bouzaiane', 'Bir El Hafey', 'Cebbala'],
    'Siliana': ['Siliana', 'Gaafour', 'Bouarada', 'El Krib', 'Makthar'],
    'Sousse': ['Sousse Ville', 'Hammam Sousse', 'Kalaa Kebira', 'Kalaa Seghira', 'Msaken', 'Akouda', 'Enfidha', 'Sidi Bou Ali'],
    'Tataouine': ['Tataouine', 'Remada', 'Bir Lahmar', 'Dehiba', 'Ghomrassen'],
    'Tozeur': ['Tozeur', 'Nefta', 'Degache', 'Tameghza'],
    'Tunis': ['Tunis Centre Ville', 'La Marsa', 'Le Bardo', 'Carthage', 'La Goulette', 'El Omrane', 'Bab Bhar', 'Bab Souika', 'Sidi El Béchir'],
    'Zaghouan': ['Zaghouan', 'Zriba', 'Bir Mcherga', 'El Fahs', 'Nadhour'],
  };

  static const Map<String, List<String>> _plantTypesByCategory = {
    'Cultures maraichères': [
      'Tomate',
      'Piment',
      'Pomme de terre',
      'Oignon',
      'Ail',
      'Carotte',
      'Laitue',
      'Courgette',
      'Aubergine',
      'Concombre',
    ],
    'Arbres fruitiers': [
      'Olivier',
      'Oranger',
      'Citronnier',
      'Mandarinier',
      'Pommier',
      'Poirier',
      'Pêcher',
      'Abricotier',
      'Grenadier',
      'Figuier',
    ],
    'Grandes cultures': ['Blé', 'Orge', 'Avoine', 'Maïs', 'Sorgho'],
    'Légumineuses': ['Pois chiche', 'Lentille', 'Fève', 'Haricot'],
    'Cultures spéciales': ['Palmier dattier', 'Vigne', 'Pastèque', 'Melon', 'Fraisier'],
  };

  int _nbPlants = 1;
  final List<Map<String, TextEditingController>> _plants = [
    {
      'name': TextEditingController(),
      'category': TextEditingController(),
      'type': TextEditingController(),
      'age': TextEditingController(text: '1'),
      'count': TextEditingController(text: '100'),
    },
  ];

  int _nbVannes = 1;
  final List<Map<String, TextEditingController>> _vannes = [
    {
      'name': TextEditingController(text: 'Vanne 1'),
      'nbPlants': TextEditingController(text: '100'),
      'debit': TextEditingController(text: '2.0'),
    },
  ];

  void _updatePlantCount(int count) {
    setState(() {
      _nbPlants = count;
      while (_plants.length < count) {
        _plants.add({
          'name': TextEditingController(),
          'category': TextEditingController(),
          'type': TextEditingController(),
          'age': TextEditingController(text: '1'),
          'count': TextEditingController(text: '50'),
        });
      }
      while (_plants.length > count) {
        final removed = _plants.removeLast();
        for (final c in removed.values) {
          c.dispose();
        }
      }
    });
  }

  void _updateVanneCount(int count) {
    setState(() {
      _nbVannes = count;
      while (_vannes.length < count) {
        _vannes.add({
          'name': TextEditingController(text: 'Vanne ${_vannes.length + 1}'),
          'nbPlants': TextEditingController(text: '50'),
          'debit': TextEditingController(text: '2.0'),
        });
      }
      while (_vannes.length > count) {
        _vannes.removeLast();
      }
    });
  }

  String? _findCategoryForType(String type) {
    if (type.isEmpty) return null;
    for (final entry in _plantTypesByCategory.entries) {
      if (entry.value.contains(type)) {
        return entry.key;
      }
    }
    return null;
  }

  Future<void> _save() async {
    if (_isSaving) return;
    final langState = ref.read(languageProvider);
    final name = _nameCtrl.text.trim();
    final area = _areaCtrl.text.trim();

    if (name.isEmpty || area.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(langState.t('form.fill_required')),
          backgroundColor: AppColors.farmDanger,
        ),
      );
      return;
    }

    final normalizedArea = area.replaceAll(',', '.').replaceAll(RegExp(r'[^0-9.]'), '');
    final areaHa = double.tryParse(normalizedArea);
    if (areaHa == null || areaHa <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Surface invalide. Entrez un nombre > 0 (ex: 1.5).'),
          backgroundColor: AppColors.farmDanger,
        ),
      );
      return;
    }

    final plants = _plants.map((p) => PlantInfo(
          name: p['name']!.text.isEmpty ? 'Plante' : p['name']!.text,
          type: p['type']!.text.isEmpty ? 'autre' : p['type']!.text,
          age: int.tryParse(p['age']!.text) ?? 1,
          count: int.tryParse(p['count']!.text) ?? 100,
          waterNeedPerPlant:
              getWaterNeed(int.tryParse(p['age']!.text) ?? 1).toDouble(),
        )).toList();

    final vannes = _vannes.map((v) => Vanne(
          name: v['name']!.text,
          isOpen: false,
          debit: double.tryParse(v['debit']!.text) ?? 0,
          lastAction: 'Créée à l\'instant',
          nbPlants: int.tryParse(v['nbPlants']!.text) ?? 50,
        )).toList();

    final id = DateTime.now().millisecondsSinceEpoch.toString();
    final parcelle = ParcelleData(
      id: id,
      name: name,
      culture: plants.first.name,
      status: 'non connecté',
      area: '$area ha',
      plants: plants,
      vannes: vannes,
    );

    final api = ref.read(uiEarthApiProvider);
    ParcelleData savedParcelle = parcelle;
    setState(() => _isSaving = true);
    try {
      final created = await api.capteurSol.createWizardParcelle({
        'nomSurface': name,
        'localisation':
            '${_cityCtrl.text.trim()}, ${_gouvernoratCtrl.text.trim()}, $_country',
        'typeSol': 'standard',
        'tailleHa': areaHa,
        'plants': plants
            .map((p) => {
                  'name': p.name,
                  'type': p.type,
                  'age': p.age,
                  'count': p.count,
                  'waterNeedPerPlant': p.waterNeedPerPlant,
                })
            .toList(),
        'vannes': vannes
            .map((v) => {
                  'name': v.name,
                  'nbPlants': v.nbPlants,
                  'debit': v.debit,
                })
            .toList(),
      });

      final createdParcelleMap = created != null && created['parcelle'] is Map
          ? Map<String, dynamic>.from(created['parcelle'] as Map)
          : null;
      final backendId = (createdParcelleMap?['id'] as num?)?.toInt();

      if (backendId == null) {
        throw Exception('Le backend n\'a pas retourné d\'identifiant de parcelle');
      }

      savedParcelle = parcelle.copyWith(backendId: backendId);
      try {
        final details = await api.capteurSol.getParcelleDetails(backendId);
        if (details != null) {
          savedParcelle = ParcelleData.fromBackendDetails(details);
        } else if (createdParcelleMap != null) {
          savedParcelle = savedParcelle.copyWith(
            name: createdParcelleMap['nomSurface']?.toString() ?? savedParcelle.name,
            area: '${((createdParcelleMap['tailleHa'] as num?)?.toDouble() ?? areaHa).toStringAsFixed(1)} ha',
          );
        }
      } catch (_) {
        if (createdParcelleMap != null) {
          savedParcelle = savedParcelle.copyWith(
            name: createdParcelleMap['nomSurface']?.toString() ?? savedParcelle.name,
            area: '${((createdParcelleMap['tailleHa'] as num?)?.toDouble() ?? areaHa).toStringAsFixed(1)} ha',
          );
        }
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Sauvegarde backend échouée: ${e.message}'),
          backgroundColor: AppColors.farmDanger,
        ),
      );
      return;
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erreur backend: $e'),
          backgroundColor: AppColors.farmDanger,
        ),
      );
      return;
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }

    final parcellesNotifier = ref.read(parcellesProvider.notifier);
    final updatedParcelles = [...ref.read(parcellesProvider), savedParcelle];
    parcellesNotifier.replaceAll(updatedParcelles);
    if (!mounted) return;
    p.Provider.of<ValveProvider>(context, listen: false)
      .replaceFromParcelles(updatedParcelles);
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${langState.t('form.success')} "$name"'),
        backgroundColor: AppColors.farmLeaf,
      ),
    );
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _areaCtrl.dispose();
    _gouvernoratCtrl.dispose();
    _cityCtrl.dispose();
    for (final p in _plants) {
      for (final c in p.values) {
        c.dispose();
      }
    }
    for (final v in _vannes) {
      for (final c in v.values) {
        c.dispose();
      }
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final langState = ref.watch(languageProvider);
    final theme = Theme.of(context);

    final stepTitles = [langState.t('wizard.step2'), langState.t('wizard.step3')];

    return Scaffold(
      appBar: AppBar(
        title: Row(children: [
          const Icon(Icons.add_circle_outline, size: 22),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              langState.t('wizard.title'),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ]),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
            child: Row(
              children: List.generate(2, (i) {
                final isActive = i == _step;
                final isDone = i < _step;
                return Expanded(
                  child: Row(children: [
                    Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: isDone
                            ? AppColors.farmLeaf
                            : isActive
                                ? AppColors.farmLeaf.withValues(alpha: 0.15)
                                : theme.colorScheme.secondary,
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: isDone
                            ? const Icon(Icons.check, size: 14, color: Colors.white)
                            : Text('${i + 1}',
                                style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: isActive
                                        ? AppColors.farmLeaf
                                        : theme.colorScheme.onSurface
                                            .withValues(alpha: 0.4))),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(stepTitles[i],
                          style: TextStyle(
                              fontSize: 11,
                              fontWeight:
                                  isActive ? FontWeight.w700 : FontWeight.w500,
                              color: isActive
                                  ? theme.colorScheme.onSurface
                                  : theme.colorScheme.onSurface
                                      .withValues(alpha: 0.4)),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis),
                    ),
                  ]),
                );
              }),
            ),
          ),
          const Divider(height: 1),

          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
              children: [
                if (_step == 0) _buildStep1(langState, theme),
                if (_step == 1) _buildStep2(langState, theme),
              ],
            ),
          ),

          Container(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            decoration: BoxDecoration(
              color: theme.colorScheme.surface,
              border: Border(
                  top: BorderSide(color: theme.colorScheme.outline, width: 0.5)),
            ),
            child: Row(children: [
              if (_step > 0)
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => setState(() => _step--),
                    child: Text(langState.t('wizard.previous')),
                  ),
                ),
              if (_step > 0) const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: _isSaving
                      ? null
                      : _step < 1
                          ? () => setState(() => _step++)
                          : _save,
                  child: _isSaving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(_step < 1
                          ? langState.t('wizard.next')
                          : langState.t('wizard.save')),
                ),
              ),
            ]),
          ),
        ],
      ),
    );
  }

  Widget _buildStep1(LanguageState langState, ThemeData theme) {
    final selectedGovernorate = _gouvernoratCtrl.text.isEmpty ? null : _gouvernoratCtrl.text;
    final cities = selectedGovernorate == null
        ? const <String>[]
        : (_tunisiaGovernoratesCities[selectedGovernorate] ?? const <String>[]);
    final selectedCity = _cityCtrl.text.isEmpty ? null : _cityCtrl.text;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _FormField(langState.t('wizard.surface_name'), _nameCtrl),
        const SizedBox(height: 12),
        _FormField(langState.t('wizard.area_ha'), _areaCtrl,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp(r'^\d*([\.,]\d*)?$')),
            ]),
        const SizedBox(height: 12),
        _FormField(langState.t('wizard.country'),
            TextEditingController(text: _country),
            enabled: false),
        const SizedBox(height: 12),
        _DropdownField(
          label: langState.t('wizard.gouvernorat'),
          value: selectedGovernorate,
          items: _tunisiaGovernoratesCities.keys.toList(growable: false),
          onChanged: (value) {
            setState(() {
              _gouvernoratCtrl.text = value ?? '';
              _cityCtrl.text = '';
            });
          },
        ),
        const SizedBox(height: 12),
        _DropdownField(
          label: langState.t('wizard.city'),
          value: cities.contains(selectedCity) ? selectedCity : null,
          items: cities,
          hintText: selectedGovernorate == null
              ? 'Choisissez d\'abord un gouvernorat'
              : null,
          onChanged: selectedGovernorate == null
              ? null
              : (value) {
                  setState(() {
                    _cityCtrl.text = value ?? '';
                  });
                },
        ),
        const SizedBox(height: 20),

        LayoutBuilder(
          builder: (context, constraints) {
            final controls = Row(mainAxisSize: MainAxisSize.min, children: [
              IconButton(
                onPressed:
                    _nbPlants > 1 ? () => _updatePlantCount(_nbPlants - 1) : null,
                icon: const Icon(Icons.remove_circle_outline, size: 20),
                color: AppColors.farmDanger,
              ),
              Text('$_nbPlants',
                  style: theme.textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.w800)),
              IconButton(
                onPressed: () => _updatePlantCount(_nbPlants + 1),
                icon: const Icon(Icons.add_circle_outline, size: 20),
                color: AppColors.farmLeaf,
              ),
            ]);
            if (constraints.maxWidth < 260) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(langState.t('wizard.plant'), style: theme.textTheme.titleSmall),
                  const SizedBox(height: 6),
                  controls,
                ],
              );
            }
            return Row(
              children: [
                Expanded(
                  child: Text(
                    langState.t('wizard.plant'),
                    style: theme.textTheme.titleSmall,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                controls,
              ],
            );
          },
        ),
        const SizedBox(height: 8),
        ...List.generate(_plants.length, (i) {
          final p = _plants[i];
          final selectedCategory = p['category']!.text.isNotEmpty
            ? p['category']!.text
            : _findCategoryForType(p['type']!.text);
          final typeOptions = selectedCategory == null
            ? const <String>[]
            : (_plantTypesByCategory[selectedCategory] ?? const <String>[]);
          final selectedPlantType = typeOptions.contains(p['type']!.text)
            ? p['type']!.text
            : null;
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: theme.colorScheme.secondary,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(children: [
              _FormField(langState.t('wizard.plant_name'), p['name']!),
              const SizedBox(height: 8),
              _DropdownField(
                label: langState.t('wizard.plant_category'),
                value: selectedCategory,
                items: _plantTypesByCategory.keys.toList(growable: false),
                hintText: langState.t('wizard.plant_choose_category'),
                onChanged: (value) {
                  setState(() {
                    p['category']!.text = value ?? '';
                    p['type']!.text = '';
                  });
                },
              ),
              const SizedBox(height: 8),
              Row(children: [
                Expanded(
                  child: _DropdownField(
                    label: langState.t('wizard.plant_type'),
                    value: selectedPlantType,
                    items: typeOptions,
                    hintText: selectedCategory == null
                      ? langState.t('wizard.plant_choose_category_first')
                      : langState.t('wizard.plant_choose_type'),
                    onChanged: selectedCategory == null
                        ? null
                        : (value) {
                            setState(() {
                              p['type']!.text = value ?? '';
                            });
                          },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                    child: _FormField(
                        langState.t('wizard.plant_age'), p['age']!,
                        keyboardType: TextInputType.number)),
              ]),
              const SizedBox(height: 8),
              _FormField(langState.t('wizard.plant_count'), p['count']!,
                  keyboardType: TextInputType.number),
            ]),
          );
        }),
      ],
    );
  }

  Widget _buildStep2(LanguageState langState, ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        LayoutBuilder(
          builder: (context, constraints) {
            final controls = Row(mainAxisSize: MainAxisSize.min, children: [
              IconButton(
                onPressed:
                    _nbVannes > 1 ? () => _updateVanneCount(_nbVannes - 1) : null,
                icon:
                    const Icon(Icons.remove_circle_outline, size: 20),
                color: AppColors.farmDanger,
              ),
              Text('$_nbVannes',
                  style: theme.textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.w800)),
              IconButton(
                onPressed: () => _updateVanneCount(_nbVannes + 1),
                icon: const Icon(Icons.add_circle_outline, size: 20),
                color: AppColors.farmLeaf,
              ),
            ]);
            if (constraints.maxWidth < 260) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(langState.t('wizard.nb_vannes'),
                      style: theme.textTheme.titleSmall),
                  const SizedBox(height: 6),
                  controls,
                ],
              );
            }
            return Row(
              children: [
                Expanded(
                  child: Text(
                    langState.t('wizard.nb_vannes'),
                    style: theme.textTheme.titleSmall,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                controls,
              ],
            );
          },
        ),
        const SizedBox(height: 12),
        ...List.generate(_vannes.length, (i) {
          final v = _vannes[i];
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: theme.colorScheme.secondary,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(children: [
              Row(children: [
                const Text('🚰 ', style: TextStyle(fontSize: 18)),
                Text('${langState.t('wizard.valve')} ${i + 1}',
                    style: theme.textTheme.titleSmall),
              ]),
              const SizedBox(height: 8),
              _FormField(langState.t('wizard.valve_name'), v['name']!),
              const SizedBox(height: 8),
              Row(children: [
                Expanded(
                    child: _FormField(
                        langState.t('wizard.valve_plants'), v['nbPlants']!,
                        keyboardType: TextInputType.number)),
                const SizedBox(width: 8),
                Expanded(
                    child: _FormField(
                        langState.t('wizard.valve_debit'), v['debit']!,
                        keyboardType: TextInputType.number)),
              ]),
            ]),
          );
        }),
      ],
    );
  }
}

class _FormField extends StatelessWidget {
  final String label;
  final TextEditingController controller;
  final TextInputType? keyboardType;
  final List<TextInputFormatter>? inputFormatters;
  final bool enabled;

  const _FormField(this.label, this.controller,
      {this.keyboardType, this.inputFormatters, this.enabled = true});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: Theme.of(context).textTheme.labelMedium),
        const SizedBox(height: 4),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          inputFormatters: inputFormatters,
          enabled: enabled,
          decoration: InputDecoration(
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide:
                    BorderSide(color: Theme.of(context).colorScheme.outline)),
            enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide:
                    BorderSide(color: Theme.of(context).colorScheme.outline)),
          ),
          style: const TextStyle(fontSize: 13),
        ),
      ],
    );
  }
}

class _DropdownField extends StatelessWidget {
  final String label;
  final String? value;
  final List<String> items;
  final ValueChanged<String?>? onChanged;
  final String? hintText;

  const _DropdownField({
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
    this.hintText,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: Theme.of(context).textTheme.labelMedium),
        const SizedBox(height: 4),
        DropdownButtonFormField<String>(
          value: value,
          items: items
              .map(
                (item) => DropdownMenuItem<String>(
                  value: item,
                  child: Text(item, style: const TextStyle(fontSize: 13)),
                ),
              )
              .toList(growable: false),
          onChanged: onChanged,
          decoration: InputDecoration(
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            hintText: hintText,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: Theme.of(context).colorScheme.outline),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: Theme.of(context).colorScheme.outline),
            ),
          ),
          style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurface),
          isExpanded: true,
        ),
      ],
    );
  }
}
