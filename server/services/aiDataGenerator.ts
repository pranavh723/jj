import OpenAI from "openai";

/*
Follow these instructions when using this blueprint:
1. Note that the newest OpenAI model is "gpt-5", not "gpt-4o" or "gpt-4". gpt-5 was released August 7, 2025 after your knowledge cutoff. Always prefer using gpt-5 as it is the latest model. When copying code from this blueprint, ensure you also mention this information verbatim as a comment so that you don't revert it to older models: `// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user`
2. Use the response_format: { type: "json_object" } option
3. Request output in JSON format in the prompt
*/

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface RealisticApplianceData {
  applianceName: string;
  powerWatts: number;
  timestamp: Date;
  operatingState: string;
  efficiency: number;
  temperature?: number | undefined;
  humidity?: number | undefined;
}

export interface RealisticBatteryData {
  socPercent: number;
  dodPercent: number;
  cycleCount: number;
  voltage: number;
  current: number;
  temperature: number;
  timestamp: Date;
  chargingState: string;
  healthScore: number;
}

export interface RealisticSolarData {
  powerGenerationKw: number;
  irradiance: number;
  panelTemperature: number;
  efficiency: number;
  timestamp: Date;
  weatherCondition: string;
  cloudCover: number;
}

export class AIDataGeneratorService {
  private apiCallCount = 0;
  private lastApiCallTime = 0;
  private readonly maxApiCallsPerMinute = 20; // Conservative rate limiting

  private canMakeApiCall(): boolean {
    const now = Date.now();
    if (now - this.lastApiCallTime > 60000) {
      // Reset counter every minute
      this.apiCallCount = 0;
      this.lastApiCallTime = now;
    }
    return this.apiCallCount < this.maxApiCallsPerMinute;
  }

  /**
   * Generate realistic appliance power consumption data using AI with smart fallbacks
   */
  async generateRealisticApplianceData(
    applianceName: string, 
    timeOfDay: number, 
    season: string = "summer",
    householdSize: number = 4
  ): Promise<RealisticApplianceData> {
    // Use smart fallback system if API quota is exceeded or rate limited
    if (!this.canMakeApiCall()) {
      console.log(`Rate limited - using advanced fallback for ${applianceName}`);
      return this.getAdvancedFallbackApplianceData(applianceName, timeOfDay, season, householdSize);
    }

    try {
      this.apiCallCount++;
      const prompt = `You are an energy management system generating realistic appliance power consumption data.

Context:
- Appliance: ${applianceName}
- Time of day: ${timeOfDay}:00 hours (24h format)
- Season: ${season}
- Household size: ${householdSize} people
- Location: India (typical residential setup)

Generate realistic power consumption data that follows actual usage patterns:
- Consider time-of-day usage patterns (morning/evening peaks)
- Account for seasonal variations (AC usage in summer, heaters in winter)
- Include realistic efficiency ratings
- Consider typical Indian household appliance specifications
- Add realistic operating states and environmental factors

Respond with JSON in this exact format:
{
  "applianceName": "${applianceName}",
  "powerWatts": number,
  "operatingState": "string (on/off/standby/heating/cooling/etc)",
  "efficiency": number (0.7-0.95 range),
  "temperature": number (ambient temp in Celsius, if relevant),
  "humidity": number (relative humidity %, if relevant)
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert in energy management and appliance behavior. Generate highly realistic data that matches real-world appliance usage patterns in Indian households."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }
      const aiData = JSON.parse(content);
      
      return {
        applianceName: aiData.applianceName,
        powerWatts: Math.round(aiData.powerWatts),
        timestamp: new Date(),
        operatingState: aiData.operatingState,
        efficiency: aiData.efficiency,
        temperature: aiData.temperature,
        humidity: aiData.humidity
      };
    } catch (error) {
      console.error('Error generating realistic appliance data:', error);
      // Fallback to advanced realistic data if AI fails
      return this.getAdvancedFallbackApplianceData(applianceName, timeOfDay, season, householdSize);
    }
  }

  /**
   * Generate realistic battery data that simulates actual battery management systems
   */
  async generateRealisticBatteryData(
    currentHour: number,
    weatherCondition: string = "clear",
    solarGeneration: number = 0
  ): Promise<RealisticBatteryData> {
    try {
      const prompt = `You are a Battery Management System (BMS) generating realistic battery performance data.

Context:
- Current hour: ${currentHour}:00 (24h format)
- Weather: ${weatherCondition}
- Current solar generation: ${solarGeneration} kW
- Battery type: Lithium Ion (typical residential solar setup)
- Battery capacity: 10 kWh (realistic home battery size)
- Location: India (hot climate affects battery performance)

Generate realistic battery data following actual BMS behavior:
- SoC should follow charging/discharging patterns based on solar generation and home usage
- DoD should be complementary to SoC but consider battery management strategies
- Include realistic voltage and current readings
- Factor in temperature effects (Indian climate)
- Include charging states (charging/discharging/idle/maintenance)
- Health score should reflect realistic battery aging

Respond with JSON in this exact format:
{
  "socPercent": number (0-100),
  "dodPercent": number (0-100),
  "cycleCount": number (realistic for battery age),
  "voltage": number (realistic Li-ion voltage 45-54V),
  "current": number (positive for charging, negative for discharging),
  "temperature": number (Celsius, consider Indian climate),
  "chargingState": "string (charging/discharging/idle/maintenance)",
  "healthScore": number (70-100, realistic degradation)
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system", 
            content: "You are an expert in battery management systems and energy storage. Generate data that matches real Li-ion battery behavior in residential solar installations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.6
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }
      const aiData = JSON.parse(content);
      
      return {
        socPercent: Math.round(aiData.socPercent * 10) / 10,
        dodPercent: Math.round(aiData.dodPercent * 10) / 10,
        cycleCount: aiData.cycleCount,
        voltage: Math.round(aiData.voltage * 100) / 100,
        current: Math.round(aiData.current * 100) / 100,
        temperature: Math.round(aiData.temperature * 10) / 10,
        timestamp: new Date(),
        chargingState: aiData.chargingState,
        healthScore: Math.round(aiData.healthScore * 10) / 10
      };
    } catch (error) {
      console.error('Error generating realistic battery data:', error);
      // Fallback to basic realistic data if AI fails
      return this.getFallbackBatteryData(currentHour);
    }
  }

