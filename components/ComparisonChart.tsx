import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ComparisonData } from '../types';
import { Card } from './Card';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  data: ComparisonData[];
  selectedMonth: Date;
  onMonthChange: (month: Date) => void;
  startDate?: string;
}

export const ComparisonChart: React.FC<Props> = ({ data, selectedMonth, onMonthChange, startDate }) => {
  const today = new Date();
  const limit = new Date(today.getFullYear(), today.getMonth(), 1);
  limit.setHours(0, 0, 0, 0);

  const minLimit = React.useMemo(() => {
    let minDate = new Date(today.getFullYear(), today.getMonth() - 11, 1);
    if (startDate) {
      const parts = startDate.split('-').map(Number);
      if (parts.length >= 2) {
        minDate = new Date(parts[0], parts[1] - 1, 1);
      }
    }
    minDate.setHours(0, 0, 0, 0);
    return minDate;
  }, [startDate]);

  const selectedCompare = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
  selectedCompare.setHours(0, 0, 0, 0);

  const isPrevDisabled = selectedCompare <= minLimit;
  const isNextDisabled = selectedCompare >= limit;

  const handlePrevMonth = () => {
    if (isPrevDisabled) return;
    const prev = new Date(selectedMonth);
    prev.setMonth(prev.getMonth() - 1);
    onMonthChange(prev);
  };

  const handleNextMonth = () => {
    if (isNextDisabled) return;
    const next = new Date(selectedMonth);
    next.setMonth(next.getMonth() + 1);
    onMonthChange(next);
  };

  const year2Digit = String(selectedMonth.getFullYear()).slice(-2);
  const monthLabel = `${year2Digit}년 ${selectedMonth.getMonth() + 1}월`;

  return (
    <Card
      title={
        <div className="flex items-center gap-1 text-sm font-bold text-gray-800">
          <button
            onClick={handlePrevMonth}
            disabled={isPrevDisabled}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="이전 달"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="select-none px-0.5">
            {monthLabel} 과제 제출률
          </span>
          <button
            onClick={handleNextMonth}
            disabled={isNextDisabled}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="다음 달"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      }
      icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>}
    >
      {/* Custom Legend */}
      <div className="flex justify-end gap-3 text-[11px] font-bold text-gray-500 mb-3 px-1">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#4f46e5]" />
          <span>나의 제출률</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#cbd5e1]" />
          <span>상위권 평균</span>
        </div>
      </div>

      <div className="h-60 w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            barSize={20}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="category" axisLine={false} tickLine={false} dy={10} />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${value}%`}
              domain={[0, 100]}
            />
            <Tooltip
              cursor={{ fill: '#f3f4f6' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              formatter={(value: number) => [`${value}%`, '']}
            />
            <Bar dataKey="student" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            <Bar dataKey="average" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-gray-500 text-center mt-2">* 상위 10% 학생들과 비교합니다.</p>
    </Card>
  );
};
