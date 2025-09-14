import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { Household } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EnergyChart } from '@/components/charts/EnergyChart';
import { RenewableChart } from '@/components/charts/RenewableChart';
import { RecommendationCard } from '@/components/RecommendationCard';
import { WeatherForecast } from '@/components/WeatherForecast';
import { CommunityLeaderboard } from '@/components/CommunityLeaderboard';
import { 
  Sun, 
  Zap, 
  IndianRupee, 
  Leaf, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DashboardMetrics {
  solarGenerated: number;
  gridConsumed: number;
  costSavings: number;
  co2Avoided: number;
  renewableShare: number;
}

interface WeatherData {
  temperature: number;
  cloudCover: number;
  windSpeed: number;
  solarIrradiance: number;
  timestamp: string;
}

interface DashboardData {
  metrics: DashboardMetrics;
  weather: WeatherData;
  recommendations: any[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [currentHousehold, setCurrentHousehold] = useState<string | null>(null);

  // Fetch user's households
  const { data: households = [] } = useQuery<Household[]>({
    queryKey: ['/api/households'],
    enabled: !!user,
  });

  // Set first household as default
  useEffect(() => {
    if (households.length > 0 && !currentHousehold) {
      setCurrentHousehold(households[0].id);
    }
  }, [households, currentHousehold]);

  // Fetch dashboard data
  const { 
    data: dashboardData, 
    isLoading: isDashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard 
  } = useQuery({
    queryKey: ['/api/dashboard', currentHousehold],
    queryFn: async () => {
      if (!currentHousehold) throw new Error('No household selected');
      return api.getDashboardData(currentHousehold);
    },
    enabled: !!currentHousehold,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Fetch forecasts for charts
  const { data: forecastData } = useQuery({
    queryKey: ['/api/forecasts', currentHousehold],
    queryFn: async () => {
      if (!currentHousehold) throw new Error('No household selected');
      return api.getForecasts(currentHousehold);
    },
    enabled: !!currentHousehold,
  });

  // Fetch live grid consumption and tariff data
  const { 
    data: gridData,
    isLoading: isLoadingGrid,
    error: gridError 
  } = useQuery<any>({
    queryKey: ['/api/grid'],
    enabled: !!user,
    refetchInterval: 10000, // Refresh every 10 seconds for live grid data
  });

  // Generate recommendations mutation
  const generateRecommendationsMutation = useMutation({
    mutationFn: () => {
      if (!currentHousehold) throw new Error('No household selected');
      return api.generateRecommendations(currentHousehold);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard', currentHousehold] });
      toast({
        title: "Recommendations updated",
        description: "New energy optimization suggestions are available.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to generate recommendations",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Prepare chart data
  const chartData = forecastData ? 
    forecastData.pv.map((pv: any, index: number) => ({
      time: new Date(pv.timestamp).toLocaleTimeString('en-US', { hour: 'numeric' }),
      solar: pv.acKw,
      grid: Math.max(0, 2.5 - pv.acKw), // Estimated grid usage
    })) : [];

  // Prepare weather forecast data
  const weatherForecast = forecastData ?
    forecastData.weather.slice(0, 4).map((weather: any) => ({
      time: new Date(weather.timestamp).toLocaleTimeString('en-US', { hour: 'numeric' }),
      solarIntensity: Math.min(1, weather.ghiProxy / 1000),
      power: `${(weather.ghiProxy / 250).toFixed(1)}kW`,
      condition: weather.cloudsPct < 30 ? 'sunny' : weather.cloudsPct < 70 ? 'cloudy' : 'rainy'
    })) : [];

  // Mock community leaderboard data (would come from API in real implementation)
  const communityData = {
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

  if (isDashboardLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-8 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (dashboardError || !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-6 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Unable to load dashboard</h3>
          <p className="text-muted-foreground mb-4">
            {dashboardError?.message || 'Please check your connection and try again.'}
          </p>
          <Button onClick={() => refetchDashboard()} data-testid="button-retry-dashboard">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  const { metrics, weather, recommendations } = dashboardData;

  return (
    <div className="space-y-8">
      {/* Current Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Solar Generation Card */}
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <Sun className="text-accent w-6 h-6" />
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary" data-testid="badge-solar-live">
                Live
              </Badge>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground" data-testid="text-solar-generation">
                {metrics.solarGenerated.toFixed(1)} kW
              </p>
              <p className="text-sm text-muted-foreground">Solar Generation</p>
              <div className="mt-2 flex items-center text-sm">
                <TrendingUp className="text-primary w-4 h-4 mr-1" />
                <span className="text-primary">+12%</span>
                <span className="text-muted-foreground ml-1">vs yesterday</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grid Consumption Card - Live Data */}
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                <Zap className="text-secondary w-6 h-6" />
              </div>
              <Badge 
                variant="secondary" 
                className={`${gridData?.current?.status === 'peak_demand' ? 'bg-orange-100 text-orange-800' : 
                  gridData?.current?.status === 'off_peak' ? 'bg-green-100 text-green-800' : 
                  'bg-secondary/10 text-secondary'}`}
                data-testid="badge-grid-live"
              >
                {gridData?.current?.status === 'peak_demand' ? 'Peak' : 
                 gridData?.current?.status === 'off_peak' ? 'Off-Peak' : 'Live'}
              </Badge>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground" data-testid="text-grid-consumption">
                {gridData?.current?.consumption_kW?.toFixed(1) || metrics.gridConsumed.toFixed(1)} kW
              </p>
              <p className="text-sm text-muted-foreground">Grid Consumption</p>
              <div className="mt-2 flex items-center text-sm">
                <IndianRupee className="text-purple-500 w-4 h-4 mr-1" />
                <span className="text-purple-600 font-medium">
                  ₹{gridData?.current?.tariff_inr_per_kWh?.toFixed(2) || '5.50'}/kWh
                </span>
                <span className="text-muted-foreground ml-1">• ₹{gridData?.costs?.current_hourly_cost?.toFixed(0) || '14'}/hr</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cost Savings Card */}
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <IndianRupee className="text-primary w-6 h-6" />
              </div>
              <Badge variant="outline" data-testid="badge-savings-today">Today</Badge>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground" data-testid="text-cost-savings">
                ₹{metrics.costSavings.toFixed(0)}
              </p>
              <p className="text-sm text-muted-foreground">Cost Savings Today</p>
              <div className="mt-2 flex items-center text-sm">
                <TrendingUp className="text-primary w-4 h-4 mr-1" />
                <span className="text-primary">₹1,680</span>
                <span className="text-muted-foreground ml-1">this month</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CO2 Reduction Card */}
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Leaf className="text-primary w-6 h-6" />
              </div>
              <Badge variant="outline" data-testid="badge-co2-today">Today</Badge>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground" data-testid="text-co2-avoided">
                {metrics.co2Avoided.toFixed(1)} kg
              </p>
              <p className="text-sm text-muted-foreground">CO₂ Avoided</p>
              <div className="mt-2 flex items-center text-sm">
                <Leaf className="text-primary w-4 h-4 mr-1" />
                <span className="text-primary">0.8 trees</span>
                <span className="text-muted-foreground ml-1">equivalent</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Energy Generation vs Consumption Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Energy Overview</CardTitle>
              <div className="flex items-center space-x-2">
                <Button 
                  size="sm" 
                  variant={selectedPeriod === 'today' ? 'default' : 'outline'}
                  onClick={() => setSelectedPeriod('today')}
                  data-testid="button-period-today"
                >
                  Today
                </Button>
                <Button 
                  size="sm" 
                  variant={selectedPeriod === 'week' ? 'default' : 'outline'}
                  onClick={() => setSelectedPeriod('week')}
                  data-testid="button-period-week"
                >
                  Week
                </Button>
                <Button 
                  size="sm" 
                  variant={selectedPeriod === 'month' ? 'default' : 'outline'}
                  onClick={() => setSelectedPeriod('month')}
                  data-testid="button-period-month"
                >
                  Month
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <EnergyChart data={chartData} />
            <div className="flex items-center justify-center space-x-6 mt-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span className="text-sm text-muted-foreground">Solar Generation</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-secondary rounded-full"></div>
                <span className="text-sm text-muted-foreground">Grid Consumption</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Renewable Energy Share */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Energy Mix</CardTitle>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${gridData?.energy_mix?.solar_active ? 'bg-yellow-400' : 'bg-gray-400'}`}></div>
                <span className="text-sm text-muted-foreground">
                  {gridData?.energy_mix?.solar_active ? 'Solar Active' : 'Night Mode'}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <RenewableChart 
              solarPercentage={gridData?.energy_mix?.renewable_percentage || metrics.renewableShare} 
              gridPercentage={gridData?.energy_mix?.grid_percentage || (100 - metrics.renewableShare)} 
            />
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Renewable Energy</span>
                </div>
                <span className="text-sm font-medium" data-testid="text-solar-percentage">
                  {(gridData?.energy_mix?.renewable_percentage || metrics.renewableShare)?.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-accent rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Grid Energy</span>
                </div>
                <span className="text-sm font-medium" data-testid="text-grid-percentage">
                  {(gridData?.energy_mix?.grid_percentage || (100 - metrics.renewableShare))?.toFixed(1)}%
                </span>
              </div>
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Current Mix Status:</span>
                  <span className={`font-medium ${gridData?.energy_mix?.solar_active ? 'text-yellow-600' : 'text-blue-600'}`}>
                    {gridData?.energy_mix?.solar_active ? 
                      `${(gridData?.energy_mix?.renewable_percentage || 0)?.toFixed(0)}% Solar + ${(gridData?.energy_mix?.grid_percentage || 0)?.toFixed(0)}% Grid` :
                      `${(gridData?.energy_mix?.renewable_percentage || 0)?.toFixed(0)}% Battery + ${(gridData?.energy_mix?.grid_percentage || 0)?.toFixed(0)}% Grid`
                    }
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Smart Recommendations & Weather Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Recommendations */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Today's Smart Recommendations</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => generateRecommendationsMutation.mutate()}
                  disabled={generateRecommendationsMutation.isPending}
                  data-testid="button-refresh-recommendations"
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${generateRecommendationsMutation.isPending ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recommendations && recommendations.length > 0 ? (
                  recommendations.map((recommendation: any) => (
                    <RecommendationCard key={recommendation.id} recommendation={recommendation} />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No recommendations available</h3>
                    <p className="text-muted-foreground mb-4">
                      Add some flexible devices to get personalized energy optimization suggestions.
                    </p>
                    <Button variant="outline" data-testid="button-setup-devices">
                      Set up devices
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weather Forecast */}
        <WeatherForecast 
          forecasts={weatherForecast}
          peakPower="4.1 kW at 1:00 PM"
          totalGeneration="28.5 kWh"
        />
      </div>

      {/* Community Leaderboard */}
      <CommunityLeaderboard {...communityData} />
    </div>
  );
}
