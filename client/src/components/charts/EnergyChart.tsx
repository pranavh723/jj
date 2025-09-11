import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';

interface EnergyData {
  time: string;
  solar: number;
  grid: number;
}

interface EnergyChartProps {
  data: EnergyData[];
}

export function EnergyChart({ data }: EnergyChartProps) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="time" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft' }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="solar"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="hsl(var(--primary))"
            fillOpacity={0.1}
            name="Solar Generation"
            dot={{ fill: "hsl(var(--primary))", r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="grid"
            stroke="hsl(var(--secondary))"
            strokeWidth={2}
            fill="hsl(var(--secondary))"
            fillOpacity={0.1}
            name="Grid Consumption"
            dot={{ fill: "hsl(var(--secondary))", r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
