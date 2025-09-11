import type { Device, PvForecastHourly, Household } from "@shared/schema";
import { storage } from "../storage";

interface RecommendationInput {
  device: Device;
  household: Household;
  pvForecasts: PvForecastHourly[];
}

interface TimeWindow {
  startHour: number;
  endHour: number;
  score: number;
  estimatedSavings: number;
  estimatedCo2Avoided: number;
  reason: string;
}

export class RecommendationService {
  /**
   * Generate smart recommendations for device scheduling
   */
  async generateRecommendations(householdId: string): Promise<void> {
    const household = await storage.getHousehold(householdId);
    if (!household) return;

    const devices = await storage.getDevicesByHouseholdId(householdId);
    const flexibleDevices = devices.filter(d => d.flexible);

    if (flexibleDevices.length === 0) return;

    // Get next 24 hours of PV forecasts
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);
    
    const pvForecasts = await storage.getPvForecastHourly(householdId, startTime, endTime);

    // Generate recommendations for each flexible device
    for (const device of flexibleDevices) {
      const recommendations = this.generateDeviceRecommendations({
        device,
        household,
        pvForecasts
      });

      // Save the best recommendation
      if (recommendations.length > 0) {
        const best = recommendations[0];
        const startTs = new Date(startTime);
        startTs.setHours(best.startHour, 0, 0, 0);
        
        const endTs = new Date(startTs);
        endTs.setHours(best.endHour, 0, 0, 0);

        await storage.createRecommendation({
          householdId,
          deviceId: device.id,
          startTs,
          endTs,
          reason: best.reason,
          estimatedSavings: best.estimatedSavings,
          estimatedCo2Avoided: best.estimatedCo2Avoided
        });
      }
    }
  }

  private generateDeviceRecommendations(input: RecommendationInput): TimeWindow[] {
    const { device, household, pvForecasts } = input;
    const timeWindows: TimeWindow[] = [];

    // Create hourly solar availability scores
    const solarScores = this.calculateSolarScores(pvForecasts);
    
    // Find optimal time windows for the device
    const minDuration = Math.ceil(device.minDurationHours);
    const earliestHour = device.earliestHour;
    const latestHour = device.latestHour;

    // Search for best time windows within device constraints
    for (let startHour = earliestHour; startHour <= latestHour - minDuration; startHour++) {
      const endHour = startHour + minDuration;
      
      if (endHour > latestHour) break;

      // Calculate cumulative solar score for this window
      let totalScore = 0;
      let totalSolarKw = 0;
      
      for (let hour = startHour; hour < endHour; hour++) {
        const hourIndex = hour - new Date().getHours();
        if (hourIndex >= 0 && hourIndex < solarScores.length) {
          totalScore += solarScores[hourIndex].score;
          totalSolarKw += solarScores[hourIndex].solarKw;
        }
      }

      const avgSolarKw = totalSolarKw / minDuration;
      const windowScore = totalScore / minDuration;

      // Calculate potential savings
      const solarCoverageRatio = Math.min(1, avgSolarKw / device.typicalKwh);
      const gridAvoidance = device.typicalKwh * solarCoverageRatio;
      
      const savings = gridAvoidance * household.tariffPerKwh;
      const co2Avoided = gridAvoidance * household.co2FactorKgPerKwh;

      // Generate recommendation reason
      const reason = this.generateRecommendationReason(
        device.name,
        startHour,
        endHour,
        avgSolarKw,
        savings,
        co2Avoided
      );

      timeWindows.push({
        startHour,
        endHour,
        score: windowScore,
        estimatedSavings: savings,
        estimatedCo2Avoided: co2Avoided,
        reason
      });
    }

    // Sort by score (best first) and return top 3
    return timeWindows
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }

  private calculateSolarScores(pvForecasts: PvForecastHourly[]): Array<{score: number, solarKw: number}> {
    if (pvForecasts.length === 0) {
      // Return default scores if no forecasts available
      return Array(24).fill({ score: 0.5, solarKw: 0 });
    }

    const maxSolar = Math.max(...pvForecasts.map(f => f.acKw));
    
    return pvForecasts.map(forecast => {
      const normalizedSolar = maxSolar > 0 ? forecast.acKw / maxSolar : 0;
      
      // Score based on solar availability (0-1)
      const score = Math.min(1, normalizedSolar);
      
      return {
        score,
        solarKw: forecast.acKw
      };
    });
  }

  private generateRecommendationReason(
    deviceName: string,
    startHour: number,
    endHour: number,
    avgSolarKw: number,
    savings: number,
    co2Avoided: number
  ): string {
    const formatTime = (hour: number) => {
      const h = hour % 24;
      const suffix = h >= 12 ? 'PM' : 'AM';
      const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${displayHour}:00 ${suffix}`;
    };

    const timeSlot = `${formatTime(startHour)} - ${formatTime(endHour)}`;
    
    if (avgSolarKw > 2) {
      return `Peak solar generation period. Run ${deviceName} ${timeSlot} to save ₹${savings.toFixed(0)} and avoid ${co2Avoided.toFixed(1)} kg CO₂`;
    } else if (avgSolarKw > 1) {
      return `Good solar output expected. Schedule ${deviceName} ${timeSlot} to save ₹${savings.toFixed(0)} and avoid ${co2Avoided.toFixed(1)} kg CO₂`;
    } else {
      return `Optimal timing for renewable energy use. Run ${deviceName} ${timeSlot} to save ₹${savings.toFixed(0)} and avoid ${co2Avoided.toFixed(1)} kg CO₂`;
    }
  }

  /**
   * Calculate daily energy metrics for dashboard
   */
  async calculateDailyMetrics(householdId: string): Promise<{
    solarGenerated: number;
    gridConsumed: number;
    costSavings: number;
    co2Avoided: number;
    renewableShare: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const household = await storage.getHousehold(householdId);
    if (!household) {
      return {
        solarGenerated: 0,
        gridConsumed: 0,
        costSavings: 0,
        co2Avoided: 0,
        renewableShare: 0
      };
    }

    // Get today's PV forecasts (as proxy for actual generation)
    const pvForecasts = await storage.getPvForecastHourly(householdId, today, tomorrow);
    const solarGenerated = pvForecasts.reduce((sum, f) => sum + f.acKw, 0);

    // Get meter readings if available, otherwise estimate
    const meterReadings = await storage.getMeterReadings(householdId, today, tomorrow);
    let gridConsumed = 0;
    
    if (meterReadings.length > 0) {
      gridConsumed = meterReadings.reduce((sum, r) => sum + r.gridKwh, 0);
    } else {
      // Estimate grid consumption (assuming typical household consumption minus solar)
      const estimatedDailyConsumption = 15; // kWh typical Indian household
      gridConsumed = Math.max(0, estimatedDailyConsumption - solarGenerated);
    }

    const totalConsumption = solarGenerated + gridConsumed;
    const renewableShare = totalConsumption > 0 ? (solarGenerated / totalConsumption) * 100 : 0;
    
    const costSavings = solarGenerated * household.tariffPerKwh;
    const co2Avoided = solarGenerated * household.co2FactorKgPerKwh;

    return {
      solarGenerated: Math.round(solarGenerated * 100) / 100,
      gridConsumed: Math.round(gridConsumed * 100) / 100,
      costSavings: Math.round(costSavings * 100) / 100,
      co2Avoided: Math.round(co2Avoided * 100) / 100,
      renewableShare: Math.round(renewableShare * 10) / 10
    };
  }
}

export const recommendationService = new RecommendationService();
