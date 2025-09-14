import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip, Area, AreaChart } from 'recharts';

interface EnergyData {
  time: string;
  solar: number;
  grid: number;
  temperature?: number;
  cloudCover?: number;
}

interface EnergyChartProps {
  data: EnergyData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-foreground mb-2">{`Time: ${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value.toFixed(2)} kW`}
          </p>
        ))}
        {payload[0]?.payload?.temperature && (
          <p className="text-xs text-muted-foreground mt-1">
            {`Temp: ${payload[0].payload.temperature.toFixed(1)}°C`}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export function EnergyChart({ data }: EnergyChartProps) {
  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="solarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--neon-blue)" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="var(--neon-blue)" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="gridGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--neon-orange)" stopOpacity={0.6}/>
              <stop offset="95%" stopColor="var(--neon-orange)" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
          <XAxis 
            dataKey="time" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            axisLine={false}
            tickLine={false}
            label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            iconType="line"
            wrapperStyle={{ paddingTop: '20px' }}
          />
          <Area
            type="monotone"
            dataKey="solar"
            stroke="var(--neon-blue)"
            strokeWidth={3}
            fill="url(#solarGradient)"
            name="Solar Generation"
            dot={false}
            activeDot={false}
            animationDuration={1500}
            animationEasing="ease-out"
          />
          <Area
            type="monotone"
            dataKey="grid"
            stroke="var(--neon-orange)"
            strokeWidth={2}
            fill="url(#gridGradient)"
            name="Grid Consumption"
            dot={false}
            activeDot={false}
            animationDuration={1800}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
