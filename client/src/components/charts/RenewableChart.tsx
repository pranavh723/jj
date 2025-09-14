import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

interface RenewableData {
  name: string;
  value: number;
  color: string;
}

interface RenewableChartProps {
  solarPercentage: number;
  gridPercentage: number;
}

export function RenewableChart({ solarPercentage, gridPercentage }: RenewableChartProps) {
  const data: RenewableData[] = [
    {
      name: 'Solar Energy',
      value: solarPercentage,
      color: '#F59E0B'
    },
    {
      name: 'Grid Energy',
      value: gridPercentage,
      color: '#EF4444'
    }
  ];

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={14}
        fontWeight={600}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={CustomLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
