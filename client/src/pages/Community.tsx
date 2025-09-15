import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { CommunityLeaderboard } from '@/components/CommunityLeaderboard';
import { GhaziabadEnergyMap } from '@/components/GhaziabadEnergyMap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Users, 
  Trophy, 
  Target, 
  TrendingUp,
  MapPin,
  Calendar,
  Award,
  Leaf,
  IndianRupee,
  Zap,
  Medal,
  Calculator,
  Building,
  Home,
  Lightbulb
} from 'lucide-react';
import type { Household } from '@shared/schema';

interface Community {
  id: string;
  name: string;
  city: string;
  description?: string;
  memberCount?: number;
  avgRenewableShare?: number;
  totalSavings?: number;
  totalCO2Avoided?: number;
}

// Solar Calculator Schema
const solarCalculatorSchema = z.object({
  buildings: z.number().min(1, "Must be at least 1 building").max(100000, "Maximum 100,000 buildings"),
  suitablePercent: z.number().min(1, "Must be at least 1%").max(100, "Cannot exceed 100%"),
  usableArea: z.number().min(10, "Minimum 10 m²").max(1000, "Maximum 1000 m² per building"),
  minSystemKw: z.number().min(1, "Minimum 1 kW").max(100, "Maximum 100 kW per setup"),
  areaPerKw: z.number().min(5, "Minimum 5 m²/kW").max(15, "Maximum 15 m²/kW"),
  yieldKwhPerKwYr: z.number().min(1000, "Minimum 1000 kWh/kW/year").max(2500, "Maximum 2500 kWh/kW/year"),
  gridEfKgPerKwh: z.number().min(0.5, "Minimum 0.5 kg CO₂/kWh").max(1.5, "Maximum 1.5 kg CO₂/kWh"),
});

type SolarCalculatorInputs = z.infer<typeof solarCalculatorSchema>;

