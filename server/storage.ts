import { 
  users, households, devices, weatherHourly, pvForecastHourly, 
  meterReadings, recommendations, communities, communityMembers, leaderboardSnapshots,
  type User, type InsertUser, type Household, type InsertHousehold,
  type Device, type InsertDevice, type WeatherHourly, type PvForecastHourly,
  type MeterReading, type InsertMeterReading, type Recommendation, type InsertRecommendation,
  type Community, type InsertCommunity, type CommunityMember, type LeaderboardSnapshot
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
  getLatestRecommendations(householdId: string): Promise<Recommendation[]>;

  // Communities
  getCommunity(id: string): Promise<Community | undefined>;
  getAllCommunities(): Promise<Community[]>;
  createCommunity(community: InsertCommunity): Promise<Community>;
  getCommunityMembers(communityId: string): Promise<CommunityMember[]>;
  addCommunityMember(communityId: string, userId: string): Promise<CommunityMember>;

  // Leaderboard
  getLeaderboardSnapshots(communityId: string, periodStart: Date, periodEnd: Date): Promise<LeaderboardSnapshot[]>;
  createLeaderboardSnapshot(snapshot: Omit<LeaderboardSnapshot, 'id'>): Promise<LeaderboardSnapshot>;
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

  async getLatestRecommendations(householdId: string): Promise<Recommendation[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return await db.select().from(recommendations)
      .where(and(
        eq(recommendations.householdId, householdId),
        gte(recommendations.startTs, today),
        lte(recommendations.startTs, tomorrow)
      ))
      .orderBy(recommendations.startTs);
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
}

export const storage = new DatabaseStorage();
