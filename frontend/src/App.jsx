import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import StarfieldBackground from './components/StarfieldBackground';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Forecast from './pages/Forecast';
import Historical from './pages/Historical';
import Insights from './pages/Insights';
import About from './pages/About';
import IndiaModule from './pages/IndiaModule';
import { apiService } from './services/api';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  
  // Coordinates and Location details
  // Defaulting to Chennai, India as a baseline, marked as default
  const [lat, setLat] = useState(13.0827);
  const [lon, setLon] = useState(80.2707);
  const [locationName, setLocationName] = useState('Chennai, Tamil Nadu, India (Default)');
  const [locationSource, setLocationSource] = useState('default'); // 'default', 'gps', 'manual'
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  
  // API states
  const [currentAQ, setCurrentAQ] = useState(null);
  const [isAQLoading, setIsAQLoading] = useState(true);
  const [aqError, setAQError] = useState(null);
  
  const [forecastData, setForecastData] = useState(null);
  const [isForecastLoading, setIsForecastLoading] = useState(true);
  const [forecastError, setForecastError] = useState(null);

  // Request browser geolocation with high-accuracy + fallback
  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by this browser.");
      return;
    }
    
    setIsLocationLoading(true);

    const handleSuccess = async (position) => {
      const gpsLat = position.coords.latitude;
      const gpsLon = position.coords.longitude;
      try {
        const res = await apiService.reverseGeocode(gpsLat, gpsLon);
        setLat(gpsLat);
        setLon(gpsLon);
        setLocationName(res.name);
        setLocationSource('gps');
      } catch (err) {
        console.error("GPS Reverse geocoding failed", err);
        setLat(gpsLat);
        setLon(gpsLon);
        setLocationName(`Coordinates: ${gpsLat.toFixed(4)}, ${gpsLon.toFixed(4)}`);
        setLocationSource('gps');
      } finally {
        setIsLocationLoading(false);
      }
    };

    const handleFallback = () => {
      // Fall back to fast Wi-Fi / network geolocation if GPS sat lock times out
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        (error) => {
          console.warn("Geolocation access denied or timed out:", error.message);
          setIsLocationLoading(false);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    };

    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleFallback,
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
    );
  };

  // Trigger geolocation on load
  useEffect(() => {
    requestGeolocation();
  }, []);

  // Re-fetch current air quality when coordinates change
  useEffect(() => {
    async function loadCurrentAQ() {
      setIsAQLoading(true);
      setAQError(null);
      try {
        const data = await apiService.getCurrentAirQuality(lat, lon);
        setCurrentAQ(data);
      } catch (err) {
        console.error(err);
        setAQError(err.message || "Failed to load current air quality.");
      } finally {
        setIsAQLoading(false);
      }
    }
    loadCurrentAQ();
  }, [lat, lon]);

  const fetchForecastData = async (duration = 24) => {
    setIsForecastLoading(true);
    setForecastError(null);
    try {
      const data = await apiService.getForecast(lat, lon, duration);
      setForecastData(data);
    } catch (err) {
      console.error(err);
      setForecastError(err.message || "Failed to load forecast data.");
    } finally {
      setIsForecastLoading(false);
    }
  };

  const handleLocationSelect = async (newLat, newLon, newName, source = 'manual') => {
    setLat(newLat);
    setLon(newLon);
    if (newName) {
      setLocationName(newName);
      setLocationSource(source);
    } else {
      // If map click doesn't provide a name, reverse-geocode it
      setLocationName(`Coordinates: ${newLat.toFixed(4)}, ${newLon.toFixed(4)}`);
      setLocationSource(source);
      try {
        const res = await apiService.reverseGeocode(newLat, newLon);
        setLocationName(res.name);
      } catch (err) {
        console.error("Map click reverse geocoding failed", err);
      }
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <Home
            setCurrentPage={setCurrentPage}
            locationName={locationName}
            isLocationLoading={isLocationLoading}
            requestGeolocation={requestGeolocation}
            onLocationSelect={handleLocationSelect}
          />
        );
      case 'dashboard':
        return (
          <Dashboard
            lat={lat}
            lon={lon}
            locationName={locationName}
            isLocationLoading={isLocationLoading}
            locationSource={locationSource}
            currentAQ={currentAQ}
            isAQLoading={isAQLoading}
            aqError={aqError}
            onLocationSelect={handleLocationSelect}
            requestGeolocation={requestGeolocation}
          />
        );
      case 'forecast':
        return (
          <Forecast
            lat={lat}
            lon={lon}
            locationName={locationName}
            forecastData={forecastData}
            isForecastLoading={isForecastLoading}
            forecastError={forecastError}
            fetchForecastData={fetchForecastData}
            onLocationSelect={handleLocationSelect}
          />
        );
      case 'historical':
        return (
          <Historical
            lat={lat}
            lon={lon}
            locationName={locationName}
          />
        );
      case 'india':
        return (
          <IndiaModule
            onLocationSelect={handleLocationSelect}
            setCurrentPage={setCurrentPage}
          />
        );
      case 'insights':
        return (
          <Insights
            lat={lat}
            lon={lon}
            locationName={locationName}
          />
        );
      case 'about':
        return <About />;
      default:
        return (
          <Home
            setCurrentPage={setCurrentPage}
            locationName={locationName}
            isLocationLoading={isLocationLoading}
            requestGeolocation={requestGeolocation}
          />
        );
    }
  };

  return (
    <div className="app-container">
      <StarfieldBackground />
      
      <Header currentPage={currentPage} setCurrentPage={setCurrentPage} />
      
      <main className="main-content">
        {renderPage()}
      </main>

      <Footer />
    </div>
  );
}
