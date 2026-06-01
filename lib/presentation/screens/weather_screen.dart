import 'dart:convert';
import 'dart:math' as math;
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';

class WeatherData {
  final int temp;
  final int humidity;
  final int windSpeed;
  final int weatherCode;
  final List<dynamic> daily;
  final List<dynamic> hourlyTemp;
  final List<dynamic> hourlyWind;
  final List<dynamic> dailyRain;

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

class WeatherScreen extends StatefulWidget {
  const WeatherScreen({super.key});

  @override
  State<WeatherScreen> createState() => _WeatherScreenState();
}

class _WeatherScreenState extends State<WeatherScreen> {
  double _lat = 36.8065;
  double _lng = 10.1815;
  String _locationName = "Tunis";
  String _searchQuery = "";
  WeatherData? _weather;
  bool _loading = false;
  bool _searching = false;

  final TextEditingController _searchController = TextEditingController();

  Map<String, String> _getWeatherInfo(int code) {
    Map<int, Map<String, String>> descriptions = {
      0: {"desc": "Ciel dégagé", "icon": "☀️"},
      1: {"desc": "Principalement dégagé", "icon": "🌤️"},
      2: {"desc": "Partiellement nuageux", "icon": "⛅"},
      3: {"desc": "Couvert", "icon": "☁️"},
      45: {"desc": "Brouillard", "icon": "🌫️"},
      48: {"desc": "Brouillard givrant", "icon": "🌫️"},
      51: {"desc": "Bruine légère", "icon": "🌦️"},
      53: {"desc": "Bruine modérée", "icon": "🌦️"},
      55: {"desc": "Bruine dense", "icon": "🌧️"},
      61: {"desc": "Pluie légère", "icon": "🌦️"},
      63: {"desc": "Pluie modérée", "icon": "🌧️"},
      65: {"desc": "Pluie forte", "icon": "🌧️"},
      71: {"desc": "Neige légère", "icon": "🌨️"},
      73: {"desc": "Neige modérée", "icon": "🌨️"},
      75: {"desc": "Neige forte", "icon": "❄️"},
      80: {"desc": "Averses légères", "icon": "🌦️"},
      81: {"desc": "Averses modérées", "icon": "🌧️"},
      82: {"desc": "Averses violentes", "icon": "⛈️"},
      95: {"desc": "Orage", "icon": "⛈️"},
    };

    return descriptions[code] ?? {"desc": "—", "icon": "🌡️"};
  }

  Future<void> _fetchWeather(double latitude, double longitude) async {
    setState(() {
      _loading = true;
    });

    try {
      final url =
          'https://api.open-meteo.com/v1/forecast?latitude=$latitude&longitude=$longitude&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum&hourly=temperature_2m,wind_speed_10m&timezone=auto&forecast_days=7';
      final response = await http.get(Uri.parse(url));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);

        final List<String> dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

        List<dynamic> daily = [];
        for (int i = 0; i < 5; i++) {
          final date = DateTime.parse(data['daily']['time'][i]);
          daily.add({
            "day": i == 0 ? "Auj." : dayNames[date.weekday % 7],
            "tempMax": data['daily']['temperature_2m_max'][i].round(),
            "tempMin": data['daily']['temperature_2m_min'][i].round(),
            "weatherCode": data['daily']['weather_code'][i],
          });
        }

        final now = DateTime.now();
        int currentHour = now.hour;
        List<dynamic> hourlyTemp = [];
        List<dynamic> hourlyWind = [];
        for (int i = 0; i < 8; i++) {
          int idx = currentHour + i * 3;
          if (idx < data['hourly']['time'].length) {
            final tDate = DateTime.parse(data['hourly']['time'][idx]);
            hourlyTemp.add({
              "hour": "${tDate.hour}h",
              "temp": data['hourly']['temperature_2m'][idx].round(),
            });
            hourlyWind.add({
              "hour": "${tDate.hour}h",
              "wind": data['hourly']['wind_speed_10m'][idx].round(),
            });
          }
        }

        List<dynamic> dailyRain = [];
        for (int i = 0; i < 7; i++) {
          final date = DateTime.parse(data['daily']['time'][i]);
          dailyRain.add({
            "day": dayNames[date.weekday % 7],
            "rain": (data['daily']['precipitation_sum'][i] * 10).round() / 10,
          });
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
      }
    } catch (e) {
      debugPrint("Weather fetch error: $e");
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  Future<void> _handleSearch() async {
    if (_searchQuery.trim().isEmpty) return;
    setState(() {
      _searching = true;
    });

    try {
      final query = Uri.encodeComponent(_searchQuery);
      final url =
          'https://nominatim.openstreetmap.org/search?format=json&q=$query&limit=1&accept-language=fr';
      final response = await http.get(Uri.parse(url));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data.isNotEmpty) {
          final newLat = double.parse(data[0]['lat'].toString());
          final newLng = double.parse(data[0]['lon'].toString());
          setState(() {
            _lat = newLat;
            _lng = newLng;
            _locationName = data[0]['display_name'].split(",")[0];
          });
          _fetchWeather(newLat, newLng);
          _searchController.clear();
          _searchQuery = "";
        }
      }
    } catch (e) {
      debugPrint("Search error: $e");
    } finally {
      setState(() {
        _searching = false;
      });
    }
  }

