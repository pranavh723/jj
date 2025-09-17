import { storage } from "../storage";
import { weatherService } from "../services/weather";
import { solarService } from "../services/solar";
import { recommendationService } from "../services/recommendations";
import { aiDataGenerator } from "../services/aiDataGenerator";
import { normalizeApplianceName } from "@shared/applianceUtils";
import type { Household } from "@shared/schema";

export class SchedulerService {
  /**
   * Hourly job: Fetch weather data and generate PV forecasts
   */
  async runHourlyJob(): Promise<void> {
    console.log('Running hourly weather and PV forecast job...');
    
    try {
      // Get all households
      const households = await this.getAllActiveHouseholds();
      
      for (const household of households) {
        await this.updateHouseholdForecasts(household.id, household.latitude, household.longitude);
      }
      
      console.log(`Updated forecasts for ${households.length} households`);
    } catch (error) {
      console.error('Error in hourly job:', error);
    }
  }

  /**
   * Auto-ingest job: Continuously feed mock data into the database for simulation
   */
  async runAutoIngestJob(): Promise<void> {
    try {
      // Get all active users for data generation
      const households = await this.getAllActiveHouseholds();
      
      if (households.length === 0) {
        return; // No households to simulate data for
      }
      
      // Generate mock appliance readings for random users
      for (let i = 0; i < Math.min(3, households.length); i++) {
        const randomHousehold = households[Math.floor(Math.random() * households.length)];
        
        // Generate realistic AI-powered appliance reading data
        const applianceData = await this.generateRealisticApplianceData(randomHousehold.id);
        await this.ingestApplianceReading(randomHousehold.userId, applianceData);
        
        // Generate realistic battery data (50% chance for more data)
        if (Math.random() < 0.5) {
          const batteryData = await this.generateRealisticBatteryData();
          await this.ingestBatteryLog(randomHousehold.userId, batteryData);
        }
      }
      
    } catch (error) {
      console.error('Error in auto-ingest job:', error);
    }
  }

  /**
   * Daily job: Generate recommendations for all households
   */
  async runDailyJob(): Promise<void> {
    console.log('Running daily recommendations job...');
    
    try {
      const households = await this.getAllActiveHouseholds();
      
      for (const household of households) {
        await recommendationService.generateRecommendations(household.id);
      }
      
      console.log(`Generated recommendations for ${households.length} households`);
      
      // Optional: Send notifications via Telegram if token is configured
      if (process.env.TELEGRAM_BOT_TOKEN) {
        await this.sendDailyNotifications();
      }
    } catch (error) {
      console.error('Error in daily job:', error);
    }
  }

  private async getAllActiveHouseholds(): Promise<Household[]> {
    try {
      // Get all households - we'll need to fetch them by getting all user households
      // This is a simplified approach - in production you'd optimize this
      const households = await storage.getAllHouseholds();
      return households;
    } catch (error) {
      console.error('Error getting households:', error);
      return [] as Household[];
    }
  }

  private async updateHouseholdForecasts(householdId: string, latitude: number, longitude: number): Promise<void> {
    try {
      // Fetch 48 hours of weather data
      const weatherData = await weatherService.fetchWeatherForecast(latitude, longitude, 48);
      
      // Convert to storage format and upsert
      const weatherRecords = weatherData.map(data => ({
        householdId,
        timestamp: data.timestamp,
        tempC: data.temperature,
        cloudsPct: data.cloudCover,
        windMps: data.windSpeed,
        ghiProxy: data.solarIrradiance
      }));
      
      await storage.upsertWeatherHourly(weatherRecords);
      
      // Get household PV configuration
      const household = await storage.getHousehold(householdId);
      if (!household) return;
      
      // Calculate PV output
      const pvConfig = {
        capacityKw: household.pvKw,
        tilt: household.tilt || 30,
        azimuth: household.azimuth || 180,
        latitude: household.latitude,
        longitude: household.longitude
      };
      
      const pvOutputs = solarService.calculatePvOutput(pvConfig, weatherData);
      
      // Convert to storage format and upsert
      const pvRecords = pvOutputs.map(output => ({
        householdId,
        timestamp: output.timestamp,
        acKw: output.acPowerKw
      }));
      
      await storage.upsertPvForecastHourly(pvRecords);
      
    } catch (error) {
      console.error(`Error updating forecasts for household ${householdId}:`, error);
    }
  }

  private async sendDailyNotifications(): Promise<void> {
    // Placeholder for Telegram notifications
    // Implementation would depend on having user Telegram chat IDs stored
    console.log('Daily notifications would be sent here if Telegram is configured');
  }