// No Community View Component with Solar Calculator
function NoCommunityView() {
  const form = useForm<SolarCalculatorInputs>({
    resolver: zodResolver(solarCalculatorSchema),
    defaultValues: {
      buildings: 5000,
      suitablePercent: 60,
      usableArea: 100,
      minSystemKw: 5,
      areaPerKw: 8,
      yieldKwhPerKwYr: 1500,
      gridEfKgPerKwh: 0.82,
    },
  });

  const watchedValues = form.watch();

  // Calculate solar potential
  const calculations = useMemo(() => {
    const { buildings, suitablePercent, usableArea, minSystemKw, areaPerKw, yieldKwhPerKwYr, gridEfKgPerKwh } = watchedValues;
    
    // Handle NaN and invalid inputs
    const validBuildings = Number(buildings) || 0;
    const validSuitablePercent = Number(suitablePercent) || 0;
    const validUsableArea = Number(usableArea) || 0;
    const validMinSystemKw = Number(minSystemKw) || 0;
    const validAreaPerKw = Number(areaPerKw) || 8;
    const validYieldKwhPerKwYr = Number(yieldKwhPerKwYr) || 1500;
    const validGridEfKgPerKwh = Number(gridEfKgPerKwh) || 0.82;
    
    const eligibleRoofs = Math.round(validBuildings * (validSuitablePercent / 100));
    const setupsPerRoof = Math.floor(validUsableArea / (validAreaPerKw * validMinSystemKw)) || 0;
    const totalSetups = Math.max(0, eligibleRoofs * setupsPerRoof);
    const addedCapacityKW = totalSetups * validMinSystemKw;
    const capacityMW = addedCapacityKW / 1000;
    const annualGenMWh = (addedCapacityKW * validYieldKwhPerKwYr) / 1000;
    const annualCO2AvoidedTons = (annualGenMWh * 1000 * validGridEfKgPerKwh) / 1000;
    const homesEquivalent = Math.round(annualGenMWh * 1000 / (120 * 12)) || 0; // 120 kWh/month per home
    
    return {
      eligibleRoofs: eligibleRoofs || 0,
      setupsPerRoof: setupsPerRoof || 0,
      totalSetups: totalSetups || 0,
      addedCapacityKW: addedCapacityKW || 0,
      capacityMW: capacityMW || 0,
      annualGenMWh: annualGenMWh || 0,
      annualCO2AvoidedTons: annualCO2AvoidedTons || 0,
      homesEquivalent: homesEquivalent || 0
    };
  }, [watchedValues]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Community</h1>
        <p className="text-muted-foreground">
          Connect with neighbors and compete in renewable energy challenges.
        </p>
      </div>

      {/* Two Column Layout: Map Left, Calculator Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side - Compact Ghaziabad Energy Map */}
        <div className="lg:col-span-7 space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2 flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-primary" />
              <span>Ghaziabad Renewable Energy Infrastructure</span>
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Explore existing renewable energy installations across Ghaziabad, Uttar Pradesh.
            </p>
          </div>
          
          {/* Compact Energy Map */}
          <div className="w-full">
            <GhaziabadEnergyMap 
              variant="compact"
              onInstallationClick={(installation) => {
                console.log('Installation clicked:', installation);
                // Handle installation details viewing
              }}
            />
          </div>

          {/* Engaging Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-3 bg-primary/5 rounded-lg">
              <div className="text-lg font-bold text-primary" data-testid="text-total-capacity">62.4 MW</div>
              <div className="text-xs text-muted-foreground">Total Capacity</div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="text-lg font-bold text-green-600" data-testid="text-operational">10</div>
              <div className="text-xs text-muted-foreground">Operational</div>
            </div>
            <div className="text-center p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
              <div className="text-lg font-bold text-amber-600" data-testid="text-development">2</div>
              <div className="text-xs text-muted-foreground">In Development</div>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="text-lg font-bold text-blue-600" data-testid="text-types">5</div>
              <div className="text-xs text-muted-foreground">Installation Types</div>
            </div>
          </div>

          {/* Did You Know Section */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <Leaf className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">Did you know?</p>
                <p className="text-xs text-green-700 dark:text-green-300">Ghaziabad's RRTS stations generate 4.3 MW of clean solar power!</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Building className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Amazing Fact:</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">Industrial areas contribute 8.7 MW through rooftop solar installations.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Solar Potential Calculator */}
        <div className="lg:col-span-5">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calculator className="w-5 h-5 text-primary" />
                <span>Solar Potential Calculator</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Estimate how many more solar installations are possible in your area
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Form {...form}>
                <form className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="buildings"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Buildings</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="1"
                              max="100000"
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              data-testid="input-buildings"
                              className="h-8 text-sm"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="suitablePercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Suitable %</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="1"
                              max="100"
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              data-testid="input-suitable-percent"
                              className="h-8 text-sm"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="usableArea"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Area (m²)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="10"
                              max="1000"
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              data-testid="input-usable-area"
                              className="h-8 text-sm"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="minSystemKw"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">System (kW)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="1"
                              max="100"
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              data-testid="input-min-system-kw"
                              className="h-8 text-sm"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="areaPerKw"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">m²/kW</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="5"
                              max="15"
                              step="0.1"
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              data-testid="input-area-per-kw"
                              className="h-8 text-sm"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="yieldKwhPerKwYr"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">kWh/kW/yr</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="1000"
                              max="2500"
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              data-testid="input-yield-kwh-per-kw-yr"
                              className="h-8 text-sm"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="gridEfKgPerKwh"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Grid Emissions (kg CO₂/kWh)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0.5"
                            max="1.5"
                            step="0.01"
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            data-testid="input-grid-ef-kg-per-kwh"
                            className="h-8 text-sm"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>

              {/* Results */}
              <div className="border-t pt-4 space-y-3">
                <h4 className="font-medium text-sm flex items-center space-x-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  <span>Solar Potential Results</span>
                </h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-primary/5 rounded-lg">
                    <div className="text-lg font-bold text-primary" data-testid="text-total-setups">
                      {calculations.totalSetups.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">New Setups</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="text-lg font-bold text-blue-600" data-testid="text-added-capacity">
                      {calculations.capacityMW.toFixed(1)} MW
                    </div>
                    <div className="text-xs text-muted-foreground">Added Capacity</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="text-lg font-bold text-green-600" data-testid="text-annual-generation">
                      {calculations.annualGenMWh.toFixed(0)} MWh
                    </div>
                    <div className="text-xs text-muted-foreground">Annual Generation</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                    <div className="text-lg font-bold text-orange-600" data-testid="text-co2-avoided">
                      {calculations.annualCO2AvoidedTons.toFixed(0)}t
                    </div>
                    <div className="text-xs text-muted-foreground">CO₂ Avoided/yr</div>
                  </div>
                </div>

                <div className="text-center p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="text-lg font-bold text-purple-600" data-testid="text-homes-equivalent">
                    {calculations.homesEquivalent.toLocaleString()}
                  </div>
                  <div className="text-xs text-purple-700 dark:text-purple-300">Homes Powered Annually</div>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  ⚡ That's enough clean energy to power {calculations.homesEquivalent.toLocaleString()} homes for a full year!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function Community() {
  const [selectedCommunity, setSelectedCommunity] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  // Fetch communities
  const { data: communities = [], isLoading: isLoadingCommunities } = useQuery({
    queryKey: ['/api/communities'],
    queryFn: () => api.getCommunities(),
  });

  // Set first community as default
  useEffect(() => {
    if (communities.length > 0 && !selectedCommunity) {
      setSelectedCommunity(communities[0].id);
    }
  }, [communities, selectedCommunity]);

  // Fetch leaderboard for selected community
  const { 
    data: leaderboard = [], 
    isLoading: isLoadingLeaderboard 
  } = useQuery({
    queryKey: ['/api/community', selectedCommunity, 'leaderboard'],
    queryFn: () => api.getLeaderboard(selectedCommunity),
    enabled: !!selectedCommunity,
  });

  // No longer need household fetching - using real Ghaziabad data instead

  // Mock community data (in real app, this would come from API)
  const communityStats = {
    totalMembers: 45,
    activeMembers: 38,
    avgRenewableShare: 68,
    monthlyGrowth: 12,
  };

  // Process leaderboard data
  const processedLeaderboard = useMemo(() => {
    if (!leaderboard.length) {
      // Mock data for demonstration
      return {
        renewableShareLeaders: [
          { rank: 1, name: 'Raj Sharma', unit: 'Flat 302', percentage: 84, points: 120 },
          { rank: 2, name: 'Priya Patel', unit: 'Flat 105', percentage: 78, points: 95 },
          { rank: 3, name: 'Amit Kumar', unit: 'Flat 201', percentage: 72, points: 80 },
        ],
        costSavingsLeaders: [
          { rank: 1, name: 'Priya Patel', unit: 'Flat 105', amount: 2340, points: 0 },
          { rank: 2, name: 'Raj Sharma', unit: 'Flat 302', amount: 2180, points: 0 },
          { rank: 3, name: 'Neha Singh', unit: 'Flat 404', amount: 1950, points: 0 },
        ],
        co2ReductionLeaders: [
          { rank: 1, name: 'Raj Sharma', unit: 'Flat 302', co2: 156, points: 0 },
          { rank: 2, name: 'Amit Kumar', unit: 'Flat 201', co2: 142, points: 0 },
          { rank: 3, name: 'Priya Patel', unit: 'Flat 105', co2: 138, points: 0 },
        ],
        totalSavings: '₹18,450',
        totalCO2: '1,234 kg',
        avgRenewableShare: '68%'
      };
    }

    // Process real leaderboard data when available
    const sorted = [...leaderboard].sort((a, b) => b.points - a.points);
    
    return {
      renewableShareLeaders: sorted.slice(0, 3).map((item, index) => ({
        rank: index + 1,
        name: item.userName || 'Anonymous',
        unit: item.householdName || 'Unknown',
        percentage: Math.round(item.renewableSharePct),
        points: item.points
      })),
      costSavingsLeaders: sorted.slice(0, 3).map((item, index) => ({
        rank: index + 1,
        name: item.userName || 'Anonymous',
        unit: item.householdName || 'Unknown',
        amount: Math.round(item.costSaved),
        points: 0
      })),
      co2ReductionLeaders: sorted.slice(0, 3).map((item, index) => ({
        rank: index + 1,
        name: item.userName || 'Anonymous',
        unit: item.householdName || 'Unknown',
        co2: Math.round(item.co2AvoidedKg),
        points: 0
      })),
      totalSavings: `₹${sorted.reduce((sum, item) => sum + item.costSaved, 0).toLocaleString()}`,
      totalCO2: `${sorted.reduce((sum, item) => sum + item.co2AvoidedKg, 0).toFixed(0)} kg`,
      avgRenewableShare: `${Math.round(sorted.reduce((sum, item) => sum + item.renewableSharePct, 0) / sorted.length || 0)}%`
    };
  }, [leaderboard]);

  if (isLoadingCommunities) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-8 bg-muted rounded"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (communities.length === 0) {
    return <NoCommunityView />;
  }

  const currentCommunity = communities.find((c: Community) => c.id === selectedCommunity);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Community</h1>
          <p className="text-muted-foreground">
            Connect with neighbors and compete in renewable energy challenges.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <Select value={selectedCommunity} onValueChange={setSelectedCommunity}>
            <SelectTrigger className="w-64" data-testid="select-community">
              <SelectValue placeholder="Select community" />
            </SelectTrigger>
            <SelectContent>
              {communities.map((community: Community) => (
                <SelectItem key={community.id} value={community.id}>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <span>{community.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {community.city}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
            <SelectTrigger className="w-32" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Community Header */}
      {currentCommunity && (
        <Card className="gradient-bg">
          <CardContent className="p-6 text-white">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold mb-2" data-testid="text-community-name">
                  {currentCommunity.name}
                </h2>
                <div className="flex items-center space-x-4 text-sm text-white/80">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span data-testid="text-community-city">{currentCommunity.city}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span data-testid="text-member-count">{communityStats.totalMembers} members</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Active since 2023</span>
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white" data-testid="badge-community-rank">
                #1 in {currentCommunity.city}
              </Badge>
            </div>
            
            {currentCommunity.description && (
              <p className="text-white/90 mb-4" data-testid="text-community-description">
                {currentCommunity.description}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold" data-testid="text-active-members">
                  {communityStats.activeMembers}
                </div>
                <div className="text-sm text-white/80">Active Members</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" data-testid="text-avg-renewable">
                  {communityStats.avgRenewableShare}%
                </div>
                <div className="text-sm text-white/80">Avg. Renewable</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-300" data-testid="text-monthly-growth">
                  +{communityStats.monthlyGrowth}%
                </div>
                <div className="text-sm text-white/80">Monthly Growth</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" data-testid="text-community-rank-number">
                  #1
                </div>
                <div className="text-sm text-white/80">City Ranking</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Achievement Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                <Trophy className="text-yellow-600 dark:text-yellow-400 w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Your Achievements</h3>
                <p className="text-sm text-muted-foreground">This month</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Medal className="w-4 h-4 text-primary" />
                  <span className="text-sm">Solar Champion</span>
                </div>
                <Badge variant="secondary" data-testid="badge-solar-champion">Earned</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Award className="w-4 h-4 text-accent" />
                  <span className="text-sm">Energy Saver</span>
                </div>
                <Badge variant="outline" data-testid="badge-energy-saver">2/3 goals</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Leaf className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Green Hero</span>
                </div>
                <Badge variant="outline" data-testid="badge-green-hero">In Progress</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Target className="text-primary w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Monthly Challenge</h3>
                <p className="text-sm text-muted-foreground">80% renewable goal</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Your Progress</span>
                  <span className="font-medium" data-testid="text-challenge-progress">72%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: '72%' }}
                    data-testid="bar-challenge-progress"
                  ></div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                8% more to reach the goal and earn 100 bonus points!
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-secondary w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Your Ranking</h3>
                <p className="text-sm text-muted-foreground">Community position</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Renewable Share</span>
                <Badge className="bg-primary text-primary-foreground" data-testid="badge-renewable-rank">
                  #3
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Cost Savings</span>
                <Badge variant="secondary" data-testid="badge-savings-rank">#5</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">CO₂ Reduction</span>
                <Badge className="bg-green-600 text-white" data-testid="badge-co2-rank">#2</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Remove duplicate map section - already shown above */}

      {/* Community Leaderboard */}
      {isLoadingLeaderboard ? (
        <Card className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="h-4 bg-muted rounded"></div>
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="h-16 bg-muted rounded"></div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : (
        <CommunityLeaderboard {...processedLeaderboard} />
      )}

      {/* Community Challenges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="w-5 h-5" />
            <span>Active Challenges</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">80% Renewable Challenge</h4>
                <Badge data-testid="badge-challenge-1">7 days left</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Achieve 80% renewable energy usage for the month
              </p>
              <div className="flex items-center justify-between text-sm">
                <span>Participants: 32/45</span>
                <span className="font-medium text-primary">Prize: ₹5,000</span>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">CO₂ Reduction Sprint</h4>
                <Badge variant="secondary" data-testid="badge-challenge-2">2 weeks left</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Community goal: Avoid 5,000 kg CO₂ emissions
              </p>
              <div className="flex items-center justify-between text-sm">
                <span>Progress: 3,240/5,000 kg</span>
                <span className="font-medium text-green-600">65% complete</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
