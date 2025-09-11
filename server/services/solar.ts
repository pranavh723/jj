import type { WeatherData } from './weather';

interface PvSystemConfig {
  capacityKw: number;
  tilt: number; // degrees
  azimuth: number; // degrees (south = 180)
  latitude: number;
  longitude: number;
  systemLosses?: number; // percentage (default 14%)
}

interface PvOutput {
  timestamp: Date;
  acPowerKw: number;
  dcPowerKw: number;
  efficiency: number;
}

export class SolarService {
  private readonly systemLosses = 0.14; // 14% system losses (inverter, cables, dust, etc.)

  /**
   * Calculate solar panel output using simplified PV modeling
   * Based on principles similar to pvlib but implemented for our use case
   */
  calculatePvOutput(config: PvSystemConfig, weatherData: WeatherData[]): PvOutput[] {
    return weatherData.map(weather => {
      const pvOutput = this.calculateHourlyPvOutput(config, weather);
      return {
        timestamp: weather.timestamp,
        acPowerKw: pvOutput.acPowerKw,
        dcPowerKw: pvOutput.dcPowerKw,
        efficiency: pvOutput.efficiency
      };
    });
  }

  private calculateHourlyPvOutput(config: PvSystemConfig, weather: WeatherData): PvOutput {
    // Get solar position
    const solarPosition = this.calculateSolarPosition(
      config.latitude,
      config.longitude,
      weather.timestamp
    );

    // Calculate incident irradiance on tilted surface
    const incidentIrradiance = this.calculateIncidentIrradiance(
      weather.solarIrradiance,
      solarPosition.elevation,
      solarPosition.azimuth,
      config.tilt,
      config.azimuth
    );

    // Apply cloud cover reduction
    const cloudReduction = 1 - (weather.cloudCover / 100) * 0.75;
    const effectiveIrradiance = incidentIrradiance * cloudReduction;

    // Calculate DC power output
    const standardIrradiance = 1000; // W/m² (STC)
    const irradianceRatio = Math.max(0, effectiveIrradiance / standardIrradiance);
    
    // Temperature derating (simplified)
    const tempCoeff = -0.004; // %/°C
    const standardTemp = 25; // °C
    const tempDerate = 1 + tempCoeff * (weather.temperature - standardTemp);
    
    const dcPowerKw = config.capacityKw * irradianceRatio * tempDerate;
    
    // Apply system losses and inverter efficiency
    const losses = config.systemLosses ?? this.systemLosses;
    const acPowerKw = Math.max(0, dcPowerKw * (1 - losses));
    
    const efficiency = config.capacityKw > 0 ? (acPowerKw / config.capacityKw) : 0;

    return {
      acPowerKw: Math.round(acPowerKw * 1000) / 1000, // Round to 3 decimal places
      dcPowerKw: Math.round(dcPowerKw * 1000) / 1000,
      efficiency: Math.round(efficiency * 1000) / 1000
    };
  }

  private calculateSolarPosition(latitude: number, longitude: number, timestamp: Date) {
    // Simplified solar position calculation
    const dayOfYear = this.getDayOfYear(timestamp);
    const hour = timestamp.getHours() + timestamp.getMinutes() / 60;
    
    // Solar declination
    const declination = 23.45 * Math.sin(Math.PI * (284 + dayOfYear) / 365 * Math.PI / 180);
    
    // Hour angle
    const solarTime = hour + (longitude - timestamp.getTimezoneOffset() * 4) / 60;
    const hourAngle = 15 * (solarTime - 12);
    
    // Solar elevation
    const latRad = latitude * Math.PI / 180;
    const declRad = declination * Math.PI / 180;
    const hourRad = hourAngle * Math.PI / 180;
    
    const elevation = Math.asin(
      Math.sin(latRad) * Math.sin(declRad) +
      Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourRad)
    ) * 180 / Math.PI;
    
    // Solar azimuth (simplified)
    const azimuth = 180 + Math.atan2(
      Math.sin(hourRad),
      Math.cos(hourRad) * Math.sin(latRad) - Math.tan(declRad) * Math.cos(latRad)
    ) * 180 / Math.PI;
    
    return {
      elevation: Math.max(0, elevation),
      azimuth: ((azimuth % 360) + 360) % 360
    };
  }

  private calculateIncidentIrradiance(
    directIrradiance: number,
    solarElevation: number,
    solarAzimuth: number,
    panelTilt: number,
    panelAzimuth: number
  ): number {
    if (solarElevation <= 0) return 0;
    
    // Convert to radians
    const elevRad = solarElevation * Math.PI / 180;
    const azimuthDiff = (solarAzimuth - panelAzimuth) * Math.PI / 180;
    const tiltRad = panelTilt * Math.PI / 180;
    
    // Angle of incidence calculation
    const cosIncidence = Math.sin(elevRad) * Math.cos(tiltRad) +
                        Math.cos(elevRad) * Math.sin(tiltRad) * Math.cos(azimuthDiff);
    
    // Ensure positive values only
    const incidenceRatio = Math.max(0, cosIncidence);
    
    return directIrradiance * incidenceRatio;
  }

  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate potential energy savings for shifting load to solar hours
   */
  calculateEnergyOptimization(
    pvOutput: PvOutput[],
    deviceConsumption: number, // kWh
    tariffPerKwh: number,
    co2FactorKgPerKwh: number
  ): { bestHours: number[], savings: number, co2Avoided: number } {
    // Find hours with highest solar output
    const solarHours = pvOutput
      .map((output, index) => ({
        hour: index,
        solarPower: output.acPowerKw,
        timestamp: output.timestamp
      }))
      .filter(h => h.solarPower > 0.1) // Filter meaningful solar output
      .sort((a, b) => b.solarPower - a.solarPower);

    const bestHours = solarHours.slice(0, 3).map(h => h.hour);
    
    // Calculate savings (assuming device runs during peak solar vs grid)
    const savings = deviceConsumption * tariffPerKwh;
    const co2Avoided = deviceConsumption * co2FactorKgPerKwh;

    return {
      bestHours,
      savings,
      co2Avoided
    };
  }
}

export const solarService = new SolarService();
