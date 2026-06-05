import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // ─── Brand ───────────────────────────────────────────────────────────────
  static const Color farmLeaf    = Color(0xFF22C55E);
  static const Color farmDark    = Color(0xFF166534);
  static const Color farmEarth   = Color(0xFF92400E);
  static const Color farmSun     = Color(0xFFF59E0B);
  static const Color farmSky     = Color(0xFFE0F2FE);
  static const Color farmWater   = Color(0xFF0EA5E9);
  static const Color farmDanger  = Color(0xFFDC2626);

  // ─── Extended palette ────────────────────────────────────────────────────
  static const Color farmLeafLight = Color(0xFF4ADE80);
  static const Color farmLeafDark  = Color(0xFF15803D);
  static const Color farmWaterLight = Color(0xFF38BDF8);
  static const Color farmSunLight   = Color(0xFFFBBF24);
  static const Color farmPurple     = Color(0xFF8B5CF6);
  static const Color farmRose       = Color(0xFFF43F5E);

  // ─── Neutral ─────────────────────────────────────────────────────────────
  static const Color neutral50  = Color(0xFFF8FAFC);
  static const Color neutral100 = Color(0xFFF1F5F1);
  static const Color neutral200 = Color(0xFFE2EBE2);
  static const Color neutral300 = Color(0xFFCAD5CA);
  static const Color neutral400 = Color(0xFF94A394);
  static const Color neutral500 = Color(0xFF6B7B6B);
  static const Color neutral600 = Color(0xFF4B5D4B);
  static const Color neutral700 = Color(0xFF374D37);
  static const Color neutral800 = Color(0xFF1E2E1E);
  static const Color neutral900 = Color(0xFF0F1A0F);

  // ─── Light Theme ─────────────────────────────────────────────────────────
  static const Color lightBackground         = Color(0xFFF5F7F5);
  static const Color lightForeground         = Color(0xFF1A2E1A);
  static const Color lightCard               = Color(0xFFFFFFFF);
  static const Color lightCardForeground     = Color(0xFF1A2E1A);
  static const Color lightPrimary            = Color(0xFF22C55E);
  static const Color lightPrimaryForeground  = Color(0xFFFFFFFF);
  static const Color lightSecondary          = Color(0xFFEEF5EE);
  static const Color lightSecondaryForeground= Color(0xFF14532D);
  static const Color lightMuted              = Color(0xFFE8EDE8);
  static const Color lightMutedForeground    = Color(0xFF6B7B6B);
  static const Color lightAccent             = Color(0xFFF59E0B);
  static const Color lightAccentForeground   = Color(0xFF451A03);
  static const Color lightDestructive        = Color(0xFFEF4444);
  static const Color lightDestructiveForeground = Color(0xFFFFFFFF);
  static const Color lightBorder             = Color(0xFFDAE5DA);
  static const Color lightInput              = Color(0xFFDAE5DA);
  static const Color lightSurface2           = Color(0xFFF0F5F0);

  // ─── Dark Theme ──────────────────────────────────────────────────────────
  static const Color darkBackground          = Color(0xFF0F1A0F);
  static const Color darkForeground          = Color(0xFFE8EDE8);
  static const Color darkCard                = Color(0xFF1A2E1A);
  static const Color darkCardForeground      = Color(0xFFE8EDE8);
  static const Color darkPrimary             = Color(0xFF22C55E);
  static const Color darkPrimaryForeground   = Color(0xFFFFFFFF);
  static const Color darkSecondary           = Color(0xFF1C3A1C);
  static const Color darkSecondaryForeground = Color(0xFFD1E7D1);
  static const Color darkMuted               = Color(0xFF1C3A1C);
  static const Color darkMutedForeground     = Color(0xFF7DA37D);
  static const Color darkAccent              = Color(0xFFF59E0B);
  static const Color darkAccentForeground    = Color(0xFFFFFFFF);
  static const Color darkDestructive         = Color(0xFF7F1D1D);
  static const Color darkDestructiveForeground = Color(0xFFFFFFFF);
  static const Color darkBorder              = Color(0xFF2D4A2D);
  static const Color darkInput               = Color(0xFF2D4A2D);
  static const Color darkSurface2            = Color(0xFF243824);

  // ─── Gradients ───────────────────────────────────────────────────────────
  static const LinearGradient farmGradient = LinearGradient(
    begin: Alignment.topLeft, end: Alignment.bottomRight,
    colors: [Color(0xFF22C55E), Color(0xFF16A34A), Color(0xFF166534)],
  );

  static const LinearGradient heroGradient = LinearGradient(
    begin: Alignment.topLeft, end: Alignment.bottomCenter,
    colors: [Color(0xFF16A34A), Color(0xFF15803D), Color(0xFF14532D)],
  );

  static const LinearGradient waterGradient = LinearGradient(
    begin: Alignment.topLeft, end: Alignment.bottomRight,
    colors: [Color(0xFF0EA5E9), Color(0xFF0284C7)],
  );

  static const LinearGradient sunGradient = LinearGradient(
    begin: Alignment.topLeft, end: Alignment.bottomRight,
    colors: [Color(0xFFF59E0B), Color(0xFFD97706)],
  );

  // ─── Semantic shadows ────────────────────────────────────────────────────
  static List<BoxShadow> get cardShadow => [
    BoxShadow(color: const Color(0xFF1A2E1A).withValues(alpha: 0.06), blurRadius: 16, offset: const Offset(0, 4)),
    BoxShadow(color: const Color(0xFF1A2E1A).withValues(alpha: 0.03), blurRadius: 4, offset: const Offset(0, 1)),
  ];

  static List<BoxShadow> get elevatedShadow => [
    BoxShadow(color: const Color(0xFF1A2E1A).withValues(alpha: 0.10), blurRadius: 24, offset: const Offset(0, 8)),
    BoxShadow(color: const Color(0xFF1A2E1A).withValues(alpha: 0.04), blurRadius: 6, offset: const Offset(0, 2)),
  ];

  static List<BoxShadow> get navShadow => [
    BoxShadow(color: const Color(0xFF1A2E1A).withValues(alpha: 0.12), blurRadius: 20, offset: const Offset(0, -4)),
    BoxShadow(color: const Color(0xFF1A2E1A).withValues(alpha: 0.05), blurRadius: 6, offset: const Offset(0, -1)),
  ];

  static List<BoxShadow> get greenShadow => [
    BoxShadow(color: const Color(0xFF22C55E).withValues(alpha: 0.30), blurRadius: 12, offset: const Offset(0, 4)),
  ];
}
