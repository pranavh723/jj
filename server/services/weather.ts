export interface WeatherData {
  temperature: number;
  cloudCover: number;
  windSpeed: number;
  solarIrradiance: number;
  timestamp: Date;
}

export class WeatherService {
  private readonly openMeteoBaseUrl = 'https://api.open-meteo.com/v1';

  async fetchWeatherForecast(latitude: number, longitude: number, hours: number = 48): Promise<WeatherData[]> {
    try {
      const url = new URL(`${this.openMeteoBaseUrl}/forecast`);
      url.searchParams.set('latitude', latitude.toString());
      url.searchParams.set('longitude', longitude.toString());
      url.searchParams.set('hourly', 'temperature_2m,cloudcover,windspeed_10m,shortwave_radiation');
      url.searchParams.set('forecast_days', Math.ceil(hours / 24).toString());
      url.searchParams.set('timezone', 'auto');

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();
      const hourlyData = data.hourly;

      const weatherData: WeatherData[] = [];
      for (let i = 0; i < Math.min(hours, hourlyData.time.length); i++) {
        weatherData.push({
          temperature: hourlyData.temperature_2m[i],
          cloudCover: hourlyData.cloudcover[i],
          windSpeed: hourlyData.windspeed_10m[i],
          solarIrradiance: hourlyData.shortwave_radiation[i] || 0,
          timestamp: new Date(hourlyData.time[i])
        });
      }

      return weatherData;
    } catch (error) {
      console.error('Error fetching weather data:', error);
      throw new Error('Failed to fetch weather data');
    }
  }

  async getCurrentWeather(latitude: number, longitude: number): Promise<WeatherData> {
    try {
      const url = new URL(`${this.openMeteoBaseUrl}/forecast`);
      url.searchParams.set('latitude', latitude.toString());
      url.searchParams.set('longitude', longitude.toString());
      url.searchParams.set('current', 'temperature_2m,cloudcover,windspeed_10m');
      url.searchParams.set('timezone', 'auto');

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();
      const current = data.current;

      return {
        temperature: current.temperature_2m,
        cloudCover: current.cloudcover,
        windSpeed: current.windspeed_10m,
        solarIrradiance: 0, // Not available in current weather
        timestamp: new Date(current.time)
      };
    } catch (error) {
      console.error('Error fetching current weather:', error);
      throw new Error('Failed to fetch current weather');
    }
  }
}

export const weatherService = new WeatherService();
