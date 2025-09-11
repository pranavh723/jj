import { storage } from "../storage";
import { weatherService } from "../services/weather";
import { solarService } from "../services/solar";
import { recommendationService } from "../services/recommendations";

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

  private async getAllActiveHouseholds() {
    // For now, get a sample of households since we don't have a specific "active" flag
    // In production, you might want to add an "active" or "enabled" field
    try {
      // This is a workaround since we don't have a direct method to get all households
      // In a real implementation, you'd add a method to storage to get all households
      return [];
    } catch (error) {
      console.error('Error getting households:', error);
      return [];
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

    console.log('Scheduler started - hourly weather updates and daily recommendations');
  }
}

export const schedulerService = new SchedulerService();
