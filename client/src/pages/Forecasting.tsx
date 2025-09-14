import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Household } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnergyChart } from '@/components/charts/EnergyChart';
import { WeatherForecast } from '@/components/WeatherForecast';
import { 
  CloudSun, 
  Sun, 
  Cloud, 
  CloudRain,
  Zap,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  Info
} from 'lucide-react';

interface WeatherForecast {
  timestamp: string;
  tempC: number;
  cloudsPct: number;
  windMps: number;
  ghiProxy: number;
}

interface PvForecast {
  timestamp: string;
  acKw: number;
}

interface ForecastData {
  weather: WeatherForecast[];
  pv: PvForecast[];
}

function getWeatherIcon(cloudCover: number) {
  if (cloudCover < 20) return Sun;
  if (cloudCover < 60) return CloudSun;
  if (cloudCover < 80) return Cloud;
  return CloudRain;
}

function getWeatherDescription(cloudCover: number, temp: number) {
  const condition = cloudCover < 20 ? 'Sunny' : 
                   cloudCover < 60 ? 'Partly Cloudy' :
                   cloudCover < 80 ? 'Cloudy' : 'Overcast';
  
  return `${condition}, ${temp.toFixed(0)}°C`;
}

function formatHour(dateString: string) {
  return new Date(dateString).toLocaleTimeString('en-US', { 
    hour: 'numeric',
    hour12: true 
  });
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short',
    day: 'numeric' 
  });
}

