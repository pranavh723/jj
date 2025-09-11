import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Zap, 
  Plus, 
  Edit2, 
  Trash2, 
  Clock, 
  Power,
  WashingMachine, 
  Droplets, 
  Car, 
  Microwave,
  Lightbulb,
  Tv,
  Wind,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const deviceSchema = z.object({
  name: z.string().min(1, 'Device name is required'),
  typicalKwh: z.number().min(0.01, 'Power consumption must be greater than 0'),
  flexible: z.boolean().default(true),
  minDurationHours: z.number().min(0.1).max(24).default(1),
  earliestHour: z.number().min(0).max(23).default(6),
  latestHour: z.number().min(0).max(23).default(22),
  householdId: z.string().min(1, 'Household is required'),
});

type DeviceFormData = z.infer<typeof deviceSchema>;

const deviceIcons = {
  'washing machine': WashingMachine,
  'washer': WashingMachine,
  'water heater': Droplets,
  'heater': Droplets,
  'ev charging': Car,
  'car': Car,
  'microwave': Microwave,
  'oven': Microwave,
  'lights': Lightbulb,
  'lighting': Lightbulb,
  'tv': Tv,
  'television': Tv,
  'ac': Wind,
  'air conditioner': Wind,
  'default': Zap
};

function getDeviceIcon(deviceName: string) {
  const key = deviceName.toLowerCase();
  for (const [name, icon] of Object.entries(deviceIcons)) {
    if (key.includes(name)) return icon;
  }
  return deviceIcons.default;
}