  @override
  void initState() {
    super.initState();
    _fetchWeather(_lat, _lng);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Search bar
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Météo',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: Colors.black,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            height: 48,
                            decoration: BoxDecoration(
                              color: Colors.grey[100],
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: TextField(
                              controller: _searchController,
                              onChanged: (val) => _searchQuery = val,
                              onSubmitted: (_) => _handleSearch(),
                              decoration: const InputDecoration(
                                prefixIcon: Icon(Icons.search, color: Colors.grey, size: 20),
                                hintText: 'Rechercher un lieu...',
                                border: InputBorder.none,
                                contentPadding: EdgeInsets.symmetric(vertical: 14),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        SizedBox(
                          height: 48,
                          child: ElevatedButton(
                            onPressed: _searching ? null : _handleSearch,
                            style: ElevatedButton.styleFrom(
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                              elevation: 0,
                              backgroundColor: Colors.black,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                            ),
                            child: _searching
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Icon(Icons.search, size: 20),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: _buildMapCard(),
              ),
              const SizedBox(height: 16),

              if (_loading && _weather == null)
                const Padding(
                  padding: EdgeInsets.all(48.0),
                  child: Center(
                    child: CircularProgressIndicator(color: Colors.black),
                  ),
                )
              else if (_weather != null)
                _buildWeatherContent(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMapCard() {
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
          const Padding(
            padding: EdgeInsets.only(left: 6, top: 2, bottom: 8),
            child: Text(
              'Localisation',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
            ),
          ),
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: SizedBox(
              height: 190,
              child: FlutterMap(
                key: ValueKey('$_lat,$_lng'),
                options: MapOptions(
                  initialCenter: LatLng(_lat, _lng),
                  initialZoom: 9.5,
                ),
                children: [
                  TileLayer(
                    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: 'com.uiearth.mobile',
                  ),
                  MarkerLayer(
                    markers: [
                      Marker(
                        point: LatLng(_lat, _lng),
                        width: 42,
                        height: 42,
                        child: const Icon(
                          Icons.location_on,
                          color: Colors.red,
                          size: 36,
                        ),
                      ),
                    ],
                  ),
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
                child: Text(
                  _locationName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: Colors.grey.shade700,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildWeatherContent() {
    final info = _getWeatherInfo(_weather!.weatherCode);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        children: [
          // Current weather
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.grey.shade200),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${_weather!.temp}°C',
                          style: const TextStyle(
                            fontSize: 48,
                            fontWeight: FontWeight.w800,
                            height: 1,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          info["desc"]!,
                          style: TextStyle(
                            fontSize: 16,
                            color: Colors.grey[600],
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.location_on, size: 14, color: Colors.green),
                            const SizedBox(width: 4),
                            Text(
                              _locationName,
                              style: const TextStyle(
                                fontSize: 14,
                                color: Colors.green,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    Text(
                      info["icon"]!,
                      style: const TextStyle(fontSize: 64),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildStatItem(Icons.water_drop, Colors.blue, '${_weather!.humidity}%'),
                    _buildStatItem(Icons.air, Colors.grey, '${_weather!.windSpeed} km/h'),
                    _buildStatItem(Icons.thermostat, Colors.orange, 'Réel'),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Daily Weather
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.grey.shade200),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Prévisions 5 jours',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                Column(
                  children: _weather!.daily.map((day) {
                    final dayInfo = _getWeatherInfo(day['weatherCode']);
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          SizedBox(
                            width: 50,
                            child: Text(
                              day['day'],
                              style: TextStyle(
                                fontWeight: FontWeight.w600,
                                color: Colors.grey[800],
                              ),
                            ),
                          ),
                          Text(dayInfo["icon"]!, style: const TextStyle(fontSize: 20)),
                          Row(
                            children: [
                              Text(
                                '${day['tempMax']}°',
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '${day['tempMin']}°',
                                style: TextStyle(color: Colors.grey[500]),
                              ),
                            ],
                          )
                        ],
                      ),
                    );
                  }).toList(),
                )
              ],
            ),
          ),
          const SizedBox(height: 20),

          _buildCurveCard(
            title: 'Température (24h)',
            color: Colors.orange,
            labels: _weather!.hourlyTemp
                .map<String>((p) => p['hour'].toString())
                .toList(growable: false),
            values: _weather!.hourlyTemp
                .map<double>((p) => (p['temp'] as num).toDouble())
                .toList(growable: false),
            unitSuffix: '°C',
          ),
          const SizedBox(height: 20),

          _buildCurveCard(
            title: 'Précipitations (7 jours)',
            color: Colors.blue,
            labels: _weather!.dailyRain
                .map<String>((p) => p['day'].toString())
                .toList(growable: false),
            values: _weather!.dailyRain
                .map<double>((p) => (p['rain'] as num).toDouble())
                .toList(growable: false),
            unitSuffix: ' mm',
            asBarChart: true,
          ),
          const SizedBox(height: 20),

          _buildCurveCard(
            title: 'Vent (24h)',
            color: Colors.teal,
            labels: _weather!.hourlyWind
                .map<String>((p) => p['hour'].toString())
                .toList(growable: false),
            values: _weather!.hourlyWind
                .map<double>((p) => (p['wind'] as num).toDouble())
                .toList(growable: false),
            unitSuffix: ' km/h',
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildCurveCard({
    required String title,
    required Color color,
    required List<String> labels,
    required List<double> values,
    required String unitSuffix,
    bool curved = true,
    bool asBarChart = false,
  }) {
    if (values.isEmpty) return const SizedBox.shrink();

    final minValue = values.reduce(math.min);
    final maxValue = values.reduce(math.max);
    final padding = ((maxValue - minValue).abs() * 0.2) + 1;

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
          Text(
            title,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 180,
            child: asBarChart
                ? BarChart(
                    BarChartData(
                      minY: 0,
                      maxY: maxValue + padding,
                      gridData: FlGridData(
                        show: true,
                        drawVerticalLine: false,
                        horizontalInterval: 1,
                        getDrawingHorizontalLine: (_) => FlLine(
                          color: Colors.grey.shade200,
                          strokeWidth: 1,
                        ),
                      ),
                      borderData: FlBorderData(show: false),
                      titlesData: FlTitlesData(
                        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        leftTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            reservedSize: 40,
                            interval: (maxValue / 3).clamp(1, 1000),
                            getTitlesWidget: (value, _) => Text(
                              '${value.toStringAsFixed(0)}$unitSuffix',
                              style: TextStyle(fontSize: 9, color: Colors.grey.shade600),
                            ),
                          ),
                        ),
                        bottomTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            interval: values.length > 6 ? 2 : 1,
                            getTitlesWidget: (value, _) {
                              final idx = value.toInt();
                              if (idx < 0 || idx >= labels.length) return const SizedBox.shrink();
                              return Padding(
                                padding: const EdgeInsets.only(top: 6),
                                child: Text(
                                  labels[idx],
                                  style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
                                ),
                              );
                            },
                          ),
                        ),
                      ),
                      barGroups: List<BarChartGroupData>.generate(
                        values.length,
                        (i) => BarChartGroupData(
                          x: i,
                          barRods: [
                            BarChartRodData(
                              toY: values[i],
                              color: color,
                              width: 14,
                              borderRadius: const BorderRadius.only(
                                topLeft: Radius.circular(4),
                                topRight: Radius.circular(4),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  )
                : LineChart(
                    LineChartData(
                      minX: 0,
                      maxX: (values.length - 1).toDouble(),
                      minY: minValue - padding,
                      maxY: maxValue + padding,
                      gridData: FlGridData(
                        show: true,
                        drawVerticalLine: false,
                        horizontalInterval: 1,
                        getDrawingHorizontalLine: (_) => FlLine(
                          color: Colors.grey.shade200,
                          strokeWidth: 1,
                        ),
                      ),
                      borderData: FlBorderData(show: false),
                      titlesData: FlTitlesData(
                        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        leftTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            reservedSize: 40,
                            interval: ((maxValue - minValue) / 3).clamp(1, 1000),
                            getTitlesWidget: (value, _) => Text(
                              '${value.toStringAsFixed(0)}$unitSuffix',
                              style: TextStyle(fontSize: 9, color: Colors.grey.shade600),
                            ),
                          ),
                        ),
                        bottomTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            interval: values.length > 6 ? 2 : 1,
                            getTitlesWidget: (value, _) {
                              final idx = value.toInt();
                              if (idx < 0 || idx >= labels.length) return const SizedBox.shrink();
                              return Padding(
                                padding: const EdgeInsets.only(top: 6),
                                child: Text(
                                  labels[idx],
                                  style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
                                ),
                              );
                            },
                          ),
                        ),
                      ),
                      lineBarsData: [
                        LineChartBarData(
                          spots: List<FlSpot>.generate(
                            values.length,
                            (i) => FlSpot(i.toDouble(), values[i]),
                          ),
                          isCurved: curved,
                          color: color,
                          barWidth: 3,
                          dotData: FlDotData(
                            show: true,
                            getDotPainter: (_, __, ___, ____) => FlDotCirclePainter(
                              radius: 2.8,
                              color: color,
                              strokeWidth: 0,
                            ),
                          ),
                          belowBarData: BarAreaData(
                            show: true,
                            color: color.withValues(alpha: 0.15),
                          ),
                        ),
                      ],
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(IconData icon, Color color, String value) {
    return Row(
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: 6),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Colors.grey[700],
          ),
        ),
      ],
    );
  }
}
