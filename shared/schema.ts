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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  households: many(households),
  communityMembers: many(communityMembers),
  leaderboardSnapshots: many(leaderboardSnapshots),
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
