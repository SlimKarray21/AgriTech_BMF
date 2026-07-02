import 'dart:convert';
import 'dart:math' as math;
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import 'package:uiearth_flutter/core/l10n/app_localizations.dart';

// ── Modèle météo (dates brutes, sans labels traduits) ────────────────────────

class DailyForecast {
  final DateTime date;
  final int tempMax;
  final int tempMin;
  final int weatherCode;
  DailyForecast({required this.date, required this.tempMax, required this.tempMin, required this.weatherCode});
}

class HourlyPoint {
  final int hour;
  final double value;
  HourlyPoint({required this.hour, required this.value});
}

class DailyRainPoint {
  final DateTime date;
  final double rain;
  DailyRainPoint({required this.date, required this.rain});
}

class WeatherData {
  final int temp;
  final int humidity;
  final int windSpeed;
  final int weatherCode;
  final List<DailyForecast> daily;
  final List<HourlyPoint> hourlyTemp;
  final List<HourlyPoint> hourlyWind;
  final List<DailyRainPoint> dailyRain;

  WeatherData({
    required this.temp,
    required this.humidity,
    required this.windSpeed,
    required this.weatherCode,
    required this.daily,
    required this.hourlyTemp,
    required this.hourlyWind,
    required this.dailyRain,
  });
}

// ── Écran météo ───────────────────────────────────────────────────────────────

class WeatherScreen extends ConsumerStatefulWidget {
  const WeatherScreen({super.key});

  @override
  ConsumerState<WeatherScreen> createState() => _WeatherScreenState();
}

class _WeatherScreenState extends ConsumerState<WeatherScreen> {
  double _lat = 36.8065;
  double _lng = 10.1815;
  String _locationName = 'Tunis';
  String _searchQuery = '';
  WeatherData? _weather;
  bool _loading = false;
  bool _searching = false;

  final TextEditingController _searchController = TextEditingController();

  // ── Codes WMO → clé traduction + icône ───────────────────────────────────

  static const Map<int, List<String>> _wmoInfo = {
    0:  ['weather.clear',         '☀️'],
    1:  ['weather.mainly_clear',  '🌤️'],
    2:  ['weather.partly_cloudy', '⛅'],
    3:  ['weather.overcast',      '☁️'],
    45: ['weather.fog',           '🌫️'],
    48: ['weather.rime_fog',      '🌫️'],
    51: ['weather.drizzle_light', '🌦️'],
    53: ['weather.drizzle_mod',   '🌦️'],
    55: ['weather.drizzle_dense', '🌧️'],
    61: ['weather.rain_light',    '🌦️'],
    63: ['weather.rain_mod',      '🌧️'],
    65: ['weather.rain_heavy',    '🌧️'],
    71: ['weather.snow_light',    '🌨️'],
    73: ['weather.snow_mod',      '🌨️'],
    75: ['weather.snow_heavy',    '❄️'],
    80: ['weather.shower_light',  '🌦️'],
    81: ['weather.shower_mod',    '🌧️'],
    82: ['weather.shower_heavy',  '⛈️'],
    95: ['weather.storm',         '⛈️'],
  };

  // Clés jours : index = date.weekday % 7 (0=dim, 1=lun, ...)
  static const List<String> _dayKeys = [
    'weather.day.sun', 'weather.day.mon', 'weather.day.tue',
    'weather.day.wed', 'weather.day.thu', 'weather.day.fri',
    'weather.day.sat',
  ];

  String _dayLabel(DateTime date, int index, String Function(String) t) {
    if (index == 0) return t('weather.today');
    return t(_dayKeys[date.weekday % 7]);
  }

  String _icon(int code) => _wmoInfo[code]?[1] ?? '🌡️';
  String _desc(int code, String Function(String) t) {
    final key = _wmoInfo[code]?[0];
    return key != null ? t(key) : '—';
  }

  // ── Fetch API ─────────────────────────────────────────────────────────────

