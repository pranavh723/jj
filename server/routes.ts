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
  insertHouseholdEnergySchema, insertEnergyTradeSchema, insertBatteryLogSchema
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
        userId: req.user.userId
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
      const households = await storage.getHouseholdsByUserId(req.user.userId);
      res.json(households);
    } catch (error) {
      console.error('Get households error:', error);
      res.status(500).json({ message: 'Failed to fetch households' });
    }
  });

  app.get("/api/households/:id", authenticateToken, async (req, res) => {
    try {
      const household = await storage.getHousehold(req.params.id);
      if (!household || household.userId !== req.user.userId) {
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
      if (!household || household.userId !== req.user.userId) {
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
      if (!household || household.userId !== req.user.userId) {
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
      if (!household || household.userId !== req.user.userId) {
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
      if (!household || household.userId !== req.user.userId) {
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
      if (!household || household.userId !== req.user.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Get next 24 hours
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);

      const [weatherData, pvData] = await Promise.all([
        storage.getWeatherHourly(householdId, startTime, endTime),
        storage.getPvForecastHourly(householdId, startTime, endTime)
      ]);

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
      if (!household || household.userId !== req.user.userId) {
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
      if (!household || household.userId !== req.user.userId) {
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
      const data = insertApplianceReadingSchema.parse({
        ...req.body,
        userId: user.userId
      });
      
      const reading = await storage.createApplianceReading(data);
      
      // Check for anomalies using moving average and standard deviation
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentReadings = await storage.getApplianceReadings(user.userId, last24Hours, new Date());
      
      const applianceReadings = recentReadings.filter(r => r.applianceName === data.applianceName);
      if (applianceReadings.length > 5) {
        const powers = applianceReadings.map(r => r.powerWatts);
        const mean = powers.reduce((sum, p) => sum + p, 0) / powers.length;
        const variance = powers.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / powers.length;
        const stdDev = Math.sqrt(variance);
        
        const threshold = mean + 2 * stdDev;
        
        if (data.powerWatts > threshold) {
          let severity = 'warning';
          if (data.powerWatts > mean + 3 * stdDev) severity = 'critical';
          
          await storage.createApplianceAnomaly({
            applianceReadingId: reading.id,
            timestamp: new Date(),
            anomalyType: 'power_spike',
            severity
          });
        }
      }
      
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
        const current = sellerStats.get(trade.sellerId) || 0;
        sellerStats.set(trade.sellerId, current + trade.energyTradedKwh);
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
      const households = await storage.getHouseholdsByUserId(user.userId);
      
      if (households.length === 0) {
        return res.json({ status: null, logs: [], recommendation: null });
      }
      
      const household = households[0];
      const latestStatus = await storage.getLatestBatteryStatus(household.id);
      
      // Generate mock battery logs if none exist
      const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      let logs = await storage.getBatteryLogs(household.id, last7Days, new Date());
      
      if (logs.length === 0) {
        // Generate mock data
        const mockLogs = [];
        for (let i = 6; i >= 0; i--) {
          const timestamp = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
          const socPercent = 20 + Math.random() * 60; // 20-80%
          const dodPercent = 100 - socPercent;
          const cycleCount = 150 + Math.floor(Math.random() * 50);
          
          mockLogs.push({
            householdId: household.id,
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
        
        logs = await storage.getBatteryLogs(household.id, last7Days, new Date());
      }
      
      const currentHour = new Date().getHours();
      let recommendation = "Monitor battery levels regularly.";
      
      if (latestStatus && latestStatus.socPercent < 30) {
        recommendation = "Charge during 10AM–3PM (solar peak) for optimal performance.";
      } else if (currentHour >= 10 && currentHour <= 15) {
        recommendation = "Great time to charge! Solar generation is at peak.";
      }
      
      res.json({
        status: latestStatus,
        logs: logs.slice(-7), // Last 7 entries
        recommendation
      });
    } catch (error) {
      console.error('Get battery error:', error);
      res.status(500).json({ message: 'Failed to fetch battery data' });
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
