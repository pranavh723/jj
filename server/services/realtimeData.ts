import { WebSocketServer, WebSocket } from 'ws';
import { storage } from '../storage';
import { aiDataGenerator } from './aiDataGenerator';

export interface RealtimeDataBroadcast {
  type: 'appliance_update' | 'battery_update' | 'solar_update' | 'energy_update';
  timestamp: string;
  data: any;
  userId?: string;
  householdId?: string;
}

class RealtimeDataService {
  private wss: WebSocketServer | null = null;
  private connectedClients: Map<WebSocket, { userId?: string; householdId?: string }> = new Map();
  private dataGenerationInterval: NodeJS.Timeout | null = null;

  initialize(server: any) {
    // Create WebSocket server attached to HTTP server
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws/realtime' 
    });

    this.wss.on('connection', (ws: WebSocket, request) => {
      console.log('🔌 Client connected to real-time data stream');
      
      // Store client connection
      this.connectedClients.set(ws, {});

      // Handle authentication and subscription
      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          
          if (data.type === 'subscribe') {
            // Subscribe client to specific user/household data
            this.connectedClients.set(ws, {
              userId: data.userId,
              householdId: data.householdId
            });
            
            console.log(`📡 Client subscribed to user ${data.userId}, household ${data.householdId}`);
            
            // Send initial data
            this.sendInitialData(ws, data.userId, data.householdId);
          }
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      });

      ws.on('close', () => {
        console.log('🔌 Client disconnected from real-time stream');
        this.connectedClients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.connectedClients.delete(ws);
      });
    });

    // Start real-time data generation every second (stock market style)
    this.startRealtimeDataGeneration();

    console.log('🚀 Real-time WebSocket server initialized on /ws/realtime');
  }

  private startRealtimeDataGeneration() {
    // Generate and broadcast data every second like a stock market
    this.dataGenerationInterval = setInterval(async () => {
      await this.generateAndBroadcastRealtimeData();
    }, 1000); // Update every 1 second for stock-market-like experience

    console.log('📈 Real-time data generation started (1-second intervals)');
  }

  private async generateAndBroadcastRealtimeData() {
    if (!this.wss || this.connectedClients.size === 0) {
      return; // No clients connected
    }

    // Get all connected clients and their subscriptions
    const subscriptions = new Set<string>();
    this.connectedClients.forEach((clientInfo, ws) => {
      if (clientInfo.userId) {
        subscriptions.add(clientInfo.userId);
      }
    });

    // Generate real-time data for each subscribed user
    for (const userId of subscriptions) {
      try {
        await this.generateUserRealtimeData(userId);
      } catch (error) {
        console.error(`Error generating real-time data for user ${userId}:`, error);
      }
    }
  }

  private async generateUserRealtimeData(userId: string) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentSeason = this.getCurrentSeason();

    // Generate realistic appliance data
    const applianceNames = [
      'Double Door Refrigerator', 'Split AC (1.5 Ton)', 'Electric Geyser',
      'Smart LED TV (55inch)', 'Gaming Laptop', 'Ceiling Fan', 'Washing Machine'
    ];

    // Pick 2-3 random appliances to update each second (like stock prices)
    const activeAppliances = applianceNames
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.floor(Math.random() * 3) + 2);

    for (const applianceName of activeAppliances) {
      try {
        // Generate realistic data using our enhanced AI system
        const applianceData = await aiDataGenerator.generateRealisticApplianceData(
          applianceName,
          currentHour,
          currentSeason,
          4 // Household size
        );

        // Broadcast appliance update
        this.broadcast({
          type: 'appliance_update',
          timestamp: now.toISOString(),
          data: {
            name: applianceName,
            powerWatts: applianceData.powerWatts,
            operatingState: applianceData.operatingState,
            efficiency: applianceData.efficiency,
            temperature: applianceData.temperature,
            humidity: applianceData.humidity,
            // Add some market-like indicators
            trend: this.calculateTrend(applianceData.powerWatts),
            changePercent: (Math.random() - 0.5) * 20, // -10% to +10%
            pricePerKwh: 6.5 + (Math.random() - 0.5) * 0.5, // Dynamic pricing
          }
        }, userId);

      } catch (error) {
        console.error(`Error generating appliance data for ${applianceName}:`, error);
      }
    }

    // Generate battery updates
    try {
      const batteryData = await aiDataGenerator.generateRealisticBatteryData(
        currentHour,
        "clear",
        Math.random() * 5 // Solar generation variation
      );

      this.broadcast({
        type: 'battery_update',
        timestamp: now.toISOString(),
        data: {
          socPercent: batteryData.socPercent,
          dodPercent: batteryData.dodPercent,
          voltage: batteryData.voltage,
          current: batteryData.current,
          temperature: batteryData.temperature,
          chargingState: batteryData.chargingState,
          healthScore: batteryData.healthScore,
          // Market-like metrics
          trend: batteryData.current > 0 ? 'charging' : 'discharging',
          powerFlow: Math.abs(batteryData.current * batteryData.voltage / 1000), // kW
          efficiency: 90 + Math.random() * 8, // 90-98%
        }
      }, userId);

    } catch (error) {
      console.error('Error generating battery data:', error);
    }

    // Generate solar generation updates
    try {
      const solarData = await aiDataGenerator.generateRealisticSolarData(
        currentHour,
        "clear",
        currentSeason
      );

      this.broadcast({
        type: 'solar_update',
        timestamp: now.toISOString(),
        data: {
          powerGeneration: solarData.powerGenerationKw,
          irradiance: solarData.irradiance,
          panelTemperature: solarData.panelTemperature,
          efficiency: solarData.efficiency,
          weatherCondition: solarData.weatherCondition,
          cloudCover: solarData.cloudCover,
          // Market-like solar trading data
          gridFeedPrice: 4.5 + Math.random() * 2, // ₹4.5-6.5 per kWh
          demandLevel: Math.random() > 0.5 ? 'high' : 'medium',
          nextHourForecast: solarData.powerGenerationKw * (0.8 + Math.random() * 0.4),
        }
      }, userId);

    } catch (error) {
      console.error('Error generating solar data:', error);
    }

    // Generate energy trading updates (market-like)
    if (Math.random() > 0.7) { // 30% chance each second
      this.broadcast({
        type: 'energy_update',
        timestamp: now.toISOString(),
        data: {
          gridPrice: 6.5 + (Math.random() - 0.5) * 1.0, // ₹6-7 per kWh
          solarExportPrice: 4.0 + Math.random() * 1.5, // ₹4-5.5 per kWh
          demandForecast: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
          carbonIntensity: 0.6 + Math.random() * 0.4, // kg CO₂/kWh
          marketStatus: Math.random() > 0.8 ? 'volatile' : 'stable',
          tradingVolume: Math.floor(Math.random() * 1000) + 500, // kWh traded
        }
      }, userId);
    }
  }

  private calculateTrend(currentValue: number): 'up' | 'down' | 'stable' {
    const change = Math.random() - 0.5;
    if (change > 0.1) return 'up';
    if (change < -0.1) return 'down';
    return 'stable';
  }

  private getCurrentSeason(): string {
    const month = new Date().getMonth() + 1; // 1-12
    
    if (month >= 3 && month <= 6) return 'summer'; // March to June
    if (month >= 7 && month <= 10) return 'monsoon'; // July to October  
    return 'winter'; // November to February
  }

  private async sendInitialData(ws: WebSocket, userId: string, householdId: string) {
    // Send current status as initial data
    try {
      // Get latest battery status
      const latestBattery = await storage.getLatestBatteryStatus(userId);
      if (latestBattery) {
        ws.send(JSON.stringify({
          type: 'battery_update',
          timestamp: new Date().toISOString(),
          data: {
            socPercent: latestBattery.socPercent,
            dodPercent: latestBattery.dodPercent,
            voltage: latestBattery.voltage,
            current: latestBattery.current,
            chargingState: latestBattery.chargingState,
            healthScore: latestBattery.healthScore,
          }
        }));
      }

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'system_message',
        timestamp: new Date().toISOString(),
        data: {
          message: '🔴 LIVE: Real-time energy data stream connected',
          status: 'connected'
        }
      }));

    } catch (error) {
      console.error('Error sending initial data:', error);
    }
  }

  private broadcast(message: RealtimeDataBroadcast, targetUserId?: string) {
    if (!this.wss) return;

    const messageStr = JSON.stringify(message);
    
    this.connectedClients.forEach((clientInfo, ws) => {
      // Send to specific user or broadcast to all
      if (targetUserId && clientInfo.userId !== targetUserId) {
        return;
      }
      
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(messageStr);
        } catch (error) {
          console.error('Error sending WebSocket message:', error);
          this.connectedClients.delete(ws);
        }
      }
    });
  }

  public stop() {
    if (this.dataGenerationInterval) {
      clearInterval(this.dataGenerationInterval);
      this.dataGenerationInterval = null;
    }
    
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    
    console.log('🛑 Real-time data service stopped');
  }
}

export const realtimeDataService = new RealtimeDataService();