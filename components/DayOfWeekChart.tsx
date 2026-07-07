import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card } from './Card';
import { CalendarDays } from 'lucide-react';

interface DayData {
  day: string;
  rate: number;
  totalDays: number;
}

interface Props {
  data: DayData[];
}

export const DayOfWeekChart: React.FC<Props> = ({ data }) => {
  return (
    <Card 
      title="요일별 과제 제출률" 
      icon={<CalendarDays className="text-indigo-600" size={20} />}
    >
      <div className="h-64 w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            barSize={28}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis 
              dataKey="day" 
              axisLine={false} 
              tickLine={false} 
              dy={10} 
              stroke="#9ca3af"
              tick={{ fontSize: 12, fontWeight: 'bold' }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tickFormatter={(value) => `${value}%`}
              domain={[0, 100]}
              stroke="#9ca3af"
            />
            <Tooltip 
              cursor={{ fill: '#f3f4f6', opacity: 0.4 }}
              contentStyle={{ 
                borderRadius: '12px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                backgroundColor: '#ffffff'
              }}
              formatter={(value: number, name, props) => {
                const total = props.payload.totalDays;
                return [`${value}%`, `제출률 (${total}주 기준)`];
              }}
            />
            <Bar 
              dataKey="rate" 
              fill="#6366f1"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
