import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Household, ApplianceReading, BatteryLog, WeatherHourly, PvForecastHourly } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Cpu,
  Zap,
  Battery,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Brain,
  RefreshCw,
  Play,
  Pause,
  Settings,
  Activity,
  Sun,
  Wind
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AlgorithmResult {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'pending';
  progress: number;
  result?: any;
  executionTime?: number;
  lastRun?: string;
}

interface EnergyOptimization {
  deviceId: string;
  deviceName: string;
  currentUsage: number;
  optimizedUsage: number;
  potentialSavings: number;
  optimalSchedule: string[];
}

interface AnomalyDetection {
  applianceId: string;
  applianceName: string;
  severity: 'normal' | 'warning' | 'critical';
  anomalyType: string;
  confidence: number;
  timestamp: string;
}

interface LoadForecast {
  timestamp: string;
  predictedLoad: number;
  confidence: number;
  weatherFactor: number;
}

export default function Algorithms() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedHousehold, setSelectedHousehold] = useState<string>('');
  const [activeTab, setActiveTab] = useState('optimization');
  const [algorithmResults, setAlgorithmResults] = useState<AlgorithmResult[]>([]);

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

  // Note: These data fetches are placeholders for future real data integration
  // In production, these would connect to actual backend algorithms endpoints
  const applianceReadings: ApplianceReading[] = [];
  const batteryLogs: BatteryLog[] = [];
  const weatherData: WeatherHourly[] = [];

  // Mock algorithm execution - in real implementation, these would call backend algorithms
  const runEnergyOptimization = async (): Promise<EnergyOptimization[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockResults: EnergyOptimization[] = [
          {
            deviceId: '1',
            deviceName: 'Washing Machine',
            currentUsage: 2.5,
            optimizedUsage: 1.8,
            potentialSavings: 0.7,
            optimalSchedule: ['10:00', '14:00', '18:00']
          },
          {
            deviceId: '2', 
            deviceName: 'Electric Vehicle Charger',
            currentUsage: 7.2,
            optimizedUsage: 5.1,
            potentialSavings: 2.1,
            optimalSchedule: ['12:00', '13:00', '14:00', '15:00']
          },
          {
            deviceId: '3',
            deviceName: 'Water Heater',
            currentUsage: 3.0,
            optimizedUsage: 2.2,
            potentialSavings: 0.8,
            optimalSchedule: ['11:00', '15:00']
          }
        ];
        resolve(mockResults);
      }, 3000);
    });
  };

  const runAnomalyDetection = async (): Promise<AnomalyDetection[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockResults: AnomalyDetection[] = [
          {
            applianceId: '1',
            applianceName: 'Refrigerator',
            severity: 'warning',
            anomalyType: 'Power consumption spike',
            confidence: 0.85,
            timestamp: new Date().toISOString()
          },
          {
            applianceId: '2',
            applianceName: 'Air Conditioner',
            severity: 'normal',
            anomalyType: 'Normal operation',
            confidence: 0.95,
            timestamp: new Date().toISOString()
          },
          {
            applianceId: '3',
            applianceName: 'Dishwasher',
            severity: 'critical',
            anomalyType: 'Efficiency degradation',
            confidence: 0.92,
            timestamp: new Date().toISOString()
          }
        ];
        resolve(mockResults);
      }, 2500);
    });
  };

  const runLoadForecasting = async (): Promise<LoadForecast[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockResults: LoadForecast[] = Array.from({ length: 24 }, (_, i) => ({
          timestamp: new Date(Date.now() + i * 3600000).toISOString(),
          predictedLoad: Math.random() * 5 + 2, // 2-7 kW
          confidence: Math.random() * 0.3 + 0.7, // 70-100%
          weatherFactor: Math.random() * 0.5 + 0.5 // 50-100%
        }));
        resolve(mockResults);
      }, 2000);
    });
  };

  const executeAlgorithm = async (algorithmName: string, algorithmFn: () => Promise<any>) => {
    const algorithmId = `${algorithmName}_${Date.now()}`;
    const newAlgorithm: AlgorithmResult = {
      id: algorithmId,
      name: algorithmName,
      status: 'running',
      progress: 0,
      lastRun: new Date().toISOString()
    };

    setAlgorithmResults(prev => [...prev.filter(a => a.name !== algorithmName), newAlgorithm]);

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setAlgorithmResults(prev => 
        prev.map(algo => 
          algo.id === algorithmId 
            ? { ...algo, progress: Math.min(algo.progress + Math.random() * 20, 90) }
            : algo
        )
      );
    }, 500);

    try {
      const startTime = Date.now();
      const result = await algorithmFn();
      const executionTime = Date.now() - startTime;

      clearInterval(progressInterval);
      
      setAlgorithmResults(prev => 
        prev.map(algo => 
          algo.id === algorithmId 
            ? { 
                ...algo, 
                status: 'completed', 
                progress: 100, 
                result,
                executionTime 
              }
            : algo
        )
      );

      toast({
        title: "Algorithm Complete",
        description: `${algorithmName} completed successfully in ${executionTime}ms`,
      });
    } catch (error) {
      clearInterval(progressInterval);
      setAlgorithmResults(prev => 
        prev.map(algo => 
          algo.id === algorithmId 
            ? { ...algo, status: 'failed', progress: 0 }
            : algo
        )
      );

      toast({
        title: "Algorithm Failed",
        description: `${algorithmName} execution failed`,
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: AlgorithmResult['status']) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getAnomalySeverityBadge = (severity: AnomalyDetection['severity']) => {
    const variants = {
      normal: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    };
    
    return (
      <Badge variant="secondary" className={variants[severity]}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-algorithms-title">
            Energy Algorithms
          </h1>
          <p className="text-muted-foreground">
            Real-time energy optimization, anomaly detection, and forecasting algorithms
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedHousehold} onValueChange={setSelectedHousehold}>
            <SelectTrigger className="w-48" data-testid="select-household">
              <SelectValue placeholder="Select household..." />
            </SelectTrigger>
            <SelectContent>
              {households.map((household) => (
                <SelectItem key={household.id} value={household.id}>
                  {household.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Algorithm Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Algorithms</p>
                <p className="text-2xl font-bold" data-testid="text-total-algorithms">
                  {algorithmResults.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Running</p>
                <p className="text-2xl font-bold text-blue-600" data-testid="text-running-algorithms">
                  {algorithmResults.filter(a => a.status === 'running').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-completed-algorithms">
                  {algorithmResults.filter(a => a.status === 'completed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600" data-testid="text-failed-algorithms">
                  {algorithmResults.filter(a => a.status === 'failed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Algorithm Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="optimization" data-testid="tab-optimization">
            <Zap className="w-4 h-4 mr-2" />
            Energy Optimization
          </TabsTrigger>
          <TabsTrigger value="anomaly" data-testid="tab-anomaly">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Anomaly Detection
          </TabsTrigger>
          <TabsTrigger value="forecasting" data-testid="tab-forecasting">
            <BarChart3 className="w-4 h-4 mr-2" />
            Load Forecasting
          </TabsTrigger>
          <TabsTrigger value="battery" data-testid="tab-battery">
            <Battery className="w-4 h-4 mr-2" />
            Battery Optimization
          </TabsTrigger>
        </TabsList>

        {/* Energy Optimization Tab */}
        <TabsContent value="optimization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5" />
                  <span>Energy Usage Optimization</span>
                </div>
                <Button 
                  onClick={() => executeAlgorithm('Energy Optimization', runEnergyOptimization)}
                  disabled={algorithmResults.some(a => a.name === 'Energy Optimization' && a.status === 'running')}
                  data-testid="button-run-optimization"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Run Optimization
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const optimizationResult = algorithmResults.find(a => a.name === 'Energy Optimization');
                if (optimizationResult?.status === 'running') {
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Analyzing energy patterns...</span>
                      </div>
                      <Progress value={optimizationResult.progress} className="w-full" />
                    </div>
                  );
                } else if (optimizationResult?.result) {
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>Optimization completed in {optimizationResult.executionTime}ms</span>
                      </div>
                      <div className="grid gap-4">
                        {optimizationResult.result.map((item: EnergyOptimization, index: number) => (
                          <div key={item.deviceId} className="border rounded-lg p-4" data-testid={`optimization-result-${index}`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{item.deviceName}</h4>
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                  <span>Current: {item.currentUsage} kW</span>
                                  <span>Optimized: {item.optimizedUsage} kW</span>
                                  <span className="text-green-600">Savings: {item.potentialSavings} kW</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Optimal Times:</p>
                                <p className="font-medium">{item.optimalSchedule.join(', ')}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p>Run energy optimization to analyze device usage patterns</p>
                    <p className="text-sm">Algorithm will suggest optimal scheduling for energy efficiency</p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Anomaly Detection Tab */}
        <TabsContent value="anomaly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Appliance Anomaly Detection</span>
                </div>
                <Button 
                  onClick={() => executeAlgorithm('Anomaly Detection', runAnomalyDetection)}
                  disabled={algorithmResults.some(a => a.name === 'Anomaly Detection' && a.status === 'running')}
                  data-testid="button-run-anomaly"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Scan for Anomalies
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const anomalyResult = algorithmResults.find(a => a.name === 'Anomaly Detection');
                if (anomalyResult?.status === 'running') {
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Scanning appliance patterns...</span>
                      </div>
                      <Progress value={anomalyResult.progress} className="w-full" />
                    </div>
                  );
                } else if (anomalyResult?.result) {
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>Anomaly scan completed in {anomalyResult.executionTime}ms</span>
                      </div>
                      <div className="grid gap-4">
                        {anomalyResult.result.map((item: AnomalyDetection, index: number) => (
                          <div key={item.applianceId} className="border rounded-lg p-4" data-testid={`anomaly-result-${index}`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{item.applianceName}</h4>
                                <p className="text-sm text-muted-foreground">{item.anomalyType}</p>
                                <p className="text-xs text-muted-foreground">
                                  Confidence: {(item.confidence * 100).toFixed(1)}%
                                </p>
                              </div>
                              <div className="text-right space-y-2">
                                {getAnomalySeverityBadge(item.severity)}
                                <p className="text-xs text-muted-foreground">
                                  {new Date(item.timestamp).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p>Run anomaly detection to identify unusual appliance behavior</p>
                    <p className="text-sm">AI algorithms will analyze patterns and detect potential issues</p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Load Forecasting Tab */}
        <TabsContent value="forecasting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>24-Hour Load Forecasting</span>
                </div>
                <Button 
                  onClick={() => executeAlgorithm('Load Forecasting', runLoadForecasting)}
                  disabled={algorithmResults.some(a => a.name === 'Load Forecasting' && a.status === 'running')}
                  data-testid="button-run-forecasting"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Generate Forecast
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const forecastResult = algorithmResults.find(a => a.name === 'Load Forecasting');
                if (forecastResult?.status === 'running') {
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Analyzing historical patterns and weather data...</span>
                      </div>
                      <Progress value={forecastResult.progress} className="w-full" />
                    </div>
                  );
                } else if (forecastResult?.result) {
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>Forecast generated in {forecastResult.executionTime}ms</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                        {forecastResult.result.slice(0, 12).map((item: LoadForecast, index: number) => (
                          <div key={index} className="border rounded p-3 text-sm" data-testid={`forecast-result-${index}`}>
                            <p className="font-medium">
                              {new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-muted-foreground">
                              {item.predictedLoad.toFixed(2)} kW
                            </p>
                            <div className="flex items-center justify-between text-xs">
                              <span>Conf: {(item.confidence * 100).toFixed(0)}%</span>
                              <span>Weather: {(item.weatherFactor * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p>Generate load forecasting using historical data and weather patterns</p>
                    <p className="text-sm">Predict energy consumption for the next 24 hours</p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Battery Optimization Tab */}
        <TabsContent value="battery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Battery className="w-5 h-5" />
                <span>Battery Scheduling Optimization</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Battery className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>Battery optimization algorithms coming soon</p>
                <p className="text-sm">Will optimize charging/discharging cycles based on solar generation and load forecasts</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Algorithm Execution History */}
      {algorithmResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Algorithm Execution History</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {algorithmResults.map((result) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                  data-testid={`algorithm-history-${result.name.toLowerCase().replace(' ', '-')}`}
                >
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <p className="font-medium">{result.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {result.lastRun && `Last run: ${new Date(result.lastRun).toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {result.status === 'running' && (
                      <Progress value={result.progress} className="w-24" />
                    )}
                    {result.executionTime && (
                      <p className="text-sm text-muted-foreground">
                        {result.executionTime}ms
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}