export default function Forecasting() {
  const [selectedHousehold, setSelectedHousehold] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '48h' | '7d'>('24h');
  const [activeTab, setActiveTab] = useState('weather');

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

  // Fetch forecast data
  const { 
    data: forecastData,
    isLoading,
    error,
    refetch 
  } = useQuery({
    queryKey: ['/api/forecasts', selectedHousehold],
    queryFn: () => api.getForecasts(selectedHousehold),
    enabled: !!selectedHousehold,
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });

  // Process data for different time periods
  const processedData = useMemo(() => {
    if (!forecastData) return { weather: [], pv: [], chartData: [] };

    const hoursToShow = selectedPeriod === '24h' ? 24 : selectedPeriod === '48h' ? 48 : 168;
    
    const weather = forecastData.weather.slice(0, hoursToShow);
    const pv = forecastData.pv.slice(0, hoursToShow);
    
    const chartData = pv.map((pvData: PvForecast, index: number) => {
      const weatherData = weather[index];
      return {
        time: selectedPeriod === '7d' 
          ? formatDate(pvData.timestamp)
          : formatHour(pvData.timestamp),
        solar: pvData.acKw,
        grid: Math.max(0, 2.5 - pvData.acKw), // Estimated grid consumption
        temperature: weatherData?.tempC || 0,
        cloudCover: weatherData?.cloudsPct || 0,
      };
    });

    return { weather, pv, chartData };
  }, [forecastData, selectedPeriod]);

  // Calculate forecast insights
  const insights = useMemo(() => {
    if (!processedData.pv.length) return null;

    const pvData = processedData.pv;
    const maxOutput = Math.max(...pvData.map((p: PvForecast) => p.acKw));
    const totalGeneration = pvData.reduce((sum: number, p: PvForecast) => sum + p.acKw, 0);
    const avgOutput = totalGeneration / pvData.length;
    
    const peakHour = pvData.find((p: PvForecast) => p.acKw === maxOutput);
    const lowPerformanceHours = pvData.filter((p: PvForecast) => p.acKw < avgOutput * 0.3).length;
    
    return {
      maxOutput: maxOutput.toFixed(2),
      totalGeneration: totalGeneration.toFixed(1),
      avgOutput: avgOutput.toFixed(2),
      peakTime: peakHour ? formatHour(peakHour.timestamp) : 'N/A',
      lowPerformanceHours
    };
  }, [processedData.pv]);

  if (households.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center">
          <CloudSun className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No households configured</h3>
          <p className="text-muted-foreground mb-4">
            Set up a household to view weather and solar forecasts.
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
          <h1 className="text-3xl font-bold text-foreground">Weather & Solar Forecasting</h1>
          <p className="text-muted-foreground">
            View detailed weather forecasts and solar energy predictions for optimal planning.
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
            <SelectTrigger className="w-40 transition-all duration-200 hover:scale-105" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h" className="hover:bg-primary/10 transition-colors">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  <span>24 Hours</span>
                </div>
              </SelectItem>
              <SelectItem value="48h" className="hover:bg-secondary/10 transition-colors">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-secondary rounded-full"></div>
                  <span>48 Hours</span>
                </div>
              </SelectItem>
              <SelectItem value="7d" className="hover:bg-accent/10 transition-colors">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  <span>7 Days</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            data-testid="button-refresh-forecast"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="animate-pulse">
                <div className="h-6 bg-muted rounded mb-4"></div>
                <div className="h-64 bg-muted rounded"></div>
              </div>
            </Card>
          </div>
          <Card className="p-6">
            <div className="animate-pulse space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-muted rounded"></div>
              ))}
            </div>
          </Card>
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to load forecast data</h3>
          <p className="text-muted-foreground mb-4">
            Unable to fetch weather and solar forecasts. Please try again.
          </p>
          <Button onClick={() => refetch()} data-testid="button-retry-forecast">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
          </Button>
        </Card>
      ) : (
        <>
          {/* Forecast Summary Cards */}
          {insights && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-primary">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Zap className="text-primary w-6 h-6 group-hover:animate-pulse" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground counter-animation" data-testid="text-max-output">
                        {insights.maxOutput} kW
                      </p>
                      <p className="text-sm text-muted-foreground">Peak Output</p>
                      <p className="text-xs text-primary/80 font-medium" data-testid="text-peak-time">
                        at {insights.peakTime}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 w-full bg-primary/10 rounded-full h-2">
                    <div className="bg-gradient-to-r from-primary to-primary/60 h-2 rounded-full animate-pulse" style={{width: '75%'}}></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-accent">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-400/20 to-orange-400/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Sun className="text-yellow-500 w-6 h-6 group-hover:rotate-45 transition-transform duration-300" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-total-generation">
                        {insights.totalGeneration} kWh
                      </p>
                      <p className="text-sm text-muted-foreground">Total Generation</p>
                      <p className="text-xs text-accent/80 font-medium">
                        {selectedPeriod} forecast
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 w-full bg-yellow-100 dark:bg-yellow-900/20 rounded-full h-2">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-400 h-2 rounded-full animate-pulse" style={{width: '90%'}}></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-secondary">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400/20 to-emerald-400/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <TrendingUp className="text-green-500 w-6 h-6 group-hover:-translate-y-1 transition-transform duration-300" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-avg-output">
                        {insights.avgOutput} kW
                      </p>
                      <p className="text-sm text-muted-foreground">Average Output</p>
                      <p className="text-xs text-secondary/80 font-medium">Hourly average</p>
                    </div>
                  </div>
                  <div className="mt-3 w-full bg-green-100 dark:bg-green-900/20 rounded-full h-2">
                    <div className="bg-gradient-to-r from-green-400 to-emerald-400 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-l-4 ${insights.lowPerformanceHours > 10 ? 'border-l-red-400' : 'border-l-blue-400'}`}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 bg-gradient-to-br ${insights.lowPerformanceHours > 10 ? 'from-red-400/20 to-red-400/10' : 'from-blue-400/20 to-blue-400/10'} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      {insights.lowPerformanceHours > 10 ? (
                        <TrendingDown className="text-red-500 w-6 h-6 group-hover:animate-bounce" />
                      ) : (
                        <CloudSun className="text-blue-500 w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
                      )}
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-low-performance-hours">
                        {insights.lowPerformanceHours}
                      </p>
                      <p className="text-sm text-muted-foreground">Low Output Hours</p>
                      <p className={`text-xs font-medium ${insights.lowPerformanceHours > 10 ? 'text-red-500/80' : 'text-blue-500/80'}`}>Below 30% average</p>
                    </div>
                  </div>
                  <div className={`mt-3 w-full ${insights.lowPerformanceHours > 10 ? 'bg-red-100 dark:bg-red-900/20' : 'bg-blue-100 dark:bg-blue-900/20'} rounded-full h-2`}>
                    <div className={`${insights.lowPerformanceHours > 10 ? 'bg-gradient-to-r from-red-400 to-red-500' : 'bg-gradient-to-r from-blue-400 to-blue-500'} h-2 rounded-full animate-pulse`} style={{width: `${Math.min(100, (insights.lowPerformanceHours / 24) * 100)}%`}}></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Forecast Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Solar Generation Chart */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Zap className="w-5 h-5" />
                      <span>Solar Generation Forecast</span>
                    </CardTitle>
                    <Badge variant="secondary" data-testid="badge-forecast-period">
                      {selectedPeriod === '24h' ? 'Next 24h' : 
                       selectedPeriod === '48h' ? 'Next 48h' : 'Next 7 days'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <EnergyChart data={processedData.chartData} />
                  <div className="flex items-center justify-center space-x-6 mt-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-primary rounded-full"></div>
                      <span className="text-sm text-muted-foreground">Solar Generation</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-secondary rounded-full"></div>
                      <span className="text-sm text-muted-foreground">Estimated Grid Usage</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Weather Details */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CloudSun className="w-5 h-5" />
                    <span>Weather Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="weather" data-testid="tab-weather">Weather</TabsTrigger>
                      <TabsTrigger value="solar" data-testid="tab-solar">Solar</TabsTrigger>
                    </TabsList>

                    <TabsContent value="weather" className="space-y-4 mt-4">
                      {processedData.weather.slice(0, 8).map((weather: WeatherForecast, index: number) => {
                        const WeatherIcon = getWeatherIcon(weather.cloudsPct);
                        return (
                          <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                            <div className="flex items-center space-x-3">
                              <span 
                                className="text-sm text-muted-foreground w-12" 
                                data-testid={`text-weather-time-${index}`}
                              >
                                {formatHour(weather.timestamp)}
                              </span>
                              <WeatherIcon className="text-accent w-4 h-4" />
                            </div>
                            <div className="text-right">
                              <p 
                                className="text-sm font-medium" 
                                data-testid={`text-weather-condition-${index}`}
                              >
                                {getWeatherDescription(weather.cloudsPct, weather.tempC)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {weather.windMps.toFixed(1)} m/s wind
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </TabsContent>

                    <TabsContent value="solar" className="space-y-4 mt-4">
                      {processedData.pv.slice(0, 8).map((pv: PvForecast, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center space-x-3">
                            <span 
                              className="text-sm text-muted-foreground w-12" 
                              data-testid={`text-solar-time-${index}`}
                            >
                              {formatHour(pv.timestamp)}
                            </span>
                            <Sun className="text-accent w-4 h-4" />
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-muted rounded-full h-2">
                              <div 
                                className="bg-accent h-2 rounded-full" 
                                style={{ 
                                  width: `${Math.min(100, (pv.acKw / (insights?.maxOutput ? parseFloat(insights.maxOutput) : 5)) * 100)}%` 
                                }}
                                data-testid={`bar-solar-intensity-${index}`}
                              />
                            </div>
                            <span 
                              className="text-sm font-medium w-12 text-right" 
                              data-testid={`text-solar-power-${index}`}
                            >
                              {pv.acKw.toFixed(1)}kW
                            </span>
                          </div>
                        </div>
                      ))}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Forecast Alerts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Info className="w-5 h-5" />
                    <span>Forecast Alerts</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {insights && insights.lowPerformanceHours > 12 && (
                    <div className="flex items-start space-x-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
                      <AlertTriangle className="text-yellow-600 dark:text-yellow-400 w-4 h-4 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                          Low solar output expected
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300">
                          Consider reducing energy-intensive activities during cloudy periods.
                        </p>
                      </div>
                    </div>
                  )}

                  {insights && parseFloat(insights.maxOutput) > 4 && (
                    <div className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                      <TrendingUp className="text-green-600 dark:text-green-400 w-4 h-4 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          High solar output expected
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300">
                          Perfect time for running energy-intensive appliances around {insights.peakTime}.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                    <Info className="text-blue-600 dark:text-blue-400 w-4 h-4 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Forecast updated
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        Data refreshed {new Date().toLocaleTimeString()}.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
