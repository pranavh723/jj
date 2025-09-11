import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, Cloud, CloudRain } from 'lucide-react';

interface HourlyForecast {
  time: string;
  solarIntensity: number; // 0-1
  power: string;
  condition: 'sunny' | 'cloudy' | 'rainy';
}

interface WeatherForecastProps {
  forecasts: HourlyForecast[];
  peakPower: string;
  totalGeneration: string;
}

function getWeatherIcon(condition: string) {
  switch (condition) {
    case 'sunny': return Sun;
    case 'cloudy': return Cloud;
    case 'rainy': return CloudRain;
    default: return Sun;
  }
}

function getIntensityWidth(intensity: number) {
  return `${Math.max(10, intensity * 100)}%`;
}

export function WeatherForecast({ forecasts, peakPower, totalGeneration }: WeatherForecastProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">24h Solar Forecast</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {forecasts.map((forecast, index) => {
            const WeatherIcon = getWeatherIcon(forecast.condition);
            return (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span 
                    className="text-sm text-muted-foreground w-12" 
                    data-testid={`text-time-${index}`}
                  >
                    {forecast.time}
                  </span>
                  <WeatherIcon className="text-accent text-sm w-4 h-4" />
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-muted rounded-full h-2">
                    <div 
                      className="bg-accent h-2 rounded-full" 
                      style={{ width: getIntensityWidth(forecast.solarIntensity) }}
                      data-testid={`bar-intensity-${index}`}
                    />
                  </div>
                  <span 
                    className="text-sm font-medium w-12 text-right" 
                    data-testid={`text-power-${index}`}
                  >
                    {forecast.power}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Today's Peak:</span>
            <span className="font-medium text-foreground" data-testid="text-peak-power">
              {peakPower}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-muted-foreground">Total Generation:</span>
            <span className="font-medium text-foreground" data-testid="text-total-generation">
              {totalGeneration}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
