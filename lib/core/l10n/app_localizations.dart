import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'translations.dart';

enum Lang { fr, ar }

class LanguageState {
  final Lang lang;
  LanguageState({this.lang = Lang.fr});

  TextDirection get direction =>
      lang == Lang.ar ? TextDirection.rtl : TextDirection.ltr;

  String t(String key) {
    final langKey = lang == Lang.fr ? 'fr' : 'ar';
    return translations[key]?[langKey] ?? key;
  }

  LanguageState copyWith({Lang? lang}) =>
      LanguageState(lang: lang ?? this.lang);
}

class LanguageNotifier extends StateNotifier<LanguageState> {
  LanguageNotifier() : super(LanguageState());

  void setLang(Lang lang) {
    state = state.copyWith(lang: lang);
  }

  void toggle() {
    state = state.copyWith(
      lang: state.lang == Lang.fr ? Lang.ar : Lang.fr,
    );
  }
}

final languageProvider =
    StateNotifierProvider<LanguageNotifier, LanguageState>((ref) {
  return LanguageNotifier();
});
