import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Household } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { EnergyChart } from '@/components/charts/EnergyChart';
import { RenewableChart } from '@/components/charts/RenewableChart';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  DollarSign,
  Leaf,
  Zap,
  Sun,
  Download,
  Filter,
  RefreshCw,
  Clock,
  Target,
  AlertCircle,
  PieChart,
  LineChart,
  Activity
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Analytics() {
  const { toast } = useToast();
  const [selectedHousehold, setSelectedHousehold] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [selectedMetric, setSelectedMetric] = useState<'energy' | 'cost' | 'environmental'>('energy');
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch households
  const { data: households = [] } = useQuery<Household[]>({
    queryKey: ['/api/households'],
  });

  // Set first household as default
  useEffect(() => {
    if (households.length > 0 && !selectedHousehold) {
      setSelectedHousehold(households[0].id);
    }
  }, [households, selectedHousehold]);

  // Fetch dashboard data for analytics
  const { 
    data: dashboardData,
    isLoading: isDashboardLoading,
    refetch: refetchDashboard 
  } = useQuery({
    queryKey: ['/api/dashboard', selectedHousehold],
    queryFn: () => api.getDashboardData(selectedHousehold),
    enabled: !!selectedHousehold,
  });

  // Fetch forecast data for trend analysis
  const { data: forecastData } = useQuery({
    queryKey: ['/api/forecasts', selectedHousehold],
    queryFn: () => api.getForecasts(selectedHousehold),
    enabled: !!selectedHousehold,
  });

  // Fetch devices for device-level analytics
  const { data: devices = [] } = useQuery({
    queryKey: ['/api/devices', selectedHousehold],
    queryFn: () => api.getDevices(selectedHousehold),
    enabled: !!selectedHousehold,
  });

  // Calculate analytics metrics
  const analytics = useMemo(() => {
    if (!dashboardData || !forecastData) {
      return {
        energyTrends: [],
        costAnalysis: {},
        environmentalImpact: {},
        deviceBreakdown: [],
        efficiency: {},
        predictions: {}
      };
    }

    const { metrics } = dashboardData;
    
    // Energy trends based on forecast data
    const energyTrends = forecastData.pv ? forecastData.pv.slice(0, 24).map((pv: any, index: number) => ({
      time: new Date(pv.timestamp).toLocaleTimeString('en-US', { hour: 'numeric' }),
      solar: pv.acKw,
      grid: Math.max(0, 2.5 - pv.acKw),
      efficiency: pv.acKw > 0 ? (pv.acKw / 5.0) * 100 : 0 // Assuming 5kW system
    })) : [];

    // Cost analysis
    const dailyCostSaving = metrics.costSavings;
    const monthlyCostSaving = dailyCostSaving * 30;
    const yearlyProjection = monthlyCostSaving * 12;
    
    const costAnalysis = {
      daily: dailyCostSaving,
      monthly: monthlyCostSaving,
      yearly: yearlyProjection,
      peakSavingHour: '1:00 PM',
      avgHourlySaving: dailyCostSaving / 24
    };

    // Environmental impact
    const dailyCO2Avoided = metrics.co2Avoided;
    const monthlyCO2Avoided = dailyCO2Avoided * 30;
    const yearlyProjection_CO2 = monthlyCO2Avoided * 12;
    const treesEquivalent = yearlyProjection_CO2 / 22; // 22kg CO2 per tree per year
    
    const environmentalImpact = {
      dailyCO2: dailyCO2Avoided,
      monthlyCO2: monthlyCO2Avoided,
      yearlyCO2: yearlyProjection_CO2,
      treesEquivalent: treesEquivalent,
      coalAvoided: yearlyProjection_CO2 * 0.5 // kg of coal
    };

    // Device-level breakdown
    const deviceBreakdown = devices.map((device: any) => ({
      name: device.name,
      consumption: device.typicalKwh,
      flexible: device.flexible,
      optimizationPotential: device.flexible ? device.typicalKwh * 0.3 : 0,
      costImpact: device.typicalKwh * 5.0 // Assuming ₹5 per kWh
    }));

    // System efficiency metrics
    const efficiency = {
      overallEfficiency: metrics.renewableShare,
      solarUtilization: (metrics.solarGenerated / 5.0) * 100, // Assuming 5kW system
      gridDependency: 100 - metrics.renewableShare,
      peakEfficiencyTime: '1:00 PM',
      avgDailyGeneration: metrics.solarGenerated
    };

    // Predictions and recommendations
    const predictions = {
      nextWeekGeneration: metrics.solarGenerated * 7 * 1.05, // 5% improvement
      potentialSavings: costAnalysis.monthly * 1.15, // 15% more with optimization
      recommendedDeviceScheduling: devices.filter((d: any) => d.flexible).length,
      co2ReductionTarget: environmentalImpact.monthlyCO2 * 1.2
    };

    return {
      energyTrends,
      costAnalysis,
      environmentalImpact,
      deviceBreakdown,
      efficiency,
      predictions
    };
  }, [dashboardData, forecastData, devices]);

  // Export analytics data
  const handleExportData = () => {
    const exportData = {
      period: selectedPeriod,
      household: households.find((h: any) => h.id === selectedHousehold)?.name,
      generatedAt: new Date().toISOString(),
      analytics
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `greengrid-analytics-${selectedPeriod}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Analytics exported",
      description: "Your analytics data has been downloaded successfully.",
    });
  };

  if (households.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No data to analyze</h3>
          <p className="text-muted-foreground mb-4">
            Set up a household to view detailed analytics and insights.
          </p>
          <Button data-testid="button-setup-household">
            Set up household
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics & Insights</h1>
          <p className="text-muted-foreground">
            Comprehensive analysis of your renewable energy performance and optimization opportunities.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {households.length > 1 && (
            <Select value={selectedHousehold} onValueChange={setSelectedHousehold}>
              <SelectTrigger className="w-48" data-testid="select-household">
                <SelectValue placeholder="Select household" />
              </SelectTrigger>
              <SelectContent>
                {households.map((household: any) => (
                  <SelectItem key={household.id} value={household.id}>
                    {household.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
            <SelectTrigger className="w-32" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExportData}
            data-testid="button-export-analytics"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetchDashboard()}
            disabled={isDashboardLoading}
            data-testid="button-refresh-analytics"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isDashboardLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {isDashboardLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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
      ) : (
        <>
          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="card-hover">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Target className="text-primary w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-efficiency-score">
                      {analytics.efficiency.overallEfficiency.toFixed(0)}%
                    </p>
                    <p className="text-sm text-muted-foreground">System Efficiency</p>
                    <div className="flex items-center text-sm mt-1">
                      <TrendingUp className="text-primary w-4 h-4 mr-1" />
                      <span className="text-primary">+5%</span>
                      <span className="text-muted-foreground ml-1">vs last month</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <DollarSign className="text-accent w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-monthly-savings">
                      ₹{analytics.costAnalysis.monthly?.toFixed(0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Monthly Savings</p>
                    <div className="flex items-center text-sm mt-1">
                      <TrendingUp className="text-primary w-4 h-4 mr-1" />
                      <span className="text-primary">₹{analytics.predictions.potentialSavings?.toFixed(0)}</span>
                      <span className="text-muted-foreground ml-1">potential</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <Leaf className="text-green-600 dark:text-green-400 w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-monthly-co2-avoided">
                      {analytics.environmentalImpact.monthlyCO2?.toFixed(0)} kg
                    </p>
                    <p className="text-sm text-muted-foreground">CO₂ Avoided</p>
                    <div className="flex items-center text-sm mt-1">
                      <Leaf className="text-green-600 dark:text-green-400 w-4 h-4 mr-1" />
                      <span className="text-green-600 dark:text-green-400">
                        {analytics.environmentalImpact.treesEquivalent?.toFixed(1)} trees
                      </span>
                      <span className="text-muted-foreground ml-1">yearly</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
                    <Sun className="text-secondary w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-solar-utilization">
                      {analytics.efficiency.solarUtilization?.toFixed(0)}%
                    </p>
                    <p className="text-sm text-muted-foreground">Solar Utilization</p>
                    <div className="flex items-center text-sm mt-1">
                      <Clock className="text-muted-foreground w-4 h-4 mr-1" />
                      <span className="text-muted-foreground">Peak at</span>
                      <span className="text-foreground ml-1">1:00 PM</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="energy" data-testid="tab-energy">Energy</TabsTrigger>
              <TabsTrigger value="financial" data-testid="tab-financial">Financial</TabsTrigger>
              <TabsTrigger value="environmental" data-testid="tab-environmental">Environmental</TabsTrigger>
              <TabsTrigger value="devices" data-testid="tab-devices">Devices</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Energy Performance Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <LineChart className="w-5 h-5" />
                      <span>Energy Performance Trends</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EnergyChart data={analytics.energyTrends} />
                  </CardContent>
                </Card>

                {/* Renewable vs Grid Split */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <PieChart className="w-5 h-5" />
                      <span>Energy Source Distribution</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RenewableChart 
                      solarPercentage={analytics.efficiency.overallEfficiency} 
                      gridPercentage={100 - analytics.efficiency.overallEfficiency} 
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Performance Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="w-5 h-5" />
                    <span>Performance Insights</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary" data-testid="text-daily-generation">
                        {analytics.efficiency.avgDailyGeneration?.toFixed(1)} kWh
                      </div>
                      <div className="text-sm text-muted-foreground">Average Daily Generation</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-secondary" data-testid="text-grid-independence">
                        {(100 - analytics.efficiency.gridDependency)?.toFixed(0)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Grid Independence</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-accent" data-testid="text-optimization-potential">
                        {analytics.deviceBreakdown.reduce((sum, device) => sum + device.optimizationPotential, 0).toFixed(1)} kWh
                      </div>
                      <div className="text-sm text-muted-foreground">Optimization Potential</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="energy" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Hourly Energy Production & Consumption</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EnergyChart data={analytics.energyTrends} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Energy Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Peak Generation</span>
                      <span className="font-medium" data-testid="text-peak-generation">
                        {Math.max(...analytics.energyTrends.map(t => t.solar)).toFixed(1)} kW
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Peak Time</span>
                      <span className="font-medium">1:00 PM</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">System Capacity</span>
                      <span className="font-medium">5.0 kW</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Capacity Factor</span>
                      <span className="font-medium" data-testid="text-capacity-factor">
                        {((analytics.efficiency.avgDailyGeneration / 24) / 5.0 * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Energy Efficiency</span>
                      <Badge variant="secondary" data-testid="badge-efficiency">
                        {analytics.efficiency.overallEfficiency > 70 ? 'Excellent' : 
                         analytics.efficiency.overallEfficiency > 50 ? 'Good' : 'Needs Improvement'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="financial" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl font-bold text-green-600" data-testid="text-daily-savings">
                      ₹{analytics.costAnalysis.daily?.toFixed(0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Daily Savings</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl font-bold text-green-600" data-testid="text-monthly-financial-savings">
                      ₹{analytics.costAnalysis.monthly?.toFixed(0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Monthly Savings</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl font-bold text-green-600" data-testid="text-yearly-projection">
                      ₹{analytics.costAnalysis.yearly?.toFixed(0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Yearly Projection</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl font-bold text-primary" data-testid="text-avg-hourly-saving">
                      ₹{analytics.costAnalysis.avgHourlySaving?.toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground">Avg. Hourly Saving</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Financial Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                      <div className="flex items-center space-x-2 mb-2">
                        <TrendingUp className="text-green-600 dark:text-green-400 w-5 h-5" />
                        <h4 className="font-medium text-green-800 dark:text-green-200">Cost Optimization Opportunities</h4>
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                        With better device scheduling, you could save an additional ₹{(analytics.predictions.potentialSavings - analytics.costAnalysis.monthly).toFixed(0)} per month.
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Peak savings window: 11:00 AM - 3:00 PM
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium mb-2">Cost Breakdown</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Grid electricity avoided</span>
                            <span className="font-medium">₹{analytics.costAnalysis.monthly?.toFixed(0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>System maintenance</span>
                            <span className="font-medium text-red-600">-₹500</span>
                          </div>
                          <div className="flex justify-between font-medium border-t pt-2">
                            <span>Net monthly benefit</span>
                            <span className="text-green-600">₹{(analytics.costAnalysis.monthly - 500).toFixed(0)}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h5 className="font-medium mb-2">ROI Analysis</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Annual savings</span>
                            <span className="font-medium">₹{analytics.costAnalysis.yearly?.toFixed(0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>System cost (est.)</span>
                            <span className="font-medium">₹3,50,000</span>
                          </div>
                          <div className="flex justify-between font-medium border-t pt-2">
                            <span>Payback period</span>
                            <span className="text-primary">
                              {(350000 / analytics.costAnalysis.yearly).toFixed(1)} years
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="environmental" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl font-bold text-green-600" data-testid="text-daily-co2-saved">
                      {analytics.environmentalImpact.dailyCO2?.toFixed(1)} kg
                    </div>
                    <div className="text-sm text-muted-foreground">Daily CO₂ Avoided</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl font-bold text-green-600" data-testid="text-monthly-co2-saved">
                      {analytics.environmentalImpact.monthlyCO2?.toFixed(0)} kg
                    </div>
                    <div className="text-sm text-muted-foreground">Monthly CO₂ Avoided</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl font-bold text-green-600" data-testid="text-yearly-co2-projection">
                      {analytics.environmentalImpact.yearlyCO2?.toFixed(0)} kg
                    </div>
                    <div className="text-sm text-muted-foreground">Yearly CO₂ Avoided</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl font-bold text-primary" data-testid="text-trees-equivalent">
                      {analytics.environmentalImpact.treesEquivalent?.toFixed(0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Trees Equivalent/Year</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Leaf className="w-5 h-5" />
                    <span>Environmental Impact Analysis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                      <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Your Environmental Contribution</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-lg font-bold text-green-600" data-testid="text-coal-avoided">
                            {analytics.environmentalImpact.coalAvoided?.toFixed(0)} kg
                          </div>
                          <div className="text-xs text-green-700 dark:text-green-300">Coal burning avoided yearly</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-green-600" data-testid="text-car-miles-equivalent">
                            {(analytics.environmentalImpact.yearlyCO2 * 2.31).toFixed(0)} km
                          </div>
                          <div className="text-xs text-green-700 dark:text-green-300">Car driving equivalent avoided</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-green-600" data-testid="text-home-power-days">
                            {(analytics.environmentalImpact.yearlyCO2 / 0.82 / 10).toFixed(0)} days
                          </div>
                          <div className="text-xs text-green-700 dark:text-green-300">Avg. home powered cleanly</div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h5 className="font-medium mb-3">Carbon Footprint Reduction</h5>
                        <div className="w-full bg-muted rounded-full h-4 mb-2">
                          <div 
                            className="bg-green-600 h-4 rounded-full" 
                            style={{ width: `${Math.min(100, (analytics.environmentalImpact.yearlyCO2 / 2000) * 100)}%` }}
                            data-testid="bar-carbon-reduction"
                          ></div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {((analytics.environmentalImpact.yearlyCO2 / 2000) * 100).toFixed(1)}% of average household carbon footprint offset
                        </p>
                      </div>

                      <div>
                        <h5 className="font-medium mb-3">Sustainability Goals</h5>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>UN SDG 7: Clean Energy</span>
                            <Badge variant="secondary" className="bg-green-100 text-green-800" data-testid="badge-sdg-7">
                              Contributing
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>UN SDG 13: Climate Action</span>
                            <Badge variant="secondary" className="bg-green-100 text-green-800" data-testid="badge-sdg-13">
                              Contributing
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Paris Agreement Goals</span>
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800" data-testid="badge-paris-agreement">
                              On Track
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="devices" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="w-5 h-5" />
                    <span>Device Energy Analysis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.deviceBreakdown.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No devices configured</h3>
                      <p className="text-muted-foreground mb-4">
                        Add devices to see detailed consumption analytics and optimization opportunities.
                      </p>
                      <Button data-testid="button-add-devices">Add Devices</Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {analytics.deviceBreakdown.map((device, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <Zap className="text-primary w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-medium" data-testid={`text-device-name-${index}`}>
                                {device.name}
                              </h4>
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <span>{device.consumption} kWh/cycle</span>
                                {device.flexible && (
                                  <Badge variant="secondary" className="text-xs" data-testid={`badge-flexible-${index}`}>
                                    Flexible
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium" data-testid={`text-device-cost-${index}`}>
                              ₹{device.costImpact.toFixed(0)}/cycle
                            </div>
                            {device.optimizationPotential > 0 && (
                              <div className="text-sm text-green-600" data-testid={`text-optimization-${index}`}>
                                Save {device.optimizationPotential.toFixed(1)} kWh
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                        <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Optimization Summary</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-lg font-bold text-blue-600" data-testid="text-total-devices">
                              {analytics.deviceBreakdown.length}
                            </div>
                            <div className="text-xs text-blue-700 dark:text-blue-300">Total Devices</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-blue-600" data-testid="text-flexible-devices-count">
                              {analytics.deviceBreakdown.filter(d => d.flexible).length}
                            </div>
                            <div className="text-xs text-blue-700 dark:text-blue-300">Flexible Devices</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-blue-600" data-testid="text-total-optimization-potential">
                              {analytics.deviceBreakdown.reduce((sum, device) => sum + device.optimizationPotential, 0).toFixed(1)} kWh
                            </div>
                            <div className="text-xs text-blue-700 dark:text-blue-300">Optimization Potential</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Predictions & Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="w-5 h-5" />
                <span>AI Predictions & Recommendations</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Next Week Forecast</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Sun className="text-green-600 dark:text-green-400 w-4 h-4" />
                        <span className="text-sm">Expected generation</span>
                      </div>
                      <span className="font-medium" data-testid="text-weekly-generation-forecast">
                        {analytics.predictions.nextWeekGeneration?.toFixed(1)} kWh
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="text-blue-600 dark:text-blue-400 w-4 h-4" />
                        <span className="text-sm">Potential savings</span>
                      </div>
                      <span className="font-medium" data-testid="text-potential-savings-forecast">
                        ₹{analytics.predictions.potentialSavings?.toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Optimization Recommendations</h4>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                      <Target className="text-yellow-600 dark:text-yellow-400 w-4 h-4 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Schedule {analytics.predictions.recommendedDeviceScheduling} flexible devices</p>
                        <p className="text-xs text-muted-foreground">
                          Run high-energy appliances during peak solar hours (11 AM - 3 PM)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <Leaf className="text-green-600 dark:text-green-400 w-4 h-4 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Target {analytics.predictions.co2ReductionTarget?.toFixed(0)} kg CO₂ reduction</p>
                        <p className="text-xs text-muted-foreground">
                          20% improvement possible with optimized scheduling
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
