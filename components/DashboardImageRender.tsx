import React from 'react';
import { StudentData } from '../types';

export interface StudentStats {
  id: string;
  name: string;
  grade: string;
  school: string;
  isFavorite: boolean;
  overallRate: number;
  wakeUpRate: number;
  problem30Rate: number;
  explanationRate: number;
  completedTasks: number;
  totalTasks: number;
  activeDays: number;
  totalExplanationCount?: number;
  rank?: number;
}

interface DashboardImageRenderProps {
  students: StudentData[];
  calculatedRankings: StudentStats[];
  dateStrings: string[];
  range: { start: Date; end: Date };
  period: 'weekly' | 'monthly' | 'yearly';
  targetDate?: Date;
  id?: string;
  sortBy?: 'rate' | 'name';
}

export const DashboardImageRender: React.FC<DashboardImageRenderProps> = ({
  students,
  calculatedRankings,
  dateStrings,
  range,
  period,
  targetDate,
  id = 'dashboard-image-export',
  sortBy = 'name',
}) => {
  const formatDateRangeString = () => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const format = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일(${days[d.getDay()]})`;
    return `${format(range.start)} ~ ${format(range.end)}`;
  };

  const todayMidnight = new Date(targetDate || new Date());
  todayMidnight.setHours(0, 0, 0, 0);

  // 날짜별 요일 문자열(약어) 배열
  const dayLabels = dateStrings.map(dateStr => {
    const d = new Date(dateStr);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return days[d.getDay()];
  });

  const getTaskDetails = (studentId: string, dateStr: string, taskType: 'wake_up' | 'problem_30' | 'explanation') => {
    const student = students.find(s => s.id === studentId);
    if (!student) return { status: 'none', count: 0 };

    const studentStart = student.profile.startDate ? new Date(student.profile.startDate) : null;
    if (studentStart) studentStart.setHours(0, 0, 0, 0);
    const studentEnd = student.profile.endDate ? new Date(student.profile.endDate) : null;
    if (studentEnd) studentEnd.setHours(0, 0, 0, 0);

    const currentDate = new Date(dateStr);
    currentDate.setHours(0, 0, 0, 0);

    const isAfterStart = studentStart ? currentDate >= studentStart : true;
    const isBeforeEnd = studentEnd ? currentDate <= studentEnd : true;
    const isBeforeOrEqualToday = currentDate <= todayMidnight;

    if (!isBeforeOrEqualToday) {
      return { status: 'future', count: 0 };
    }

    if (!(isAfterStart && isBeforeEnd)) {
      return { status: 'none', count: 0 };
    }

    const daily = student.homework?.find(h => h.date === dateStr);
    const task = daily?.tasks?.find(t => t.type === taskType);
    const count = task?.count || (task?.completed ? 1 : 0);

    return {
      status: task?.completed ? 'done' : 'missed',
      count
    };
  };

  const renderStatusDot = (status: 'none' | 'done' | 'missed' | 'future') => {
    if (status === 'done') {
      return (
        <div className="w-[18px] h-[18px] rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 shadow-sm border border-blue-600">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      );
    } else if (status === 'missed') {
      return (
        <div className="w-[18px] h-[18px] rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 border border-red-200">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>
      );
    } else if (status === 'future') {
      return (
        <div className="w-[18px] h-[18px] flex-shrink-0" />
      );
    } else {
      return (
        <div className="w-[18px] h-[18px] rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-200">
          <div className="w-1.5 h-0.5 bg-gray-300 rounded-full"></div>
        </div>
      );
    }
  };

  const renderDailyTaskGrid = (studentId: string, taskType: 'wake_up' | 'problem_30' | 'explanation') => {
    return (
      <div className="flex gap-1 justify-center items-center">
        {dateStrings.map((dateStr) => {
          const { status, count } = getTaskDetails(studentId, dateStr, taskType);
          
          if (taskType === 'explanation') {
            if (status === 'future') {
              return (
                <div key={dateStr} className="w-[18px] h-[18px] flex-shrink-0" />
              );
            }
            if (status === 'none') {
              return (
                <div key={dateStr} className="w-5 h-5 rounded bg-gray-100 text-gray-300 flex items-center justify-center text-xs font-bold border border-gray-200">
                  -
                </div>
              );
            }
            if (count > 0) {
              return (
                <div key={dateStr} className="w-5 h-5 rounded bg-purple-50 text-purple-700 flex items-center justify-center text-xs font-black border border-purple-200">
                  {count}
                </div>
              );
            } else {
              return (
                <div key={dateStr} className="w-5 h-5 rounded bg-gray-50 text-gray-400 flex items-center justify-center text-xs font-bold border border-gray-200">
                  0
                </div>
              );
            }
          }

          return (
            <div key={dateStr} className="flex flex-col items-center gap-1">
              {renderStatusDot(status)}
            </div>
          );
        })}
      </div>
    );
  };

  const isWeekly = dateStrings.length <= 7;

  return (
    <div id={id} className="bg-white text-gray-900 w-[1000px] rounded-2xl p-8 border border-gray-200" style={{ fontFamily: '"Pretendard", sans-serif' }}>
      {/* Header */}
      <div className="flex justify-between items-end border-b-2 border-gray-900 pb-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
            <span className="text-indigo-600">❗</span>
            과제 체크 표
            <span className="text-xl text-gray-500 font-bold ml-2">({period === 'weekly' ? '주간' : period === 'monthly' ? '월간' : '연간'})</span>
          </h1>
          <p className="text-gray-600 mt-2 font-bold text-sm tracking-wide">
            [기상 / 30문제 / 해설] 집계 범위: {formatDateRangeString()}
          </p>
        </div>
        <div className="text-right flex-shrink-0 whitespace-nowrap">
          <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-sm font-black border border-gray-200">
            기준일: {todayMidnight.getFullYear()}.{String(todayMidnight.getMonth() + 1).padStart(2, '0')}.{String(todayMidnight.getDate()).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-300 shadow-sm">
        <table className="w-full text-center border-collapse bg-white">
          <thead className="bg-gray-50 border-b-2 border-gray-300">
            <tr>
              <th className="py-3 px-4 font-black text-gray-700 w-16">{sortBy === 'rate' ? '순위' : ''}</th>
              <th className="py-3 px-4 font-black text-gray-700 text-left w-32">학생</th>
              <th className="py-3 px-2 font-black text-gray-700">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-blue-600">기상</span>
                  {isWeekly && (
                    <div className="flex gap-1 text-[10px] text-gray-400 mt-1">
                      {dayLabels.map((l, i) => <span key={i} className="w-[18px] text-center inline-block">{l}</span>)}
                    </div>
                  )}
                </div>
              </th>
              <th className="py-3 px-2 font-black text-gray-700">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-emerald-600">30문제</span>
                  {isWeekly && (
                    <div className="flex gap-1 text-[10px] text-gray-400 mt-1">
                      {dayLabels.map((l, i) => <span key={i} className="w-[18px] text-center inline-block">{l}</span>)}
                    </div>
                  )}
                </div>
              </th>
              <th className="py-3 px-2 font-black text-gray-700">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-purple-600">해설</span>
                  {isWeekly && (
                    <div className="flex gap-1 text-[10px] text-gray-400 mt-1">
                      {dayLabels.map((l, i) => <span key={i} className="w-[18px] text-center inline-block">{l}</span>)}
                    </div>
                  )}
                </div>
              </th>
              <th className="py-3 px-4 font-black text-gray-700 w-28">제출률</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {calculatedRankings.map((item, index) => (
              <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                <td className="py-3 px-4 text-sm font-black text-gray-500">
                  {sortBy === 'rate' ? (
                    item.rank === 1 ? <span className="text-xl">🥇</span> :
                    item.rank === 2 ? <span className="text-xl">🥈</span> :
                    item.rank === 3 ? <span className="text-xl">🥉</span> :
                    item.rank
                  ) : ''}
                </td>
                <td className="py-3 px-4 text-left">
                  <div className="font-extrabold text-gray-900 text-base">{item.name}</div>
                </td>
                <td className="py-3 px-2 align-middle">
                  {isWeekly ? (
                    renderDailyTaskGrid(item.id, 'wake_up')
                  ) : (
                    <div className="font-black text-blue-600">{item.wakeUpRate}%</div>
                  )}
                </td>
                <td className="py-3 px-2 align-middle">
                  {isWeekly ? (
                    renderDailyTaskGrid(item.id, 'problem_30')
                  ) : (
                    <div className="font-black text-emerald-600">{item.problem30Rate}%</div>
                  )}
                </td>
                <td className="py-3 px-2 align-middle">
                  {isWeekly ? (
                    renderDailyTaskGrid(item.id, 'explanation')
                  ) : (
                    <div className="font-black text-purple-600">
                      {item.explanationRate}% ({item.totalExplanationCount || 0}개)
                    </div>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="inline-flex items-center justify-center bg-gray-900 text-white rounded-full px-4 py-1.5 font-black text-sm w-16">
                    {item.overallRate}%
                  </div>
                </td>
              </tr>
            ))}
            {calculatedRankings.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center font-bold text-gray-400">
                  해당 기간에 등록된 학생이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Footer / Legend */}
      {isWeekly && (
        <div className="mt-6 flex justify-end items-center gap-4 text-xs font-bold text-gray-500">
          <div className="flex items-center gap-1.5">
            {renderStatusDot('done')} <span className="pt-0.5">완료</span>
          </div>
          <div className="flex items-center gap-1.5">
            {renderStatusDot('missed')} <span className="pt-0.5">미완료</span>
          </div>
          <div className="flex items-center gap-1.5">
            {renderStatusDot('none')} <span className="pt-0.5">대상아님(휴식/미등록)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-purple-50 text-purple-700 flex items-center justify-center text-xs font-black border border-purple-200">1</div>
            <span className="pt-0.5">해설 작성 개수</span>
          </div>
        </div>
      )}
    </div>
  );
};