  Future<void> _fetchWeather(double lat, double lng) async {
    setState(() => _loading = true);
    try {
      final url =
          'https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lng'
          '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code'
          '&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum'
          '&hourly=temperature_2m,wind_speed_10m&timezone=auto&forecast_days=7';
      final res = await http.get(Uri.parse(url));
      if (res.statusCode != 200) return;
      final data = json.decode(res.body);

      // Prévisions 5 jours
      final daily = <DailyForecast>[];
      for (int i = 0; i < 5; i++) {
        daily.add(DailyForecast(
          date: DateTime.parse(data['daily']['time'][i]),
          tempMax: data['daily']['temperature_2m_max'][i].round(),
          tempMin: data['daily']['temperature_2m_min'][i].round(),
          weatherCode: data['daily']['weather_code'][i],
        ));
      }

      // Températures horaires (24h)
      final now = DateTime.now();
      final hourlyTemp = <HourlyPoint>[];
      final hourlyWind = <HourlyPoint>[];
      for (int i = 0; i < 8; i++) {
        final idx = now.hour + i * 3;
        if (idx < data['hourly']['time'].length) {
          final h = DateTime.parse(data['hourly']['time'][idx]).hour;
          hourlyTemp.add(HourlyPoint(hour: h, value: (data['hourly']['temperature_2m'][idx] as num).toDouble()));
          hourlyWind.add(HourlyPoint(hour: h, value: (data['hourly']['wind_speed_10m'][idx] as num).toDouble()));
        }
      }

      // Précipitations 7 jours
      final dailyRain = <DailyRainPoint>[];
      for (int i = 0; i < 7; i++) {
        dailyRain.add(DailyRainPoint(
          date: DateTime.parse(data['daily']['time'][i]),
          rain: ((data['daily']['precipitation_sum'][i] as num) * 10).round() / 10,
        ));
      }

      setState(() {
        _weather = WeatherData(
          temp: data['current']['temperature_2m'].round(),
          humidity: data['current']['relative_humidity_2m'].round(),
          windSpeed: data['current']['wind_speed_10m'].round(),
          weatherCode: data['current']['weather_code'],
          daily: daily,
          hourlyTemp: hourlyTemp,
          hourlyWind: hourlyWind,
          dailyRain: dailyRain,
        );
      });
    } catch (e) {
      debugPrint('Weather fetch error: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _handleSearch(String lang) async {
    if (_searchQuery.trim().isEmpty) return;
    setState(() => _searching = true);
    try {
      final query    = Uri.encodeComponent(_searchQuery);
      final acceptLang = lang == 'ar' ? 'ar' : 'fr';
      final url = 'https://nominatim.openstreetmap.org/search?format=json&q=$query&limit=1&accept-language=$acceptLang';
      final res = await http.get(Uri.parse(url));
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        if (data.isNotEmpty) {
          final newLat = double.parse(data[0]['lat'].toString());
          final newLng = double.parse(data[0]['lon'].toString());
          setState(() {
            _lat = newLat;
            _lng = newLng;
            _locationName = data[0]['display_name'].split(',')[0];
          });
          _fetchWeather(newLat, newLng);
          _searchController.clear();
          _searchQuery = '';
        }
      }
    } catch (e) {
      debugPrint('Search error: $e');
    } finally {
      if (mounted) setState(() => _searching = false);
    }
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _fetchWeather(_lat, _lng));
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final langState = ref.watch(languageProvider);
    final t    = langState.t;
    final lang = langState.lang == Lang.ar ? 'ar' : 'fr';
    final isRtl = langState.lang == Lang.ar;

    return Directionality(
      textDirection: isRtl ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        backgroundColor: Colors.white,
        body: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
                // ── Hero Header ──────────────────────────────────────────
                _buildHero(t, lang, isRtl),
                const SizedBox(height: 16),

                // Carte localisation
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: _buildMapCard(t),
                ),
                const SizedBox(height: 16),

                if (_loading && _weather == null)
                  const Padding(
                    padding: EdgeInsets.all(48),
                    child: Center(child: CircularProgressIndicator(color: Colors.black)),
                  )
                else if (_weather != null)
                  _buildWeatherContent(t, isRtl),
              ],
            ),
          ),
        ),
    );
  }

  // ── Hero Header ──────────────────────────────────────────────────────────

  Widget _buildHero(String Function(String) t, String lang, bool isRtl) {
    final w = _weather;
    final kmh = isRtl ? 'كم/س' : 'km/h';
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF16a34a), Color(0xFF15803d), Color(0xFF166534)],
        ),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(32)),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(t('weather.title'),
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 28,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -0.5)),
                        const SizedBox(height: 2),
                        Text(_locationName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                color: Colors.white70, fontSize: 14)),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(16)),
                    child: const Icon(Icons.cloud_rounded,
                        color: Colors.white, size: 26),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              // Barre de recherche
              Row(
                children: [
                  Expanded(
                    child: Container(
                      height: 48,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                            color: Colors.white.withValues(alpha: 0.18)),
                      ),
                      child: TextField(
                        controller: _searchController,
                        textDirection:
                            isRtl ? TextDirection.rtl : TextDirection.ltr,
                        style: const TextStyle(color: Colors.black87),
                        cursorColor: const Color(0xFF15803d),
                        onChanged: (v) => _searchQuery = v,
                        onSubmitted: (_) => _handleSearch(lang),
                        decoration: InputDecoration(
                          prefixIcon: Icon(Icons.search,
                              color: Colors.grey.shade600, size: 20),
                          hintText: t('weather.search'),
                          hintStyle: TextStyle(color: Colors.grey.shade600),
                          border: InputBorder.none,
                          contentPadding:
                              const EdgeInsets.symmetric(vertical: 14),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    height: 48,
                    child: ElevatedButton(
                      onPressed: _searching ? null : () => _handleSearch(lang),
                      style: ElevatedButton.styleFrom(
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16)),
                        elevation: 0,
                        backgroundColor: Colors.white,
                        foregroundColor: const Color(0xFF15803d),
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                      ),
                      child: _searching
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Color(0xFF15803d)))
                          : const Icon(Icons.search, size: 20),
                    ),
                  ),
                ],
              ),
              if (w != null) ...[
                const SizedBox(height: 18),
                Row(children: [
                  _WeatherKpiPill(
                      value: '${w.temp}°C',
                      label: _desc(w.weatherCode, t),
                      icon: Icons.thermostat_rounded,
                      color: const Color(0xFFfed7aa)),
                  const SizedBox(width: 10),
                  _WeatherKpiPill(
                      value: '${w.humidity}%',
                      label: t('weather.real'),
                      icon: Icons.water_drop_rounded,
                      color: const Color(0xFFbae6fd)),
                  const SizedBox(width: 10),
                  _WeatherKpiPill(
                      value: '${w.windSpeed} $kmh',
                      label: t('weather.wind_chart'),
                      icon: Icons.air_rounded,
                      color: const Color(0xFFbbf7d0)),
                ]),
              ],
            ],
          ),
        ),
      ),
    );
  }

  // ── Carte carte interactive ───────────────────────────────────────────────

  Widget _buildMapCard(String Function(String) t) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 6, top: 2, bottom: 8),
            child: Text(t('weather.location'),
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
          ),
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: SizedBox(
              height: 190,
              child: FlutterMap(
                key: ValueKey('$_lat,$_lng'),
                options: MapOptions(initialCenter: LatLng(_lat, _lng), initialZoom: 9.5),
                children: [
                  TileLayer(
                    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: 'com.uiearth.mobile',
                  ),
                  MarkerLayer(markers: [
                    Marker(
                      point: LatLng(_lat, _lng), width: 42, height: 42,
                      child: const Icon(Icons.location_on, color: Colors.red, size: 36),
                    ),
                  ]),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.place, size: 14, color: Colors.green),
              const SizedBox(width: 4),
              Expanded(
                child: Text(_locationName, maxLines: 1, overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: Colors.grey.shade700, fontSize: 12, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── Contenu météo principal ───────────────────────────────────────────────

  Widget _buildWeatherContent(String Function(String) t, bool isRtl) {
    final w = _weather!;
    final icon = _icon(w.weatherCode);
    final desc = _desc(w.weatherCode, t);

    // Unités localisées
    final kmh   = isRtl ? 'كم/س' : 'km/h';
    final degC  = '°C';
    final mm    = ' mm';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        children: [
          // ── Météo actuelle ──────────────────────────────────────────
          Container(
            padding: const EdgeInsets.all(20),
            decoration: _cardDecoration(),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${w.temp}$degC',
                              style: const TextStyle(fontSize: 48, fontWeight: FontWeight.w800, height: 1)),
                          const SizedBox(height: 8),
                          Text(desc,
                              style: TextStyle(fontSize: 16, color: Colors.grey[600], fontWeight: FontWeight.w500)),
                          const SizedBox(height: 4),
                          Row(children: [
                            const Icon(Icons.location_on, size: 14, color: Colors.green),
                            const SizedBox(width: 4),
                            Expanded(child: Text(_locationName, maxLines: 1, overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 14, color: Colors.green, fontWeight: FontWeight.w600))),
                          ]),
                        ],
                      ),
                    ),
                    Text(icon, style: const TextStyle(fontSize: 64)),
                  ],
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _statItem(Icons.water_drop, Colors.blue, '${w.humidity}%'),
                    _statItem(Icons.air, Colors.grey, '${w.windSpeed} $kmh'),
                    _statItem(Icons.thermostat, Colors.orange, t('weather.real')),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // ── Prévisions 5 jours ──────────────────────────────────────
          Container(
            padding: const EdgeInsets.all(20),
            decoration: _cardDecoration(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(t('weather.forecast'),
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                ...w.daily.asMap().entries.map((entry) {
                  final i = entry.key;
                  final d = entry.value;
                  final dayLabel = _dayLabel(d.date, i, t);
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        SizedBox(width: 60,
                            child: Text(dayLabel,
                                style: TextStyle(fontWeight: FontWeight.w600, color: Colors.grey[800]))),
                        Text(_icon(d.weatherCode), style: const TextStyle(fontSize: 20)),
                        Row(children: [
                          Text('${d.tempMax}$degC',
                              style: const TextStyle(fontWeight: FontWeight.bold)),
                          const SizedBox(width: 8),
                          Text('${d.tempMin}$degC',
                              style: TextStyle(color: Colors.grey[500])),
                        ]),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // ── Graphiques ──────────────────────────────────────────────
          _curveCard(
            title: t('weather.temp_chart'),
            color: Colors.orange,
            labels: w.hourlyTemp.map((p) => '${p.hour}h').toList(),
            values: w.hourlyTemp.map((p) => p.value).toList(),
            unitSuffix: degC,
          ),
          const SizedBox(height: 20),

          _curveCard(
            title: t('weather.rain_chart'),
            color: Colors.blue,
            labels: w.dailyRain.asMap().entries
                .map((e) => t(_dayKeys[e.value.date.weekday % 7]))
                .toList(),
            values: w.dailyRain.map((p) => p.rain).toList(),
            unitSuffix: mm,
            asBarChart: true,
          ),
          const SizedBox(height: 20),

          _curveCard(
            title: t('weather.wind_chart'),
            color: Colors.teal,
            labels: w.hourlyWind.map((p) => '${p.hour}h').toList(),
            values: w.hourlyWind.map((p) => p.value).toList(),
            unitSuffix: ' $kmh',
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  // ── Helpers visuels ───────────────────────────────────────────────────────

  BoxDecoration _cardDecoration() => BoxDecoration(
    color: Colors.white,
    borderRadius: BorderRadius.circular(24),
    border: Border.all(color: Colors.grey.shade200),
    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 10, offset: const Offset(0, 4))],
  );

  Widget _statItem(IconData icon, Color color, String value) => Row(
    children: [
      Icon(icon, size: 16, color: color),
      const SizedBox(width: 6),
      Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.grey[700])),
    ],
  );

  Widget _curveCard({
    required String title,
    required Color color,
    required List<String> labels,
    required List<double> values,
    required String unitSuffix,
    bool asBarChart = false,
  }) {
    if (values.isEmpty) return const SizedBox.shrink();

    final minVal = values.reduce(math.min);
    final maxVal = values.reduce(math.max);
    final pad    = ((maxVal - minVal).abs() * 0.2) + 1;

    Widget chart;

    if (asBarChart) {
      chart = BarChart(BarChartData(
        minY: 0,
        maxY: maxVal + pad,
        gridData: FlGridData(show: true, drawVerticalLine: false, horizontalInterval: 1,
            getDrawingHorizontalLine: (_) => FlLine(color: Colors.grey.shade200, strokeWidth: 1)),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          topTitles:   const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          leftTitles:  AxisTitles(sideTitles: SideTitles(
            showTitles: true, reservedSize: 42,
            interval: (maxVal / 3).clamp(1, 1000),
            getTitlesWidget: (v, _) => Text('${v.toStringAsFixed(0)}$unitSuffix',
                style: TextStyle(fontSize: 9, color: Colors.grey.shade600)),
          )),
          bottomTitles: AxisTitles(sideTitles: SideTitles(
            showTitles: true,
            interval: labels.length > 6 ? 2 : 1,
            getTitlesWidget: (v, _) {
              final i = v.toInt();
              if (i < 0 || i >= labels.length) return const SizedBox.shrink();
              return Padding(padding: const EdgeInsets.only(top: 6),
                  child: Text(labels[i], style: TextStyle(fontSize: 10, color: Colors.grey.shade600)));
            },
          )),
        ),
        barGroups: List.generate(values.length, (i) => BarChartGroupData(x: i, barRods: [
          BarChartRodData(toY: values[i], color: color, width: 14,
              borderRadius: const BorderRadius.only(topLeft: Radius.circular(4), topRight: Radius.circular(4))),
        ])),
      ));
    } else {
      chart = LineChart(LineChartData(
        minX: 0, maxX: (values.length - 1).toDouble(),
        minY: minVal - pad, maxY: maxVal + pad,
        gridData: FlGridData(show: true, drawVerticalLine: false, horizontalInterval: 1,
            getDrawingHorizontalLine: (_) => FlLine(color: Colors.grey.shade200, strokeWidth: 1)),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          topTitles:   const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          leftTitles:  AxisTitles(sideTitles: SideTitles(
            showTitles: true, reservedSize: 42,
            interval: ((maxVal - minVal) / 3).clamp(1, 1000),
            getTitlesWidget: (v, _) => Text('${v.toStringAsFixed(0)}$unitSuffix',
                style: TextStyle(fontSize: 9, color: Colors.grey.shade600)),
          )),
          bottomTitles: AxisTitles(sideTitles: SideTitles(
            showTitles: true,
            interval: labels.length > 6 ? 2 : 1,
            getTitlesWidget: (v, _) {
              final i = v.toInt();
              if (i < 0 || i >= labels.length) return const SizedBox.shrink();
              return Padding(padding: const EdgeInsets.only(top: 6),
                  child: Text(labels[i], style: TextStyle(fontSize: 10, color: Colors.grey.shade600)));
            },
          )),
        ),
        lineBarsData: [
          LineChartBarData(
            spots: List.generate(values.length, (i) => FlSpot(i.toDouble(), values[i])),
            isCurved: true, color: color, barWidth: 3,
            dotData: FlDotData(show: true,
                getDotPainter: (_, __, ___, ____) => FlDotCirclePainter(radius: 2.8, color: color, strokeWidth: 0)),
            belowBarData: BarAreaData(show: true, color: color.withValues(alpha: 0.15)),
          ),
        ],
      ));
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          SizedBox(height: 180, child: chart),
        ],
      ),
    );
  }
}

// ── KPI pill (hero météo) ─────────────────────────────────────────────────────

class _WeatherKpiPill extends StatelessWidget {
  final String value, label;
  final IconData icon;
  final Color color;
  const _WeatherKpiPill(
      {required this.value,
      required this.label,
      required this.icon,
      required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
        ),
        child: Row(children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
                color: color.withValues(alpha: 0.45),
                borderRadius: BorderRadius.circular(8)),
            child: Icon(icon, size: 14, color: Colors.black54),
          ),
          const SizedBox(width: 8),
          Expanded(
              child:
                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(value,
                style: const TextStyle(
                    color: Colors.black87,
                    fontSize: 12,
                    fontWeight: FontWeight.w800),
                overflow: TextOverflow.ellipsis),
            Text(label,
                style: TextStyle(
                    color: Colors.grey.shade700, fontSize: 9),
                maxLines: 1,
                overflow: TextOverflow.ellipsis),
          ])),
        ]),
      ),
    );
  }
}
