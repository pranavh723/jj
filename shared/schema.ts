import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean, timestamp, uuid, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const households = pgTable("households", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  pvKw: real("pv_kw").notNull(), // Solar panel capacity in kW
  tilt: real("tilt").default(30), // Panel tilt angle
  azimuth: real("azimuth").default(180), // Panel azimuth (south = 180)
  tariffCurrency: text("tariff_currency").default("INR"),
  tariffPerKwh: real("tariff_per_kwh").default(5.0), // Cost per kWh
  co2FactorKgPerKwh: real("co2_factor_kg_per_kwh").default(0.82), // India grid emission factor
  usePvwatts: boolean("use_pvwatts").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const devices = pgTable("devices", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  householdId: uuid("household_id").references(() => households.id).notNull(),
  name: text("name").notNull(),
  typicalKwh: real("typical_kwh").notNull(), // Typical energy consumption
  flexible: boolean("flexible").default(true), // Can be scheduled
  minDurationHours: real("min_duration_hours").default(1), // Minimum runtime
  earliestHour: integer("earliest_hour").default(6), // Earliest start time (24h format)
  latestHour: integer("latest_hour").default(22), // Latest start time
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const weatherHourly = pgTable("weather_hourly", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  householdId: uuid("household_id").references(() => households.id).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  tempC: real("temp_c").notNull(),
  cloudsPct: real("clouds_pct").notNull(),
  windMps: real("wind_mps").notNull(),
  ghiProxy: real("ghi_proxy").notNull(), // Global Horizontal Irradiance proxy
});

export const pvForecastHourly = pgTable("pv_forecast_hourly", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  householdId: uuid("household_id").references(() => households.id).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  acKw: real("ac_kw").notNull(), // AC power output in kW
});

export const meterReadings = pgTable("meter_readings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  householdId: uuid("household_id").references(() => households.id).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  gridKwh: real("grid_kwh").notNull(),
  solarKwh: real("solar_kwh").notNull(),
});

export const recommendations = pgTable("recommendations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  householdId: uuid("household_id").references(() => households.id).notNull(),
  deviceId: uuid("device_id").references(() => devices.id).notNull(),
  createdTs: timestamp("created_ts").defaultNow().notNull(),
  startTs: timestamp("start_ts").notNull(),
  endTs: timestamp("end_ts").notNull(),
  reason: text("reason").notNull(),
  estimatedSavings: real("estimated_savings").notNull(),
  estimatedCo2Avoided: real("estimated_co2_avoided").notNull(),
});

export const communities = pgTable("communities", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  city: text("city").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const communityMembers = pgTable("community_members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  communityId: uuid("community_id").references(() => communities.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const leaderboardSnapshots = pgTable("leaderboard_snapshots", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  communityId: uuid("community_id").references(() => communities.id).notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  kwh_saved: real("kwh_saved").notNull(),
  co2AvoidedKg: real("co2_avoided_kg").notNull(),
  costSaved: real("cost_saved").notNull(),
  renewableSharePct: real("renewable_share_pct").notNull(),
  points: integer("points").notNull(),
});

// AI Appliance Fault/Anomaly Detector Tables
export const applianceReadings = pgTable("appliance_readings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  applianceName: text("appliance_name").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  powerWatts: real("power_watts").notNull(),
});

export const applianceAnomalies = pgTable("appliance_anomalies", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applianceReadingId: uuid("appliance_reading_id").references(() => applianceReadings.id).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  anomalyType: text("anomaly_type").notNull(),
  severity: text("severity").notNull(), // 'normal', 'warning', 'critical'
});

// Energy Marketplace Tables
export const householdEnergy = pgTable("household_energy", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  householdId: uuid("household_id").references(() => households.id).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  generationKwh: real("generation_kwh").notNull(),
  consumptionKwh: real("consumption_kwh").notNull(),
});

export const energyTrades = pgTable("energy_trades", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerHouseholdId: uuid("seller_household_id").references(() => households.id).notNull(),
  buyerHouseholdId: uuid("buyer_household_id").references(() => households.id).notNull(),
  energyTradedKwh: real("energy_traded_kwh").notNull(),
  timestamp: timestamp("timestamp").notNull(),
});

// Battery Health & Scheduling Tables
export const batteryLogs = pgTable("battery_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  householdId: uuid("household_id").references(() => households.id).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  socPercent: real("soc_percent").notNull(), // State of Charge
  dodPercent: real("dod_percent").notNull(), // Depth of Discharge
  cycleCount: integer("cycle_count").notNull(),
  alert: text("alert"), // Warning message if any
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  households: many(households),
  communityMembers: many(communityMembers),
  leaderboardSnapshots: many(leaderboardSnapshots),
  applianceReadings: many(applianceReadings),
}));

export const householdsRelations = relations(households, ({ one, many }) => ({
  user: one(users, {
    fields: [households.userId],
    references: [users.id],
  }),
  devices: many(devices),
  weatherHourly: many(weatherHourly),
  pvForecastHourly: many(pvForecastHourly),
  meterReadings: many(meterReadings),
  recommendations: many(recommendations),
  householdEnergy: many(householdEnergy),
  batteryLogs: many(batteryLogs),
  sellerTrades: many(energyTrades, { relationName: "seller" }),
  buyerTrades: many(energyTrades, { relationName: "buyer" }),
}));

