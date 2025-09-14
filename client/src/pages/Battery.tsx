import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Battery as BatteryIcon, 
  TrendingDown,
  AlertTriangle, 
  CheckCircle, 
  Activity,
  Plus,
  RefreshCw,
  Zap,
  Clock,
  Settings,
  Database
} from 'lucide-react';
import { SimulationToggle } from '@/components/SimulationToggle';
import { apiRequest } from '@/lib/queryClient';
import type { BatteryLog, Household, InsertBatteryLog } from '@shared/schema';
import { insertBatteryLogSchema } from '@shared/schema';
import { z } from 'zod';

interface BatteryStatus {
  currentSoC: number;
  currentDoD: number;
  totalCycles: number;
  healthStatus: 'excellent' | 'good' | 'fair' | 'poor';
  lastAlert?: string;
}

interface BatterySchedule {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  targetSoC: number;
  maxDoD: number;
  enabled: boolean;
  daysOfWeek: string[];
}

// Form schema with validation
const batteryFormSchema = insertBatteryLogSchema.extend({
  socPercent: z.coerce.number().min(0, 'SoC must be positive').max(100, 'SoC cannot exceed 100%'),
  dodPercent: z.coerce.number().min(0, 'DoD must be positive').max(100, 'DoD cannot exceed 100%'),
  cycleCount: z.coerce.number().min(0, 'Cycle count must be positive'),
}).omit({ userId: true, timestamp: true });

