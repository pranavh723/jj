import { 
  users, households, devices, weatherHourly, pvForecastHourly, 
  meterReadings, recommendations, communities, communityMembers, leaderboardSnapshots,
  applianceReadings, applianceAnomalies, householdEnergy, energyTrades, batteryLogs,
  type User, type InsertUser, type Household, type InsertHousehold,
  type Device, type InsertDevice, type WeatherHourly, type PvForecastHourly,
  type MeterReading, type InsertMeterReading, type Recommendation, type InsertRecommendation,
  type Community, type InsertCommunity, type CommunityMember, type LeaderboardSnapshot,
  type ApplianceReading, type InsertApplianceReading, type ApplianceAnomaly, type InsertApplianceAnomaly,
  type HouseholdEnergy, type InsertHouseholdEnergy, type EnergyTrade, type InsertEnergyTrade,
  type BatteryLog, type InsertBatteryLog
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Households
  getHousehold(id: string): Promise<Household | undefined>;
  getHouseholdsByUserId(userId: string): Promise<Household[]>;
  getAllHouseholds(): Promise<Household[]>;
  createHousehold(household: InsertHousehold): Promise<Household>;
  updateHousehold(id: string, household: Partial<Household>): Promise<Household>;
  deleteHousehold(id: string): Promise<void>;

  // Devices
  getDevice(id: string): Promise<Device | undefined>;
  getDevicesByHouseholdId(householdId: string): Promise<Device[]>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: string, device: Partial<Device>): Promise<Device>;
  deleteDevice(id: string): Promise<void>;

  // Weather data
  getWeatherHourly(householdId: string, startTime: Date, endTime: Date): Promise<WeatherHourly[]>;
  upsertWeatherHourly(data: Omit<WeatherHourly, 'id'>[]): Promise<void>;

  // PV forecasts
  getPvForecastHourly(householdId: string, startTime: Date, endTime: Date): Promise<PvForecastHourly[]>;
  upsertPvForecastHourly(data: Omit<PvForecastHourly, 'id'>[]): Promise<void>;

  // Meter readings
  getMeterReadings(householdId: string, startTime: Date, endTime: Date): Promise<MeterReading[]>;
  createMeterReading(reading: InsertMeterReading): Promise<MeterReading>;

  // Recommendations
  getRecommendations(householdId: string, startTime: Date, endTime: Date): Promise<Recommendation[]>;
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  getLatestRecommendations(householdId: string): Promise<(Recommendation & { deviceName: string })[]>;
  deleteRecommendationsByDeviceId(deviceId: string): Promise<void>;

  // Communities
  getCommunity(id: string): Promise<Community | undefined>;
  getAllCommunities(): Promise<Community[]>;
  createCommunity(community: InsertCommunity): Promise<Community>;
  getCommunityMembers(communityId: string): Promise<CommunityMember[]>;
  addCommunityMember(communityId: string, userId: string): Promise<CommunityMember>;
  getCommunityHouseholds(communityId: string): Promise<Household[]>;

  // Leaderboard
  getLeaderboardSnapshots(communityId: string, periodStart: Date, periodEnd: Date): Promise<LeaderboardSnapshot[]>;
  createLeaderboardSnapshot(snapshot: Omit<LeaderboardSnapshot, 'id'>): Promise<LeaderboardSnapshot>;

  // Appliance Anomaly Detection
  createApplianceReading(reading: InsertApplianceReading): Promise<ApplianceReading>;
  getApplianceReadings(userId: string, startTime: Date, endTime: Date): Promise<ApplianceReading[]>;
  getApplianceReadingById(id: string): Promise<ApplianceReading | undefined>;
  deleteApplianceReading(id: string): Promise<void>;
  getApplianceAnomalies(userId: string): Promise<ApplianceAnomaly[]>;
  createApplianceAnomaly(anomaly: InsertApplianceAnomaly): Promise<ApplianceAnomaly>;

  // Energy Marketplace
  createHouseholdEnergy(energy: InsertHouseholdEnergy): Promise<HouseholdEnergy>;
  getHouseholdEnergy(householdId: string, startTime: Date, endTime: Date): Promise<HouseholdEnergy[]>;
  createEnergyTrade(trade: InsertEnergyTrade): Promise<EnergyTrade>;
  getEnergyTrades(): Promise<EnergyTrade[]>;

  // Battery Management
  createBatteryLog(log: InsertBatteryLog): Promise<BatteryLog>;
  getBatteryLogs(userId: string, startTime: Date, endTime: Date): Promise<BatteryLog[]>;
  getLatestBatteryStatus(userId: string): Promise<BatteryLog | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getHousehold(id: string): Promise<Household | undefined> {
    const [household] = await db.select().from(households).where(eq(households.id, id));
    return household || undefined;
  }

  async getHouseholdsByUserId(userId: string): Promise<Household[]> {
    return await db.select().from(households).where(eq(households.userId, userId));
  }

  async getAllHouseholds(): Promise<Household[]> {
    return await db.select().from(households);
  }

  async createHousehold(household: InsertHousehold): Promise<Household> {
    const [newHousehold] = await db.insert(households).values(household).returning();
    return newHousehold;
  }

  async updateHousehold(id: string, household: Partial<Household>): Promise<Household> {
    const [updated] = await db.update(households).set(household).where(eq(households.id, id)).returning();
    return updated;
  }

  async deleteHousehold(id: string): Promise<void> {
    // Delete all related data in the correct order to avoid foreign key constraint issues
    
    // Delete recommendations first (references both household and devices)
    await db.delete(recommendations).where(eq(recommendations.householdId, id));
    
    // Delete devices associated with this household
    await db.delete(devices).where(eq(devices.householdId, id));
    
    // Delete weather data
    await db.delete(weatherHourly).where(eq(weatherHourly.householdId, id));
    
    // Delete PV forecast data
    await db.delete(pvForecastHourly).where(eq(pvForecastHourly.householdId, id));
    
    // Delete meter readings
    await db.delete(meterReadings).where(eq(meterReadings.householdId, id));
    
    // Delete household energy data
    await db.delete(householdEnergy).where(eq(householdEnergy.householdId, id));
    
    // Delete energy trades where this household is seller or buyer
    await db.delete(energyTrades).where(eq(energyTrades.sellerHouseholdId, id));
    await db.delete(energyTrades).where(eq(energyTrades.buyerHouseholdId, id));
    
    // Finally delete the household itself
    await db.delete(households).where(eq(households.id, id));
  }

  async getDevice(id: string): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.id, id));
    return device || undefined;
  }

  async getDevicesByHouseholdId(householdId: string): Promise<Device[]> {
    return await db.select().from(devices).where(eq(devices.householdId, householdId));
  }

  async createDevice(device: InsertDevice): Promise<Device> {
    const [newDevice] = await db.insert(devices).values(device).returning();
    return newDevice;
  }

  async updateDevice(id: string, device: Partial<Device>): Promise<Device> {
    const [updated] = await db.update(devices).set(device).where(eq(devices.id, id)).returning();
    return updated;
  }

  async deleteDevice(id: string): Promise<void> {
    // First delete all recommendations that reference this device
    await this.deleteRecommendationsByDeviceId(id);
    // Then delete the device itself
    await db.delete(devices).where(eq(devices.id, id));
  }

  async getWeatherHourly(householdId: string, startTime: Date, endTime: Date): Promise<WeatherHourly[]> {
    return await db.select().from(weatherHourly)
      .where(and(
        eq(weatherHourly.householdId, householdId),
        gte(weatherHourly.timestamp, startTime),
        lte(weatherHourly.timestamp, endTime)
      ))
      .orderBy(weatherHourly.timestamp);
  }

  async upsertWeatherHourly(data: Omit<WeatherHourly, 'id'>[]): Promise<void> {
    if (data.length === 0) return;
    
    await db.insert(weatherHourly).values(data).onConflictDoNothing();
  }

  async getPvForecastHourly(householdId: string, startTime: Date, endTime: Date): Promise<PvForecastHourly[]> {
    return await db.select().from(pvForecastHourly)
      .where(and(
        eq(pvForecastHourly.householdId, householdId),
        gte(pvForecastHourly.timestamp, startTime),
        lte(pvForecastHourly.timestamp, endTime)
      ))
      .orderBy(pvForecastHourly.timestamp);
  }

  async upsertPvForecastHourly(data: Omit<PvForecastHourly, 'id'>[]): Promise<void> {
    if (data.length === 0) return;
    
    await db.insert(pvForecastHourly).values(data).onConflictDoNothing();
  }

  async getMeterReadings(householdId: string, startTime: Date, endTime: Date): Promise<MeterReading[]> {
    return await db.select().from(meterReadings)
      .where(and(
        eq(meterReadings.householdId, householdId),
        gte(meterReadings.timestamp, startTime),
        lte(meterReadings.timestamp, endTime)
      ))
      .orderBy(meterReadings.timestamp);
  }

  async createMeterReading(reading: InsertMeterReading): Promise<MeterReading> {
    const [newReading] = await db.insert(meterReadings).values(reading).returning();
    return newReading;
  }

  async getRecommendations(householdId: string, startTime: Date, endTime: Date): Promise<Recommendation[]> {
    return await db.select().from(recommendations)
      .where(and(
        eq(recommendations.householdId, householdId),
        gte(recommendations.createdTs, startTime),
        lte(recommendations.createdTs, endTime)
      ))
      .orderBy(desc(recommendations.createdTs));
  }

  async createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation> {
    const [newRec] = await db.insert(recommendations).values(recommendation).returning();
    return newRec;
  }

  async getLatestRecommendations(householdId: string): Promise<(Recommendation & { deviceName: string })[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return await db.select({
      id: recommendations.id,
      householdId: recommendations.householdId,
      deviceId: recommendations.deviceId,
      createdTs: recommendations.createdTs,
      startTs: recommendations.startTs,
      endTs: recommendations.endTs,
      reason: recommendations.reason,
      estimatedSavings: recommendations.estimatedSavings,
      estimatedCo2Avoided: recommendations.estimatedCo2Avoided,
      deviceName: devices.name,
    }).from(recommendations)
      .innerJoin(devices, eq(recommendations.deviceId, devices.id))
      .where(and(
        eq(recommendations.householdId, householdId),
        gte(recommendations.startTs, today),
        lte(recommendations.startTs, tomorrow)
      ))
      .orderBy(recommendations.startTs);
  }

  async deleteRecommendationsByDeviceId(deviceId: string): Promise<void> {
    await db.delete(recommendations).where(eq(recommendations.deviceId, deviceId));
  }

  async getCommunity(id: string): Promise<Community | undefined> {
    const [community] = await db.select().from(communities).where(eq(communities.id, id));
    return community || undefined;
  }

  async getAllCommunities(): Promise<Community[]> {
    return await db.select().from(communities);
  }

  async createCommunity(community: InsertCommunity): Promise<Community> {
    const [newCommunity] = await db.insert(communities).values(community).returning();
    return newCommunity;
  }

  async getCommunityMembers(communityId: string): Promise<CommunityMember[]> {
    return await db.select().from(communityMembers).where(eq(communityMembers.communityId, communityId));
  }

  async addCommunityMember(communityId: string, userId: string): Promise<CommunityMember> {
    const [member] = await db.insert(communityMembers).values({
      communityId,
      userId
    }).returning();
    return member;
  }

  async getCommunityHouseholds(communityId: string): Promise<Household[]> {
    // Join communityMembers and households to get households for community members
    return await db
      .select({
        id: households.id,
        userId: households.userId,
        name: households.name,
        latitude: households.latitude,
        longitude: households.longitude,
        pvKw: households.pvKw,
        tilt: households.tilt,
        azimuth: households.azimuth,
        tariffCurrency: households.tariffCurrency,
        tariffPerKwh: households.tariffPerKwh,
        co2FactorKgPerKwh: households.co2FactorKgPerKwh,
        usePvwatts: households.usePvwatts,
        createdAt: households.createdAt,
      })
      .from(households)
      .innerJoin(communityMembers, eq(households.userId, communityMembers.userId))
      .where(eq(communityMembers.communityId, communityId));
  }

  async getLeaderboardSnapshots(communityId: string, periodStart: Date, periodEnd: Date): Promise<LeaderboardSnapshot[]> {
    return await db.select().from(leaderboardSnapshots)
      .where(and(
        eq(leaderboardSnapshots.communityId, communityId),
        gte(leaderboardSnapshots.periodStart, periodStart),
        lte(leaderboardSnapshots.periodEnd, periodEnd)
      ))
      .orderBy(desc(leaderboardSnapshots.points));
  }

  async createLeaderboardSnapshot(snapshot: Omit<LeaderboardSnapshot, 'id'>): Promise<LeaderboardSnapshot> {
    const [newSnapshot] = await db.insert(leaderboardSnapshots).values(snapshot).returning();
    return newSnapshot;
  }

  // Appliance Anomaly Detection
  async createApplianceReading(reading: InsertApplianceReading): Promise<ApplianceReading> {
    const [newReading] = await db.insert(applianceReadings).values(reading).returning();
    return newReading;
  }

  async getApplianceReadings(userId: string, startTime: Date, endTime: Date): Promise<ApplianceReading[]> {
    return await db.select().from(applianceReadings)
      .where(and(
        eq(applianceReadings.userId, userId),
        gte(applianceReadings.timestamp, startTime),
        lte(applianceReadings.timestamp, endTime)
      ))
      .orderBy(desc(applianceReadings.timestamp));
  }

  async getApplianceReadingById(id: string): Promise<ApplianceReading | undefined> {
    const [reading] = await db.select().from(applianceReadings).where(eq(applianceReadings.id, id));
    return reading || undefined;
  }

  async deleteApplianceReading(id: string): Promise<void> {
    // First delete related anomalies
    await db.delete(applianceAnomalies).where(eq(applianceAnomalies.applianceReadingId, id));
    // Then delete the appliance reading
    await db.delete(applianceReadings).where(eq(applianceReadings.id, id));
  }

  async getApplianceAnomalies(userId: string): Promise<any[]> {
    return await db.select({
      id: applianceAnomalies.id,
      applianceReadingId: applianceAnomalies.applianceReadingId,
      timestamp: applianceAnomalies.timestamp,
      anomalyType: applianceAnomalies.anomalyType,
      severity: applianceAnomalies.severity,
      applianceReading: {
        id: applianceReadings.id,
        userId: applianceReadings.userId,
        applianceName: applianceReadings.applianceName,
        timestamp: applianceReadings.timestamp,
        powerWatts: applianceReadings.powerWatts
      }
    })
    .from(applianceAnomalies)
    .innerJoin(applianceReadings, eq(applianceAnomalies.applianceReadingId, applianceReadings.id))
    .where(eq(applianceReadings.userId, userId))
    .orderBy(desc(applianceAnomalies.timestamp));
  }

  async createApplianceAnomaly(anomaly: InsertApplianceAnomaly): Promise<ApplianceAnomaly> {
    const [newAnomaly] = await db.insert(applianceAnomalies).values(anomaly).returning();
    return newAnomaly;
  }

  // Energy Marketplace
  async createHouseholdEnergy(energy: InsertHouseholdEnergy): Promise<HouseholdEnergy> {
    const [newEnergy] = await db.insert(householdEnergy).values(energy).returning();
    return newEnergy;
  }

  async getHouseholdEnergy(householdId: string, startTime: Date, endTime: Date): Promise<HouseholdEnergy[]> {
    return await db.select().from(householdEnergy)
      .where(and(
        eq(householdEnergy.householdId, householdId),
        gte(householdEnergy.timestamp, startTime),
        lte(householdEnergy.timestamp, endTime)
      ))
      .orderBy(householdEnergy.timestamp);
  }

  async createEnergyTrade(trade: InsertEnergyTrade): Promise<EnergyTrade> {
    const [newTrade] = await db.insert(energyTrades).values(trade).returning();
    return newTrade;
  }

  async getEnergyTrades(): Promise<EnergyTrade[]> {
    return await db.select().from(energyTrades)
      .orderBy(desc(energyTrades.timestamp));
  }

  // Battery Management
  async createBatteryLog(log: InsertBatteryLog): Promise<BatteryLog> {
    const [newLog] = await db.insert(batteryLogs).values(log).returning();
    return newLog;
  }

  async getBatteryLogs(userId: string, startTime: Date, endTime: Date): Promise<BatteryLog[]> {
    return await db.select().from(batteryLogs)
      .where(and(
        eq(batteryLogs.userId, userId),
        gte(batteryLogs.timestamp, startTime),
        lte(batteryLogs.timestamp, endTime)
      ))
      .orderBy(desc(batteryLogs.timestamp));
  }

  async getLatestBatteryStatus(userId: string): Promise<BatteryLog | undefined> {
    const [latest] = await db.select().from(batteryLogs)
      .where(eq(batteryLogs.userId, userId))
      .orderBy(desc(batteryLogs.timestamp))
      .limit(1);
    return latest || undefined;
  }
}

export const storage = new DatabaseStorage();
