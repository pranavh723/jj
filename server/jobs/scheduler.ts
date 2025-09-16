import { storage } from "../storage";
import { weatherService } from "../services/weather";
import { solarService } from "../services/solar";
import { recommendationService } from "../services/recommendations";
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
        
        // Generate mock appliance reading data based on actual devices in the household
        const applianceData = await this.generateMockApplianceData(randomHousehold.id);
        await this.ingestApplianceReading(randomHousehold.userId, applianceData);
        
        // Generate mock battery data (30% chance)
        if (Math.random() < 0.3) {
          const batteryData = await this.generateMockBatteryData();
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

  private async generateMockApplianceData(householdId: string): Promise<any> {
    // Get actual devices for this household
    const devices = await storage.getDevicesByHouseholdId(householdId);
    
    if (devices.length === 0) {
      // Fallback to default appliance names if no devices exist
      const fallbackApplianceNames = [
        'Refrigerator', 'Air Conditioner', 'Washing Machine', 'Dishwasher', 
        'Microwave', 'Water Heater', 'Television', 'Computer', 'LED Lights', 
        'Ceiling Fan', 'Electric Oven', 'Toaster', 'Coffee Maker', 'Vacuum Cleaner'
      ];
      
      const randomAppliance = fallbackApplianceNames[Math.floor(Math.random() * fallbackApplianceNames.length)];
      
      // Different power ranges for different appliances
      let powerRange;
      if (randomAppliance === 'Air Conditioner') powerRange = [1200, 2500];
      else if (randomAppliance === 'Water Heater') powerRange = [2000, 3000];
      else if (randomAppliance === 'Refrigerator') powerRange = [100, 300];
      else if (randomAppliance === 'Washing Machine') powerRange = [500, 1500];
      else if (randomAppliance === 'Microwave') powerRange = [700, 1200];
      else if (randomAppliance === 'Television') powerRange = [100, 250];
      else if (randomAppliance === 'LED Lights') powerRange = [10, 50];
      else powerRange = [50, 800];
      
      const powerWatts = Math.round(powerRange[0] + Math.random() * (powerRange[1] - powerRange[0]));
      
      return {
        applianceName: randomAppliance,
        powerWatts: powerWatts,
        timestamp: new Date()
      };
    }
    
    // Use actual device from the household
    const randomDevice = devices[Math.floor(Math.random() * devices.length)];
    
    // Generate power consumption based on the device's typical consumption
    // Convert kWh to watts (assuming 1 hour of operation)
    const baseWatts = randomDevice.typicalKwh * 1000; // kWh to Wh per hour
    
    // Add some realistic variation (±20% from typical consumption)
    const variation = 0.2;
    const minWatts = Math.max(1, baseWatts * (1 - variation));
    const maxWatts = baseWatts * (1 + variation);
    const powerWatts = Math.round(minWatts + Math.random() * (maxWatts - minWatts));
    
    return {
      applianceName: randomDevice.name,
      powerWatts: powerWatts,
      timestamp: new Date()
    };
  }

  private async generateMockBatteryData(): Promise<any> {
    const currentHour = new Date().getHours();
    
    // Simulate daily charge patterns
    let socPercent, dodPercent;
    
    if (currentHour >= 6 && currentHour <= 18) {
      // Daytime: battery charging from solar
      socPercent = 60 + Math.random() * 35; // 60-95%
      dodPercent = Math.max(0, 100 - socPercent - Math.random() * 20); // Lower DoD during charge
    } else {
      // Nighttime: battery discharging
      socPercent = 20 + Math.random() * 60; // 20-80%
      dodPercent = 30 + Math.random() * 50; // 30-80% higher DoD during discharge
    }
    
    const cycleCount = Math.floor(100 + Math.random() * 1000); // 100-1100 cycles
    
    return {
      socPercent: Math.round(socPercent * 10) / 10,
      dodPercent: Math.round(dodPercent * 10) / 10,
      cycleCount: cycleCount,
      timestamp: new Date()
    };
  }

  private async ingestApplianceReading(userId: string, applianceData: any): Promise<void> {
    try {
      // Create appliance reading
      const reading = await storage.createApplianceReading({
        userId,
        applianceName: applianceData.applianceName,
        powerWatts: applianceData.powerWatts,
        timestamp: applianceData.timestamp
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
        timestamp: batteryData.timestamp
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
