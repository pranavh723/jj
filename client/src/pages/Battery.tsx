import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Battery as BatteryIcon, 
  TrendingDown,
  AlertTriangle, 
  CheckCircle, 
  Activity,
  Plus,
  RefreshCw,
  Zap
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { BatteryLog, Household } from '@shared/schema';

interface BatteryStatus {
  currentSoC: number;
  currentDoD: number;
  totalCycles: number;
  healthStatus: 'excellent' | 'good' | 'fair' | 'poor';
  lastAlert?: string;
}

export default function Battery() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [socPercent, setSocPercent] = useState('');
  const [dodPercent, setDodPercent] = useState('');
  const [cycleCount, setCycleCount] = useState('');

  // Fetch user's households
  const { data: households = [] } = useQuery<Household[]>({
    queryKey: ['/api/households'],
    enabled: !!user,
  });

  // Fetch battery logs
  const { 
    data: batteryLogs = [], 
    isLoading: isLoadingLogs,
    refetch: refetchLogs 
  } = useQuery<BatteryLog[]>({
    queryKey: ['/api/battery'],
    enabled: !!user && households.length > 0,
  });

  // Add battery log mutation
  const addLogMutation = useMutation({
    mutationFn: async (data: { socPercent: number; dodPercent: number; cycleCount: number; timestamp: string }) => {
      return apiRequest('/api/battery', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Battery Log Added",
        description: "Battery status has been recorded and analyzed.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/battery'] });
      setSocPercent('');
      setDodPercent('');
      setCycleCount('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add battery log",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!socPercent || !dodPercent || !cycleCount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all battery status fields.",
        variant: "destructive",
      });
      return;
    }

    const soc = parseFloat(socPercent);
    const dod = parseFloat(dodPercent);
    const cycles = parseInt(cycleCount);

    if (isNaN(soc) || isNaN(dod) || isNaN(cycles) || soc < 0 || soc > 100 || dod < 0 || dod > 100 || cycles < 0) {
      toast({
        title: "Invalid Values",
        description: "Please enter valid percentage values (0-100) and positive cycle count.",
        variant: "destructive",
      });
      return;
    }

    addLogMutation.mutate({
      socPercent: soc,
      dodPercent: dod,
      cycleCount: cycles,
      timestamp: new Date().toISOString(),
    });
  };

  const getBatteryStatus = (): BatteryStatus => {
    if (batteryLogs.length === 0) {
      return {
        currentSoC: 0,
        currentDoD: 0,
        totalCycles: 0,
        healthStatus: 'excellent',
      };
    }

    // Get the latest log entry
    const latestLog = batteryLogs[0];
    
    // Calculate health based on cycles and DoD
    let healthStatus: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
    if (latestLog.cycleCount > 2000 || latestLog.dodPercent > 80) {
      healthStatus = 'poor';
    } else if (latestLog.cycleCount > 1500 || latestLog.dodPercent > 60) {
      healthStatus = 'fair';
    } else if (latestLog.cycleCount > 1000 || latestLog.dodPercent > 40) {
      healthStatus = 'good';
    }

    return {
      currentSoC: latestLog.socPercent,
      currentDoD: latestLog.dodPercent,
      totalCycles: latestLog.cycleCount,
      healthStatus,
      lastAlert: latestLog.alert || undefined,
    };
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'text-green-500';
      case 'good':
        return 'text-blue-500';
      case 'fair':
        return 'text-yellow-500';
      case 'poor':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getHealthBadgeColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'bg-green-500 text-white';
      case 'good':
        return 'bg-blue-500 text-white';
      case 'fair':
        return 'bg-yellow-500 text-white';
      case 'poor':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getRecommendations = (status: BatteryStatus) => {
    const recommendations: string[] = [];
    
    if (status.currentDoD > 80) {
      recommendations.push("⚠️ Reduce depth of discharge below 80% to extend battery life");
    }
    
    if (status.currentSoC < 20) {
      recommendations.push("🔋 Charge battery above 20% to prevent deep discharge damage");
    }
    
    if (status.totalCycles > 1500) {
      recommendations.push("🔧 Consider battery replacement planning - high cycle count detected");
    }
    
    if (status.currentSoC > 95) {
      recommendations.push("⚡ Avoid keeping battery at full charge for extended periods");
    }
    
    if (recommendations.length === 0) {
      recommendations.push("✅ Battery performance is optimal - continue current usage patterns");
    }
    
    return recommendations;
  };

  const batteryStatus = getBatteryStatus();
  const recommendations = getRecommendations(batteryStatus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Battery Management</h1>
          <p className="text-muted-foreground">
            Monitor battery health and optimize charging schedules
          </p>
        </div>
        <Button
          onClick={() => refetchLogs()}
          variant="outline"
          size="sm"
          disabled={isLoadingLogs}
          data-testid="button-refresh-battery"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingLogs ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Battery Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BatteryIcon className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">State of Charge</p>
                <p className="text-2xl font-bold" data-testid="text-soc">
                  {batteryStatus.currentSoC.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingDown className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Depth of Discharge</p>
                <p className="text-2xl font-bold" data-testid="text-dod">
                  {batteryStatus.currentDoD.toFixed(1)}%
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
                <p className="text-sm font-medium text-muted-foreground">Cycle Count</p>
                <p className="text-2xl font-bold" data-testid="text-cycles">
                  {batteryStatus.totalCycles}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className={`w-5 h-5 ${getHealthColor(batteryStatus.healthStatus)}`} />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Health Status</p>
                <Badge className={getHealthBadgeColor(batteryStatus.healthStatus)} data-testid="text-health-status">
                  {batteryStatus.healthStatus}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Battery Visual Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BatteryIcon className="w-5 h-5" />
            <span>Battery Status Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>State of Charge</span>
              <span>{batteryStatus.currentSoC.toFixed(1)}%</span>
            </div>
            <Progress value={batteryStatus.currentSoC} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Depth of Discharge</span>
              <span>{batteryStatus.currentDoD.toFixed(1)}%</span>
            </div>
            <Progress value={batteryStatus.currentDoD} className="h-2" />
          </div>

          {batteryStatus.lastAlert && (
            <div className="flex items-center space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-yellow-800 dark:text-yellow-200">
                {batteryStatus.lastAlert}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add Battery Log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>Log Battery Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="soc-percent">State of Charge (%)</Label>
                <Input
                  id="soc-percent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g., 85.5"
                  value={socPercent}
                  onChange={(e) => setSocPercent(e.target.value)}
                  data-testid="input-soc-percent"
                />
              </div>
              
              <div>
                <Label htmlFor="dod-percent">Depth of Discharge (%)</Label>
                <Input
                  id="dod-percent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g., 15.0"
                  value={dodPercent}
                  onChange={(e) => setDodPercent(e.target.value)}
                  data-testid="input-dod-percent"
                />
              </div>
              
              <div>
                <Label htmlFor="cycle-count">Cycle Count</Label>
                <Input
                  id="cycle-count"
                  type="number"
                  min="0"
                  placeholder="e.g., 500"
                  value={cycleCount}
                  onChange={(e) => setCycleCount(e.target.value)}
                  data-testid="input-cycle-count"
                />
              </div>
              
              <Button
                type="submit"
                disabled={addLogMutation.isPending}
                className="w-full"
                data-testid="button-add-battery-log"
              >
                {addLogMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Logging...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Battery Log
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="w-5 h-5" />
              <span>Optimization Recommendations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((recommendation, index) => (
                <div
                  key={index}
                  className="p-3 border rounded-lg text-sm"
                  data-testid={`recommendation-${index}`}
                >
                  {recommendation}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Battery Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Recent Battery Logs</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingLogs ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              <span>Loading battery logs...</span>
            </div>
          ) : batteryLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BatteryIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No battery logs recorded yet.</p>
              <p className="text-sm">Add your first battery status reading to start monitoring.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {batteryLogs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                  data-testid={`battery-log-${log.id}`}
                >
                  <div className="flex items-center space-x-3">
                    <BatteryIcon className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium">
                        SoC: {log.socPercent}% | DoD: {log.dodPercent}%
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Cycle: {log.cycleCount} {log.alert && `• ${log.alert}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}