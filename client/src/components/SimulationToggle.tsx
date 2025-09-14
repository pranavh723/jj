import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Pause, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface SimulationToggleProps {
  type: 'appliance' | 'battery' | 'analytics';
  onDataGenerated?: (data: any) => void;
}

export function SimulationToggle({ type, onDataGenerated }: SimulationToggleProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [dataCount, setDataCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const startSimulation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setIsRunning(true);
    setDataCount(0);

    // Fetch and ingest data every 5 seconds
    intervalRef.current = setInterval(async () => {
      try {
        let mockData;
        let endpoint;

        // Get mock data based on type
        switch (type) {
          case 'appliance':
            mockData = await fetch('/api/mock/appliance').then(res => res.json());
            endpoint = '/api/readings';
            break;
          case 'battery':
            mockData = await fetch('/api/mock/battery').then(res => res.json());
            endpoint = '/api/battery';
            break;
          case 'analytics':
            // For analytics, we might want both appliance and battery data
            mockData = await fetch('/api/mock/appliance').then(res => res.json());
            endpoint = '/api/readings';
            break;
          default:
            return;
        }

        // Save the data using the appropriate API endpoint
        if (endpoint && mockData) {
          try {
            await apiRequest(endpoint, 'POST', mockData);
            setDataCount(prev => prev + 1);
            
            // Notify parent component of new data
            if (onDataGenerated) {
              onDataGenerated(mockData);
            }
          } catch (error) {
            console.error('Error saving simulated data:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching mock data:', error);
      }
    }, 5000); // 5 seconds

    toast({
      title: "Simulation Started",
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} data simulation is now running`,
    });
  };

  const stopSimulation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);

    toast({
      title: "Simulation Stopped",
      description: `Generated ${dataCount} simulated data points`,
    });
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleToggle = () => {
    if (isRunning) {
      stopSimulation();
    } else {
      startSimulation();
    }
  };

  return (
    <Card className="border-2 border-dashed border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {isRunning ? (
                <Activity className="w-5 h-5 text-green-500 animate-pulse" />
              ) : (
                <Play className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium text-sm">
                  {type.charAt(0).toUpperCase() + type.slice(1)} Simulation
                </p>
                <p className="text-xs text-muted-foreground">
                  {isRunning 
                    ? `Running - ${dataCount} data points generated` 
                    : 'Generate live mock data every 5 seconds'
                  }
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Switch
              checked={isRunning}
              onCheckedChange={handleToggle}
              data-testid={`switch-simulation-${type}`}
            />
            <Button
              onClick={handleToggle}
              variant={isRunning ? "destructive" : "default"}
              size="sm"
              data-testid={`button-simulation-${type}`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}