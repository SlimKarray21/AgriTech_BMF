import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class WeatherData {
  final int temp;
  final int humidity;
  final int windSpeed;
  final int weatherCode;
  final List<dynamic> daily;
  final List<dynamic> hourlyTemp;
  final List<dynamic> dailyRain;

  WeatherData({
    required this.temp,
    required this.humidity,
    required this.windSpeed,
    required this.weatherCode,
    required this.daily,
    required this.hourlyTemp,
    required this.dailyRain,
  });
}

class WeatherScreen extends StatefulWidget {
  const WeatherScreen({Key? key}) : super(key: key);

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
          'https://api.open-meteo.com/v1/forecast?latitude=$latitude&longitude=$longitude&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum&hourly=temperature_2m&timezone=auto&forecast_days=7';
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
        for (int i = 0; i < 8; i++) {
          int idx = currentHour + i * 3;
          if (idx < data['hourly']['time'].length) {
            final tDate = DateTime.parse(data['hourly']['time'][idx]);
            hourlyTemp.add({
              "hour": "${tDate.hour}h",
              "temp": data['hourly']['temperature_2m'][idx].round(),
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
                  color: Colors.black.withOpacity(0.02),
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
                  color: Colors.black.withOpacity(0.02),
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
          const SizedBox(height: 32),
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
