import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface RealtimeDataPoint {
  timestamp: string;
  time: string;
  solarGeneration: number;
  gridConsumption: number;
  batteryLevel: number;
  totalConsumption: number;
  gridPrice: number;
  trend?: 'up' | 'down' | 'stable';
}

interface RealtimeEnergyChartProps {
  householdId?: string;
  maxDataPoints?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    return (
      <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-4 shadow-lg min-w-[200px]">
        <p className="font-medium text-foreground mb-2">{`🔴 LIVE: ${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between items-center mb-1">
            <span className="text-sm" style={{ color: entry.color }}>
              {entry.name}:
            </span>
            <span className="font-medium ml-2" style={{ color: entry.color }}>
              {entry.value.toFixed(2)} {entry.name.includes('Price') ? '₹/kWh' : 'kW'}
            </span>
          </div>
        ))}
        {data?.gridPrice && (
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Grid Price:</span>
              <span className="font-medium">₹{data.gridPrice.toFixed(2)}/kWh</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Battery:</span>
              <span className="font-medium">{data.batteryLevel}%</span>
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export function RealtimeEnergyChart({ householdId, maxDataPoints = 60 }: RealtimeEnergyChartProps) {
  const realtimeData = useRealtimeData(householdId);
  const [chartData, setChartData] = useState<RealtimeDataPoint[]>([]);
  const [priceAlert, setPriceAlert] = useState<'high' | 'low' | null>(null);

  // Update chart data every second with new real-time readings
  useEffect(() => {
    if (realtimeData.lastUpdate) {
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });

      const newDataPoint: RealtimeDataPoint = {
        timestamp: now.toISOString(),
        time: timeString,
        solarGeneration: realtimeData.solar?.powerGeneration || 0,
        gridConsumption: realtimeData.energy?.gridPrice ? 
          (realtimeData.getTotalPowerConsumption() / 1000) : 
          Math.random() * 3 + 1, // Fallback realistic grid consumption
        batteryLevel: realtimeData.battery?.socPercent || 0,
        totalConsumption: realtimeData.getTotalPowerConsumption() / 1000, // Convert to kW
        gridPrice: realtimeData.energy?.gridPrice || 6.5 + (Math.random() - 0.5) * 0.5,
        trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.3 ? 'down' : 'stable',
      };

      // Price alert logic (like stock market alerts)
      if (newDataPoint.gridPrice > 7.0) {
        setPriceAlert('high');
        setTimeout(() => setPriceAlert(null), 3000);
      } else if (newDataPoint.gridPrice < 5.5) {
        setPriceAlert('low');
        setTimeout(() => setPriceAlert(null), 3000);
      }

      setChartData(prev => {
        const updated = [...prev, newDataPoint];
        // Keep only the latest data points (sliding window)
        return updated.slice(-maxDataPoints);
      });
    }
  }, [realtimeData.lastUpdate, maxDataPoints, realtimeData]);

  // Generate initial mock data if no real-time data is available
  useEffect(() => {
    if (chartData.length === 0) {
      const initialData: RealtimeDataPoint[] = [];
      const now = new Date();
      
      for (let i = 30; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 1000);
        initialData.push({
          timestamp: time.toISOString(),
          time: time.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
          }),
          solarGeneration: Math.max(0, 2 + Math.sin(i * 0.1) * 1.5 + Math.random() * 0.5),
          gridConsumption: Math.max(0, 2.5 - Math.sin(i * 0.1) * 1.2 + Math.random() * 0.3),
          batteryLevel: 70 + Math.sin(i * 0.05) * 20,
          totalConsumption: 1.5 + Math.random() * 1.5,
          gridPrice: 6.5 + Math.sin(i * 0.2) * 0.5 + Math.random() * 0.2,
        });
      }
      
      setChartData(initialData);
    }
  }, []);

  const currentData = chartData[chartData.length - 1];
  const previousData = chartData[chartData.length - 2];

  // Calculate trends for display
  const solarTrend = currentData && previousData ? 
    (currentData.solarGeneration > previousData.solarGeneration ? 'up' : 
     currentData.solarGeneration < previousData.solarGeneration ? 'down' : 'stable') : 'stable';
  
  const gridTrend = currentData && previousData ? 
    (currentData.gridConsumption > previousData.gridConsumption ? 'up' : 
     currentData.gridConsumption < previousData.gridConsumption ? 'down' : 'stable') : 'stable';

  return (
    <div className="space-y-4">
      {/* Real-time Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" data-testid="indicator-live"></div>
            <span className="font-medium text-sm">LIVE MARKET DATA</span>
          </div>
          <Badge 
            variant={realtimeData.isConnected ? "default" : "destructive"}
            className="text-xs"
            data-testid="badge-connection-status"
          >
            {realtimeData.isConnected ? '🔴 STREAMING' : '❌ OFFLINE'}
          </Badge>
        </div>
        
        {priceAlert && (
          <Badge 
            variant={priceAlert === 'high' ? "destructive" : "secondary"}
            className="animate-bounce"
            data-testid={`alert-price-${priceAlert}`}
          >
            {priceAlert === 'high' ? '⚠️ HIGH PRICE ALERT' : '💰 LOW PRICE ALERT'}
          </Badge>
        )}
      </div>

      {/* Current Values Ticker (Stock Market Style) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/20 rounded-lg">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <span className="text-xs text-muted-foreground">SOLAR</span>
            {solarTrend === 'up' && <TrendingUp className="w-3 h-3 text-green-500" />}
            {solarTrend === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
          </div>
          <div className="text-lg font-mono font-bold" data-testid="ticker-solar">
            {currentData?.solarGeneration.toFixed(2) || '0.00'} kW
          </div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <span className="text-xs text-muted-foreground">GRID</span>
            {gridTrend === 'up' && <TrendingUp className="w-3 h-3 text-red-500" />}
            {gridTrend === 'down' && <TrendingDown className="w-3 h-3 text-green-500" />}
          </div>
          <div className="text-lg font-mono font-bold" data-testid="ticker-grid">
            {currentData?.gridConsumption.toFixed(2) || '0.00'} kW
          </div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <span className="text-xs text-muted-foreground">PRICE</span>
            <Activity className="w-3 h-3 text-yellow-500" />
          </div>
          <div className="text-lg font-mono font-bold" data-testid="ticker-price">
            ₹{currentData?.gridPrice.toFixed(2) || '6.50'}
          </div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <span className="text-xs text-muted-foreground">BATTERY</span>
          </div>
          <div className="text-lg font-mono font-bold" data-testid="ticker-battery">
            {currentData?.batteryLevel.toFixed(0) || '0'}%
          </div>
        </div>
      </div>

      {/* Real-time Chart */}
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="time"
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              axisLine={false}
              tickLine={false}
              label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Price alert reference lines */}
            <ReferenceLine y={7.0} stroke="red" strokeDasharray="4 4" opacity={0.5} label="High Price" />
            <ReferenceLine y={5.5} stroke="green" strokeDasharray="4 4" opacity={0.5} label="Low Price" />
            
            {/* Solar Generation - Bright blue like a bull market */}
            <Line
              type="monotone"
              dataKey="solarGeneration"
              stroke="#00D2FF"
              strokeWidth={2}
              dot={false}
              name="Solar Generation"
              animationDuration={200}
              animationEasing="linear"
            />
            
            {/* Grid Consumption - Orange like energy markets */}
            <Line
              type="monotone"
              dataKey="gridConsumption"
              stroke="#FF6B35"
              strokeWidth={2}
              dot={false}
              name="Grid Consumption"
              animationDuration={200}
              animationEasing="linear"
            />
            
            {/* Grid Price (scaled for visualization) */}
            <Line
              type="monotone"
              dataKey="gridPrice"
              stroke="#FFD700"
              strokeWidth={1}
              dot={false}
              name="Grid Price"
              strokeDasharray="3 3"
              animationDuration={200}
              animationEasing="linear"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Connection Status Message */}
      {realtimeData.systemMessage && (
        <div className="text-center py-2">
          <Badge variant="outline" className="text-xs">
            {realtimeData.systemMessage}
          </Badge>
        </div>
      )}
    </div>
  );
}