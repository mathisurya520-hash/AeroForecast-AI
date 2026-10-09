const BASE_URL = 'http://localhost:8000/api';

/**
 * Handles API response checks and returns JSON data.
 */
async function handleResponse(response) {
  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch (e) {
      // Ignore parsing errors for empty/non-JSON responses
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

export const apiService = {
  /**
   * Search city name to get coordinates
   */
  async searchLocation(query) {
    const url = `${BASE_URL}/location/search?q=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    return handleResponse(response);
  },

  /**
   * Reverse geocode coordinates to get city/region name
   */
  async reverseGeocode(lat, lon) {
    const url = `${BASE_URL}/location/reverse?lat=${lat}&lon=${lon}`;
    const response = await fetch(url);
    return handleResponse(response);
  },

  /**
   * Fetch current air quality & weather
   */
  async getCurrentAirQuality(lat, lon) {
    const url = `${BASE_URL}/current-air-quality?lat=${lat}&lon=${lon}`;
    const response = await fetch(url);
    return handleResponse(response);
  },

  /**
   * Fetch predictions / forecast (24h, 48h, 72h)
   */
  async getForecast(lat, lon, duration = 24) {
    const url = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&duration=${duration}`;
    const response = await fetch(url);
    return handleResponse(response);
  },

  /**
   * Fetch historical trend data (days = 7, 30, etc.)
   */
  async getHistoricalData(lat, lon, days = 7) {
    const url = `${BASE_URL}/historical-data?lat=${lat}&lon=${lon}&days=${days}`;
    const response = await fetch(url);
    return handleResponse(response);
  },

  /**
   * Fetch evaluation metrics comparison
   */
  async getModelPerformance(lat, lon) {
    const url = `${BASE_URL}/model-performance?lat=${lat}&lon=${lon}`;
    const response = await fetch(url);
    return handleResponse(response);
  },

  /**
   * Fetch feature importance values for both models
   */
  async getFeatureImportance(lat, lon) {
    const url = `${BASE_URL}/feature-importance?lat=${lat}&lon=${lon}`;
    const response = await fetch(url);
    return handleResponse(response);
  },

  /**
   * Force retraining of models for a location
   */
  async forceRetrain(lat, lon) {
    const url = `${BASE_URL}/predict?lat=${lat}&lon=${lon}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return handleResponse(response);
  },

  // ==========================================
  // INDIA AIR QUALITY MODULE API METHODS
  // ==========================================

  /**
   * Fetch India overview total statistics (stations, cities, states, pollutants)
   */
  async getIndiaOverview() {
    const url = `${BASE_URL}/india/overview`;
    const response = await fetch(url);
    return handleResponse(response);
  },

  /**
   * Fetch list of available Indian states
   */
  async getIndiaStates() {
    const url = `${BASE_URL}/india/states`;
    const response = await fetch(url);
    return handleResponse(response);
  },

  /**
   * Fetch list of cities in India (optionally filtered by state)
   */
  async getIndiaCities(state = null) {
    const query = state ? `?state=${encodeURIComponent(state)}` : '';
    const url = `${BASE_URL}/india/cities${query}`;
    const response = await fetch(url);
    return handleResponse(response);
  },

  /**
   * Fetch/Search monitoring stations in India
   */
  async getIndiaStations(state = null, city = null, query = null) {
    const params = new URLSearchParams();
    if (state) params.append('state', state);
    if (city) params.append('city', city);
    if (query) params.append('query', query);
    
    const url = `${BASE_URL}/india/stations?${params.toString()}`;
    const response = await fetch(url);
    return handleResponse(response);
  },

  /**
   * Fetch current ground observation card for an Indian station
   */
  async getIndiaObservation(stationId) {
    const url = `${BASE_URL}/india/observations?station_id=${encodeURIComponent(stationId)}`;
    const response = await fetch(url);
    return handleResponse(response);
  },

  /**
   * Fetch historical trend data and analytical metrics for an Indian station
   */
  async getIndiaHistory(stationId, pollutant = 'NO2', period = '7d') {
    const url = `${BASE_URL}/india/history?station_id=${encodeURIComponent(stationId)}&pollutant=${encodeURIComponent(pollutant)}&period=${encodeURIComponent(period)}`;
    const response = await fetch(url);
    return handleResponse(response);
  },

  /**
   * Fetch AeroForecast AI ML Model predictions for an Indian station
   */
  async getIndiaForecast(stationId, pollutant = 'NO2') {
    const url = `${BASE_URL}/india/forecast?station_id=${encodeURIComponent(stationId)}&pollutant=${encodeURIComponent(pollutant)}`;
    const response = await fetch(url);
    return handleResponse(response);
  },

  /**
   * Fetch model comparison metrics for an Indian station
   */
  async getIndiaModelMetrics(stationId = 'TN_CHE_01') {
    const url = `${BASE_URL}/india/model-metrics?station_id=${encodeURIComponent(stationId)}`;
    const response = await fetch(url);
    return handleResponse(response);
  }
};

