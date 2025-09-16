import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Cpu, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Plus,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { ApplianceReading, ApplianceAnomaly, InsertApplianceReading, Household } from '@shared/schema';
import { insertApplianceReadingSchema } from '@shared/schema';
import { z } from 'zod';

interface DeviceStatusWithReading extends ApplianceAnomaly {
  applianceReading: ApplianceReading;
}

// Form schema with validation
const applianceFormSchema = insertApplianceReadingSchema.extend({
  powerWatts: z.coerce.number().min(0, 'Power consumption must be positive'),
  applianceName: z.string().min(1, 'Appliance name is required'),
}).omit({ userId: true, timestamp: true });

export default function Appliances() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedHousehold, setSelectedHousehold] = useState<string>('');
  
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

  // Form setup
  const form = useForm({
    resolver: zodResolver(applianceFormSchema),
    defaultValues: {
      applianceName: '',
      powerWatts: 0,
    },
  });

  // Fetch appliance readings
  const { 
    data: readings = [], 
    isLoading: isLoadingReadings,
    error: readingsError,
    refetch: refetchReadings 
  } = useQuery<ApplianceReading[]>({
    queryKey: ['/api/readings', selectedHousehold],
    queryFn: async () => {
      const url = selectedHousehold 
        ? `/api/readings?household_id=${selectedHousehold}`
        : '/api/readings';
      const response = await apiRequest(url);
      return response.json();
    },
    enabled: !!user && !!selectedHousehold,
  });

  // Fetch appliance device status
  const { 
    data: deviceStatusData = [], 
    isLoading: isLoadingDeviceStatus,
    error: deviceStatusError,
    refetch: refetchDeviceStatus 
  } = useQuery<DeviceStatusWithReading[]>({
    queryKey: ['/api/anomalies', selectedHousehold],
    queryFn: async () => {
      const url = selectedHousehold 
        ? `/api/anomalies?household_id=${selectedHousehold}`
        : '/api/anomalies';
      const response = await apiRequest(url);
      return response.json();
    },
    enabled: !!user && !!selectedHousehold,
  });

  // Add appliance reading mutation
  const addReadingMutation = useMutation({
    mutationFn: async (data: InsertApplianceReading) => {
      return apiRequest('/api/readings', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Reading Added",
        description: "Appliance power reading has been recorded and device status analyzed.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/readings', selectedHousehold] });
      queryClient.invalidateQueries({ queryKey: ['/api/anomalies', selectedHousehold] });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add appliance reading",
        variant: "destructive",
      });
    },
  });

  // Delete appliance reading mutation
  const deleteReadingMutation = useMutation({
    mutationFn: async (readingId: string) => {
      return apiRequest(`/api/readings/${readingId}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "Reading Deleted",
        description: "The appliance reading has been successfully removed.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/readings', selectedHousehold] });
      queryClient.invalidateQueries({ queryKey: ['/api/anomalies', selectedHousehold] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete appliance reading",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    addReadingMutation.mutate({
      ...data,
      timestamp: new Date(),
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-destructive text-destructive-foreground';
      case 'warning':
        return 'bg-yellow-500 text-white';
      case 'normal':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      case 'normal':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Cpu className="w-4 h-4" />;
    }
  };

  // Group devices by their latest status
  const getDevicesByLatestStatus = () => {
    if (!deviceStatusData || deviceStatusData.length === 0) {
      return { normal: [], warning: [], critical: [] };
    }

    // Group by appliance name and get latest status for each device
    const deviceMap = new Map();
    
    deviceStatusData.forEach((status: any) => {
      const deviceName = status.applianceReading?.applianceName || 'Unknown Device';
      const timestamp = new Date(status.timestamp).getTime();
      
      if (!deviceMap.has(deviceName) || deviceMap.get(deviceName).timestamp < timestamp) {
        deviceMap.set(deviceName, {
          name: deviceName,
          severity: status.severity,
          timestamp: timestamp,
          powerWatts: status.applianceReading?.powerWatts || 0
        });
      }
    });

    // Group by severity
    const groupedDevices = { normal: [], warning: [], critical: [] };
    
    deviceMap.forEach((device) => {
      if (device.severity === 'normal') {
        groupedDevices.normal.push(device);
      } else if (device.severity === 'warning') {
        groupedDevices.warning.push(device);
      } else if (device.severity === 'critical') {
        groupedDevices.critical.push(device);
      }
    });

    return groupedDevices;
  };

  const getDeviceStatusStats = () => {
    const devicesByStatus = getDevicesByLatestStatus();
    const critical = devicesByStatus.critical.length;
    const warnings = devicesByStatus.warning.length;
    const normal = devicesByStatus.normal.length;
    const total = critical + warnings + normal;
    
    return { total, critical, warnings, normal };
  };

  const devicesByStatus = getDevicesByLatestStatus();

  const stats = getDeviceStatusStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">AI Appliance Monitor</h1>
          <p className="text-muted-foreground">
            Monitor your appliances and track device status using AI-powered analysis
          </p>
        </div>
        <div className="flex items-center gap-4">
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
          <Button
            onClick={() => refetchDeviceStatus()}
            variant="outline"
            size="sm"
            disabled={isLoadingDeviceStatus}
            data-testid="button-refresh-device-status"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingDeviceStatus ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>


      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Devices</p>
                <p className="text-2xl font-bold" data-testid="text-total-devices">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Issues</p>
                <p className="text-2xl font-bold text-red-500" data-testid="text-critical-issues">{stats.critical}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Warnings</p>
                <p className="text-2xl font-bold text-yellow-500" data-testid="text-warnings">{stats.warnings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Normal</p>
                <p className="text-2xl font-bold text-green-500" data-testid="text-normal-readings">{stats.normal}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Readings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Recent Appliance Readings</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {readingsError ? (
            <div className="text-center py-8 text-destructive">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
              <p>Failed to load readings</p>
              <p className="text-sm">{readingsError.message}</p>
              <Button 
                onClick={() => refetchReadings()} 
                variant="outline" 
                size="sm" 
                className="mt-2"
                data-testid="button-retry-readings"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : isLoadingReadings ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              <span>Loading readings...</span>
            </div>
          ) : readings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Cpu className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No appliance readings yet.</p>
              <p className="text-sm">Add your first reading below to start monitoring.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Appliance</th>
                    <th className="text-left p-3">Power (W)</th>
                    <th className="text-left p-3">Timestamp</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {readings.slice(0, 20).map((reading) => (
                    <tr key={reading.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium" data-testid={`reading-name-${reading.id}`}>
                        {reading.applianceName}
                      </td>
                      <td className="p-3" data-testid={`reading-power-${reading.id}`}>
                        {reading.powerWatts}W
                      </td>
                      <td className="p-3 text-muted-foreground" data-testid={`reading-time-${reading.id}`}>
                        {new Date(reading.timestamp).toLocaleString()}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteReadingMutation.mutate(reading.id)}
                          disabled={deleteReadingMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          data-testid={`button-delete-reading-${reading.id}`}
                        >
                          {deleteReadingMutation.isPending ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Reading Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>Add Appliance Reading</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <FormField
                control={form.control}
                name="applianceName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Appliance Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Refrigerator, AC, Washing Machine"
                        data-testid="input-appliance-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="powerWatts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Power Consumption (Watts)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 150"
                        data-testid="input-power-watts"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={addReadingMutation.isPending}
                data-testid="button-add-reading"
              >
                {addReadingMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Reading
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Device Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Device Status Overview</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Monitor the health and performance status of your appliances
          </p>
        </CardHeader>
        <CardContent>
          {deviceStatusError ? (
            <div className="text-center py-8 text-destructive">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
              <p>Failed to load device status</p>
              <p className="text-sm">{deviceStatusError.message}</p>
              <Button 
                onClick={() => refetchDeviceStatus()} 
                variant="outline" 
                size="sm" 
                className="mt-2"
                data-testid="button-retry-device-status"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : isLoadingDeviceStatus ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              <span>Loading device status...</span>
            </div>
          ) : deviceStatusData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Cpu className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No devices monitored yet.</p>
              <p className="text-sm">Add some appliance readings to start monitoring device status.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Normal Status Card */}
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Normal Operation</p>
                      <p className="text-3xl font-bold text-green-600" data-testid="text-normal-count">
                        {devicesByStatus.normal.length}
                      </p>
                      <p className="text-xs text-muted-foreground">devices running smoothly</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <span className="text-green-600 font-medium">Optimal</span>
                    </div>
                    {devicesByStatus.normal.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground mb-2">Devices:</p>
                        <div className="flex flex-wrap gap-1">
                          {devicesByStatus.normal.slice(0, 4).map((device, index) => (
                            <Badge key={index} variant="secondary" className="text-xs bg-green-100 text-green-800" data-testid={`device-normal-${index}`}>
                              {device.name}
                            </Badge>
                          ))}
                          {devicesByStatus.normal.length > 4 && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                              +{devicesByStatus.normal.length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Warning Status Card */}
              <Card className="border-l-4 border-l-yellow-500">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                      <AlertTriangle className="w-8 h-8 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Needs Attention</p>
                      <p className="text-3xl font-bold text-yellow-600" data-testid="text-warning-count">
                        {devicesByStatus.warning.length}
                      </p>
                      <p className="text-xs text-muted-foreground">devices need monitoring</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <span className="text-yellow-600 font-medium">Monitor</span>
                    </div>
                    {devicesByStatus.warning.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground mb-2">Devices:</p>
                        <div className="flex flex-wrap gap-1">
                          {devicesByStatus.warning.slice(0, 4).map((device, index) => (
                            <Badge key={index} variant="secondary" className="text-xs bg-yellow-100 text-yellow-800" data-testid={`device-warning-${index}`}>
                              {device.name}
                            </Badge>
                          ))}
                          {devicesByStatus.warning.length > 4 && (
                            <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                              +{devicesByStatus.warning.length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Critical Status Card */}
              <Card className="border-l-4 border-l-red-500">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                      <AlertTriangle className="w-8 h-8 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Critical Issues</p>
                      <p className="text-3xl font-bold text-red-600" data-testid="text-critical-count">
                        {devicesByStatus.critical.length}
                      </p>
                      <p className="text-xs text-muted-foreground">devices need immediate action</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <span className="text-red-600 font-medium">Urgent</span>
                    </div>
                    {devicesByStatus.critical.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground mb-2">Devices:</p>
                        <div className="flex flex-wrap gap-1">
                          {devicesByStatus.critical.slice(0, 4).map((device, index) => (
                            <Badge key={index} variant="secondary" className="text-xs bg-red-100 text-red-800" data-testid={`device-critical-${index}`}>
                              {device.name}
                            </Badge>
                          ))}
                          {devicesByStatus.critical.length > 4 && (
                            <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
                              +{devicesByStatus.critical.length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}