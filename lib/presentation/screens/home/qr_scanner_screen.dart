import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:uiearth_flutter/core/l10n/app_localizations.dart';
import 'package:uiearth_flutter/core/theme/app_colors.dart';
import 'package:uiearth_flutter/domain/providers/parcelle_provider.dart';

class QrScannerScreen extends ConsumerStatefulWidget {
  final String? parcelleId;

  const QrScannerScreen({super.key, this.parcelleId});

  @override
  ConsumerState<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends ConsumerState<QrScannerScreen>
    with TickerProviderStateMixin {
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    formats: const [BarcodeFormat.qrCode],
    // Analyse en haute résolution : un QR petit / loin / décentré a alors assez
    // de pixels pour être décodé sans devoir l'amener pile dans le carré.
    cameraResolution: const Size(1920, 1080),
    // Sélecteur caméra moderne (meilleur autofocus/résolution sur Android récent).
    useNewCameraSelector: true,
  );

  bool _captured = false;
  bool _torchEnabled = false;

  /// Taille de la zone d'affichage (mise à jour à chaque build).
  Size _viewSize = Size.zero;

  /// Coins du QR verrouillés (espace écran) après ajustement moindres carrés.
  List<Offset>? _lockedCorners;
  Offset? _lockedCenter;

  /// Ligne de balayage continue pendant la recherche.
  late final AnimationController _sweep =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1600))
        ..repeat();

  /// Animation de verrouillage / succès à la capture.
  late final AnimationController _success =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 750));

  // ───────────────────────────── Détection ──────────────────────────────────

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_captured) return;
    final Barcode? barcode = capture.barcodes
        .where((b) => (b.rawValue ?? '').isNotEmpty)
        .firstOrNull;
    final String? value = barcode?.rawValue;
    if (value == null) return;

    _captured = true;

    // Ajuste un carré (moindres carrés) sur les coins détectés, puis le
    // ramène dans l'espace écran pour dessiner le verrouillage à l'endroit
    // exact du QR — peu importe où il se trouve dans le cadre.
    final fitted = _fitLockSquare(barcode!.corners, capture.size);
    if (mounted) {
      setState(() {
        _lockedCorners = fitted?.corners;
        _lockedCenter = fitted?.center;
      });
    }

    _sweep.stop();
    await _success.forward();
    await _controller.stop();

    if (widget.parcelleId != null && mounted) {
      ref.read(parcellesProvider.notifier).connectParcelle(widget.parcelleId!);
    }
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('QR détecté: $value'),
        backgroundColor: AppColors.farmLeaf,
      ),
    );
    context.pop();
  }

  // ───────────────────── Ajustement par moindres carrés ──────────────────────

  /// Mappe un point de l'espace image (caméra) vers l'espace écran, en tenant
  /// compte du `BoxFit.cover` utilisé par l'aperçu caméra.
  Offset _imageToView(Offset p, Size img) {
    if (img.width == 0 || img.height == 0 || _viewSize == Size.zero) return p;
    final scale = math.max(_viewSize.width / img.width, _viewSize.height / img.height);
    final dx = (_viewSize.width - img.width * scale) / 2;
    final dy = (_viewSize.height - img.height * scale) / 2;
    return Offset(p.dx * scale + dx, p.dy * scale + dy);
  }

  /// Ajuste le **carré au sens des moindres carrés** (problème de Procrustes
  /// 2D : translation + rotation + échelle optimales) sur les 4 coins détectés.
  ///
  /// Les coins renvoyés par le détecteur forment un quadrilatère bruité / en
  /// perspective ; on en déduit le carré qui minimise la somme des distances
  /// au carré, ce qui donne un verrouillage stable et bien orienté.
  _LockFit? _fitLockSquare(List<Offset> rawCorners, Size imageSize) {
    if (rawCorners.length < 4) return null;
    final pts = rawCorners.map((p) => _imageToView(p, imageSize)).toList();

    // Centre = centroïde (solution moindres carrés pour la translation).
    Offset c = Offset.zero;
    for (final p in pts) {
      c += p;
    }
    c = c / pts.length.toDouble();

    // Coins centrés, ordonnés par angle (sens trigonométrique).
    final q = pts.map((p) => p - c).toList()
      ..sort((a, b) => math.atan2(a.dy, a.dx).compareTo(math.atan2(b.dy, b.dx)));

    // Gabarit : carré unité, coins ordonnés par angle (45°,135°,225°,315°).
    const base = [
      Offset(0.5, 0.5),
      Offset(-0.5, 0.5),
      Offset(-0.5, -0.5),
      Offset(0.5, -0.5),
    ];
    const sumTemplateSq = 2.0; // Σ |base_k|²  (= 4 × 0.5)

    // On essaie les 4 décalages cycliques de correspondance et on garde celui
    // de plus faible résidu (gère les QR pivotés de ~90°).
    double bestErr = double.infinity;
    double bestTheta = 0;
    double bestScale = 0;
    for (int shift = 0; shift < 4; shift++) {
      double a = 0, b = 0;
      for (int k = 0; k < 4; k++) {
        final t = base[(k + shift) % 4];
        final d = q[k];
        a += t.dx * d.dx + t.dy * d.dy; // Σ t·d
        b += t.dx * d.dy - t.dy * d.dx; // Σ t×d
      }
      final theta = math.atan2(b, a);
      final scale = math.sqrt(a * a + b * b) / sumTemplateSq;
      // Résidu Σ |d_k - scale·R(theta)·t_k|².
      final cosT = math.cos(theta), sinT = math.sin(theta);
      double err = 0;
      for (int k = 0; k < 4; k++) {
        final t = base[(k + shift) % 4];
        final rx = scale * (cosT * t.dx - sinT * t.dy);
        final ry = scale * (sinT * t.dx + cosT * t.dy);
        err += (q[k] - Offset(rx, ry)).distanceSquared;
      }
      if (err < bestErr) {
        bestErr = err;
        bestTheta = theta;
        bestScale = scale;
      }
    }

    if (bestScale <= 0) return null;
    final cosT = math.cos(bestTheta), sinT = math.sin(bestTheta);
    final corners = base.map((t) {
      final rx = bestScale * (cosT * t.dx - sinT * t.dy);
      final ry = bestScale * (sinT * t.dx + cosT * t.dy);
      return c + Offset(rx, ry);
    }).toList();
    return _LockFit(corners, c);
  }

  @override
  void dispose() {
    _sweep.dispose();
    _success.dispose();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final langState = ref.watch(languageProvider);

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(langState.t('index.scan_qr')),
        actions: [
          IconButton(
            onPressed: () => _controller.switchCamera(),
            icon: const Icon(Icons.cameraswitch),
          ),
          IconButton(
            onPressed: () async {
              await _controller.toggleTorch();
              if (!mounted) return;
              setState(() => _torchEnabled = !_torchEnabled);
            },
            icon: Icon(_torchEnabled ? Icons.flash_on : Icons.flash_off),
          ),
        ],
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          _viewSize = Size(constraints.maxWidth, constraints.maxHeight);
          return Stack(
            fit: StackFit.expand,
            children: [
              MobileScanner(controller: _controller, onDetect: _onDetect),

              // Overlay animé (recherche + verrouillage).
              AnimatedBuilder(
                animation: Listenable.merge([_sweep, _success]),
                builder: (context, _) {
                  return CustomPaint(
                    painter: _ScanOverlayPainter(
                      sweep: _sweep.value,
                      success: _success.value,
                      lockedCorners: _lockedCorners,
                      lockedCenter: _lockedCenter,
                      accent: AppColors.farmLeaf,
                    ),
                  );
                },
              ),

              Positioned(
                left: 20,
                right: 20,
                bottom: 28,
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.55),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    langState.t('index.scan_to_connect'),
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                        color: Colors.white, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// Résultat de l'ajustement par moindres carrés (espace écran).
class _LockFit {
  final List<Offset> corners;
  final Offset center;
  const _LockFit(this.corners, this.center);
}

class _ScanOverlayPainter extends CustomPainter {
  final double sweep; // 0..1 position de la ligne de balayage
  final double success; // 0..1 progression du verrouillage
  final List<Offset>? lockedCorners;
  final Offset? lockedCenter;
  final Color accent;

  _ScanOverlayPainter({
    required this.sweep,
    required this.success,
    required this.lockedCorners,
    required this.lockedCenter,
    required this.accent,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final searching = success == 0;
    final guideSize = math.min(size.width, size.height) * 0.62;
    final guide = Rect.fromCenter(
      center: size.center(Offset.zero),
      width: guideSize,
      height: guideSize,
    );

    // Voile sombre avec une découpe sur la zone utile.
    final overlay = Path()..addRect(Offset.zero & size);
    final hole = Path()
      ..addRRect(RRect.fromRectAndRadius(guide, const Radius.circular(20)));
    canvas.drawPath(
      Path.combine(PathOperation.difference, overlay, hole),
      Paint()..color = Colors.black.withValues(alpha: 0.55 - 0.25 * success),
    );

    if (searching) {
      _paintSearching(canvas, guide);
    } else {
      _paintLock(canvas, size, guide);
    }
  }

  void _paintSearching(Canvas canvas, Rect guide) {
    // Coins blancs.
    _drawCorners(canvas, _rectCorners(guide), Colors.white, 1, 26);

    // Ligne de balayage qui monte et descend avec un dégradé lumineux.
    final t = (math.sin(sweep * 2 * math.pi) + 1) / 2; // 0..1 va-et-vient
    final y = guide.top + t * guide.height;
    final shader = LinearGradient(
      colors: [
        accent.withValues(alpha: 0),
        accent.withValues(alpha: 0.9),
        accent.withValues(alpha: 0),
      ],
    ).createShader(Rect.fromLTWH(guide.left, y - 14, guide.width, 28));
    canvas.drawRect(
      Rect.fromLTWH(guide.left + 6, y - 1.5, guide.width - 12, 3),
      Paint()..shader = shader,
    );
  }

  void _paintLock(Canvas canvas, Size size, Rect guide) {
    final corners = lockedCorners ?? _rectCorners(guide);
    final center = lockedCenter ?? guide.center;
    final ease = Curves.easeOutBack.transform(success.clamp(0, 1));

    // Polygone verrouillé sur le QR.
    final poly = Path()..addPolygon(corners, true);
    canvas.drawPath(
      poly,
      Paint()
        ..color = accent.withValues(alpha: 0.16 * success)
        ..style = PaintingStyle.fill,
    );
    canvas.drawPath(
      poly,
      Paint()
        ..color = accent
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3
        ..strokeJoin = StrokeJoin.round,
    );
    _drawCorners(canvas, corners, accent, ease, 30);

    // Pulsation lumineuse autour du centre.
    final radius = _maxCornerRadius(corners, center);
    canvas.drawCircle(
      center,
      radius * (0.6 + 0.8 * success),
      Paint()
        ..color = accent.withValues(alpha: 0.5 * (1 - success))
        ..style = PaintingStyle.stroke
        ..strokeWidth = 4,
    );

    // Coche de validation.
    if (success > 0.4) {
      final k = ((success - 0.4) / 0.6).clamp(0.0, 1.0);
      final r = radius * 0.42;
      final p1 = center + Offset(-r * 0.45, r * 0.02);
      final p2 = center + Offset(-r * 0.12, r * 0.34);
      final p3 = center + Offset(r * 0.5, -r * 0.32);
      final check = Path()..moveTo(p1.dx, p1.dy);
      final mid = Offset.lerp(p1, p2, k.clamp(0, 0.5) / 0.5)!;
      check.lineTo(mid.dx, mid.dy);
      if (k > 0.5) {
        final end = Offset.lerp(p2, p3, (k - 0.5) / 0.5)!;
        check.lineTo(end.dx, end.dy);
      }
      canvas.drawPath(
        check,
        Paint()
          ..color = Colors.white
          ..style = PaintingStyle.stroke
          ..strokeWidth = 5
          ..strokeCap = StrokeCap.round
          ..strokeJoin = StrokeJoin.round,
      );
    }
  }

  List<Offset> _rectCorners(Rect r) =>
      [r.topLeft, r.topRight, r.bottomRight, r.bottomLeft];

  double _maxCornerRadius(List<Offset> corners, Offset center) {
    double m = 0;
    for (final c in corners) {
      m = math.max(m, (c - center).distance);
    }
    return m == 0 ? 60 : m;
  }

  /// Dessine des équerres aux 4 coins (longueur animée par [grow]).
  void _drawCorners(
      Canvas canvas, List<Offset> corners, Color color, double grow, double len) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round;
    for (final corner in corners) {
      // Deux segments partant du coin vers ses deux voisins les plus proches.
      final neighbours = corners.where((c) => c != corner).toList()
        ..sort((a, b) => (a - corner).distance.compareTo((b - corner).distance));
      for (int i = 0; i < 2 && i < neighbours.length; i++) {
        final dir = neighbours[i] - corner;
        final n = dir.distance == 0 ? dir : dir / dir.distance;
        canvas.drawLine(corner, corner + n * len * grow.clamp(0.0, 1.0), paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant _ScanOverlayPainter old) =>
      old.sweep != sweep ||
      old.success != success ||
      old.lockedCorners != lockedCorners;
}
