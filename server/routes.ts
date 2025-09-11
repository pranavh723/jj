import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authService } from "./services/auth";
import { weatherService } from "./services/weather";
import { solarService } from "./services/solar";
import { recommendationService } from "./services/recommendations";
import { schedulerService } from "./jobs/scheduler";
import { 
  insertUserSchema, insertHouseholdSchema, insertDeviceSchema, 
  insertMeterReadingSchema 
} from "@shared/schema";

// Middleware for JWT authentication
const authenticateToken = async (req: any, res: any, next: any) => {
  const token = authService.extractTokenFromHeader(req.headers.authorization);
  
  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  const payload = authService.verifyToken(token);
  if (!payload) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  req.user = payload;
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name } = insertUserSchema.parse(req.body);
      
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

  // Start the scheduler
  schedulerService.startScheduler();

  const httpServer = createServer(app);
  return httpServer;
}