  private async generateRealisticApplianceData(householdId: string): Promise<any> {
    // Get actual devices for this household
    const devices = await storage.getDevicesByHouseholdId(householdId);
    const currentHour = new Date().getHours();
    const season = this.getCurrentSeason();
    
    let applianceName: string;
    
    if (devices.length === 0) {
      // Fallback to realistic appliance names based on typical Indian households
      const realisticAppliances = [
        'Refrigerator', 'Air Conditioner', 'Washing Machine', 'Dishwasher', 
        'Microwave', 'Water Heater', 'Television', 'LED Lights', 
        'Ceiling Fan', 'Electric Oven', 'Vacuum Cleaner'
      ];
      applianceName = realisticAppliances[Math.floor(Math.random() * realisticAppliances.length)];
    } else {
      // Use actual device from the household
      const randomDevice = devices[Math.floor(Math.random() * devices.length)];
      applianceName = randomDevice.name;
    }
    
    // Generate AI-powered realistic data
    try {
      const aiData = await aiDataGenerator.generateRealisticApplianceData(
        applianceName,
        currentHour,
        season,
        4 // typical household size
      );
      
      console.log(`AI-Generated: ${applianceName} @ ${aiData.powerWatts}W (${aiData.operatingState})`);
      
      return {
        applianceName: aiData.applianceName,
        powerWatts: aiData.powerWatts,
        timestamp: aiData.timestamp,
        operatingState: aiData.operatingState,
        efficiency: aiData.efficiency,
        temperature: aiData.temperature,
        humidity: aiData.humidity
      };
    } catch (error) {
      console.error('Error generating AI appliance data, using fallback:', error);
      // Fallback to simple realistic data if AI fails
      return this.getFallbackApplianceData(applianceName, currentHour);
    }
  }

  private async generateRealisticBatteryData(): Promise<any> {
    const currentHour = new Date().getHours();
    const weatherCondition = await this.getCurrentWeatherCondition();
    const solarGeneration = await this.getCurrentSolarGeneration();
    
    try {
      // Generate AI-powered realistic battery data
      const aiData = await aiDataGenerator.generateRealisticBatteryData(
        currentHour,
        weatherCondition,
        solarGeneration
      );
      
      console.log(`AI-Battery: SoC ${aiData.socPercent}% | ${aiData.chargingState} @ ${aiData.current}A`);
      
      return {
        socPercent: aiData.socPercent,
        dodPercent: aiData.dodPercent,
        cycleCount: aiData.cycleCount,
        voltage: aiData.voltage,
        current: aiData.current,
        temperature: aiData.temperature,
        timestamp: aiData.timestamp,
        chargingState: aiData.chargingState,
        healthScore: aiData.healthScore
      };
    } catch (error) {
      console.error('Error generating AI battery data, using fallback:', error);
      // Fallback to basic realistic data if AI fails
      return this.getFallbackBatteryData(currentHour);
    }
  }

  private async ingestApplianceReading(userId: string, applianceData: any): Promise<void> {
    try {
      // Create appliance reading with realistic AI-generated fields
      const reading = await storage.createApplianceReading({
        userId,
        applianceName: applianceData.applianceName,
        powerWatts: applianceData.powerWatts,
        timestamp: applianceData.timestamp,
        operatingState: applianceData.operatingState,
        efficiency: applianceData.efficiency,
        temperature: applianceData.temperature,
        humidity: applianceData.humidity
      });

      // Enhanced anomaly detection with specific power thresholds
      const anomalies = await this.detectPowerAnomalies(userId, applianceData, reading.id);
      
      // Store detected anomalies
      for (const anomaly of anomalies) {
        await storage.createApplianceAnomaly(anomaly);
      }
      
      if (anomalies.length > 0) {
        console.log(`Auto-ingest: Detected ${anomalies.length} anomalies for ${applianceData.applianceName}: ${anomalies.map(a => a.severity).join(', ')}`);
      }
    } catch (error) {
      console.error('Error ingesting appliance reading:', error);
    }
  }

  private async ingestBatteryLog(userId: string, batteryData: any): Promise<void> {
    try {
      await storage.createBatteryLog({
        userId,
        socPercent: batteryData.socPercent,
        dodPercent: batteryData.dodPercent,
        cycleCount: batteryData.cycleCount,
        timestamp: batteryData.timestamp,
        voltage: batteryData.voltage,
        current: batteryData.current,
        temperature: batteryData.temperature,
        chargingState: batteryData.chargingState,
        healthScore: batteryData.healthScore
      });
      
      console.log(`Auto-ingest: Battery log added - SoC: ${batteryData.socPercent}%, DoD: ${batteryData.dodPercent}%`);
    } catch (error) {
      console.error('Error ingesting battery log:', error);
    }
  }

