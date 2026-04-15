import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:intl/intl.dart';

import '../../../data/services/weather_service.dart';
import '../../widgets/weather_map_widget.dart';

class WeatherScreen extends StatefulWidget {
  const WeatherScreen({Key? key}) : super(key: key);

  @override
  State<WeatherScreen> createState() => _WeatherScreenState();
}

class _WeatherScreenState extends State<WeatherScreen> {
  LatLng? _currentPosition;
  WeatherData? _weatherData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _checkPermissionsAndGetLocation();
  }

  Future<void> _checkPermissionsAndGetLocation() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      _showError('Les services de localisation sont désactivés.');
      return;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        _showError('Les permissions de localisation sont refusées.');
        return;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      _showError('Les permissions de localisation sont définitivement refusées.');
      return;
    }

    final position = await Geolocator.getCurrentPosition();
    _updateLocation(LatLng(position.latitude, position.longitude));
  }

  Future<void> _updateLocation(LatLng newLocation) async {
    setState(() {
      _currentPosition = newLocation;
      _isLoading = true;
    });

    try {
      final weather = await WeatherService.fetchWeatherByLocation(
          newLocation.latitude, newLocation.longitude);
      setState(() {
        _weatherData = weather;
        _isLoading = false;
      });
    } catch (e) {
      _showError('Erreur de chargement de la météo : $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message), backgroundColor: Colors.red));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Météo & Irrigation'),
        centerTitle: true,
      ),
      body: Column(
        children: [
          Expanded(
            flex: 4,
            child: _currentPosition == null
                ? const Center(child: CircularProgressIndicator())
                : MapWidget(
                    initialPosition: _currentPosition!,
                    onLocationSelected: _updateLocation,
                  ),
          ),
          
          Expanded(
            flex: 6,
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _weatherData != null
                    ? _buildWeatherDetails(theme)
                    : const Center(child: Text('Sélectionnez un lieu')),
          ),
        ],
      ),
    );
  }

  Widget _buildWeatherDetails(ThemeData theme) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Card(
            color: _weatherData!.irrigationRecommended ? Colors.green.shade100 : Colors.orange.shade100,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            elevation: 2,
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  Icon(
                    _weatherData!.irrigationRecommended ? Icons.water_drop : Icons.grass,
                    color: _weatherData!.irrigationRecommended ? Colors.green.shade700 : Colors.orange.shade700,
                    size: 40,
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Recommandation d\'Irrigation',
                          style: theme.textTheme.titleMedium?.copyWith(
                            color: Colors.black87,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          _weatherData!.irrigationRecommended ? 'OUI - Conditions sèches' : 'NON - Pas nécessaire',
                          style: theme.textTheme.titleLarge?.copyWith(
                            color: _weatherData!.irrigationRecommended ? Colors.green.shade800 : Colors.orange.shade800,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            elevation: 2,
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  Text(
                    WeatherService.getWeatherIcon(_weatherData!.weatherCode),
                    style: const TextStyle(fontSize: 60),
                  ),
                  Text(
                    '${_weatherData!.temperature}°C',
                    style: theme.textTheme.displaySmall?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  Text(
                    WeatherService.getWeatherDescription(_weatherData!.weatherCode),
                    style: theme.textTheme.titleMedium,
                  ),
                  const Divider(height: 32),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _buildWeatherStat(Icons.water_drop_outlined, '${_weatherData!.humidity}%', 'Humidité'),
                      _buildWeatherStat(Icons.air, '${_weatherData!.windSpeed} km/h', 'Vent'),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          Text(
            'Prévisions sur 5 jours',
            style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 120,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: _weatherData!.forecast.length,
              itemBuilder: (context, index) {
                final forecast = _weatherData!.forecast[index];
                return Card(
                  margin: const EdgeInsets.only(right: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 1,
                  child: Container(
                    width: 90,
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        Text(
                          DateFormat('E').format(forecast.date),
                          style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        Text(
                          WeatherService.getWeatherIcon(forecast.weatherCode),
                          style: const TextStyle(fontSize: 24),
                        ),
                        Text(
                          '${forecast.temperature}°C',
                          style: theme.textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWeatherStat(IconData icon, String value, String label) {
    return Column(
      children: [
        Icon(icon, size: 28, color: Colors.blueGrey),
        const SizedBox(height: 8),
        Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        Text(label, style: const TextStyle(color: Colors.grey)),
      ],
    );
  }
}
