import 'package:flutter/material.dart';

/// Farm-specific color tokens mapped from the Lovable CSS HSL design system.
class AppColors {
  AppColors._();

  // ─── Farm Semantic Colors ───
  static const Color farmLeaf = Color(0xFF22C55E);
  static const Color farmDark = Color(0xFF166534);
  static const Color farmEarth = Color(0xFF92400E);
  static const Color farmSun = Color(0xFFF59E0B);
  static const Color farmSky = Color(0xFFE0F2FE);
  static const Color farmWater = Color(0xFF0EA5E9);
  static const Color farmDanger = Color(0xFFDC2626);

  // ─── Light Theme ───
  static const Color lightBackground = Color(0xFFF5F7F5);
  static const Color lightForeground = Color(0xFF1A2E1A);
  static const Color lightCard = Color(0xFFFFFFFF);
  static const Color lightCardForeground = Color(0xFF1A2E1A);
  static const Color lightPrimary = Color(0xFF22C55E);
  static const Color lightPrimaryForeground = Color(0xFFFFFFFF);
  static const Color lightSecondary = Color(0xFFDCFCE7);
  static const Color lightSecondaryForeground = Color(0xFF14532D);
  static const Color lightMuted = Color(0xFFE8EDE8);
  static const Color lightMutedForeground = Color(0xFF6B7B6B);
  static const Color lightAccent = Color(0xFFF59E0B);
  static const Color lightAccentForeground = Color(0xFF451A03);
  static const Color lightDestructive = Color(0xFFEF4444);
  static const Color lightDestructiveForeground = Color(0xFFFFFFFF);
  static const Color lightBorder = Color(0xFFDAE5DA);
  static const Color lightInput = Color(0xFFDAE5DA);

  // ─── Dark Theme ───
  static const Color darkBackground = Color(0xFF0F1A0F);
  static const Color darkForeground = Color(0xFFE8EDE8);
  static const Color darkCard = Color(0xFF1A2E1A);
  static const Color darkCardForeground = Color(0xFFE8EDE8);
  static const Color darkPrimary = Color(0xFF22C55E);
  static const Color darkPrimaryForeground = Color(0xFFFFFFFF);
  static const Color darkSecondary = Color(0xFF1C3A1C);
  static const Color darkSecondaryForeground = Color(0xFFD1E7D1);
  static const Color darkMuted = Color(0xFF1C3A1C);
  static const Color darkMutedForeground = Color(0xFF7DA37D);
  static const Color darkAccent = Color(0xFFF59E0B);
  static const Color darkAccentForeground = Color(0xFFFFFFFF);
  static const Color darkDestructive = Color(0xFF7F1D1D);
  static const Color darkDestructiveForeground = Color(0xFFFFFFFF);
  static const Color darkBorder = Color(0xFF2D4A2D);
  static const Color darkInput = Color(0xFF2D4A2D);

  // ─── Farm Gradient ───
  static const LinearGradient farmGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [farmLeaf, farmDark],
  );

  static const LinearGradient sunGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [farmSun, Color(0xFFFBBF24)],
  );
}
