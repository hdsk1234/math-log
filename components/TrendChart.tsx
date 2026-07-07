import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendData } from '../types';
import { Card } from './Card';
import { TrendingUp } from 'lucide-react';

interface Props {
  data: TrendData[];
}

export const TrendChart: React.FC<Props> = ({ data }) => {
  const [hiddenKeys, setHiddenKeys] = React.useState<Record<string, boolean>>({
    wake_up: false,
    problem_30: false,
    explanation: false,
  });
  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null);

  const handleLegendClick = (o: any) => {
    const { dataKey } = o;
    setHiddenKeys((prev) => ({
      ...prev,
      [dataKey]: !prev[dataKey],
    }));
  };

  const handleLegendMouseEnter = (o: any) => {
    const { dataKey } = o;
    setHoveredKey(dataKey);
  };

  const handleLegendMouseLeave = () => {
    setHoveredKey(null);
  };

  const getLineOpacity = (dataKey: string) => {
    if (hiddenKeys[dataKey]) return 0;
    if (hoveredKey === null) return 1.0;
    return hoveredKey === dataKey ? 1.0 : 0.15;
  };

  const getLineStrokeWidth = (dataKey: string) => {
    if (hoveredKey === dataKey) return 3.5;
    return 2.5;
  };

  return (
    <Card 
      title="주차별 과제 제출률 추이" 
      icon={<TrendingUp className="text-indigo-600" size={20} />}
    >
      <div className="h-64 w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              dy={10} 
              stroke="#9ca3af"
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tickFormatter={(value) => `${value}%`}
              domain={[0, 100]}
              stroke="#9ca3af"
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '12px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                backgroundColor: '#ffffff'
              }}
              formatter={(value: number) => [`${value}%`, '']}
            />
            <Legend 
              verticalAlign="top" 
              height={36} 
              iconType="circle"
              wrapperStyle={{ paddingTop: '0px' }}
              onClick={handleLegendClick}
              onMouseEnter={handleLegendMouseEnter}
              onMouseLeave={handleLegendMouseLeave}
              formatter={(value, entry) => {
                const { dataKey } = entry as any;
                const isHidden = hiddenKeys[dataKey];
                return (
                  <span className={`cursor-pointer transition-colors select-none ${isHidden ? 'text-gray-300 line-through' : 'text-gray-700 font-bold'}`}>
                    {value}
                  </span>
                );
              }}
            />
            
            {/* Wake-up task line: Solid Blue */}
            <Line 
              name="기상 과제" 
              type="monotone" 
              dataKey="wake_up" 
              stroke="#3b82f6" 
              strokeWidth={getLineStrokeWidth('wake_up')}
              opacity={getLineOpacity('wake_up')}
              activeDot={{ r: 6 }}
              dot={{ r: 4, strokeWidth: 2 }}
              hide={hiddenKeys['wake_up']}
            />
            
            {/* Problem 30 task line: Solid Emerald */}
            <Line 
              name="매일 30문제" 
              type="monotone" 
              dataKey="problem_30" 
              stroke="#10b981" 
              strokeWidth={getLineStrokeWidth('problem_30')}
              opacity={getLineOpacity('problem_30')}
              activeDot={{ r: 6 }}
              dot={{ r: 4, strokeWidth: 2 }}
              hide={hiddenKeys['problem_30']}
            />
            
            {/* Explanation task line: Solid Purple */}
            <Line 
              name="해설 작성" 
              type="monotone" 
              dataKey="explanation" 
              stroke="#8b5cf6" 
              strokeWidth={getLineStrokeWidth('explanation')}
              opacity={getLineOpacity('explanation')}
              activeDot={{ r: 6 }}
              dot={{ r: 4, strokeWidth: 2 }}
              hide={hiddenKeys['explanation']}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-gray-400 text-center mt-3">
        * 범례를 클릭하면 특정 과제 그래프를 켜고 끌 수 있으며, 마우스를 올리면 해당 선이 강조됩니다.
      </p>
    </Card>
  );
};
