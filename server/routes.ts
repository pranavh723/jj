import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authService } from "./services/auth";
import { weatherService } from "./services/weather";
import { solarService } from "./services/solar";
import { recommendationService } from "./services/recommendations";
import { schedulerService } from "./jobs/scheduler";
import { 
  insertUserSchema, insertHouseholdSchema, insertDeviceSchema, 
  insertMeterReadingSchema, insertApplianceReadingSchema, insertApplianceAnomalySchema,
  insertHouseholdEnergySchema, insertEnergyTradeSchema, insertBatteryLogSchema,
  type InsertApplianceAnomaly
} from "@shared/schema";
import { normalizeApplianceName } from "@shared/applianceUtils";
import { z } from "zod";

// Extended Express Request interface
interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    name?: string;
  };
}

// Schema for user registration (includes password)
const registerUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1)
});

// Middleware for JWT authentication
const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const token = authService.extractTokenFromHeader(req.headers.authorization);
  
  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  const payload = authService.verifyToken(token);
  if (!payload) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  (req as AuthenticatedRequest).user = payload;
  next();
};

// Enhanced AI-powered anomaly detection service
async function detectApplianceAnomalies(
  userId: string, 
  currentReading: { applianceName: string; powerWatts: number; timestamp: Date }, 
  readingId: string
): Promise<Array<Omit<InsertApplianceAnomaly, 'id'>>> {
  const anomalies: Array<Omit<InsertApplianceAnomaly, 'id'>> = [];
  
  // Get historical data for the appliance (last 7 days)
  const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const allReadings = await storage.getApplianceReadings(userId, last7Days, new Date());
  const applianceReadings = allReadings.filter(r => r.applianceName === currentReading.applianceName);
  
  if (applianceReadings.length < 3) {
    // Not enough data for analysis
    return anomalies;
  }
  
  const powers = applianceReadings.map(r => r.powerWatts);
  
  // Statistical baseline calculation
  const mean = powers.reduce((sum, p) => sum + p, 0) / powers.length;
  const variance = powers.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / powers.length;
  const stdDev = Math.sqrt(variance);
  
  // Algorithm 1: Enhanced Power Spike Detection
  const spikeThreshold = mean + 2 * stdDev;
  const criticalSpikeThreshold = mean + 3 * stdDev;
  
  if (currentReading.powerWatts > criticalSpikeThreshold) {
    anomalies.push({
      applianceReadingId: readingId,
      timestamp: new Date(),
      anomalyType: 'power_spike_critical',
      severity: 'critical'
    });
  } else if (currentReading.powerWatts > spikeThreshold) {
    anomalies.push({
      applianceReadingId: readingId,
      timestamp: new Date(),
      anomalyType: 'power_spike',
      severity: 'warning'
    });
  }
  
  // Algorithm 2: Power Drop Detection
  const dropThreshold = Math.max(0, mean - 2 * stdDev);
  const criticalDropThreshold = Math.max(0, mean - 3 * stdDev);
  
  if (currentReading.powerWatts < criticalDropThreshold && mean > 50) {
    anomalies.push({
      applianceReadingId: readingId,
      timestamp: new Date(),
      anomalyType: 'power_drop_critical',
      severity: 'critical'
    });
  } else if (currentReading.powerWatts < dropThreshold && mean > 30) {
    anomalies.push({
      applianceReadingId: readingId,
      timestamp: new Date(),
      anomalyType: 'power_drop',
      severity: 'warning'
    });
  }
  
  // Algorithm 3: Efficiency Anomaly Detection
  const recentReadings = applianceReadings.filter(r => new Date(r.timestamp) > last24Hours);
  if (recentReadings.length >= 5) {
    const recentPowers = recentReadings.map(r => r.powerWatts);
    const recentMean = recentPowers.reduce((sum, p) => sum + p, 0) / recentPowers.length;
    const efficiencyRatio = recentMean / mean;
    
    if (efficiencyRatio > 1.5 && mean > 20) {
      anomalies.push({
        applianceReadingId: readingId,
        timestamp: new Date(),
        anomalyType: 'efficiency_degradation',
        severity: 'warning'
      });
    } else if (efficiencyRatio > 2.0 && mean > 20) {
      anomalies.push({
        applianceReadingId: readingId,
        timestamp: new Date(),
        anomalyType: 'efficiency_failure',
        severity: 'critical'
      });
    }
  }
  
  // Algorithm 4: Time-based Pattern Anomaly
  const currentHour = currentReading.timestamp.getHours();
  const currentDayOfWeek = currentReading.timestamp.getDay();
  
  const sameTimeReadings = applianceReadings.filter(r => {
    const readingDate = new Date(r.timestamp);
    const hourDiff = Math.abs(readingDate.getHours() - currentHour);
    const dayDiff = Math.abs(readingDate.getDay() - currentDayOfWeek);
    return hourDiff <= 1 && dayDiff === 0;
  });
  
  if (sameTimeReadings.length >= 3) {
    const sameTimePowers = sameTimeReadings.map(r => r.powerWatts);
    const sameTimeMean = sameTimePowers.reduce((sum, p) => sum + p, 0) / sameTimePowers.length;
    const sameTimeStdDev = Math.sqrt(
      sameTimePowers.reduce((sum, p) => sum + Math.pow(p - sameTimeMean, 2), 0) / sameTimePowers.length
    );
    
    if (Math.abs(currentReading.powerWatts - sameTimeMean) > 2 * sameTimeStdDev && sameTimeMean > 10) {
      anomalies.push({
        applianceReadingId: readingId,
        timestamp: new Date(),
        anomalyType: 'time_pattern_anomaly',
        severity: 'warning'
      });
    }
  }
  
  // Algorithm 5: Zero Power Anomaly (for always-on appliances)
  const alwaysOnAppliances = ['refrigerator', 'fridge', 'freezer', 'security system', 'router', 'modem'];
  const isAlwaysOn = alwaysOnAppliances.some(appliance => 
    currentReading.applianceName.toLowerCase().includes(appliance)
  );
  
  if (isAlwaysOn && currentReading.powerWatts < 5 && mean > 20) {
    anomalies.push({
      applianceReadingId: readingId,
      timestamp: new Date(),
      anomalyType: 'unexpected_shutdown',
      severity: 'critical'
    });
  }
  
  // Algorithm 6: Cycling Anomaly Detection
  if (applianceReadings.length >= 10) {
    const last2Hours = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const recent2HourReadings = applianceReadings
      .filter(r => new Date(r.timestamp) > last2Hours)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
    if (recent2HourReadings.length >= 6) {
      let significantChanges = 0;
      for (let i = 1; i < recent2HourReadings.length; i++) {
        const powerDiff = Math.abs(recent2HourReadings[i].powerWatts - recent2HourReadings[i-1].powerWatts);
        if (powerDiff > mean * 0.3) {
          significantChanges++;
        }
      }
      
      if (significantChanges >= 5) {
        anomalies.push({
          applianceReadingId: readingId,
          timestamp: new Date(),
          anomalyType: 'rapid_cycling',
          severity: 'warning'
        });
      }
    }
  }
  
  return anomalies;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name } = registerUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash password and create user
      const passwordHash = await authService.hashPassword(password);
      const user = await storage.createUser({ email, passwordHash, name });
      
      // Automatically create a default household for new users
      try {
        const householdData = insertHouseholdSchema.parse({
          userId: user.id,
          name: `${name}'s Home`,
          latitude: 28.6139, // Default to Delhi, India coordinates
          longitude: 77.2090,
          pvKw: 0, // User can add solar panels later
          tariffPerKwh: 5.0, // Default tariff rate in INR
          tariffCurrency: 'INR',
          co2FactorKgPerKwh: 0.82, // India grid emission factor
        });
        
        await storage.createHousehold(householdData);
      } catch (householdError) {
        // Rollback user creation if household creation fails
        console.error('Household creation failed during registration:', householdError);
        try {
          await storage.deleteUser(user.id);
        } catch (deleteError) {
          console.error('Failed to rollback user creation:', deleteError);
        }
        return res.status(400).json({ message: 'Registration failed' });
      }
      
      // Generate token
      const token = authService.generateToken(user);
      
      res.json({ 
        token, 
        user: { id: user.id, email: user.email, name: user.name }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ message: 'Registration failed' });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Verify password
      const isValid = await authService.verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate token
      const token = authService.generateToken(user);
      
      res.json({ 
        token, 
        user: { id: user.id, email: user.email, name: user.name }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(400).json({ message: 'Login failed' });
    }
  });

  // Household routes
  app.post("/api/households", authenticateToken, async (req, res) => {
    try {
      const householdData = insertHouseholdSchema.parse({
        ...req.body,
        userId: (req as AuthenticatedRequest).user.userId
      });
      
      const household = await storage.createHousehold(householdData);
      res.json(household);
    } catch (error) {
      console.error('Create household error:', error);
      res.status(400).json({ message: 'Failed to create household' });
    }
  });

  app.get("/api/households", authenticateToken, async (req, res) => {
    try {
      const households = await storage.getHouseholdsByUserId((req as AuthenticatedRequest).user.userId);
      res.json(households);
    } catch (error) {
      console.error('Get households error:', error);
      res.status(500).json({ message: 'Failed to fetch households' });
    }
  });

  app.get("/api/households/:id", authenticateToken, async (req, res) => {
    try {
      const household = await storage.getHousehold(req.params.id);
      if (!household || household.userId !== (req as AuthenticatedRequest).user.userId) {
        return res.status(404).json({ message: 'Household not found' });
      }
      res.json(household);
    } catch (error) {
      console.error('Get household error:', error);
      res.status(500).json({ message: 'Failed to fetch household' });
    }
  });

  app.put("/api/households/:id", authenticateToken, async (req, res) => {
    try {
      const householdId = req.params.id;
      const userId = (req as AuthenticatedRequest).user.userId;
      
      // Verify household belongs to user
      const existingHousehold = await storage.getHousehold(householdId);
      if (!existingHousehold || existingHousehold.userId !== userId) {
        return res.status(404).json({ message: 'Household not found' });
      }
      
      // Parse and validate update data (excluding userId, id, createdAt)
      const updateData = insertHouseholdSchema.omit({ userId: true }).parse(req.body);
      
      const household = await storage.updateHousehold(householdId, updateData);
      res.json(household);
    } catch (error) {
      console.error('Update household error:', error);
      res.status(400).json({ message: 'Failed to update household' });
    }
  });

  app.delete("/api/households/:id", authenticateToken, async (req, res) => {
    try {
      const householdId = req.params.id;
      const userId = (req as AuthenticatedRequest).user.userId;
      
      // Verify household belongs to user
      const household = await storage.getHousehold(householdId);
      if (!household || household.userId !== userId) {
        return res.status(404).json({ message: 'Household not found' });
      }
      
      await storage.deleteHousehold(householdId);
      res.json({ message: 'Household deleted successfully' });
    } catch (error) {
      console.error('Delete household error:', error);
      res.status(500).json({ message: 'Failed to delete household' });
    }
  });

  // Device routes
  app.post("/api/devices", authenticateToken, async (req, res) => {
    try {
      const deviceData = insertDeviceSchema.parse(req.body);
      
      // Verify household belongs to user
      const household = await storage.getHousehold(deviceData.householdId);
      if (!household || household.userId !== (req as AuthenticatedRequest).user.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const device = await storage.createDevice(deviceData);
      res.json(device);
    } catch (error) {
      console.error('Create device error:', error);
      res.status(400).json({ message: 'Failed to create device' });
    }
  });

  app.get("/api/devices", authenticateToken, async (req, res) => {
    try {
      const householdId = req.query.household_id as string;
      if (!householdId) {
        return res.status(400).json({ message: 'household_id required' });
      }

      // Verify household belongs to user
      const household = await storage.getHousehold(householdId);
      if (!household || household.userId !== (req as AuthenticatedRequest).user.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const devices = await storage.getDevicesByHouseholdId(householdId);
      res.json(devices);
    } catch (error) {
      console.error('Get devices error:', error);
      res.status(500).json({ message: 'Failed to fetch devices' });
    }
  });

  app.delete("/api/devices/:id", authenticateToken, async (req, res) => {
    try {
      const device = await storage.getDevice(req.params.id);
      if (!device) {
        return res.status(404).json({ message: 'Device not found' });
      }

      // Verify household belongs to user
      const household = await storage.getHousehold(device.householdId);
      if (!household || household.userId !== (req as AuthenticatedRequest).user.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      await storage.deleteDevice(req.params.id);
      res.json({ message: 'Device deleted' });
    } catch (error) {
      console.error('Delete device error:', error);
      res.status(500).json({ message: 'Failed to delete device' });
    }
  });

  // Dashboard data route
  app.get("/api/dashboard", authenticateToken, async (req, res) => {
    try {
      const householdId = req.query.household_id as string;
      if (!householdId) {
        return res.status(400).json({ message: 'household_id required' });
      }

      // Verify household belongs to user
      const household = await storage.getHousehold(householdId);
      if (!household || household.userId !== (req as AuthenticatedRequest).user.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Get daily metrics
      const metrics = await recommendationService.calculateDailyMetrics(householdId);
      
      // Get current weather
      const currentWeather = await weatherService.getCurrentWeather(
        household.latitude, 
        household.longitude
      );

      // Get latest recommendations
      const recommendations = await storage.getLatestRecommendations(householdId);

      res.json({
        metrics,
        weather: currentWeather,
        recommendations
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard data' });
    }
  });

  // Forecasts route
  app.get("/api/forecasts", authenticateToken, async (req, res) => {
    try {
      const householdId = req.query.household_id as string;
      if (!householdId) {
        return res.status(400).json({ message: 'household_id required' });
      }

      // Verify household belongs to user
      const household = await storage.getHousehold(householdId);
      if (!household || household.userId !== (req as AuthenticatedRequest).user.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Get next 48 hours (extended for better forecasting)
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 48 * 60 * 60 * 1000);

      let [weatherData, pvData] = await Promise.all([
        storage.getWeatherHourly(householdId, startTime, endTime),
        storage.getPvForecastHourly(householdId, startTime, endTime)
      ]);

      // Generate fallback data if no forecast data exists
      if (weatherData.length === 0 || pvData.length === 0) {
        console.log(`Generating fallback forecast data for household ${householdId}`);
        
        // Default PV system configuration
        const pvCapacity = household.pvKw || 5.0; // Default 5kW system
        
        // Generate realistic mock data for the next 48 hours
        const mockWeatherData = [];
        const mockPvData = [];
        
        for (let i = 0; i < 48; i++) {
          const timestamp = new Date(startTime.getTime() + i * 60 * 60 * 1000);
          const hour = timestamp.getHours();
          
          // Generate realistic weather patterns
          const baseTemp = 26 + Math.sin((hour - 6) / 24 * 2 * Math.PI) * 8; // 18-34°C range
          const tempC = baseTemp + (Math.random() - 0.5) * 4;
          
          // Cloud cover varies throughout day
          const cloudsPct = Math.max(0, Math.min(100, 
            30 + Math.sin((hour + i/4) / 12 * Math.PI) * 40 + (Math.random() - 0.5) * 30
          ));
          
          const windMps = 2 + Math.random() * 6; // 2-8 m/s
          const ghiProxy = Math.max(0, (hour >= 6 && hour <= 18) ? 
            Math.sin((hour - 6) / 12 * Math.PI) * 800 * (1 - cloudsPct/150) : 0
          );
          
          mockWeatherData.push({
            householdId,
            timestamp,
            tempC: Math.round(tempC * 10) / 10,
            cloudsPct: Math.round(cloudsPct),
            windMps: Math.round(windMps * 10) / 10,
            ghiProxy: Math.round(ghiProxy)
          });
          
          // Generate corresponding PV output
          let acKw = 0;
          if (hour >= 6 && hour <= 18) {
            const solarFactor = Math.sin((hour - 6) / 12 * Math.PI);
            const cloudFactor = 1 - (cloudsPct / 100) * 0.7;
            const tempFactor = Math.max(0.7, 1 - Math.max(0, tempC - 25) * 0.004);
            acKw = pvCapacity * solarFactor * cloudFactor * tempFactor;
          }
          
          mockPvData.push({
            householdId,
            timestamp,
            acKw: Math.max(0, Math.round(acKw * 1000) / 1000)
          });
        }
        
        // Store the generated data for future use
        try {
          await Promise.all([
            storage.upsertWeatherHourly(mockWeatherData),
            storage.upsertPvForecastHourly(mockPvData)
          ]);
        } catch (error) {
          console.error('Error storing mock forecast data:', error);
        }
        
        // Generate IDs for mock data to match the expected types
        weatherData = mockWeatherData.map(data => ({
          ...data,
          id: crypto.randomUUID()
        }));
        pvData = mockPvData.map(data => ({
          ...data,
          id: crypto.randomUUID()
        }));
      }

      res.json({
        weather: weatherData,
        pv: pvData
      });
    } catch (error) {
      console.error('Forecasts error:', error);
      res.status(500).json({ message: 'Failed to fetch forecasts' });
    }
  });

  // Generate recommendations on demand
  app.post("/api/recommendations/generate", authenticateToken, async (req, res) => {
    try {
      const householdId = req.query.household_id as string;
      if (!householdId) {
        return res.status(400).json({ message: 'household_id required' });
      }

      // Verify household belongs to user
      const household = await storage.getHousehold(householdId);
      if (!household || household.userId !== (req as AuthenticatedRequest).user.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      await recommendationService.generateRecommendations(householdId);
      const recommendations = await storage.getLatestRecommendations(householdId);

      res.json(recommendations);
    } catch (error) {
      console.error('Generate recommendations error:', error);
      res.status(500).json({ message: 'Failed to generate recommendations' });
    }
  });

  // Meter readings
  app.post("/api/meter-readings", authenticateToken, async (req, res) => {
    try {
      const readingData = insertMeterReadingSchema.parse(req.body);
      
      // Verify household belongs to user
      const household = await storage.getHousehold(readingData.householdId);
      if (!household || household.userId !== (req as AuthenticatedRequest).user.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const reading = await storage.createMeterReading(readingData);
      res.json(reading);
    } catch (error) {
      console.error('Create meter reading error:', error);
      res.status(400).json({ message: 'Failed to create meter reading' });
    }
  });

  // Community routes
  app.get("/api/communities", async (req, res) => {
    try {
      const communities = await storage.getAllCommunities();
      res.json(communities);
    } catch (error) {
      console.error('Get communities error:', error);
      res.status(500).json({ message: 'Failed to fetch communities' });
    }
  });

  app.get("/api/community/:id/leaderboard", async (req, res) => {
    try {
      const communityId = req.params.id;
      
      // Get current month period
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const snapshots = await storage.getLeaderboardSnapshots(communityId, periodStart, periodEnd);
      res.json(snapshots);
    } catch (error) {
      console.error('Get leaderboard error:', error);
      res.status(500).json({ message: 'Failed to fetch leaderboard' });
    }
  });

  app.get("/api/community/:id/households", async (req, res) => {
    try {
      const communityId = req.params.id;
      const households = await storage.getCommunityHouseholds(communityId);
      res.json(households);
    } catch (error) {
      console.error('Get community households error:', error);
      res.status(500).json({ message: 'Failed to fetch community households' });
    }
  });

  // Centralized data endpoint that generates comprehensive data from households
  app.get("/api/data", authenticateToken, async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      
      // Get all households for the user
      const households = await storage.getHouseholdsByUserId(user.userId);
      
      if (households.length === 0) {
        return res.json({
          households: [],
          summary: {
            totalHouseholds: 0,
            totalEnergyConsumption: 0,
            totalRenewableContribution: 0,
            totalBatteryStorage: 0
          }
        });
      }

      // Generate comprehensive data for each household with auto-filled defaults
      const enrichedHouseholds = await Promise.all(households.map(async (household: any, index: number) => {
        // Get devices for this household
        const devices = await storage.getDevicesByHouseholdId(household.id);
        
        // Auto-generate missing attributes with realistic defaults
        const currentHour = new Date().getHours();
        const currentMinute = new Date().getMinutes();
        
        // Calculate renewable share based on PV capacity
        const baseRenewableShare = Math.min(95, 45 + (household.pvKw * 8)); // Higher PV = higher renewable share
        const renewableShare = Math.round(baseRenewableShare + (Math.sin(household.id.length) * 15));
        
        // Calculate daily consumption based on devices and household size
        const baseConsumption = devices.reduce((sum: number, device: any) => sum + (device.typicalKwh || 2), 8);
        const dailyConsumption = Math.round((baseConsumption * (0.8 + Math.random() * 0.4)) * 10) / 10;
        
        // Auto-generate battery capacity based on PV capacity and consumption
        const batteryCapacity = Math.round((household.pvKw * 2.5 + dailyConsumption * 0.6) * 10) / 10;
        
        // Generate anomaly count based on device count and randomness
        const anomalyCount = Math.floor(Math.random() * Math.min(3, Math.floor(devices.length / 4)));
        
        // Generate battery health data
        let baseSoC = 60 + (index * 15) % 40; // 60-85% range varied by household
        
        // Adjust SoC based on time of day
        if (currentHour >= 6 && currentHour <= 18) {
          // Daytime: charging from solar
          baseSoC += Math.sin((currentHour - 6) / 12 * Math.PI) * 15;
        } else {
          // Nighttime: discharging
          baseSoC -= Math.sin((currentHour + 6) / 12 * Math.PI) * 10;
        }
        
        // Ensure SoC stays within realistic bounds
        const stateOfCharge = Math.max(15, Math.min(95, baseSoC + (Math.random() - 0.5) * 5));
        
        // Calculate battery cycles and health
        const dailyCycles = Math.round((1 + Math.random() * 0.5) * 10) / 10; // 1.0-1.5 cycles per day
        const totalCycles = Math.floor(dailyCycles * 365 * (1 + Math.random())); // Estimated total cycles
        const currentDoD = Math.round((100 - stateOfCharge) * 0.8 * 10) / 10; // Depth of discharge
        
        // Health status based on SoC and usage patterns
        let healthStatus = 'good';
        if (stateOfCharge < 20 || dailyCycles > 1.3 || totalCycles > 1500) {
          healthStatus = 'fair';
        } else if (stateOfCharge < 10 || dailyCycles > 1.5 || totalCycles > 2000) {
          healthStatus = 'poor';
        }

        return {
          id: household.id,
          name: household.name,
          location: {
            latitude: household.latitude,
            longitude: household.longitude
          },
          // Device data
          devices: devices.length,
          deviceList: devices.map((device: any) => ({
            id: device.id,
            name: device.name,
            typicalKwh: device.typicalKwh,
            flexible: device.flexible,
            status: anomalyCount > 0 && Math.random() < 0.3 ? 'warning' : 'normal'
          })),
          // Energy data
          dailyConsumption,
          renewableShare,
          pvCapacity: household.pvKw,
          // Battery data
          batteryCapacity,
          battery: {
            stateOfCharge: Math.round(stateOfCharge * 10) / 10,
            healthStatus,
            currentDoD,
            totalCycles,
            dailyCycles,
            lastAlert: totalCycles > 1800 ? 'High cycle count detected' : undefined
          },
          // System data
          anomalyCount,
          tariff: {
            perKwh: household.tariffPerKwh,
            currency: household.tariffCurrency
          },
          co2Factor: household.co2FactorKgPerKwh,
          // Additional computed metrics
          monthlySavings: Math.round(dailyConsumption * renewableShare / 100 * household.tariffPerKwh * 30 * 10) / 10,
          co2Avoided: Math.round(dailyConsumption * renewableShare / 100 * household.co2FactorKgPerKwh * 30 * 10) / 10
        };
      }));

      // Calculate summary metrics
      const totalHouseholds = enrichedHouseholds.length;
      const totalEnergyConsumption = enrichedHouseholds.reduce((sum, h) => sum + h.dailyConsumption, 0);
      const totalRenewableContribution = enrichedHouseholds.reduce((sum, h) => 
        sum + (h.dailyConsumption * h.renewableShare / 100), 0);
      const totalBatteryStorage = enrichedHouseholds.reduce((sum, h) => sum + h.batteryCapacity, 0);
      const averageRenewableShare = totalHouseholds > 0 ? 
        enrichedHouseholds.reduce((sum, h) => sum + h.renewableShare, 0) / totalHouseholds : 0;

      res.json({
        households: enrichedHouseholds,
        summary: {
          totalHouseholds,
          totalEnergyConsumption: Math.round(totalEnergyConsumption * 10) / 10,
          totalRenewableContribution: Math.round(totalRenewableContribution * 10) / 10,
          totalBatteryStorage: Math.round(totalBatteryStorage * 10) / 10,
          averageRenewableShare: Math.round(averageRenewableShare * 10) / 10,
          totalDevices: enrichedHouseholds.reduce((sum, h) => sum + h.devices, 0),
          totalAnomalies: enrichedHouseholds.reduce((sum, h) => sum + h.anomalyCount, 0)
        }
      });
    } catch (error) {
      console.error('Get centralized data error:', error);
      res.status(500).json({ message: 'Failed to fetch centralized data' });
    }
  });

  // Legacy Community Energy Insights API - Now redirects to centralized data
  app.get("/api/community", authenticateToken, async (req, res) => {
    try {
      // Redirect to the centralized data endpoint
      const dataResponse = await fetch(`${req.protocol}://${req.get('host')}/api/data`, {
        headers: {
          'Authorization': req.headers.authorization || ''
        }
      });
      const data = await dataResponse.json();
      res.json(data);
    } catch (error) {
      console.error('Get community energy insights error:', error);
      res.status(500).json({ message: 'Failed to fetch community energy insights' });
    }
  });

  // ===== NEW FEATURE ROUTES =====
  
  // Appliance Anomaly Detection Routes
  app.post("/api/readings", authenticateToken, async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const data = insertApplianceReadingSchema.omit({ userId: true }).extend({
        powerWatts: z.coerce.number(),
        timestamp: z.coerce.date()
      }).parse(req.body);
      const fullData = {
        ...data,
        applianceName: normalizeApplianceName(data.applianceName),
        userId: user.userId
      };
      
      const reading = await storage.createApplianceReading(fullData);
      
      // Enhanced AI anomaly detection with multiple rule-based algorithms
      const anomalies = await detectApplianceAnomalies(user.userId, fullData, reading.id);
      
      // Store all detected anomalies
      if (anomalies.length > 0) {
        console.log(`Detected ${anomalies.length} anomalies for ${fullData.applianceName}: ${anomalies.map(a => a.anomalyType).join(', ')}`);
        for (const anomaly of anomalies) {
          await storage.createApplianceAnomaly(anomaly);
        }
      }
      
      console.log(`Appliance reading added: ${fullData.applianceName} - ${fullData.powerWatts}W`);
      
      res.json({ reading, anomaliesDetected: anomalies.length });
    } catch (error) {
      console.error('Create appliance reading error:', error);
      res.status(400).json({ message: 'Failed to create appliance reading' });
    }
  });

  app.get("/api/readings", authenticateToken, async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const householdId = req.query.household_id as string;
      
      // Get readings from the last 30 days
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      if (householdId) {
        // Verify household belongs to user
        const household = await storage.getHousehold(householdId);
        if (!household || household.userId !== user.userId) {
          return res.status(403).json({ message: 'Access denied' });
        }
        
        // For household filtering, we'll filter by appliance names that match the household's devices
        // Get all devices for this household
        const devices = await storage.getDevicesByHouseholdId(householdId);
        const deviceNames = devices.map(device => device.name);
        
        // Get all user readings and filter by device names
        const allReadings = await storage.getApplianceReadings(user.userId, startTime, endTime);
        const filteredReadings = allReadings.filter(reading => 
          deviceNames.some(deviceName => 
            reading.applianceName.toLowerCase().includes(deviceName.toLowerCase()) ||
            deviceName.toLowerCase().includes(reading.applianceName.toLowerCase())
          )
        );
        res.json(filteredReadings);
      } else {
        const readings = await storage.getApplianceReadings(user.userId, startTime, endTime);
        res.json(readings);
      }
    } catch (error) {
      console.error('Get readings error:', error);
      res.status(500).json({ message: 'Failed to fetch readings' });
    }
  });

  app.delete("/api/readings/:id", authenticateToken, async (req, res) => {
    try {
      const readingId = req.params.id;
      const user = (req as AuthenticatedRequest).user;
      
      // Verify the reading exists and belongs to the authenticated user
      const reading = await storage.getApplianceReadingById(readingId);
      
      if (!reading) {
        return res.status(404).json({ message: 'Reading not found' });
      }
      
      if (reading.userId !== user.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      await storage.deleteApplianceReading(readingId);
      res.json({ message: 'Reading deleted successfully' });
    } catch (error) {
      console.error('Delete reading error:', error);
      res.status(500).json({ message: 'Failed to delete reading' });
    }
  });

  app.get("/api/anomalies", authenticateToken, async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const householdId = req.query.household_id as string;
      
      if (householdId) {
        // Verify household belongs to user
        const household = await storage.getHousehold(householdId);
        if (!household || household.userId !== user.userId) {
          return res.status(403).json({ message: 'Access denied' });
        }
        
        // Get all anomalies for the user first
        const allAnomalies = await storage.getApplianceAnomalies(user.userId);
        
        // Filter anomalies by household's device names
        const devices = await storage.getDevicesByHouseholdId(householdId);
        const deviceNames = devices.map(device => device.name);
        
        const filteredAnomalies = allAnomalies.filter((anomaly: any) => {
          const applianceName = anomaly.applianceReading?.applianceName || '';
          return deviceNames.some(deviceName => 
            applianceName.toLowerCase().includes(deviceName.toLowerCase()) ||
            deviceName.toLowerCase().includes(applianceName.toLowerCase())
          );
        });
        
        res.json(filteredAnomalies);
      } else {
        const anomalies = await storage.getApplianceAnomalies(user.userId);
        res.json(anomalies);
      }
    } catch (error) {
      console.error('Get anomalies error:', error);
      res.status(500).json({ message: 'Failed to fetch anomalies' });
    }
  });

  // Energy Marketplace Routes - Enhanced with detailed P2P trade data
  app.get("/api/marketplace", authenticateToken, async (req, res) => {
    try {
      // Get time range from query parameter (today, week, month)
      const timeRange = req.query.range as string || 'today';
      let timeRangeHours = 24; // Default: today (24 hours)
      
      if (timeRange === 'week') {
        timeRangeHours = 7 * 24; // 7 days
      } else if (timeRange === 'month') {
        timeRangeHours = 30 * 24; // 30 days
      }
      
      // Get all households for marketplace simulation
      const households = await storage.getAllHouseholds();
      
      // Generate realistic seller/buyer names for P2P trading
      const mockNames = [
        'Raj Sharma', 'Priya Patel', 'Amit Kumar', 'Neha Singh', 'Vikram Malhotra',
        'Sneha Gupta', 'Rohit Verma', 'Anjali Mehta', 'Suresh Reddy', 'Kavita Jain',
        'Manish Agarwal', 'Deepika Roy', 'Arjun Nair', 'Pooja Sinha', 'Ravi Iyer',
        'Sita Rao', 'Kiran Shah', 'Meera Bhatt', 'Arun Das', 'Shweta Mishra'
      ];
      
      // Generate dynamic marketplace trades with all required fields
      // Adjust trade count based on time range
      const currentTrades = [];
      let baseNumTrades = Math.min(25, Math.max(10, households.length * 2));
      if (timeRange === 'week') baseNumTrades = baseNumTrades * 5;
      if (timeRange === 'month') baseNumTrades = baseNumTrades * 15;
      const numTrades = Math.min(100, baseNumTrades); // Cap at 100 trades
      
      for (let i = 0; i < numTrades; i++) {
        const kWh = Math.round((Math.random() * 8 + 1) * 10) / 10; // 1.0 - 9.0 kWh
        const basePrice = 6 + Math.random() * 4; // ₹6-10 per kWh
        const totalPrice = Math.round(kWh * basePrice * 100) / 100;
        
        const trade = {
          trade_id: `TXN${Date.now()}-${i.toString().padStart(3, '0')}`,
          seller_name: mockNames[Math.floor(Math.random() * mockNames.length)],
          buyer_name: mockNames[Math.floor(Math.random() * mockNames.length)],
          kWh: kWh,
          price: totalPrice,
          timestamp: new Date(Date.now() - Math.random() * timeRangeHours * 60 * 60 * 1000) // Within specified time range
        };
        
        // Ensure seller and buyer are different
        if (trade.seller_name !== trade.buyer_name) {
          currentTrades.push(trade);
        }
      }
      
      // Sort trades by timestamp (newest first)
      currentTrades.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      // Calculate seller statistics for leaderboard
      const sellerStats = new Map();
      currentTrades.forEach(trade => {
        const current = sellerStats.get(trade.seller_name) || { totalKwh: 0, totalEarnings: 0 };
        current.totalKwh += trade.kWh;
        current.totalEarnings += trade.price;
        sellerStats.set(trade.seller_name, current);
      });
      
      const topSellers = Array.from(sellerStats.entries())
        .sort((a, b) => b[1].totalKwh - a[1].totalKwh)
        .slice(0, 8)
        .map((seller, index) => ({
          rank: index + 1,
          seller_name: seller[0],
          energyTradedKwh: Math.round(seller[1].totalKwh * 10) / 10,
          totalEarnings: Math.round(seller[1].totalEarnings * 100) / 100
        }));
      
      // Calculate marketplace metrics
      const totalEnergyTraded = currentTrades.reduce((sum, trade) => sum + trade.kWh, 0);
      const totalValue = currentTrades.reduce((sum, trade) => sum + trade.price, 0);
      const averagePrice = totalValue / totalEnergyTraded || 0;
      const renewablePercentage = 78 + Math.random() * 17; // 78-95% renewable
      
      res.json({
        trades: currentTrades.slice(0, 15), // Most recent 15 trades
        topSellers: topSellers,
        metrics: {
          totalEnergyTraded: Math.round(totalEnergyTraded * 10) / 10,
          totalValue: Math.round(totalValue * 100) / 100,
          averagePrice: Math.round(averagePrice * 100) / 100,
          activeTraders: new Set([...currentTrades.map(t => t.seller_name), ...currentTrades.map(t => t.buyer_name)]).size,
          renewablePercentage: Math.round(renewablePercentage * 10) / 10
        }
      });
    } catch (error) {
      console.error('Get marketplace error:', error);
      res.status(500).json({ message: 'Failed to fetch marketplace data' });
    }
  });


  // Battery Management Routes
  app.get("/api/battery", authenticateToken, async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const userId = user.userId;
      
      const latestStatus = await storage.getLatestBatteryStatus(userId);
      
      // Get battery logs for the last 30 days
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      let logs = await storage.getBatteryLogs(userId, last30Days, new Date());
      
      if (logs.length === 0) {
        // Generate mock data
        const mockLogs = [];
        for (let i = 6; i >= 0; i--) {
          const timestamp = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
          const socPercent = 20 + Math.random() * 60; // 20-80%
          const dodPercent = 100 - socPercent;
          const cycleCount = 150 + Math.floor(Math.random() * 50);
          
          mockLogs.push({
            userId,
            timestamp,
            socPercent,
            dodPercent,
            cycleCount,
            alert: dodPercent > 80 ? 'High depth of discharge - consider charging' : null
          });
        }
        
        // Save mock data
        for (const log of mockLogs) {
          await storage.createBatteryLog(log);
        }
        
        logs = await storage.getBatteryLogs(userId, last30Days, new Date());
      }
      
      const currentHour = new Date().getHours();
      let recommendation = "Monitor battery levels regularly.";
      
      if (latestStatus && latestStatus.socPercent < 30) {
        recommendation = "Charge during 10AM–3PM (solar peak) for optimal performance.";
      } else if (currentHour >= 10 && currentHour <= 15) {
        recommendation = "Great time to charge! Solar generation is at peak.";
      }
      
      res.json(logs);
    } catch (error) {
      console.error('Get battery error:', error);
      res.status(500).json({ message: 'Failed to fetch battery data' });
    }
  });

  app.post("/api/battery", authenticateToken, async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const userId = user.userId;
      
      // Validate request body and set userId server-side  
      const validatedData = insertBatteryLogSchema.omit({ userId: true, timestamp: true }).extend({
        socPercent: z.coerce.number().min(0).max(100),
        dodPercent: z.coerce.number().min(0).max(100),
        cycleCount: z.coerce.number().min(0)
      }).parse(req.body);
      
      const batteryLog = await storage.createBatteryLog({
        ...validatedData,
        userId,
        timestamp: new Date()
      });
      
      res.status(201).json(batteryLog);
    } catch (error) {
      console.error('Create battery log error:', error);
      res.status(500).json({ message: 'Failed to create battery log' });
    }
  });

  // Main Battery Status API - Real-time simulation with live SoC updates
  app.get("/api/main-battery", authenticateToken, async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const userId = user.userId;
      
      // Get the latest battery log to use as baseline
      const latestLog = await storage.getLatestBatteryStatus(userId);
      const currentTime = new Date();
      const currentHour = currentTime.getHours();
      const currentMinute = currentTime.getMinutes();
      
      // Default values if no logs exist
      let baselineData = {
        socPercent: 75,
        dodPercent: 25,
        cycleCount: 450,
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        alert: null as string | null
      };
      
      if (latestLog) {
        baselineData = {
          socPercent: latestLog.socPercent,
          dodPercent: latestLog.dodPercent,
          cycleCount: latestLog.cycleCount,
          timestamp: latestLog.timestamp,
          alert: latestLog.alert
        };
      }
      
      // REAL-TIME SoC SIMULATION - Updates every few seconds
      const timeSinceLastLog = (currentTime.getTime() - baselineData.timestamp.getTime()) / 1000; // seconds
      const secondsNow = currentTime.getSeconds();
      
      // Solar generation simulation (affects charging behavior)
      const solarActive = currentHour >= 6 && currentHour <= 18;
      let solarIntensity = 0;
      
      if (solarActive) {
        // Peak solar at 12 PM, declining towards 6 AM/6 PM
        const solarPeakFactor = Math.sin(((currentHour - 6) / 12) * Math.PI);
        solarIntensity = Math.max(0, solarPeakFactor * 0.8 + Math.random() * 0.2); // 0-1 scale
      }
      
      // Simulate charging/discharging patterns based on time and solar
      let socAdjustment = 0;
      let currentBatteryMode = 'idle';
      
      if (solarActive && solarIntensity > 0.3) {
        // Solar charging during good sunlight
        if (baselineData.socPercent < 95) {
          const chargingRate = solarIntensity * 0.008; // 0.8% per minute max
          socAdjustment = Math.min(5, chargingRate * (timeSinceLastLog / 60));
          currentBatteryMode = 'charging';
        }
      } else if (currentHour >= 18 && currentHour <= 23) {
        // Evening discharge for house loads
        const dischargeRate = 0.005; // 0.5% per minute
        socAdjustment = -Math.min(3, dischargeRate * (timeSinceLastLog / 60));
        currentBatteryMode = 'discharging';
      } else if (currentHour >= 0 && currentHour <= 6) {
        // Overnight gradual discharge
        const nightDischargeRate = 0.002; // 0.2% per minute
        socAdjustment = -Math.min(1, nightDischargeRate * (timeSinceLastLog / 60));
        currentBatteryMode = 'discharging';
      }
      
      // Add small real-time fluctuations (updates every few seconds)
      const realTimeFluctuation = Math.sin((Date.now() / 15000) + userId.charCodeAt(0)) * 0.3; // ±0.3%
      const randomFluctuation = (Math.random() - 0.5) * 0.2; // ±0.1%
      
      // Calculate live SoC with bounds checking
      let liveSoC = Math.max(5, Math.min(100, 
        baselineData.socPercent + socAdjustment + realTimeFluctuation + randomFluctuation
      ));
      
      // Ensure SoC stays realistic during very rapid updates
      if (Math.abs(liveSoC - baselineData.socPercent) > 10) {
        liveSoC = baselineData.socPercent + (liveSoC > baselineData.socPercent ? 8 : -8);
      }
      
      const liveDoD = Math.max(0, Math.min(95, 100 - liveSoC));
      
      // Calculate health status based on cycles and DoD
      let health: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
      let status: 'normal' | 'warning' | 'critical' = 'normal';
      
      if (baselineData.cycleCount > 2000 || liveDoD > 80) {
        health = 'poor';
        status = 'critical';
      } else if (baselineData.cycleCount > 1500 || liveDoD > 60) {
        health = 'fair';
        status = 'warning';
      } else if (baselineData.cycleCount > 1000 || liveDoD > 40) {
        health = 'good';
        status = 'normal';
      }
      
      // Generate intelligent recommendations
      const recommendations: string[] = [];
      if (liveDoD > 80) {
        recommendations.push('Critical: Battery depth of discharge is too high - charge immediately');
      }
      if (liveSoC < 20) {
        recommendations.push('Low battery: Charge during solar peak hours (10AM-3PM) for optimal performance');
      }
      if (baselineData.cycleCount > 1500) {
        recommendations.push('Consider battery replacement planning - high cycle count detected');
      }
      if (liveSoC > 95 && currentBatteryMode === 'charging') {
        recommendations.push('Battery nearly full - solar excess can be sold to grid');
      }
      if (solarActive && liveSoC < 80 && solarIntensity > 0.5) {
        recommendations.push('Excellent solar conditions - optimal time for battery charging');
      }
      if (recommendations.length === 0) {
        recommendations.push('Battery performance is optimal - continue current usage patterns');
      }
      
      // Calculate live voltage based on SoC (typical 12V lead-acid curve)
      const voltage = 11.8 + (liveSoC / 100) * 1.4 + (Math.random() - 0.5) * 0.1;
      
      // Simulate realistic temperature variation
      const baseTemp = 25;
      const tempVariation = (currentBatteryMode === 'charging' ? 2 : 0) + Math.sin(Date.now() / 30000) * 1.5;
      const temperature = baseTemp + tempVariation + (Math.random() - 0.5) * 0.5;
      
      // Generate alerts based on current conditions
      let currentAlert: string | null = baselineData.alert;
      if (liveSoC < 15) {
        currentAlert = 'Critical: Battery charge below 15% - immediate charging required';
      } else if (liveDoD > 85) {
        currentAlert = 'Warning: High depth of discharge - consider reducing power consumption';
      } else if (liveSoC > 98 && currentBatteryMode === 'charging') {
        currentAlert = 'Notice: Battery nearly full - excess solar can be exported to grid';
      } else if (liveSoC > 20 && liveDoD < 80) {
        currentAlert = null; // Clear alerts when in normal range
      }
      
      const mainBatteryStatus = {
        stateOfCharge: Math.round(liveSoC * 10) / 10,
        depthOfDischarge: Math.round(liveDoD * 10) / 10,
        cycleCount: baselineData.cycleCount,
        health,
        voltage: Math.round(voltage * 100) / 100,
        temperature: Math.round(temperature * 10) / 10,
        lastUpdated: currentTime.toISOString(),
        status,
        batteryMode: currentBatteryMode,
        solarIntensity: Math.round(solarIntensity * 100),
        solarActive,
        recommendations,
        alert: currentAlert,
        // Additional live data for dashboard
        powerFlow: {
          charging_kW: currentBatteryMode === 'charging' ? Math.round(solarIntensity * 2.5 * 100) / 100 : 0,
          discharging_kW: currentBatteryMode === 'discharging' ? Math.round((Math.random() * 1.8 + 0.5) * 100) / 100 : 0,
          idle_kW: currentBatteryMode === 'idle' ? Math.round((Math.random() * 0.2) * 100) / 100 : 0
        }
      };
      
      res.json(mainBatteryStatus);
    } catch (error) {
      console.error('Get main battery error:', error);
      res.status(500).json({ message: 'Failed to fetch main battery status' });
    }
  });

  // Legacy endpoint removed - battery status now available in /api/data

  // Schedule Management Routes
  app.get("/api/schedule", authenticateToken, async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      // For now, return mock schedule data
      const mockSchedules = [
        {
          id: '1',
          user_id: user.userId,
          start_time: '10:00',
          end_time: '14:00',
          action: 'Charge battery during solar peak',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          user_id: user.userId,
          start_time: '18:00',
          end_time: '22:00',
          action: 'Run dishwasher using stored solar',
          created_at: new Date().toISOString()
        }
      ];
      res.json(mockSchedules);
    } catch (error) {
      console.error('Get schedule error:', error);
      res.status(500).json({ message: 'Failed to fetch schedules' });
    }
  });

  app.post("/api/schedule", authenticateToken, async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const { start_time, end_time, action } = req.body;
      
      // Create new schedule (mock implementation)
      const newSchedule = {
        id: Date.now().toString(),
        user_id: user.userId,
        start_time,
        end_time,
        action,
        created_at: new Date().toISOString()
      };
      
      res.status(201).json(newSchedule);
    } catch (error) {
      console.error('Create schedule error:', error);
      res.status(500).json({ message: 'Failed to create schedule' });
    }
  });

  // Grid Data API
  app.get("/api/grid", authenticateToken, async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const householdId = req.query.household_id as string;
      
      if (!householdId) {
        return res.status(400).json({ message: 'household_id required' });
      }

      // Verify household belongs to user
      const household = await storage.getHousehold(householdId);
      if (!household || household.userId !== user.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Generate mock grid data for the last 30 days
      const gridData = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Simulate daily consumption patterns
        const baseConsumption = 15 + Math.random() * 10; // 15-25 kWh base
        const seasonalFactor = 1 + 0.3 * Math.sin((date.getMonth() - 3) * Math.PI / 6); // Summer peak
        const kWhConsumed = Math.round(baseConsumption * seasonalFactor * 100) / 100;
        
        // Different tariff plans
        const tariffPlans = ['Peak', 'Off-Peak', 'Flat Rate'];
        const tariffPlan = tariffPlans[i % 3];
        
        let tariffRate;
        switch (tariffPlan) {
          case 'Peak': tariffRate = 8.5; break;
          case 'Off-Peak': tariffRate = 4.2; break;
          default: tariffRate = 6.0;
        }
        
        const cost = Math.round(kWhConsumed * tariffRate * 100) / 100;
        
        gridData.push({
          date: dateStr,
          household_id: householdId,
          kWh_consumed: kWhConsumed,
          tariff_plan: tariffPlan,
          cost: cost,
          tariff_rate: tariffRate
        });
      }
      
      res.json(gridData);
    } catch (error) {
      console.error('Get grid data error:', error);
      res.status(500).json({ message: 'Failed to fetch grid data' });
    }
  });

  // Grid Tariff API - For electricity cost trends and analytics
  app.get("/api/grid-tariff", authenticateToken, async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      
      // Generate tariff trend data for the last 90 days for analytics
      const tariffData = [];
      const currentDate = new Date();
      
      for (let i = 89; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setDate(currentDate.getDate() - i);
        
        // Simulate realistic time-of-use tariff structure
        const hour = date.getHours();
        const dayOfWeek = date.getDay(); // 0 = Sunday
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        // Base tariff rates (INR per kWh)
        let peakRate, offPeakRate, standardRate;
        
        // Seasonal variations (summer higher rates)
        const month = date.getMonth();
        const isSummer = month >= 4 && month <= 8; // May to September
        const seasonalMultiplier = isSummer ? 1.15 : 0.95;
        
        if (isWeekend) {
          peakRate = 6.8 * seasonalMultiplier;
          offPeakRate = 4.2 * seasonalMultiplier;
          standardRate = 5.5 * seasonalMultiplier;
        } else {
          peakRate = 8.5 * seasonalMultiplier;
          offPeakRate = 4.8 * seasonalMultiplier;
          standardRate = 6.2 * seasonalMultiplier;
        }
        
        // Time-of-use classification
        let tariffType, currentRate;
        if (hour >= 18 && hour <= 22) {
          // Peak hours (6 PM to 10 PM)
          tariffType = 'peak';
          currentRate = peakRate;
        } else if (hour >= 22 || hour <= 6) {
          // Off-peak hours (10 PM to 6 AM)
          tariffType = 'off-peak';
          currentRate = offPeakRate;
        } else {
          // Standard hours
          tariffType = 'standard';
          currentRate = standardRate;
        }
        
        // Add some random variation to make it realistic
        const variation = 0.9 + Math.random() * 0.2; // ±10% variation
        currentRate = currentRate * variation;
        
        // Historical average for comparison
        const historicalAverage = 5.8;
        
        tariffData.push({
          timestamp: date.toISOString(),
          date: date.toISOString().split('T')[0],
          hour: hour,
          tariffType: tariffType,
          rate: Math.round(currentRate * 100) / 100,
          currency: 'INR',
          unit: 'per_kWh',
          isWeekend: isWeekend,
          isSummer: isSummer,
          historicalAverage: historicalAverage,
          percentageChange: Math.round(((currentRate - historicalAverage) / historicalAverage) * 100 * 100) / 100
        });
      }
      
      // Calculate summary statistics
      const rates = tariffData.map(d => d.rate);
      const averageRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
      const minRate = Math.min(...rates);
      const maxRate = Math.max(...rates);
      
      // Recent 7-day trend
      const recent7Days = tariffData.slice(-7 * 24);
      const recentAverage = recent7Days.reduce((sum, d) => sum + d.rate, 0) / recent7Days.length;
      const previous7Days = tariffData.slice(-14 * 24, -7 * 24);
      const previousAverage = previous7Days.reduce((sum, d) => sum + d.rate, 0) / previous7Days.length;
      const weeklyTrend = ((recentAverage - previousAverage) / previousAverage) * 100;
      
      // Peak demand periods for forecasting
      const peakPeriods = [
        { start: '18:00', end: '22:00', type: 'evening_peak', description: 'Evening residential peak' },
        { start: '09:00', end: '12:00', type: 'morning_peak', description: 'Morning commercial peak' },
        { start: '13:00', end: '16:00', type: 'afternoon_peak', description: 'Afternoon industrial peak' }
      ];
      
      const response = {
        tariffData: tariffData,
        summary: {
          averageRate: Math.round(averageRate * 100) / 100,
          minRate: Math.round(minRate * 100) / 100,
          maxRate: Math.round(maxRate * 100) / 100,
          currency: 'INR',
          unit: 'per_kWh',
          dataRange: {
            from: tariffData[0].date,
            to: tariffData[tariffData.length - 1].date,
            totalDays: 90
          },
          weeklyTrend: Math.round(weeklyTrend * 100) / 100
        },
        peakPeriods: peakPeriods,
        forecast: {
          nextWeekProjection: Math.round((recentAverage * 1.02) * 100) / 100, // 2% increase projection
          seasonalTrend: (currentDate.getMonth() >= 4 && currentDate.getMonth() <= 8) ? 'increasing' : 'stable',
          recommendations: [
            'Shift heavy appliance usage to off-peak hours (10 PM - 6 AM)',
            'Use battery storage during peak hours (6 PM - 10 PM)',
            'Monitor weekend vs weekday rate differences'
          ]
        }
      };
      
      res.json(response);
    } catch (error) {
      console.error('Get grid tariff error:', error);
      res.status(500).json({ message: 'Failed to fetch grid tariff data' });
    }
  });

  // Get household statistics for all user households
  app.get("/api/households-metrics", authenticateToken, async (req, res) => {
    try {
      const userId = (req as AuthenticatedRequest).user.userId;
      
      // Get all households for user
      const userHouseholds = await storage.getHouseholdsByUserId(userId);
      
      if (!userHouseholds || userHouseholds.length === 0) {
        return res.json([]);
      }

      // Calculate metrics for each household
      const householdMetrics = await Promise.all(userHouseholds.map(async (household) => {
        try {
          // Get daily metrics
          const dailyMetrics = await recommendationService.calculateDailyMetrics(household.id);
          
          // Calculate monthly metrics (simplified - multiply daily by ~30)
          const monthlyMetrics = {
            solarGenerated: dailyMetrics.solarGenerated * 30,
            gridConsumed: dailyMetrics.gridConsumed * 30,
            totalConsumption: (dailyMetrics.solarGenerated + dailyMetrics.gridConsumed) * 30,
          };
          
          return {
            id: household.id,
            name: household.name,
            daily: {
              consumption: Math.round((dailyMetrics.solarGenerated + dailyMetrics.gridConsumed) * 100) / 100,
              renewablePercentage: dailyMetrics.renewableShare
            },
            monthly: {
              consumption: Math.round(monthlyMetrics.totalConsumption * 100) / 100,
              renewablePercentage: dailyMetrics.renewableShare // Same as daily for simplicity
            }
          };
        } catch (error) {
          console.error(`Error calculating metrics for household ${household.id}:`, error);
          return {
            id: household.id,
            name: household.name,
            daily: { consumption: 0, renewablePercentage: 0 },
            monthly: { consumption: 0, renewablePercentage: 0 }
          };
        }
      }));

      res.json(householdMetrics);
    } catch (error) {
      console.error('Get households metrics error:', error);
      res.status(500).json({ message: 'Failed to fetch household metrics' });
    }
  });

  // Mock Data APIs for simulation
  app.get("/api/mock/appliance", async (req, res) => {
    try {
      const applianceNames = [
        'Refrigerator', 'Air Conditioner', 'Washing Machine', 'Dishwasher', 
        'Microwave', 'Water Heater', 'Television', 'Computer', 'LED Lights', 
        'Ceiling Fan', 'Electric Oven', 'Toaster', 'Coffee Maker', 'Vacuum Cleaner'
      ];
      
      const randomAppliance = applianceNames[Math.floor(Math.random() * applianceNames.length)];
      
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
      
      const mockReading = {
        applianceName: randomAppliance,
        powerWatts: powerWatts,
        timestamp: new Date().toISOString()
      };
      
      res.json(mockReading);
    } catch (error) {
      console.error('Mock appliance API error:', error);
      res.status(500).json({ message: 'Failed to generate mock appliance data' });
    }
  });

  app.get("/api/mock/battery", async (req, res) => {
    try {
      // Simulate realistic battery charge/discharge patterns
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
      
      const mockBatteryLog = {
        socPercent: Math.round(socPercent * 10) / 10,
        dodPercent: Math.round(dodPercent * 10) / 10,
        cycleCount: cycleCount,
        timestamp: new Date().toISOString()
      };
      
      res.json(mockBatteryLog);
    } catch (error) {
      console.error('Mock battery API error:', error);
      res.status(500).json({ message: 'Failed to generate mock battery data' });
    }
  });

  app.get("/api/mock/grid", async (req, res) => {
    try {
      const currentHour = new Date().getHours();
      
      // Simulate time-of-use tariff rates (India grid pricing)
      let tariffRate, maxLoad;
      
      if (currentHour >= 18 && currentHour <= 22) {
        // Peak hours: 6 PM - 10 PM
        tariffRate = 8.5 + Math.random() * 2; // ₹8.5-10.5/kWh
        maxLoad = 3.5 + Math.random() * 1.5; // 3.5-5 kW
      } else if (currentHour >= 22 || currentHour <= 6) {
        // Off-peak hours: 10 PM - 6 AM
        tariffRate = 3.5 + Math.random() * 1.5; // ₹3.5-5/kWh
        maxLoad = 2.0 + Math.random() * 1; // 2-3 kW
      } else {
        // Normal hours: 6 AM - 6 PM
        tariffRate = 5.5 + Math.random() * 2; // ₹5.5-7.5/kWh
        maxLoad = 4.0 + Math.random() * 2; // 4-6 kW
      }
      
      const mockGridData = {
        timestamp: new Date().toISOString(),
        tariffRate: Math.round(tariffRate * 100) / 100,
        maxLoad: Math.round(maxLoad * 100) / 100,
        currentHour: currentHour,
        tariffType: currentHour >= 18 && currentHour <= 22 ? 'Peak' : 
                   (currentHour >= 22 || currentHour <= 6) ? 'Off-Peak' : 'Normal'
      };
      
      res.json(mockGridData);
    } catch (error) {
      console.error('Mock grid API error:', error);
      res.status(500).json({ message: 'Failed to generate mock grid data' });
    }
  });

  // Manual scheduler triggers (for debugging/immediate data population)
  app.post("/api/scheduler/run-hourly", authenticateToken, async (req, res) => {
    try {
      console.log('Manual hourly scheduler trigger by user:', (req as AuthenticatedRequest).user.email);
      await schedulerService.runHourlyJob();
      res.json({ message: 'Hourly job completed successfully' });
    } catch (error) {
      console.error('Manual hourly scheduler error:', error);
      res.status(500).json({ message: 'Failed to run hourly job' });
    }
  });

  // Start the scheduler
  schedulerService.startScheduler();

  const httpServer = createServer(app);
  return httpServer;
}
