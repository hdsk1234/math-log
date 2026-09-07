import React, { useState, useMemo } from 'react';
import { StudentData } from '../types';
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  UserMinus, 
  Calendar, 
  TrendingUp, 
  Filter,
  CheckCircle2,
  XCircle,
  Search
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

interface AdminStudentStatsProps {
  students: StudentData[];
  isLoading: boolean;
}

type PeriodOption = 'all' | '1y' | '6m' | '3m' | '1m';
type GranularityOption = 'daily' | 'monthly';

// Helper to normalize date strings (YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD, ISO strings)
const parseDateString = (dateStr?: string): Date | null => {
  if (!dateStr || !dateStr.trim()) return null;
  const cleanStr = dateStr.trim().replace(/[\.\/]/g, '-');
  const d = new Date(cleanStr);
  return isNaN(d.getTime()) ? null : d;
};

const formatDateToISO = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatDateToMonth = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
};

export const AdminStudentStats: React.FC<AdminStudentStatsProps> = ({ students, isLoading }) => {
  const [period, setPeriod] = useState<PeriodOption>('6m');
  const [granularity, setGranularity] = useState<GranularityOption>('daily');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'ended'>('all');

  const todayStr = useMemo(() => formatDateToISO(new Date()), []);
  const todayDate = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  // 1. Process student start / end dates
  const studentPeriods = useMemo(() => {
    return students.map((s) => {
      const start = parseDateString(s.profile?.startDate);
      const end = parseDateString(s.profile?.endDate);

      // Start date normalization (set to beginning of day)
      if (start) start.setHours(0, 0, 0, 0);
      
      // End date normalization (set to end of day)
      if (end) end.setHours(23, 59, 59, 999);

      // Active status check (as of today)
      const isStarted = start ? start <= todayDate : true;
      const isNotEnded = !end || end >= new Date(new Date().setHours(0, 0, 0, 0));
      const isActive = isStarted && isNotEnded;

      return {
        id: s.id,
        name: s.profile?.name || '이름 없음',
        school: s.profile?.school || '',
        grade: s.profile?.grade || '',
        startDate: s.profile?.startDate || '',
        endDate: s.profile?.endDate || '',
        startObj: start,
        endObj: end,
        isActive,
      };
    });
  }, [students, todayDate]);

  // 2. High-level Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalCount = studentPeriods.length;
    const activeCount = studentPeriods.filter((s) => s.isActive).length;

    // Recent 30 days window
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const newStudentsCount = studentPeriods.filter(
      (s) => s.startObj && s.startObj >= thirtyDaysAgo && s.startObj <= todayDate
    ).length;

    const endedStudentsCount = studentPeriods.filter(
      (s) => s.endObj && s.endObj >= thirtyDaysAgo && s.endObj <= todayDate
    ).length;

    return {
      totalCount,
      activeCount,
      newStudentsCount,
      endedStudentsCount,
    };
  }, [studentPeriods, todayDate]);

  // 3. Time Series Data for Line Chart
  const chartData = useMemo(() => {
    if (studentPeriods.length === 0) return [];

    // Find earliest start date among students or fallback to default window
    let earliestDate: Date | null = null;
    studentPeriods.forEach((s) => {
      if (s.startObj) {
        if (!earliestDate || s.startObj < earliestDate) {
          earliestDate = new Date(s.startObj);
        }
      }
    });

    const now = new Date();
    now.setHours(23, 59, 59, 999);

    // Calculate startDate based on PeriodOption filter
    let startDateLimit = new Date();
    if (period === '1m') {
      startDateLimit.setDate(now.getDate() - 30);
    } else if (period === '3m') {
      startDateLimit.setMonth(now.getMonth() - 3);
    } else if (period === '6m') {
      startDateLimit.setMonth(now.getMonth() - 6);
    } else if (period === '1y') {
      startDateLimit.setFullYear(now.getFullYear() - 1);
    } else {
      // 'all'
      startDateLimit = earliestDate || new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    }
    startDateLimit.setHours(0, 0, 0, 0);

    const endDateLimit = new Date(now);

    const points: { dateStr: string; label: string; activeCount: number; newCount: number; endedCount: number }[] = [];

    if (granularity === 'daily') {
      const curr = new Date(startDateLimit);
      while (curr <= endDateLimit) {
        const dateISO = formatDateToISO(curr);
        const dayStart = new Date(curr);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(curr);
        dayEnd.setHours(23, 59, 59, 999);

        let activeCount = 0;
        let newCount = 0;
        let endedCount = 0;

        studentPeriods.forEach((s) => {
          // Active on dayEnd check
          const startedBeforeOrOnDay = !s.startObj || s.startObj <= dayEnd;
          const endedAfterOrOnDay = !s.endObj || s.endObj >= dayStart;

          if (startedBeforeOrOnDay && endedAfterOrOnDay) {
            activeCount++;
          }

          // New join on this day
          if (s.startObj && s.startObj >= dayStart && s.startObj <= dayEnd) {
            newCount++;
          }

          // Ended on this day
          if (s.endObj && s.endObj >= dayStart && s.endObj <= dayEnd) {
            endedCount++;
          }
        });

        // Label formatting: M/D or YYYY-MM-DD
        const month = curr.getMonth() + 1;
        const day = curr.getDate();
        const label = `${month}/${day}`;

        points.push({
          dateStr: dateISO,
          label,
          activeCount,
          newCount,
          endedCount,
        });

        // Increment 1 day
        curr.setDate(curr.getDate() + 1);
      }
    } else {
      // Monthly granularity
      const curr = new Date(startDateLimit.getFullYear(), startDateLimit.getMonth(), 1);
      while (curr <= endDateLimit) {
        const monthISO = formatDateToMonth(curr);
        const monthStart = new Date(curr.getFullYear(), curr.getMonth(), 1, 0, 0, 0, 0);
        
        // Month end: last day of month or today if current month
        const isCurrentMonth = curr.getFullYear() === now.getFullYear() && curr.getMonth() === now.getMonth();
        const monthEnd = isCurrentMonth 
          ? new Date(now) 
          : new Date(curr.getFullYear(), curr.getMonth() + 1, 0, 23, 59, 59, 999);

        let activeCount = 0;
        let newCount = 0;
        let endedCount = 0;

        studentPeriods.forEach((s) => {
          // Active as of monthEnd
          const started = !s.startObj || s.startObj <= monthEnd;
          const notEnded = !s.endObj || s.endObj >= monthStart;

          if (started && notEnded) {
            activeCount++;
          }

          if (s.startObj && s.startObj >= monthStart && s.startObj <= monthEnd) {
            newCount++;
          }

          if (s.endObj && s.endObj >= monthStart && s.endObj <= monthEnd) {
            endedCount++;
          }
        });

        const label = `${curr.getFullYear()}.${String(curr.getMonth() + 1).padStart(2, '0')}`;

        points.push({
          dateStr: monthISO,
          label,
          activeCount,
          newCount,
          endedCount,
        });

        curr.setMonth(curr.getMonth() + 1);
      }
    }

    return points;
  }, [studentPeriods, period, granularity]);

  // Filtered Student List
  const filteredStudents = useMemo(() => {
    return studentPeriods.filter((s) => {
      const matchesSearch = 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.school.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.grade.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = 
        statusFilter === 'all' ? true :
        statusFilter === 'active' ? s.isActive :
        !s.isActive;

      return matchesSearch && matchesStatus;
    });
  }, [studentPeriods, searchQuery, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
        <span>수업 통계 데이터를 불러오는 중입니다...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <UserCheck size={24} />
          </div>
          <div>
            <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">현재 수업 중 학생</p>
            <h2 className="text-2xl font-black text-gray-900 mt-0.5">{summaryMetrics.activeCount}명</h2>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">전체 등록 학생</p>
            <h2 className="text-2xl font-black text-gray-900 mt-0.5">{summaryMetrics.totalCount}명</h2>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserPlus size={24} />
          </div>
          <div>
            <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">최근 30일 신규 수강</p>
            <h2 className="text-2xl font-black text-emerald-600 mt-0.5">+{summaryMetrics.newStudentsCount}명</h2>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-rose-50 text-rose-600 rounded-xl">
            <UserMinus size={24} />
          </div>
          <div>
            <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">최근 30일 수업 종료</p>
            <h2 className="text-2xl font-black text-rose-500 mt-0.5">-{summaryMetrics.endedStudentsCount}명</h2>
          </div>
        </div>
      </div>

      {/* 2. Chart Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="text-indigo-600" size={22} />
              <h3 className="text-lg font-extrabold text-gray-900">날짜별 수업 중인 학생 수 추이</h3>
            </div>
            <p className="text-xs text-gray-400 mt-1">학생별 수업 시작일(startDate) 및 종료일(endDate) 기준 실 수강인원 변화 그래프</p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Period selector */}
            <div className="inline-flex bg-gray-100 p-1 rounded-xl text-xs font-bold text-gray-600">
              <button
                onClick={() => setPeriod('1m')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${period === '1m' ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-gray-900'}`}
              >
                1개월
              </button>
              <button
                onClick={() => setPeriod('3m')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${period === '3m' ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-gray-900'}`}
              >
                3개월
              </button>
              <button
                onClick={() => setPeriod('6m')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${period === '6m' ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-gray-900'}`}
              >
                6개월
              </button>
              <button
                onClick={() => setPeriod('1y')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${period === '1y' ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-gray-900'}`}
              >
                1년
              </button>
              <button
                onClick={() => setPeriod('all')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${period === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-gray-900'}`}
              >
                전체
              </button>
            </div>

            {/* Granularity selector */}
            <div className="inline-flex bg-gray-100 p-1 rounded-xl text-xs font-bold text-gray-600">
              <button
                onClick={() => setGranularity('daily')}
                className={`px-3 py-1.5 rounded-lg transition-all ${granularity === 'daily' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:text-gray-900'}`}
              >
                일별
              </button>
              <button
                onClick={() => setGranularity('monthly')}
                className={`px-3 py-1.5 rounded-lg transition-all ${granularity === 'monthly' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:text-gray-900'}`}
              >
                월별
              </button>
            </div>
          </div>
        </div>

        {/* Recharts LineChart */}
        {chartData.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-gray-400 text-sm">
            <Calendar size={32} className="mb-2 text-gray-300" />
            표시할 기간 내 학생 데이터가 존재하지 않습니다.
          </div>
        ) : (
          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  interval={chartData.length > 30 ? Math.floor(chartData.length / 10) : 0}
                />
                <YAxis 
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 'dataMax + 2']}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-gray-900/95 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 backdrop-blur-sm border border-gray-800">
                          <p className="font-bold text-gray-300 border-b border-gray-700 pb-1">{data.dateStr} ({granularity === 'daily' ? '일별' : '월별'})</p>
                          <div className="flex items-center justify-between gap-4 font-extrabold text-sm text-indigo-400">
                            <span>수업 중 학생:</span>
                            <span>{data.activeCount}명</span>
                          </div>
                          {data.newCount > 0 && (
                            <div className="flex items-center justify-between gap-4 text-emerald-400 font-semibold">
                              <span>신규 수강 시작:</span>
                              <span>+{data.newCount}명</span>
                            </div>
                          )}
                          {data.endedCount > 0 && (
                            <div className="flex items-center justify-between gap-4 text-rose-400 font-semibold">
                              <span>수업 종료:</span>
                              <span>-{data.endedCount}명</span>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="activeCount" 
                  name="수업 중 학생 수" 
                  stroke="#4f46e5" 
                  strokeWidth={3} 
                  dot={chartData.length <= 40 ? { r: 3, fill: '#4f46e5', strokeWidth: 2, stroke: '#ffffff' } : false}
                  activeDot={{ r: 6, fill: '#4f46e5', strokeWidth: 2, stroke: '#ffffff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 3. Student Lesson Period Details Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-gray-900">학생별 수업 기간 명단</h3>
            <p className="text-gray-400 text-sm mt-0.5">시작일과 종료일 설정을 통해 날짜별 수강 상태가 결정됩니다.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="inline-flex bg-gray-100 p-1 rounded-xl text-xs font-bold text-gray-600">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-gray-900'}`}
              >
                전체 ({studentPeriods.length})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'active' ? 'bg-emerald-500 text-white shadow-sm' : 'hover:text-gray-900'}`}
              >
                수업 중 ({summaryMetrics.activeCount})
              </button>
              <button
                onClick={() => setStatusFilter('ended')}
                className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'ended' ? 'bg-rose-500 text-white shadow-sm' : 'hover:text-gray-900'}`}
              >
                수업 종료 ({studentPeriods.length - summaryMetrics.activeCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-3 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="학생 이름/학교 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-3.5 text-xs font-extrabold text-gray-400 uppercase tracking-wider">학생 정보</th>
                <th className="px-6 py-3.5 text-xs font-extrabold text-gray-400 uppercase tracking-wider">수업 시작일 (startDate)</th>
                <th className="px-6 py-3.5 text-xs font-extrabold text-gray-400 uppercase tracking-wider">수업 종료일 (endDate)</th>
                <th className="px-6 py-3.5 text-xs font-extrabold text-gray-400 uppercase tracking-wider text-right">현재 상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${student.isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{student.name}</div>
                        <div className="text-xs text-gray-400">{student.school} {student.grade}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-700">
                    {student.startDate ? (
                      <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-semibold">
                        <Calendar size={13} />
                        {student.startDate}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">미설정</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-700">
                    {student.endDate ? (
                      <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-md text-xs font-semibold">
                        <Calendar size={13} />
                        {student.endDate}
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                        진행 중 (종료일 없음)
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {student.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 size={13} />
                        수업 중
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500">
                        <XCircle size={13} />
                        수업 종료
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-gray-400 text-sm">
                    조건에 해당하는 학생 데이터가 존재하지 않습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
