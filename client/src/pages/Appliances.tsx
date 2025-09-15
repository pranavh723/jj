import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Cpu, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Plus,
  RefreshCw
} from 'lucide-react';
import { SimulationToggle } from '@/components/SimulationToggle';
import { apiRequest } from '@/lib/queryClient';
import type { ApplianceReading, ApplianceAnomaly, InsertApplianceReading } from '@shared/schema';
import { insertApplianceReadingSchema } from '@shared/schema';
import { z } from 'zod';

interface AnomalyWithReading extends ApplianceAnomaly {
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
    queryKey: ['/api/readings'],
    enabled: !!user,
  });

  // Fetch appliance anomalies
  const { 
    data: anomalies = [], 
    isLoading: isLoadingAnomalies,
    error: anomaliesError,
    refetch: refetchAnomalies 
  } = useQuery<AnomalyWithReading[]>({
    queryKey: ['/api/anomalies'],
    enabled: !!user,
  });

  // Add appliance reading mutation
  const addReadingMutation = useMutation({
    mutationFn: async (data: InsertApplianceReading) => {
      return apiRequest('/api/readings', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Reading Added",
        description: "Appliance power reading has been recorded and analyzed for anomalies.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/readings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/anomalies'] });
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

  const getApplianceStats = () => {
    const total = anomalies.length;
    const critical = anomalies.filter(a => a.severity === 'critical').length;
    const warnings = anomalies.filter(a => a.severity === 'warning').length;
    const normal = anomalies.filter(a => a.severity === 'normal').length;
    
    return { total, critical, warnings, normal };
  };

  const stats = getApplianceStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">AI Appliance Monitor</h1>
          <p className="text-muted-foreground">
            Monitor your appliances and detect power consumption anomalies using AI
          </p>
        </div>
        <Button
          onClick={() => refetchAnomalies()}
          variant="outline"
          size="sm"
          disabled={isLoadingAnomalies}
          data-testid="button-refresh-anomalies"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingAnomalies ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Simulation Toggle */}
      <SimulationToggle 
        type="appliance"
        onDataGenerated={() => {
          // Refresh the data when new simulated data is generated
          refetchReadings();
          refetchAnomalies();
        }}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Anomalies</p>
                <p className="text-2xl font-bold" data-testid="text-total-anomalies">{stats.total}</p>
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

      {/* Anomalies List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Recent Anomaly Detections</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {anomaliesError ? (
            <div className="text-center py-8 text-destructive">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
              <p>Failed to load anomalies</p>
              <p className="text-sm">{anomaliesError.message}</p>
              <Button 
                onClick={() => refetchAnomalies()} 
                variant="outline" 
                size="sm" 
                className="mt-2"
                data-testid="button-retry-anomalies"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : isLoadingAnomalies ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              <span>Loading anomalies...</span>
            </div>
          ) : anomalies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Cpu className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No anomalies detected yet.</p>
              <p className="text-sm">Add some appliance readings to start monitoring.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {anomalies.slice(0, 3).map((anomaly) => (
                <div
                  key={anomaly.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`anomaly-item-${anomaly.id}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getSeverityIcon(anomaly.severity)}
                      <div>
                        <p className="font-medium">
                          {anomaly.applianceReading?.applianceName || 'Unknown Appliance'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {anomaly.anomalyType}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {anomaly.applianceReading?.powerWatts || 0}W
                    </span>
                    <Badge className={getSeverityColor(anomaly.severity)}>
                      {anomaly.severity}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(anomaly.timestamp).toLocaleString()}
                    </span>
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