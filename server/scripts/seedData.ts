import { storage } from "../storage";
import type { InsertUser, InsertHousehold, InsertDevice, InsertApplianceReading, InsertBatteryLog, InsertMeterReading } from "@shared/schema";
import { aiDataGenerator } from "../services/aiDataGenerator";
import bcrypt from "bcrypt";

export async function seedSampleData() {
  try {
    console.log("Starting data seeding...");

    // Create sample users with hashed passwords
    const user1: InsertUser = {
      email: "baltimore.user1@example.com",
      passwordHash: await bcrypt.hash("password123", 10),
      name: "John Smith"
    };

    const user2: InsertUser = {
      email: "baltimore.user2@example.com", 
      passwordHash: await bcrypt.hash("password123", 10),
      name: "Sarah Johnson"
    };

    const createdUser1 = await storage.createUser(user1);
    const createdUser2 = await storage.createUser(user2);
    console.log("✓ Created users");

    // Create households in Baltimore, MD area (21201) with solar setup
    const household1: InsertHousehold = {
      userId: createdUser1.id,
      name: "Baltimore Smart Home 1",
      latitude: 39.2904,
      longitude: -76.6122,
      pvKw: 5.0, // 5kW solar system
      tilt: 30,
      azimuth: 180, // South facing
      tariffCurrency: "USD",
      tariffPerKwh: 0.12, // $0.12 per kWh (typical Baltimore rate)
      co2FactorKgPerKwh: 0.45, // Maryland grid emission factor
      usePvwatts: true
    };

    const household2: InsertHousehold = {
      userId: createdUser2.id,
      name: "Baltimore Smart Home 2", 
      latitude: 39.2912,
      longitude: -76.6146,
      pvKw: 6.5, // 6.5kW solar system
      tilt: 30,
      azimuth: 180,
      tariffCurrency: "USD",
      tariffPerKwh: 0.12,
      co2FactorKgPerKwh: 0.45,
      usePvwatts: true
    };

    const createdHousehold1 = await storage.createHousehold(household1);
    const createdHousehold2 = await storage.createHousehold(household2);
    console.log("✓ Created households");

    // Create smart energy devices for household 1 (scheduling focused)
    const devices1: InsertDevice[] = [
      {
        householdId: createdHousehold1.id,
        name: "Smart Water Heater",
        typicalKwh: 4.5, // 4.5 kWh typical daily usage
        flexible: true, // Can be scheduled
        minDurationHours: 2, // Minimum 2 hour runtime
        earliestHour: 5, // Can start as early as 5 AM
        latestHour: 23 // Can start as late as 11 PM
      },
      {
        householdId: createdHousehold1.id,
        name: "Pool Pump",
        typicalKwh: 3.2,
        flexible: true,
        minDurationHours: 6, // Pool pump needs 6 hours daily
        earliestHour: 10,
        latestHour: 16
      },
      {
        householdId: createdHousehold1.id,
        name: "Electric Vehicle Charger",
        typicalKwh: 12.0, // EV charging
        flexible: true,
        minDurationHours: 4,
        earliestHour: 22, // Charge overnight
        latestHour: 6
      },
      {
        householdId: createdHousehold1.id,
        name: "Dishwasher",
        typicalKwh: 1.8,
        flexible: true,
        minDurationHours: 1.5,
        earliestHour: 20,
        latestHour: 3
      },
      {
        householdId: createdHousehold1.id,
        name: "Washer/Dryer",
        typicalKwh: 3.5,
        flexible: true,
        minDurationHours: 2,
        earliestHour: 9,
        latestHour: 21
      }
    ];

    // Create devices for household 2
    const devices2: InsertDevice[] = [
      {
        householdId: createdHousehold2.id,
        name: "Heat Pump Water Heater",
        typicalKwh: 3.8,
        flexible: true,
        minDurationHours: 2.5,
        earliestHour: 4,
        latestHour: 22
      },
      {
        householdId: createdHousehold2.id,
        name: "Air Conditioner",
        typicalKwh: 8.5, // High summer usage
        flexible: false, // Comfort priority
        minDurationHours: 0.5,
        earliestHour: 6,
        latestHour: 23
      },
      {
        householdId: createdHousehold2.id,
        name: "Tesla Model Y Charger",
        typicalKwh: 15.0,
        flexible: true,
        minDurationHours: 5,
        earliestHour: 23,
        latestHour: 7
      },
      {
        householdId: createdHousehold2.id,
        name: "Smart Irrigation",
        typicalKwh: 1.2,
        flexible: true,
        minDurationHours: 1,
        earliestHour: 5,
        latestHour: 8
      },
      {
        householdId: createdHousehold2.id,
        name: "Basement Dehumidifier",
        typicalKwh: 2.1,
        flexible: true,
        minDurationHours: 3,
        earliestHour: 11,
        latestHour: 15
      },
      {
        householdId: createdHousehold2.id,
        name: "Electric Dryer",
        typicalKwh: 2.8,
        flexible: true,
        minDurationHours: 1.5,
        earliestHour: 10,
        latestHour: 20
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

    // Generate AI-powered appliance readings for various appliances
    const applianceNames = [
      "Refrigerator", "Air Conditioner", "Water Heater", "Microwave", 
      "Washing Machine", "Dishwasher", "Television", "Computer"
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