function formatHour(hour: number) {
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${h}:00 ${suffix}`;
}

export default function Devices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<string | null>(null);
  const [selectedHousehold, setSelectedHousehold] = useState<string>('');

  // Fetch households
  const { data: households = [] } = useQuery({
    queryKey: ['/api/households'],
  });

  // Set first household as default
  React.useEffect(() => {
    if (households.length > 0 && !selectedHousehold) {
      setSelectedHousehold(households[0].id);
    }
  }, [households, selectedHousehold]);

  // Fetch devices for selected household
  const { 
    data: devices = [], 
    isLoading: isLoadingDevices,
    error: devicesError 
  } = useQuery({
    queryKey: ['/api/devices', selectedHousehold],
    queryFn: () => api.getDevices(selectedHousehold),
    enabled: !!selectedHousehold,
  });

  const form = useForm<DeviceFormData>({
    resolver: zodResolver(deviceSchema),
    defaultValues: {
      name: '',
      typicalKwh: 1.5,
      flexible: true,
      minDurationHours: 1,
      earliestHour: 6,
      latestHour: 22,
      householdId: selectedHousehold,
    },
  });

  // Update form household when selection changes
  React.useEffect(() => {
    form.setValue('householdId', selectedHousehold);
  }, [selectedHousehold, form]);

  // Create device mutation
  const createDeviceMutation = useMutation({
    mutationFn: (data: DeviceFormData) => api.createDevice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices', selectedHousehold] });
      form.reset();
      setIsAddDialogOpen(false);
      toast({
        title: "Device added successfully",
        description: "The device has been added and is ready for energy optimization.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add device",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete device mutation
  const deleteDeviceMutation = useMutation({
    mutationFn: (deviceId: string) => api.deleteDevice(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices', selectedHousehold] });
      toast({
        title: "Device removed",
        description: "The device has been successfully removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove device",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DeviceFormData) => {
    if (data.latestHour <= data.earliestHour) {
      toast({
        title: "Invalid time range",
        description: "Latest hour must be after earliest hour.",
        variant: "destructive",
      });
      return;
    }
    createDeviceMutation.mutate(data);
  };

  const handleDeleteDevice = (deviceId: string, deviceName: string) => {
    if (confirm(`Are you sure you want to remove "${deviceName}"?`)) {
      deleteDeviceMutation.mutate(deviceId);
    }
  };

  if (households.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No households configured</h3>
          <p className="text-muted-foreground mb-4">
            You need to set up a household before adding devices.
          </p>
          <Button data-testid="button-setup-household">
            Set up household
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Device Management</h1>
          <p className="text-muted-foreground">
            Manage your household devices for optimal energy scheduling and automation.
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

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-device">
                <Plus className="w-4 h-4 mr-2" />
                Add Device
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Device</DialogTitle>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Device Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., WashingMachine Machine" 
                            {...field} 
                            data-testid="input-device-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="typicalKwh"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Power Consumption (kWh per cycle)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1"
                            placeholder="1.5" 
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                            data-testid="input-power-consumption"
                          />
                        </FormControl>
                        <FormDescription>
                          Average energy consumed per use cycle
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="flexible"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Flexible scheduling</FormLabel>
                          <FormDescription>
                            Allow automatic scheduling for optimal energy usage
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-flexible"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch('flexible') && (
                    <>
                      <FormField
                        control={form.control}
                        name="minDurationHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Duration (hours)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.1"
                                min="0.1"
                                max="24"
                                {...field}
                                onChange={e => field.onChange(parseFloat(e.target.value))}
                                data-testid="input-min-duration"
                              />
                            </FormControl>
                            <FormDescription>
                              How long the device needs to run
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name="earliestHour"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Earliest Start</FormLabel>
                              <Select 
                                value={field.value.toString()} 
                                onValueChange={v => field.onChange(parseInt(v))}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-earliest-hour">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Array.from({length: 24}, (_, i) => (
                                    <SelectItem key={i} value={i.toString()}>
                                      {formatHour(i)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="latestHour"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Latest Start</FormLabel>
                              <Select 
                                value={field.value.toString()} 
                                onValueChange={v => field.onChange(parseInt(v))}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-latest-hour">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Array.from({length: 24}, (_, i) => (
                                    <SelectItem key={i} value={i.toString()}>
                                      {formatHour(i)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}

                  <div className="flex space-x-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setIsAddDialogOpen(false)}
                      data-testid="button-cancel-device"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1"
                      disabled={createDeviceMutation.isPending}
                      data-testid="button-save-device"
                    >
                      {createDeviceMutation.isPending ? 'Adding...' : 'Add Device'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoadingDevices ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-8 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded"></div>
              </div>
            </Card>
          ))}
        </div>
      ) : devicesError ? (
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to load devices</h3>
          <p className="text-muted-foreground">
            {devicesError.message}
          </p>
        </Card>
      ) : devices.length === 0 ? (
        <Card className="p-8 text-center">
          <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No devices added yet</h3>
          <p className="text-muted-foreground mb-4">
            Start by adding your household devices to get personalized energy recommendations.
          </p>
          <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-first-device">
            <Plus className="w-4 h-4 mr-2" />
            Add your first device
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map((device: any) => {
            const DeviceIcon = getDeviceIcon(device.name);
            return (
              <Card key={device.id} className="card-hover">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <DeviceIcon className="text-primary w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg" data-testid={`text-device-name-${device.id}`}>
                          {device.name}
                        </CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          {device.flexible ? (
                            <Badge variant="secondary" className="text-xs" data-testid={`badge-flexible-${device.id}`}>
                              Flexible
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs" data-testid={`badge-fixed-${device.id}`}>
                              Fixed Schedule
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingDevice(device.id)}
                        data-testid={`button-edit-device-${device.id}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDevice(device.id, device.name)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-delete-device-${device.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Power className="text-muted-foreground w-4 h-4" />
                    <span className="text-sm text-muted-foreground">Power:</span>
                    <span className="text-sm font-medium" data-testid={`text-power-consumption-${device.id}`}>
                      {device.typicalKwh} kWh
                    </span>
                  </div>

                  {device.flexible && (
                    <>
                      <div className="flex items-center space-x-2">
                        <Clock className="text-muted-foreground w-4 h-4" />
                        <span className="text-sm text-muted-foreground">Duration:</span>
                        <span className="text-sm font-medium" data-testid={`text-duration-${device.id}`}>
                          {device.minDurationHours}h
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Clock className="text-muted-foreground w-4 h-4" />
                        <span className="text-sm text-muted-foreground">Schedule:</span>
                        <span className="text-sm font-medium" data-testid={`text-schedule-${device.id}`}>
                          {formatHour(device.earliestHour)} - {formatHour(device.latestHour)}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      {device.flexible 
                        ? 'Available for smart scheduling and optimization'
                        : 'Runs on fixed schedule, not optimized automatically'
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Device Statistics */}
      {devices.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Zap className="text-primary w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-total-devices">
                    {devices.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Devices</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
                  <Clock className="text-secondary w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-flexible-devices">
                    {devices.filter((d: any) => d.flexible).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Flexible Devices</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                  <Power className="text-accent w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-total-consumption">
                    {devices.reduce((sum: number, d: any) => sum + d.typicalKwh, 0).toFixed(1)} kWh
                  </p>
                  <p className="text-sm text-muted-foreground">Total Consumption</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