export const devicesRelations = relations(devices, ({ one, many }) => ({
  household: one(households, {
    fields: [devices.householdId],
    references: [households.id],
  }),
  recommendations: many(recommendations),
}));

export const recommendationsRelations = relations(recommendations, ({ one }) => ({
  household: one(households, {
    fields: [recommendations.householdId],
    references: [households.id],
  }),
  device: one(devices, {
    fields: [recommendations.deviceId],
    references: [devices.id],
  }),
}));

export const communitiesRelations = relations(communities, ({ many }) => ({
  members: many(communityMembers),
  leaderboardSnapshots: many(leaderboardSnapshots),
}));

export const communityMembersRelations = relations(communityMembers, ({ one }) => ({
  community: one(communities, {
    fields: [communityMembers.communityId],
    references: [communities.id],
  }),
  user: one(users, {
    fields: [communityMembers.userId],
    references: [users.id],
  }),
}));

// New table relations
export const applianceReadingsRelations = relations(applianceReadings, ({ one, many }) => ({
  user: one(users, {
    fields: [applianceReadings.userId],
    references: [users.id],
  }),
  anomalies: many(applianceAnomalies),
}));

export const applianceAnomaliesRelations = relations(applianceAnomalies, ({ one }) => ({
  applianceReading: one(applianceReadings, {
    fields: [applianceAnomalies.applianceReadingId],
    references: [applianceReadings.id],
  }),
}));

export const householdEnergyRelations = relations(householdEnergy, ({ one }) => ({
  household: one(households, {
    fields: [householdEnergy.householdId],
    references: [households.id],
  }),
}));

export const energyTradesRelations = relations(energyTrades, ({ one }) => ({
  sellerHousehold: one(households, {
    fields: [energyTrades.sellerHouseholdId],
    references: [households.id],
    relationName: "seller",
  }),
  buyerHousehold: one(households, {
    fields: [energyTrades.buyerHouseholdId],
    references: [households.id],
    relationName: "buyer",
  }),
}));

export const batteryLogsRelations = relations(batteryLogs, ({ one }) => ({
  household: one(households, {
    fields: [batteryLogs.householdId],
    references: [households.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertHouseholdSchema = createInsertSchema(households).omit({
  id: true,
  createdAt: true,
});

export const insertDeviceSchema = createInsertSchema(devices).omit({
  id: true,
  createdAt: true,
});

export const insertMeterReadingSchema = createInsertSchema(meterReadings).omit({
  id: true,
});

export const insertRecommendationSchema = createInsertSchema(recommendations).omit({
  id: true,
  createdTs: true,
});

export const insertCommunitySchema = createInsertSchema(communities).omit({
  id: true,
  createdAt: true,
});

// New insert schemas
export const insertApplianceReadingSchema = createInsertSchema(applianceReadings).omit({
  id: true,
});

export const insertApplianceAnomalySchema = createInsertSchema(applianceAnomalies).omit({
  id: true,
});

export const insertHouseholdEnergySchema = createInsertSchema(householdEnergy).omit({
  id: true,
});

export const insertEnergyTradeSchema = createInsertSchema(energyTrades).omit({
  id: true,
});

export const insertBatteryLogSchema = createInsertSchema(batteryLogs).omit({
  id: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Household = typeof households.$inferSelect;
export type InsertHousehold = z.infer<typeof insertHouseholdSchema>;
export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type WeatherHourly = typeof weatherHourly.$inferSelect;
export type PvForecastHourly = typeof pvForecastHourly.$inferSelect;
export type MeterReading = typeof meterReadings.$inferSelect;
export type InsertMeterReading = z.infer<typeof insertMeterReadingSchema>;
export type Recommendation = typeof recommendations.$inferSelect;
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Community = typeof communities.$inferSelect;
export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type CommunityMember = typeof communityMembers.$inferSelect;
export type LeaderboardSnapshot = typeof leaderboardSnapshots.$inferSelect;

// New types
export type ApplianceReading = typeof applianceReadings.$inferSelect;
export type InsertApplianceReading = z.infer<typeof insertApplianceReadingSchema>;
export type ApplianceAnomaly = typeof applianceAnomalies.$inferSelect;
export type InsertApplianceAnomaly = z.infer<typeof insertApplianceAnomalySchema>;
export type HouseholdEnergy = typeof householdEnergy.$inferSelect;
export type InsertHouseholdEnergy = z.infer<typeof insertHouseholdEnergySchema>;
export type EnergyTrade = typeof energyTrades.$inferSelect;
export type InsertEnergyTrade = z.infer<typeof insertEnergyTradeSchema>;
export type BatteryLog = typeof batteryLogs.$inferSelect;
export type InsertBatteryLog = z.infer<typeof insertBatteryLogSchema>;