  private async detectPowerAnomalies(userId: string, applianceData: any, readingId: string): Promise<any[]> {
    const anomalies = [];
    const powerWatts = applianceData.powerWatts;
    
    // Power-based anomaly detection as requested
    if (powerWatts > 1800) {
      anomalies.push({
        applianceReadingId: readingId,
        timestamp: applianceData.timestamp,
        anomalyType: 'Power Spike Critical',
        severity: 'critical'
      });
    } else if (powerWatts > 1500) {
      anomalies.push({
        applianceReadingId: readingId,
        timestamp: applianceData.timestamp,
        anomalyType: 'Power Spike Warning',
        severity: 'warning'
      });
    } else {
      // Normal power consumption
      anomalies.push({
        applianceReadingId: readingId,
        timestamp: applianceData.timestamp,
        anomalyType: 'Normal Operation',
        severity: 'normal'
      });
    }
    
    return anomalies;
  }

  // Helper methods for AI data generation
  private getCurrentSeason(): string {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return "spring";
    if (month >= 6 && month <= 8) return "monsoon";
    if (month >= 9 && month <= 11) return "post-monsoon";
    return "winter";
  }

  private async getCurrentWeatherCondition(): Promise<string> {
    // Simple weather simulation based on season and time
    const season = this.getCurrentSeason();
    const hour = new Date().getHours();
    
    if (season === "monsoon") {
      return Math.random() < 0.7 ? "cloudy" : "rainy";
    } else if (season === "winter") {
      return Math.random() < 0.6 ? "clear" : "foggy";
    } else {
      return hour >= 6 && hour <= 18 ? "clear" : "clear";
    }
  }

  private async getCurrentSolarGeneration(): Promise<number> {
    const hour = new Date().getHours();
    const season = this.getCurrentSeason();
    
    if (hour < 6 || hour > 18) return 0;
    
    // Simple solar generation simulation
    const peak = 12;
    const hoursFromPeak = Math.abs(hour - peak);
    const factor = Math.max(0, 1 - (hoursFromPeak / 6));
    
    const seasonMultiplier = season === "monsoon" ? 0.4 : season === "winter" ? 0.7 : 1.0;
    return factor * 4.5 * seasonMultiplier * (0.8 + Math.random() * 0.4);
  }

  private getFallbackApplianceData(applianceName: string, timeOfDay: number): any {
    let baseWatts = 100;
    let operatingState = "on";
    
    if (applianceName.toLowerCase().includes('refrigerator')) {
      baseWatts = 150 + Math.random() * 50;
      operatingState = "cooling";
    } else if (applianceName.toLowerCase().includes('air conditioner') || applianceName.toLowerCase().includes('ac')) {
      baseWatts = timeOfDay >= 10 && timeOfDay <= 18 ? 1800 + Math.random() * 700 : 50;
      operatingState = baseWatts > 100 ? "cooling" : "standby";
    } else if (applianceName.toLowerCase().includes('washing machine')) {
      baseWatts = (timeOfDay >= 7 && timeOfDay <= 11) || (timeOfDay >= 18 && timeOfDay <= 22) ? 800 + Math.random() * 400 : 50;
      operatingState = baseWatts > 100 ? "washing" : "standby";
    }

    return {
      applianceName,
      powerWatts: Math.round(baseWatts),
      timestamp: new Date(),
      operatingState,
      efficiency: 0.8 + Math.random() * 0.1,
      temperature: 25 + Math.random() * 10,
      humidity: 45 + Math.random() * 20
    };
  }

  private getFallbackBatteryData(currentHour: number): any {
    let socPercent, current, chargingState;
    
    if (currentHour >= 9 && currentHour <= 16) {
      // Daytime: charging
      socPercent = 60 + Math.random() * 35;
      current = 15 + Math.random() * 10;
      chargingState = "charging";
    } else {
      // Evening/night: discharging
      socPercent = 30 + Math.random() * 50;
      current = -(5 + Math.random() * 15);
      chargingState = "discharging";
    }

    return {
      socPercent: Math.round(socPercent * 10) / 10,
      dodPercent: Math.round((100 - socPercent) * 10) / 10,
      cycleCount: 150 + Math.floor(Math.random() * 500),
      voltage: 48 + Math.random() * 4,
      current: Math.round(current * 100) / 100,
      temperature: 32 + Math.random() * 8,
      timestamp: new Date(),
      chargingState,
      healthScore: 85 + Math.random() * 10
    };
  }

  /**
   * Start the scheduler with specified intervals
   */
  startScheduler(): void {
    // Run hourly job every hour
    setInterval(() => {
      this.runHourlyJob().catch(console.error);
    }, 60 * 60 * 1000); // 1 hour

    // Run daily job at 7:00 AM local time
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 7 && now.getMinutes() === 0) {
        this.runDailyJob().catch(console.error);
      }
    }, 60 * 1000); // Check every minute

    // Run auto-ingest job every 10 seconds for continuous simulation
    setInterval(() => {
      this.runAutoIngestJob().catch(console.error);
    }, 10 * 1000); // 10 seconds

    console.log('Scheduler started - hourly weather updates, daily recommendations, and continuous auto-ingest simulation');
  }
}

export const schedulerService = new SchedulerService();