const scheduleFormSchema = z.object({
  name: z.string().min(1, 'Schedule name is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  targetSoC: z.coerce.number().min(0, 'Target SoC must be positive').max(100, 'Target SoC cannot exceed 100%'),
  maxDoD: z.coerce.number().min(0, 'Max DoD must be positive').max(100, 'Max DoD cannot exceed 100%'),
  enabled: z.boolean(),
  daysOfWeek: z.array(z.string()).min(1, 'Select at least one day'),
});

export default function Battery() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form setup
  const form = useForm({
    resolver: zodResolver(batteryFormSchema),
    defaultValues: {
      socPercent: 0,
      dodPercent: 0,
      cycleCount: 0,
    },
  });

  const scheduleForm = useForm({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      name: '',
      startTime: '',
      endTime: '',
      targetSoC: 80,
      maxDoD: 30,
      enabled: true,
      daysOfWeek: [],
    },
  });

  // Fetch user's households
  const { 
    data: households = [], 
    isLoading: isLoadingHouseholds,
    error: householdsError,
    refetch: refetchHouseholds 
  } = useQuery<Household[]>({
    queryKey: ['/api/households'],
    enabled: !!user,
  });

  // Fetch main battery status (live data)
  const { 
    data: mainBatteryStatus, 
    isLoading: isLoadingMainBattery,
    error: mainBatteryError,
    refetch: refetchMainBattery 
  } = useQuery<any>({
    queryKey: ['/api/main-battery'],
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds for live data
  });

  // Fetch battery logs (for manual entry history)
  const { 
    data: batteryLogsRaw = [], 
    isLoading: isLoadingLogs,
    error: batteryLogsError,
    refetch: refetchLogs 
  } = useQuery<BatteryLog[]>({
    queryKey: ['/api/battery'],
    enabled: !!user,
  });

  // Fetch schedules from API
  const { 
    data: schedules = [], 
    isLoading: isLoadingSchedules,
    error: schedulesError,
    refetch: refetchSchedules 
  } = useQuery<any[]>({
    queryKey: ['/api/schedule'],
    enabled: !!user,
  });

  // Sort battery logs by timestamp desc to ensure latest entry is first
  const batteryLogs = [...batteryLogsRaw].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Add battery log mutation
  const addLogMutation = useMutation({
    mutationFn: async (data: InsertBatteryLog) => {
      return apiRequest('/api/battery', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Battery Log Added",
        description: "Battery status has been recorded and analyzed.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/battery'] });
      queryClient.invalidateQueries({ queryKey: ['/api/main-battery'] });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add battery log",
        variant: "destructive",
      });
    },
  });

  // Add schedule mutation
  const addScheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      const scheduleData = {
        start_time: data.startTime,
        end_time: data.endTime,
        action: `${data.name} - Target SoC: ${data.targetSoC}%, Max DoD: ${data.maxDoD}%`
      };
      return apiRequest('/api/schedule', 'POST', scheduleData);
    },
    onSuccess: () => {
      toast({
        title: "Schedule Added",
        description: "Battery charging schedule has been created.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/schedule'] });
      scheduleForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add schedule",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to add battery logs.",
        variant: "destructive",
      });
      return;
    }

    addLogMutation.mutate({
      ...data,
      timestamp: new Date(),
    });
  };

  const onScheduleSubmit = (data: any) => {
    addScheduleMutation.mutate(data);
  };

  // Note: These functions are currently display-only since the backend doesn't support update/delete
  const toggleSchedule = (id: string) => {
    toast({
      title: "Feature Coming Soon",
      description: "Schedule editing will be available in a future update.",
      variant: "default",
    });
  };

  const deleteSchedule = (id: string) => {
    toast({
      title: "Feature Coming Soon", 
      description: "Schedule deletion will be available in a future update.",
      variant: "default",
    });
  };

  const getBatteryStatus = (): BatteryStatus => {
    // Use live main battery data if available
    if (mainBatteryStatus) {
      return {
        currentSoC: mainBatteryStatus.stateOfCharge,
        currentDoD: mainBatteryStatus.depthOfDischarge,
        totalCycles: mainBatteryStatus.cycleCount,
        healthStatus: mainBatteryStatus.health,
        lastAlert: mainBatteryStatus.alert || undefined,
      };
    }

    // Fallback to battery logs if main battery data is not available
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
        <div className="flex space-x-2">
          <Button
            onClick={() => {
              refetchHouseholds();
              refetchLogs();
              refetchMainBattery();
            }}
            variant="outline"
            size="sm"
            disabled={isLoadingLogs || isLoadingHouseholds || isLoadingMainBattery}
            data-testid="button-refresh-data"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${(isLoadingLogs || isLoadingHouseholds || isLoadingMainBattery) ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Error States */}
      {householdsError && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-4">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-destructive" />
              <p className="text-destructive font-medium">Failed to load households</p>
              <p className="text-sm text-muted-foreground mb-4">{householdsError.message}</p>
              <Button 
                onClick={() => refetchHouseholds()} 
                variant="outline" 
                size="sm"
                data-testid="button-retry-households"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {mainBatteryError && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-4">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-destructive" />
              <p className="text-destructive font-medium">Failed to load main battery status</p>
              <p className="text-sm text-muted-foreground mb-4">{mainBatteryError.message}</p>
              <Button 
                onClick={() => refetchMainBattery()} 
                variant="outline" 
                size="sm"
                data-testid="button-retry-main-battery"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {batteryLogsError && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-4">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-destructive" />
              <p className="text-destructive font-medium">Failed to load battery logs</p>
              <p className="text-sm text-muted-foreground mb-4">{batteryLogsError.message}</p>
              <Button 
                onClick={() => refetchLogs()} 
                variant="outline" 
                size="sm"
                data-testid="button-retry-battery-logs"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Simulation Toggle */}
      <SimulationToggle 
        type="battery"
        onDataGenerated={() => {
          // Refresh the data when new simulated data is generated
          refetchLogs();
        }}
      />

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
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BatteryIcon className="w-5 h-5" />
              <span>Battery Status Overview</span>
            </div>
            <div className="flex items-center space-x-2">
              {mainBatteryStatus ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <Activity className="w-3 h-3 mr-1" />
                  Live Data
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  <Database className="w-3 h-3 mr-1" />
                  Manual Logs
                </Badge>
              )}
              {isLoadingMainBattery && (
                <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>
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
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="socPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State of Charge (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="e.g., 85.5"
                          data-testid="input-soc-percent"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="dodPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Depth of Discharge (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="e.g., 15.0"
                          data-testid="input-dod-percent"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="cycleCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cycle Count</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="e.g., 500"
                          data-testid="input-cycle-count"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
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
            </Form>
          </CardContent>
        </Card>

        {/* Battery Scheduling */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Battery Scheduling</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...scheduleForm}>
              <form onSubmit={scheduleForm.handleSubmit(onScheduleSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={scheduleForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Schedule Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Morning Charge"
                            data-testid="input-schedule-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={scheduleForm.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 pt-6">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-schedule-enabled"
                          />
                        </FormControl>
                        <FormLabel>Enabled</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={scheduleForm.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            data-testid="input-start-time"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={scheduleForm.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            data-testid="input-end-time"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={scheduleForm.control}
                    name="targetSoC"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target SoC (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="e.g., 80"
                            data-testid="input-target-soc"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={scheduleForm.control}
                    name="maxDoD"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max DoD (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="e.g., 30"
                            data-testid="input-max-dod"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <Button
                  type="submit"
                  className="w-full"
                  data-testid="button-add-schedule"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Schedule
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Active Schedules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Active Schedules</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No schedules configured yet.</p>
              <p className="text-sm">Add a schedule above to start optimizing your battery usage.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`schedule-item-${schedule.id}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="font-medium">{schedule.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {schedule.startTime} - {schedule.endTime} | Target: {schedule.targetSoC}% | Max DoD: {schedule.maxDoD}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {schedule.daysOfWeek?.join(', ') || 'No days specified'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={schedule.enabled}
                      onCheckedChange={() => toggleSchedule(schedule.id)}
                      data-testid={`switch-schedule-${schedule.id}`}
                    />
                    <Badge variant={schedule.enabled ? "default" : "secondary"}>
                      {schedule.enabled ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteSchedule(schedule.id)}
                      data-testid={`button-delete-schedule-${schedule.id}`}
                    >
                      <AlertTriangle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
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

      {/* Recent Battery Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Recent Battery Logs</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {batteryLogsError ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-destructive" />
              <p className="text-destructive font-medium">Failed to load battery logs</p>
              <p className="text-sm text-muted-foreground mb-4">{batteryLogsError.message}</p>
              <Button 
                onClick={() => refetchLogs()} 
                variant="outline" 
                size="sm"
                data-testid="button-retry-logs"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : isLoadingLogs ? (
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