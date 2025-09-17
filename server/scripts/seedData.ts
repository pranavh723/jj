import { storage } from "../storage";
import type { InsertUser, InsertHousehold, InsertDevice, InsertApplianceReading, InsertBatteryLog, InsertMeterReading } from "@shared/schema";
import { aiDataGenerator } from "../services/aiDataGenerator";
import bcrypt from "bcrypt";

export async function seedSampleData() {
  try {
    console.log("Starting realistic AI-powered demo data seeding...");

    // Create realistic Indian demo users with easy login credentials for teachers
    const user1: InsertUser = {
      email: "demo.rajesh@greengrid.in",
      passwordHash: await bcrypt.hash("demo123", 10),
      name: "Rajesh Kumar Sharma"
    };

    const user2: InsertUser = {
      email: "demo.priya@greengrid.in", 
      passwordHash: await bcrypt.hash("demo123", 10),
      name: "Priya Agarwal"
    };

    const createdUser1 = await storage.createUser(user1);
    const createdUser2 = await storage.createUser(user2);
    console.log("✓ Created realistic Indian demo users with credentials:");

    // Create realistic Indian households with proper solar installations
    const household1: InsertHousehold = {
      userId: createdUser1.id,
      name: "Delhi Smart Solar Villa",
      latitude: 28.6139, // New Delhi coordinates
      longitude: 77.2090,
      pvKw: 7.5, // 7.5kW rooftop solar (common for Indian villas)
      tilt: 28, // Optimal tilt for Delhi latitude
      azimuth: 180, // South facing for maximum solar gain
      tariffCurrency: "INR",
      tariffPerKwh: 6.50, // ₹6.50 per kWh (typical Delhi BSES rate)
      co2FactorKgPerKwh: 0.82, // India grid emission factor (coal-heavy)
      usePvwatts: false
    };

    const household2: InsertHousehold = {
      userId: createdUser2.id,
      name: "Mumbai Green Apartment", 
      latitude: 19.0760, // Mumbai coordinates
      longitude: 72.8777,
      pvKw: 5.2, // 5.2kW apartment rooftop system
      tilt: 19, // Optimal for Mumbai latitude
      azimuth: 180,
      tariffCurrency: "INR",
      tariffPerKwh: 7.20, // ₹7.20 per kWh (MSEDCL rate)
      co2FactorKgPerKwh: 0.82,
      usePvwatts: false
    };

    const createdHousehold1 = await storage.createHousehold(household1);
    const createdHousehold2 = await storage.createHousehold(household2);
    console.log("✓ Created households");

    // Create realistic Indian smart devices for Delhi household (Villa setup)
    const devices1: InsertDevice[] = [
      {
        householdId: createdHousehold1.id,
        name: "Smart Geyser (150L)",
        typicalKwh: 5.2, // Indian electric geyser consumption
        flexible: true,
        minDurationHours: 1.5,
        earliestHour: 5, // Morning bath time
        latestHour: 22 // Evening usage
      },
      {
        householdId: createdHousehold1.id,
        name: "Split AC (1.5 Ton)",
        typicalKwh: 12.0, // High summer usage in Delhi heat
        flexible: false, // Comfort priority in Indian summers
        minDurationHours: 0.5,
        earliestHour: 10,
        latestHour: 4 // Late night cooling
      },
      {
        householdId: createdHousehold1.id,
        name: "Tata Nexon EV Charger", 
        typicalKwh: 15.0, // Electric vehicle charging
        flexible: true,
        minDurationHours: 4,
        earliestHour: 22,
        latestHour: 6
      },
      {
        householdId: createdHousehold1.id,
        name: "IFB Washing Machine",
        typicalKwh: 2.1, // Front-loading washing machine
        flexible: true,
        minDurationHours: 1.5,
        earliestHour: 7,
        latestHour: 20
      },
      {
        householdId: createdHousehold1.id,
        name: "Submersible Borewell Pump",
        typicalKwh: 2.8, // Water pump for Indian homes
        flexible: true,
        minDurationHours: 2,
        earliestHour: 5,
        latestHour: 7 // Early morning water filling
      },
      {
        householdId: createdHousehold1.id,
        name: "Room Heaters (Winter)",
        typicalKwh: 3.5, // Delhi winter heating
        flexible: true,
        minDurationHours: 2,
        earliestHour: 18,
        latestHour: 8
      }
    ];

    // Create realistic Mumbai apartment devices (Compact setup)
    const devices2: InsertDevice[] = [
      {
        householdId: createdHousehold2.id,
        name: "Instant Electric Geyser (25L)",
        typicalKwh: 3.1, // Smaller apartment geyser
        flexible: true,
        minDurationHours: 1,
        earliestHour: 6,
        latestHour: 23
      },
      {
        householdId: createdHousehold2.id,
        name: "Window AC (1 Ton)",
        typicalKwh: 8.5, // Mumbai humidity requires constant AC
        flexible: false,
        minDurationHours: 0.5,
        earliestHour: 9,
        latestHour: 6 // Monsoon humidity control
      },
      {
        householdId: createdHousehold2.id,
        name: "MG ZS EV Charging Point",
        typicalKwh: 13.5, // Electric vehicle for urban mobility
        flexible: true,
        minDurationHours: 5,
        earliestHour: 23,
        latestHour: 7
      },
      {
        householdId: createdHousehold2.id,
        name: "Smart Inverter Microwave",
        typicalKwh: 1.8, // Heavy microwave usage in apartments
        flexible: true,
        minDurationHours: 0.5,
        earliestHour: 6,
        latestHour: 23
      },
      {
        householdId: createdHousehold2.id,
        name: "Tower Water Pump",
        typicalKwh: 1.8, // Apartment water pump
        flexible: true,
        minDurationHours: 1.5,
        earliestHour: 5,
        latestHour: 8
      },
      {
        householdId: createdHousehold2.id,
        name: "Aquaguard RO + UV Purifier",
        typicalKwh: 0.8, // Water purification system
        flexible: false, // Always on for safe drinking water
        minDurationHours: 24,
        earliestHour: 0,
        latestHour: 23
      }
    ];

    // Create all devices
    for (const device of devices1) {
      await storage.createDevice(device);
    }
    for (const device of devices2) {
      await storage.createDevice(device);
    }
    console.log("✓ Created devices");

    // Generate household-level meter readings and individual appliance readings
    const now = new Date();
    const currentHour = now.getHours();

    // Create household-level meter readings (grid and solar consumption)
    const meterReading1: InsertMeterReading = {
      householdId: createdHousehold1.id,
      timestamp: now,
      gridKwh: 15.2, // Grid consumption
      solarKwh: 18.5  // Solar generation
    };

    const meterReading2: InsertMeterReading = {
      householdId: createdHousehold2.id,
      timestamp: now,
      gridKwh: 12.8,
      solarKwh: 22.1
    };

    await storage.createMeterReading(meterReading1);
    await storage.createMeterReading(meterReading2);
    console.log("✓ Created meter readings");

    // Generate AI-powered appliance readings for realistic Indian appliances
    const applianceNames = [
      "Double Door Refrigerator", "Split AC (1.5 Ton)", "Electric Geyser", "Inverter Microwave", 
      "Front Load Washing Machine", "Smart LED TV (55inch)", "Gaming Laptop", "Ceiling Fan",
      "Induction Cooktop", "RO Water Purifier", "Stabilizer", "Room Heater"
    ];

    // Generate appliance readings for user 1
    for (const applianceName of applianceNames) {
      try {
        const applianceData = await aiDataGenerator.generateRealisticApplianceData(
          applianceName,
          currentHour,
          "summer",
          4 // Household size
        );

        const applianceReading: InsertApplianceReading = {
          userId: createdUser1.id,
          applianceName: applianceName,
          timestamp: now,
          powerWatts: applianceData.powerWatts,
          operatingState: applianceData.operatingState,
          efficiency: applianceData.efficiency,
          temperature: applianceData.temperature,
          humidity: applianceData.humidity
        };

        await storage.createApplianceReading(applianceReading);
      } catch (error) {
        console.log(`Using fallback data for ${applianceName}:`, (error as Error).message);
        
        // Fallback to basic realistic data if AI fails
        const basicPower = applianceName.includes('Refrigerator') ? 150 :
                          applianceName.includes('Air Conditioner') ? 1800 :
                          applianceName.includes('Water Heater') ? 3500 : 100;
        
        const fallbackReading: InsertApplianceReading = {
          userId: createdUser1.id,
          applianceName: applianceName,
          timestamp: now,
          powerWatts: basicPower,
          operatingState: basicPower > 0 ? "on" : "standby",
          efficiency: 0.85,
          temperature: 25,
          humidity: 55
        };

        await storage.createApplianceReading(fallbackReading);
      }
    }

    // Generate appliance readings for user 2
    for (const applianceName of applianceNames) {
      try {
        const applianceData = await aiDataGenerator.generateRealisticApplianceData(
          applianceName,
          currentHour,
          "summer",
          3 // Different household size
        );

        const applianceReading: InsertApplianceReading = {
          userId: createdUser2.id,
          applianceName: applianceName,
          timestamp: now,
          powerWatts: applianceData.powerWatts,
          operatingState: applianceData.operatingState,
          efficiency: applianceData.efficiency,
          temperature: applianceData.temperature,
          humidity: applianceData.humidity
        };

        await storage.createApplianceReading(applianceReading);
      } catch (error) {
        console.log(`Using fallback data for ${applianceName}:`, (error as Error).message);
        
        const basicPower = applianceName.includes('Refrigerator') ? 130 :
                          applianceName.includes('Air Conditioner') ? 1600 :
                          applianceName.includes('Water Heater') ? 3200 : 100;
        
        const fallbackReading: InsertApplianceReading = {
          userId: createdUser2.id,
          applianceName: applianceName,
          timestamp: now,
          powerWatts: basicPower,
          operatingState: basicPower > 0 ? "on" : "standby",
          efficiency: 0.87,
          temperature: 24,
          humidity: 52
        };

        await storage.createApplianceReading(fallbackReading);
      }
    }

    console.log("✓ Created appliance readings");

    // Generate AI-powered battery logs for both users
    try {
      const batteryData1 = await aiDataGenerator.generateRealisticBatteryData(currentHour, "clear", 4.2);
      const batteryLog1: InsertBatteryLog = {
        userId: createdUser1.id,
        timestamp: now,
        socPercent: batteryData1.socPercent,
        dodPercent: batteryData1.dodPercent,
        cycleCount: batteryData1.cycleCount,
        voltage: batteryData1.voltage,
        current: batteryData1.current,
        temperature: batteryData1.temperature,
        chargingState: batteryData1.chargingState,
        healthScore: batteryData1.healthScore
      };

      await storage.createBatteryLog(batteryLog1);

      const batteryData2 = await aiDataGenerator.generateRealisticBatteryData(currentHour, "clear", 5.1);
      const batteryLog2: InsertBatteryLog = {
        userId: createdUser2.id,
        timestamp: now,
        socPercent: batteryData2.socPercent,
        dodPercent: batteryData2.dodPercent,
        cycleCount: batteryData2.cycleCount,
        voltage: batteryData2.voltage,
        current: batteryData2.current,
        temperature: batteryData2.temperature,
        chargingState: batteryData2.chargingState,
        healthScore: batteryData2.healthScore
      };

      await storage.createBatteryLog(batteryLog2);
    } catch (error) {
      console.log("Using fallback battery data:", (error as Error).message);
      
      // Fallback battery data
      const fallbackBattery1: InsertBatteryLog = {
        userId: createdUser1.id,
        timestamp: now,
        socPercent: 75.5,
        dodPercent: 24.5,
        cycleCount: 245,
        voltage: 48.2,
        current: -12.5, // Discharging
        temperature: 28.5,
        chargingState: "discharging",
        healthScore: 92.1
      };

      const fallbackBattery2: InsertBatteryLog = {
        userId: createdUser2.id,
        timestamp: now,
        socPercent: 82.3,
        dodPercent: 17.7,
        cycleCount: 198,
        voltage: 49.1,
        current: 8.2, // Charging
        temperature: 26.8,
        chargingState: "charging",
        healthScore: 94.7
      };

      await storage.createBatteryLog(fallbackBattery1);
      await storage.createBatteryLog(fallbackBattery2);
    }

    console.log("✓ Created battery logs");
    console.log("🎉 Sample data seeding completed successfully!");
    
    return {
      users: [createdUser1, createdUser2],
      households: [createdHousehold1, createdHousehold2]
    };

  } catch (error) {
    console.error("Error seeding data:", error);
    throw error;
  }
}

// Run the seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedSampleData()
    .then(() => {
      console.log("Seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}