import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Home, Zap, DollarSign, Leaf, Plus, Edit2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const householdSchema = z.object({
  name: z.string().min(1, 'Household name is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  pvKw: z.number().min(0).max(100),
  tilt: z.number().min(0).max(90).default(30),
  azimuth: z.number().min(0).max(360).default(180),
  tariffPerKwh: z.number().min(0).max(50).default(5.0),
  tariffCurrency: z.string().default('INR'),
  co2FactorKgPerKwh: z.number().min(0).max(2).default(0.82),
});

type HouseholdFormData = z.infer<typeof householdSchema>;

export default function HouseholdSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingHousehold, setEditingHousehold] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('existing');

  // Fetch existing households
  const { data: households = [], isLoading } = useQuery({
    queryKey: ['/api/households'],
  });

  // Set tab based on whether user has households
  useEffect(() => {
    if (households.length === 0 && activeTab === 'existing') {
      setActiveTab('new');
    }
  }, [households, activeTab]);

  const form = useForm<HouseholdFormData>({
    resolver: zodResolver(householdSchema),
    defaultValues: {
      name: '',
      latitude: 19.0760, // Mumbai coordinates
      longitude: 72.8777,
      pvKw: 5.0,
      tilt: 30,
      azimuth: 180,
      tariffPerKwh: 5.0,
      tariffCurrency: 'INR',
      co2FactorKgPerKwh: 0.82,
    },
  });

  // Create household mutation
  const createHouseholdMutation = useMutation({
    mutationFn: (data: HouseholdFormData) => api.createHousehold(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/households'] });
      form.reset();
      setActiveTab('existing');
      toast({
        title: "Household created successfully",
        description: "Your household has been set up and is ready for energy optimization.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create household",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: HouseholdFormData) => {
    createHouseholdMutation.mutate(data);
  };

  // Auto-detect location
  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          form.setValue('latitude', position.coords.latitude);
          form.setValue('longitude', position.coords.longitude);
          toast({
            title: "Location detected",
            description: "Your coordinates have been automatically filled.",
          });
        },
        (error) => {
          toast({
            title: "Location detection failed",
            description: "Please enter your coordinates manually.",
            variant: "destructive",
          });
        }
      );
    } else {
      toast({
        title: "Geolocation not supported",
        description: "Please enter your coordinates manually.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-20 bg-muted rounded"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Household Setup</h1>
        <p className="text-muted-foreground">
          Configure your household details for accurate energy management and recommendations.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="existing" data-testid="tab-existing-households">
            Existing Households ({households.length})
          </TabsTrigger>
          <TabsTrigger value="new" data-testid="tab-new-household">
            Add New Household
          </TabsTrigger>
        </TabsList>

        <TabsContent value="existing" className="space-y-6">
          {households.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Home className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No households configured</h3>
                <p className="text-muted-foreground mb-4">
                  Set up your first household to start optimizing your renewable energy usage.
                </p>
                <Button onClick={() => setActiveTab('new')} data-testid="button-setup-first-household">
                  <Plus className="w-4 h-4 mr-2" />
                  Set up household
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {households.map((household: any) => (
                <Card key={household.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Home className="text-primary w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground" data-testid={`text-household-name-${household.id}`}>
                          {household.name}
                        </h3>
                        <p className="text-sm text-muted-foreground" data-testid={`text-household-location-${household.id}`}>
                          {household.latitude.toFixed(4)}, {household.longitude.toFixed(4)}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingHousehold(household.id)}
                        data-testid={`button-edit-household-${household.id}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center space-x-2">
                      <Zap className="text-accent w-4 h-4" />
                      <div>
                        <p className="text-sm font-medium" data-testid={`text-pv-capacity-${household.id}`}>
                          {household.pvKw} kW
                        </p>
                        <p className="text-xs text-muted-foreground">Solar Capacity</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <DollarSign className="text-primary w-4 h-4" />
                      <div>
                        <p className="text-sm font-medium" data-testid={`text-tariff-${household.id}`}>
                          ₹{household.tariffPerKwh}/kWh
                        </p>
                        <p className="text-xs text-muted-foreground">Electricity Rate</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Leaf className="text-green-600 w-4 h-4" />
                      <div>
                        <p className="text-sm font-medium" data-testid={`text-co2-factor-${household.id}`}>
                          {household.co2FactorKgPerKwh} kg/kWh
                        </p>
                        <p className="text-xs text-muted-foreground">CO₂ Factor</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <MapPin className="text-secondary w-4 h-4" />
                      <div>
                        <p className="text-sm font-medium" data-testid={`text-panel-angle-${household.id}`}>
                          {household.tilt}° / {household.azimuth}°
                        </p>
                        <p className="text-xs text-muted-foreground">Tilt / Azimuth</p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="new" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="w-5 h-5" />
                <span>Add New Household</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center space-x-2">
                      <Home className="w-5 h-5" />
                      <span>Basic Information</span>
                    </h3>
                    
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Household Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="My Home" 
                              {...field} 
                              data-testid="input-household-name"
                            />
                          </FormControl>
                          <FormDescription>
                            A friendly name for your household (e.g., "Main House", "Flat 203")
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold flex items-center space-x-2">
                        <MapPin className="w-5 h-5" />
                        <span>Location</span>
                      </h3>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={detectLocation}
                        data-testid="button-detect-location"
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        Auto-detect
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="latitude"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Latitude</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="any"
                                placeholder="19.0760"
                                {...field}
                                onChange={e => field.onChange(parseFloat(e.target.value))}
                                data-testid="input-latitude"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="longitude"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Longitude</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="any"
                                placeholder="72.8777"
                                {...field}
                                onChange={e => field.onChange(parseFloat(e.target.value))}
                                data-testid="input-longitude"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Solar System Configuration */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center space-x-2">
                      <Zap className="w-5 h-5" />
                      <span>Solar System</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="pvKw"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>System Capacity (kW)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.1"
                                placeholder="5.0"
                                {...field}
                                onChange={e => field.onChange(parseFloat(e.target.value))}
                                data-testid="input-pv-capacity"
                              />
                            </FormControl>
                            <FormDescription>Total installed solar capacity</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tilt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Panel Tilt (degrees)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                max="90"
                                placeholder="30"
                                {...field}
                                onChange={e => field.onChange(parseFloat(e.target.value))}
                                data-testid="input-panel-tilt"
                              />
                            </FormControl>
                            <FormDescription>Angle from horizontal (30° recommended)</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="azimuth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Panel Azimuth (degrees)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                max="360"
                                placeholder="180"
                                {...field}
                                onChange={e => field.onChange(parseFloat(e.target.value))}
                                data-testid="input-panel-azimuth"
                              />
                            </FormControl>
                            <FormDescription>Direction (180° = South)</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Economic Parameters */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center space-x-2">
                      <DollarSign className="w-5 h-5" />
                      <span>Economic & Environmental</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="tariffPerKwh"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Electricity Tariff (₹/kWh)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.1"
                                placeholder="5.0"
                                {...field}
                                onChange={e => field.onChange(parseFloat(e.target.value))}
                                data-testid="input-tariff"
                              />
                            </FormControl>
                            <FormDescription>Your electricity rate</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tariffCurrency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-currency">
                                  <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="INR">INR (₹)</SelectItem>
                                <SelectItem value="USD">USD ($)</SelectItem>
                                <SelectItem value="EUR">EUR (€)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="co2FactorKgPerKwh"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CO₂ Factor (kg/kWh)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                placeholder="0.82"
                                {...field}
                                onChange={e => field.onChange(parseFloat(e.target.value))}
                                data-testid="input-co2-factor"
                              />
                            </FormControl>
                            <FormDescription>Grid emission factor (0.82 for India)</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-6">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setActiveTab('existing')}
                      data-testid="button-cancel-household"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createHouseholdMutation.isPending}
                      data-testid="button-create-household"
                    >
                      {createHouseholdMutation.isPending ? 'Creating...' : 'Create Household'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