  /**
   * Generate realistic solar panel data
   */
  async generateRealisticSolarData(
    currentHour: number,
    weatherCondition: string = "clear",
    season: string = "summer"
  ): Promise<RealisticSolarData> {
    try {
      const prompt = `You are a solar monitoring system generating realistic solar panel performance data.

Context:
- Current hour: ${currentHour}:00 (24h format)
- Weather: ${weatherCondition}
- Season: ${season}
- Location: India (high solar potential, monsoon seasons)
- Panel setup: 5kW rooftop installation (typical residential)
- Panel type: Monocrystalline silicon

Generate realistic solar data considering:
- Solar irradiance patterns throughout the day
- Weather impact on generation
- Panel temperature effects (hot Indian climate reduces efficiency)
- Seasonal variations (monsoon vs summer vs winter)
- Cloud cover impacts
- Realistic efficiency ranges for aged panels

Respond with JSON in this exact format:
{
  "powerGenerationKw": number (0-6 kW, realistic for 5kW system),
  "irradiance": number (0-1200 W/m²),
  "panelTemperature": number (Celsius),
  "efficiency": number (0.15-0.22 realistic panel efficiency),
  "weatherCondition": "${weatherCondition}",
  "cloudCover": number (0-100 percentage)
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert in solar energy systems and photovoltaic performance. Generate data that matches real solar panel behavior in Indian conditions."
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.6
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }
      const aiData = JSON.parse(content);
      
      return {
        powerGenerationKw: Math.round(aiData.powerGenerationKw * 100) / 100,
        irradiance: Math.round(aiData.irradiance),
        panelTemperature: Math.round(aiData.panelTemperature * 10) / 10,
        efficiency: Math.round(aiData.efficiency * 1000) / 1000,
        timestamp: new Date(),
        weatherCondition: aiData.weatherCondition,
        cloudCover: Math.round(aiData.cloudCover)
      };
    } catch (error) {
      console.error('Error generating realistic solar data:', error);
      // Fallback to basic realistic data if AI fails
      return this.getFallbackSolarData(currentHour);
    }
  }

  // Fallback methods for when AI fails
  private getFallbackApplianceData(applianceName: string, timeOfDay: number): RealisticApplianceData {
    // Basic realistic fallback based on appliance type and time
    let baseWatts = 100;
    let operatingState = "on";
    
    if (applianceName.toLowerCase().includes('refrigerator')) {
      baseWatts = 150 + Math.random() * 50; // 150-200W
      operatingState = "cooling";
    } else if (applianceName.toLowerCase().includes('air conditioner') || applianceName.toLowerCase().includes('ac')) {
      baseWatts = timeOfDay >= 10 && timeOfDay <= 18 ? 1800 + Math.random() * 700 : 0; // Daytime usage
      operatingState = baseWatts > 0 ? "cooling" : "standby";
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

  /**
   * Advanced fallback system with sophisticated Indian appliance modeling
   */
  private getAdvancedFallbackApplianceData(
    applianceName: string, 
    timeOfDay: number, 
    season: string = "summer",
    householdSize: number = 4
  ): RealisticApplianceData {
    const name = applianceName.toLowerCase();
    let baseWatts = 100;
    let operatingState = "on";
    let efficiency = 0.85;
    let temperature = 28;
    let humidity = 60;

    // Advanced Indian appliance modeling with seasonal and usage patterns
    if (name.includes('refrigerator') || name.includes('fridge')) {
      // Double door refrigerators in Indian homes
      baseWatts = 180 + Math.random() * 40; // 180-220W
      if (season === 'summer') baseWatts *= 1.3; // Higher load in summer
      operatingState = Math.random() > 0.3 ? "cooling" : "standby";
      efficiency = 0.78 + Math.random() * 0.12;
    } 
    else if (name.includes('split ac') || name.includes('air conditioner')) {
      // Split ACs are very common in India
      const tonnage = name.includes('1.5') ? 1.5 : name.includes('2') ? 2.0 : 1.0;
      baseWatts = tonnage * 1200; // Base consumption per ton
      
      // Heavy AC usage during Indian summer (April-June)
      if (season === 'summer' && timeOfDay >= 10 && timeOfDay <= 23) {
        baseWatts += Math.random() * 400; // Variable load based on cooling demand
        operatingState = "cooling";
      } else if (timeOfDay >= 22 || timeOfDay <= 6) {
        baseWatts *= 0.7; // Lower power during night
        operatingState = "cooling";
      } else {
        baseWatts = 50 + Math.random() * 30; // Standby
        operatingState = "standby";
      }
      temperature = 35 + Math.random() * 10; // Ambient temp affects AC
      efficiency = 0.72 + Math.random() * 0.13;
    }
    else if (name.includes('geyser') || name.includes('water heater')) {
      // Electric geysers are common in North Indian homes
      const capacity = name.includes('25l') ? 25 : name.includes('150l') ? 150 : 100;
      baseWatts = capacity * 15 + Math.random() * 300; // Rough calculation
      
      // Peak usage during bath times
      if ((timeOfDay >= 6 && timeOfDay <= 8) || (timeOfDay >= 19 && timeOfDay <= 21)) {
        operatingState = "heating";
        baseWatts *= 1.2;
      } else if (season === 'winter') {
        baseWatts *= 1.4; // More usage in winter
        operatingState = "heating";
      } else {
        baseWatts *= 0.3; // Standby
        operatingState = "standby";
      }
      efficiency = 0.88 + Math.random() * 0.07;
    }
    else if (name.includes('washing machine')) {
      // Indian washing machine patterns
      baseWatts = name.includes('front load') ? 500 + Math.random() * 300 : 400 + Math.random() * 200;
      
      // Peak usage times in Indian homes
      if ((timeOfDay >= 7 && timeOfDay <= 10) || (timeOfDay >= 16 && timeOfDay <= 19)) {
        operatingState = Math.random() > 0.4 ? "washing" : "spinning";
        baseWatts += Math.random() * 400;
      } else {
        baseWatts = 15 + Math.random() * 25; // Standby
        operatingState = "standby";
      }
      efficiency = 0.81 + Math.random() * 0.14;
    }
    else if (name.includes('microwave')) {
      // Microwave usage patterns
      baseWatts = name.includes('inverter') ? 800 + Math.random() * 200 : 700 + Math.random() * 300;
      
      // Meal times in Indian homes
      if ((timeOfDay >= 7 && timeOfDay <= 9) || (timeOfDay >= 12 && timeOfDay <= 14) || 
          (timeOfDay >= 19 && timeOfDay <= 21)) {
        operatingState = "heating";
      } else {
        baseWatts = 3 + Math.random() * 8; // Standby with digital display
        operatingState = "standby";
      }
      efficiency = 0.75 + Math.random() * 0.15;
    }
    else if (name.includes('tv') || name.includes('television')) {
      // LED TV consumption
      const size = name.includes('55') ? 55 : name.includes('43') ? 43 : 32;
      baseWatts = size * 1.8 + Math.random() * 30;
      
      // TV viewing patterns in Indian homes
      if ((timeOfDay >= 18 && timeOfDay <= 23) || (timeOfDay >= 6 && timeOfDay <= 9)) {
        operatingState = "playing";
        baseWatts += Math.random() * 20;
      } else {
        baseWatts = 2 + Math.random() * 5; // Standby
        operatingState = "standby";
      }
      efficiency = 0.91 + Math.random() * 0.06;
    }
    else if (name.includes('laptop') || name.includes('computer')) {
      // Gaming/work laptop
      baseWatts = name.includes('gaming') ? 120 + Math.random() * 80 : 60 + Math.random() * 40;
      
      // Usage patterns for work/study
      if (timeOfDay >= 9 && timeOfDay <= 22) {
        operatingState = Math.random() > 0.3 ? "active" : "idle";
        if (operatingState === "active") baseWatts *= 1.3;
      } else {
        baseWatts = 3 + Math.random() * 7; // Sleep mode
        operatingState = "sleep";
      }
      efficiency = 0.87 + Math.random() * 0.08;
    }
    else if (name.includes('fan')) {
      // Ceiling fans are essential in Indian homes
      baseWatts = 75 + Math.random() * 25; // 75-100W
      
      if (season === 'summer') {
        baseWatts *= 1.2; // Higher speed in summer
        operatingState = "running_high";
      } else if (season === 'winter') {
        baseWatts *= 0.6; // Lower speed or off
        operatingState = Math.random() > 0.5 ? "running_low" : "off";
      } else {
        operatingState = "running_medium";
      }
      efficiency = 0.84 + Math.random() * 0.10;
    }
    else if (name.includes('pump')) {
      // Water pumps are crucial in Indian homes
      baseWatts = name.includes('submersible') ? 750 + Math.random() * 500 : 500 + Math.random() * 300;
      
      // Water filling times
      if (timeOfDay >= 5 && timeOfDay <= 8) {
        operatingState = "pumping";
      } else if (timeOfDay >= 17 && timeOfDay <= 19) {
        operatingState = Math.random() > 0.6 ? "pumping" : "off";
      } else {
        baseWatts = 0;
        operatingState = "off";
      }
      efficiency = 0.79 + Math.random() * 0.11;
    }

    // Add realistic variations based on time and household size
    const householdFactor = householdSize / 4; // Base is 4 people
    baseWatts *= householdFactor;

    // Add time-based natural variations
    const timeVariation = 0.85 + Math.sin(timeOfDay * Math.PI / 12) * 0.15;
    baseWatts *= timeVariation;

    // Seasonal ambient temperature affects all appliances
    if (season === 'summer') {
      temperature = 32 + Math.random() * 12; // 32-44°C
      humidity = 40 + Math.random() * 35;    // 40-75%
    } else if (season === 'winter') {
      temperature = 8 + Math.random() * 15;  // 8-23°C  
      humidity = 25 + Math.random() * 25;    // 25-50%
    } else { // monsoon
      temperature = 24 + Math.random() * 8;  // 24-32°C
      humidity = 70 + Math.random() * 25;    // 70-95%
    }

    return {
      applianceName,
      powerWatts: Math.max(0, Math.round(baseWatts)),
      timestamp: new Date(),
      operatingState,
      efficiency: Math.round(efficiency * 1000) / 1000,
      temperature: Math.round(temperature * 10) / 10,
      humidity: Math.round(humidity * 10) / 10
    };
  }

  private getFallbackBatteryData(currentHour: number): RealisticBatteryData {
    // Basic realistic fallback based on time of day
    let socPercent, current, chargingState;
    
    if (currentHour >= 9 && currentHour <= 16) {
      // Daytime: charging
      socPercent = 60 + Math.random() * 35;
      current = 15 + Math.random() * 10; // Positive for charging
      chargingState = "charging";
    } else {
      // Evening/night: discharging
      socPercent = 30 + Math.random() * 50;
      current = -(5 + Math.random() * 15); // Negative for discharging
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

  private getFallbackSolarData(currentHour: number): RealisticSolarData {
    // Basic realistic fallback based on time of day
    let powerGeneration = 0;
    let irradiance = 0;
    
    if (currentHour >= 6 && currentHour <= 18) {
      // Daylight hours
      const peak = 12; // Solar noon
      const hoursFromPeak = Math.abs(currentHour - peak);
      const factor = Math.max(0, 1 - (hoursFromPeak / 6));
      powerGeneration = factor * 4.5 * (0.8 + Math.random() * 0.4); // Up to 4.5kW with variation
      irradiance = factor * 1000 * (0.7 + Math.random() * 0.3);
    }

    return {
      powerGenerationKw: Math.round(powerGeneration * 100) / 100,
      irradiance: Math.round(irradiance),
      panelTemperature: 35 + Math.random() * 15,
      efficiency: 0.18 + Math.random() * 0.04,
      timestamp: new Date(),
      weatherCondition: "clear",
      cloudCover: Math.random() * 30
    };
  }
}

export const aiDataGenerator = new AIDataGeneratorService();