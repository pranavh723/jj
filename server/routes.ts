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
        
        weatherData = mockWeatherData;
        pvData = mockPvData;
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
      
      res.json(reading);
    } catch (error) {
      console.error('Create appliance reading error:', error);
      res.status(400).json({ message: 'Failed to create appliance reading' });
    }
  });

  app.get("/api/anomalies", authenticateToken, async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const anomalies = await storage.getApplianceAnomalies(user.userId);
      res.json(anomalies);
    } catch (error) {
      console.error('Get anomalies error:', error);
      res.status(500).json({ message: 'Failed to fetch anomalies' });
    }
  });

  // Energy Marketplace Routes
  app.get("/api/marketplace", authenticateToken, async (req, res) => {
    try {
      // Get all households for marketplace simulation
      const households = await storage.getAllHouseholds();
      
      // Generate mock energy data and trades
      const trades = await storage.getEnergyTrades();
      const simulatedTrades = [];
      
      // Simulate marketplace trades
      for (let i = 0; i < Math.min(10, households.length); i++) {
        const seller = households[Math.floor(Math.random() * households.length)];
        const buyer = households[Math.floor(Math.random() * households.length)];
        
        if (seller.id !== buyer.id) {
          const energyAmount = Math.random() * 5 + 1; // 1-6 kWh
          simulatedTrades.push({
            sellerId: seller.id,
            buyerId: buyer.id,
            energyTradedKwh: energyAmount,
            timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
          });
        }
      }
      
      // Calculate leaderboard of top sellers
      const sellerStats = new Map();
      [...trades, ...simulatedTrades].forEach(trade => {
        const sellerId = 'sellerId' in trade ? trade.sellerId : trade.sellerHouseholdId;
        const current = sellerStats.get(sellerId) || 0;
        sellerStats.set(sellerId, current + trade.energyTradedKwh);
      });
      
      const topSellers = Array.from(sellerStats.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      // Anonymize sensitive data before sending
      const anonymizedTrades = [...trades, ...simulatedTrades].slice(0, 20).map((trade, index) => ({
        id: `trade_${index}`,
        energyTradedKwh: trade.energyTradedKwh,
        timestamp: trade.timestamp
      }));

      const anonymizedTopSellers = topSellers.map((seller, index) => ({
        rank: index + 1,
        energyTradedKwh: seller[1]
      }));

      res.json({
        trades: anonymizedTrades,
        topSellers: anonymizedTopSellers,
        renewablePercentage: 75 + Math.random() * 20 // 75-95%
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
      const validatedData = insertBatteryLogSchema.omit({ userId: true }).extend({
        chargeLevel: z.coerce.number(),
        timestamp: z.coerce.date()
      }).parse(req.body);
      
      const batteryLog = await storage.createBatteryLog({
        ...validatedData,
        userId
      });
      
      res.status(201).json(batteryLog);
    } catch (error) {
      console.error('Create battery log error:', error);
      res.status(500).json({ message: 'Failed to create battery log' });
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
