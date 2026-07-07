
import React, { useState, useEffect, useMemo } from 'react';
import { DailyHomework, HomeworkType, StudentProfile } from '../types';
import { ChevronLeft, ChevronRight, BookOpen, Check, MessageSquare, TrendingUp, Coins } from 'lucide-react';
import { Card } from './Card';

interface Props {
  data: DailyHomework[];
  isAdmin?: boolean;
  onToggleTask?: (date: string, taskIndex: number) => void;
  onToggleLesson?: (date: string) => void;
  onUpdateNote?: (date: string, note: string) => void;
  startDate?: string; // YYYY-MM-DD format
  studentProfile?: StudentProfile; // 학생 수업 설정 요일 확인용
  onTogglePaymentPaid?: (date: string) => void; // 수업료 수납 상태 토글 핸들러
}

const getTaskColor = (type: HomeworkType) => {
  switch (type) {
    case 'wake_up': return 'bg-blue-500'; // 기상
    case 'problem_30': return 'bg-emerald-500'; // 30문제
    case 'explanation': return 'bg-purple-500'; // 해설
    default: return 'bg-gray-300';
  }
};

const getTaskLabel = (type: HomeworkType) => {
  switch (type) {
    case 'wake_up': return '기상 과제 인증';
    case 'problem_30': return '매일 30문제 풀이';
    case 'explanation': return '오답 해설 작성';
    default: return '기타 과제';
  }
};

export const HomeworkCalendar: React.FC<Props> = ({ data, isAdmin = false, onToggleTask, onToggleLesson, onUpdateNote, startDate, studentProfile, onTogglePaymentPaid }) => {
  // 수업일 판단 헬퍼 함수 (명시적 기록이 없으면 요일 데이터를 바탕으로 동적 계산)
  const getHasLesson = (dateStr: string) => {
    const dayData = data.find(d => d.date === dateStr);
    if (dayData && dayData.hasLesson !== undefined) {
      return dayData.hasLesson;
    }
    if (!studentProfile || !studentProfile.lessonDays || studentProfile.lessonDays.length === 0) {
      return false;
    }
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    
    // 로컬 시간 기준으로 요일 추출 (UTC 변환 시 요일이 밀리는 이슈 방지)
    const dateParts = dateStr.split('-').map(Number);
    const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    const dayName = dayNames[date.getDay()];
    
    const startDateObj = studentProfile.startDate ? new Date(studentProfile.startDate) : null;
    if (startDateObj) startDateObj.setHours(0,0,0,0);
    const endDateObj = studentProfile.endDate ? new Date(studentProfile.endDate) : null;
    if (endDateObj) endDateObj.setHours(0,0,0,0);
    
    const curr = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    curr.setHours(0,0,0,0);
    
    if (startDateObj && curr < startDateObj) return false;
    if (endDateObj && curr > endDateObj) return false;
    
    return studentProfile.lessonDays.includes(dayName);
  };

  // Start with current date
  const [currentDate, setCurrentDate] = useState(new Date());
  // Selected date for detail view (defaults to today)
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');
  
  // Note editing state
  const [editingNote, setEditingNote] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);

  // 모든 수업일의 회차(sessionNum) 매핑
  const lessonSessionMap = useMemo(() => {
    const profile = studentProfile;
    if (!profile || !profile.startDate) return {};

    const allLessonDates: string[] = [];
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const startDateStr = profile.startDate;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const limitDate = new Date(year, month + 2, 0); // 다음달 말일
    const limitStr = `${limitDate.getFullYear()}-${String(limitDate.getMonth() + 1).padStart(2, '0')}-${String(limitDate.getDate()).padStart(2, '0')}`;

    let tempDate = new Date(startDateStr);
    
    while (true) {
      const yyyy = tempDate.getFullYear();
      const mm = String(tempDate.getMonth() + 1).padStart(2, '0');
      const dd = String(tempDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      if (dateStr > limitStr) break;

      const dayData = data.find(d => d.date === dateStr);
      let isLesson = false;

      if (dayData && dayData.hasLesson !== undefined) {
        isLesson = dayData.hasLesson;
      } else {
        if (profile.lessonDays && profile.lessonDays.length > 0) {
          const dayName = dayNames[tempDate.getDay()];
          const endDateObj = profile.endDate ? new Date(profile.endDate) : null;
          if (endDateObj) endDateObj.setHours(0,0,0,0);
          const curr = new Date(tempDate);
          curr.setHours(0,0,0,0);

          const isWithinRange = curr <= (endDateObj || curr);
          isLesson = isWithinRange && profile.lessonDays.includes(dayName);
        }
      }

      if (isLesson) {
        allLessonDates.push(dateStr);
      }

      tempDate.setDate(tempDate.getDate() + 1);
    }

    allLessonDates.sort();

    const map: { [key: string]: number } = {};
    allLessonDates.forEach((dateStr, index) => {
      map[dateStr] = index + 1;
    });

    return map;
  }, [data, studentProfile, currentDate]);

  // 납부 대상일 계산 및 수납 완료 여부 매핑
  const paymentDaysMap = useMemo(() => {
    const profile = studentProfile;
    const cycle = profile?.lessonFeeCycle;
    if (!profile || !cycle) return {};

    const map: { [key: string]: { sessionNum: number; isPaid: boolean } } = {};
    const completedPaid = profile.completedPaymentDates || [];

    Object.entries(lessonSessionMap).forEach(([dateStr, sessionNum]) => {
      if (sessionNum % cycle === 0) {
        map[dateStr] = {
          sessionNum,
          isPaid: completedPaid.includes(dateStr)
        };
      }
    });

    return map;
  }, [lessonSessionMap, studentProfile]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11

  useEffect(() => {
    // Set default selected date to today on mount
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setSelectedDateStr(todayStr);
  }, []);

  // Update local editing note when selection changes
  useEffect(() => {
    const dayData = data.find(d => d.date === selectedDateStr);
    setEditingNote(dayData?.note || '');
    setIsEditingNote(false);
  }, [selectedDateStr, data]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  // --- Statistics Calculation ---
  // 1. Weekly Stats (Main) - Based on Selected Date
  const calculateWeeklyStats = () => {
     const stats = {
      wake_up: { count: 0, total: 0 },
      problem_30: { count: 0, total: 0 },
      explanation: { count: 0, total: 0 }
    };
    
    if (!selectedDateStr) return { stats, weekLabel: '' };

    const selected = new Date(selectedDateStr);
    const dayOfWeek = selected.getDay(); // 0 (Sun) - 6 (Sat)
    
    // Start of week (Sunday)
    const startOfWeek = new Date(selected);
    startOfWeek.setDate(selected.getDate() - dayOfWeek);
    
    // End of week (Saturday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    // Check week bounds relative to student Start Date and Today
    const today = new Date();
    today.setHours(0,0,0,0);
    const sDate = startDate ? new Date(startDate) : null;
    if (sDate) sDate.setHours(0,0,0,0);

    // Iterate 7 days
    for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        d.setHours(0,0,0,0);

        // Calculate Total: Only count days that have passed or are today, AND are after start date
        const isCountable = d <= today && (!sDate || d >= sDate);

        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const dayData = data.find(data => data.date === dateStr);

        (['wake_up', 'problem_30', 'explanation'] as const).forEach(type => {
             if (isCountable) {
                stats[type].total += 1;
             }
             
             // 완료 체크
             const task = dayData?.tasks?.find(t => t.type === type);
             if (task?.completed) {
                 stats[type].count += 1;
             }
        });
    }

    // Label: "3.30 ~ 4.05" format to handle cross-month weeks
    const weekLabel = `${startOfWeek.getMonth() + 1}.${startOfWeek.getDate()} ~ ${endOfWeek.getMonth() + 1}.${endOfWeek.getDate()}`;
    return { stats, weekLabel };
  };

  // 2. Monthly Stats (Secondary) - Based on Current View Month
  const calculateMonthlyStats = () => {
    const stats = {
      wake_up: { count: 0, total: 0 },
      problem_30: { count: 0, total: 0 },
      explanation: { count: 0, total: 0 }
    };

    const today = new Date();
    today.setHours(0,0,0,0);
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const isFutureMonth = new Date(year, month, 1) > today;

    if (isFutureMonth && !isCurrentMonth) return stats;

    const limitDay = isCurrentMonth ? today.getDate() : daysInMonth;
    let startDay = 1;

    if (startDate) {
      const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
      const viewMonthEnd = new Date(year, month + 1, 0); 
      const startObj = new Date(sYear, sMonth - 1, sDay);

      if (viewMonthEnd < startObj) return stats;
      if (sYear === year && (sMonth - 1) === month) {
        startDay = sDay;
      }
    }

    for (let day = startDay; day <= limitDay; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayData = data.find(d => d.date === dateStr);
        
        (['wake_up', 'problem_30', 'explanation'] as const).forEach(type => {
             stats[type].total += 1;
             const task = dayData?.tasks?.find(t => t.type === type);
             if (task?.completed) {
                 stats[type].count += 1;
             }
        });
    }

    return stats;
  };

  const { stats: weeklyStats, weekLabel } = calculateWeeklyStats();
  const monthlyStats = calculateMonthlyStats();
  
  const getRate = (stats: any, type: HomeworkType) => {
      const s = stats[type];
      return s.total === 0 ? 0 : Math.round((s.count / s.total) * 100);
  };

  // Helper to get data for selected date
  const getSelectedDayData = () => {
    const found = data.find(d => d.date === selectedDateStr);
    if (found) return found;
    
    // Return a virtual empty object if not found
    return {
      date: selectedDateStr,
      tasks: [
        { type: 'wake_up' as HomeworkType, completed: false },
        { type: 'problem_30' as HomeworkType, completed: false },
        { type: 'explanation' as HomeworkType, completed: false },
      ],
      hasLesson: false,
      note: ''
    };
  };

  const selectedDayData = getSelectedDayData();

  const handleSaveNote = () => {
    if (onUpdateNote && selectedDateStr) {
      onUpdateNote(selectedDateStr, editingNote);
      setIsEditingNote(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card 
        title="숙제 달성표" 
        icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
      >
        <div className="flex flex-col gap-4">
          {/* Header Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
              <span className="text-lg font-bold text-gray-800">
                {year}년 {month + 1}월
              </span>
              <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                <ChevronRight size={20} className="text-gray-600" />
              </button>
            </div>

            <div className="flex gap-2 lg:gap-3 text-xs text-gray-600 flex-wrap justify-end">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span className="hidden sm:inline">기상</span></div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="hidden sm:inline">30문제</span></div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"></div><span className="hidden sm:inline">해설</span></div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {weekDays.map((d, i) => (
                <div key={d} className={`text-xs font-medium py-1 ${i === 0 ? 'text-red-400' : 'text-gray-400'}`}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 lg:gap-2">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square"></div>
              ))}
              
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayData = data.find(d => d.date === dateStr);
                
                let tasks = dayData?.tasks || [];
                const isVirtual = tasks.length === 0;
                const hasLesson = getHasLesson(dateStr);
                const hasNote = !!dayData?.note;
                const paymentInfo = paymentDaysMap[dateStr];
                const isPaymentDay = isAdmin && !!paymentInfo;
                const sessionNum = lessonSessionMap[dateStr];
                
                if (isVirtual) {
                  tasks = [
                    { type: 'wake_up', completed: false },
                    { type: 'problem_30', completed: false },
                    { type: 'explanation', completed: false },
                  ];
                }
                
                const isToday = new Date().toDateString() === new Date(dateStr).toDateString();
                const isSelected = dateStr === selectedDateStr;

                return (
                  <div 
                    key={day} 
                    onClick={() => setSelectedDateStr(dateStr)}
                    className={`
                      aspect-square border rounded-lg flex flex-col items-center justify-start py-1 relative transition-all cursor-pointer
                      ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-1 border-indigo-500 z-10' : ''}
                      ${hasLesson 
                          ? 'bg-indigo-50 border-indigo-200' 
                          : 'bg-gray-50/50 border-gray-100 hover:bg-gray-100'
                      }
                    `}
                  >
                    <div className="flex items-center gap-0.5 mb-0.5 w-full justify-center relative">
                       <span 
                         className={`
                           text-xs font-medium 
                           ${hasLesson ? 'text-indigo-800 font-bold' : 'text-gray-500'} 
                         `}
                       >
                         {day}
                       </span>
                       {isPaymentDay ? (
                         <Coins size={9} className={`${paymentInfo.isPaid ? 'text-amber-500' : 'text-rose-500'} absolute right-0.5 top-0.5`} />
                       ) : (
                         hasLesson && <BookOpen size={8} className="text-indigo-600 absolute right-0.5 top-0.5" />
                       )}
                       {hasNote && !hasLesson && !isPaymentDay && <div className="w-1 h-1 bg-gray-400 rounded-full absolute right-1 top-1"></div>}
                    </div>

                    {/* Session Number Badge */}
                    {hasLesson && sessionNum !== undefined && (
                      isPaymentDay ? (
                        paymentInfo.isPaid ? (
                          <span className="text-[8px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded font-black block leading-none select-none mb-1">
                            ₩ {sessionNum}회차
                          </span>
                        ) : (
                          <span className="text-[8px] bg-rose-100 text-rose-700 px-1 py-0.5 rounded font-black block leading-none select-none mb-1 animate-pulse">
                            ₩ {sessionNum}회차
                          </span>
                        )
                      ) : (
                        <span className="text-[8px] bg-indigo-100/60 text-indigo-700 px-1 py-0.5 rounded font-black block leading-none select-none mb-1">
                          {sessionNum}회차
                        </span>
                      )
                    )}
                    
                    <div className="flex flex-wrap justify-center gap-0.5 px-0.5 w-full mt-auto mb-0.5">
                       {tasks.map((task, idx) => (
                         <div 
                          key={idx} 
                          className={`w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full transition-all ${
                            task.completed ? getTaskColor(task.type) : 'bg-gray-200'
                          }`}
                         />
                       ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Stats Footer (Split Weekly & Monthly) */}
          <div className="space-y-4">
             {/* 1. Main Weekly Stats */}
             <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
               <div className="flex items-center gap-2 mb-3">
                 <TrendingUp size={16} className="text-indigo-600" />
                 <h4 className="text-sm font-bold text-gray-800">{weekLabel} 달성 현황</h4>
               </div>
               
               <div className="grid grid-cols-3 gap-3">
                 <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm flex flex-col items-center justify-center text-center">
                   <div className="text-[10px] font-bold text-blue-500 mb-1 uppercase tracking-wide">기상 과제</div>
                   <div className="text-2xl font-black text-blue-600 leading-none">
                     {weeklyStats.wake_up.count}<span className="text-sm text-gray-400 font-medium">/{weeklyStats.wake_up.total}</span>
                   </div>
                 </div>
                 
                 <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm flex flex-col items-center justify-center text-center">
                   <div className="text-[10px] font-bold text-emerald-600 mb-1 uppercase tracking-wide">30문제</div>
                   <div className="text-2xl font-black text-emerald-600 leading-none">
                     {weeklyStats.problem_30.count}<span className="text-sm text-gray-400 font-medium">/{weeklyStats.problem_30.total}</span>
                   </div>
                 </div>
                 
                 <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-sm flex flex-col items-center justify-center text-center">
                   <div className="text-[10px] font-bold text-purple-600 mb-1 uppercase tracking-wide">해설 작성</div>
                   <div className="text-2xl font-black text-purple-600 leading-none">
                     {weeklyStats.explanation.count}<span className="text-sm text-gray-400 font-medium">/{weeklyStats.explanation.total}</span>
                   </div>
                 </div>
               </div>
             </div>

             {/* 2. Secondary Monthly Stats */}
             <div className="px-2">
                <h4 className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">{month + 1}월 전체 누적 달성률</h4>
                <div className="grid grid-cols-3 gap-4 text-xs text-gray-500">
                   <div>
                      <div className="flex items-center justify-between mb-1">
                          <span>기상</span>
                          <span className="font-bold text-blue-600">{monthlyStats.wake_up.count}/{monthlyStats.wake_up.total}</span>
                      </div>
                      <div className="text-right text-[10px] text-gray-400">
                          {getRate(monthlyStats, 'wake_up')}%
                      </div>
                   </div>
                   <div>
                      <div className="flex items-center justify-between mb-1">
                          <span>문제</span>
                          <span className="font-bold text-emerald-600">{monthlyStats.problem_30.count}/{monthlyStats.problem_30.total}</span>
                      </div>
                      <div className="text-right text-[10px] text-gray-400">
                          {getRate(monthlyStats, 'problem_30')}%
                      </div>
                   </div>
                   <div>
                      <div className="flex items-center justify-between mb-1">
                          <span>해설</span>
                          <span className="font-bold text-purple-600">{monthlyStats.explanation.count}/{monthlyStats.explanation.total}</span>
                      </div>
                      <div className="text-right text-[10px] text-gray-400">
                          {getRate(monthlyStats, 'explanation')}%
                      </div>
                   </div>
                </div>
                {/* Visual Bars for Monthly */}
                <div className="grid grid-cols-3 gap-4 mt-1">
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-300" style={{ width: `${getRate(monthlyStats, 'wake_up')}%` }}></div>
                  </div>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-300" style={{ width: `${getRate(monthlyStats, 'problem_30')}%` }}></div>
                  </div>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-300" style={{ width: `${getRate(monthlyStats, 'explanation')}%` }}></div>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </Card>

      {/* Detail View for Selected Date */}
      {selectedDateStr && (
        <div className="animate-in slide-in-from-top-2 fade-in duration-300">
          <Card className="border-indigo-100 ring-4 ring-indigo-50/30">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
               <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 flex-wrap">
                    {parseInt(selectedDateStr.split('-')[1])}월 {parseInt(selectedDateStr.split('-')[2])}일 기록
                    {getHasLesson(selectedDateStr) && (
                      <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <BookOpen size={10} /> 수업일
                      </span>
                    )}
                    {isAdmin && paymentDaysMap[selectedDateStr] && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                        paymentDaysMap[selectedDateStr].isPaid
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}>
                        <Coins size={10} />
                        {paymentDaysMap[selectedDateStr].isPaid ? '수업료 납부 완료' : '수업료 미납'}
                      </span>
                    )}
                  </h3>
               </div>
               {isAdmin && onToggleLesson && (
                 <button 
                  onClick={() => onToggleLesson(selectedDateStr)}
                  className={`text-xs px-2 py-1 rounded font-bold transition-colors ${getHasLesson(selectedDateStr) ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                 >
                   {getHasLesson(selectedDateStr) ? '수업 취소' : '수업일로 지정'}
                 </button>
               )}
            </div>

            <div className="space-y-4">
              {/* Payment Status Widget */}
              {isAdmin && paymentDaysMap[selectedDateStr] && (
                <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100/85 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                      <Coins size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-black text-gray-800">
                        수업료 납부일 ({paymentDaysMap[selectedDateStr].sessionNum}회차 수업일)
                      </div>
                      <div className="text-[10px] text-gray-500 font-bold mt-0.5">
                        {paymentDaysMap[selectedDateStr].isPaid ? '수업료가 수납 완료되었습니다.' : '수업료 미납 상태입니다.'}
                      </div>
                    </div>
                  </div>
                  {isAdmin && onTogglePaymentPaid && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-amber-800 hidden sm:inline">납부 완료 처리</span>
                      <button
                        onClick={() => onTogglePaymentPaid(selectedDateStr)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          paymentDaysMap[selectedDateStr].isPaid ? 'bg-amber-500' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            paymentDaysMap[selectedDateStr].isPaid ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tasks List */}
              <div className="space-y-2">
                 {selectedDayData.tasks.map((task, idx) => (
                   <div 
                    key={idx} 
                    onClick={() => isAdmin && onToggleTask && onToggleTask(selectedDateStr, idx)}
                    className={`
                      flex items-center justify-between p-3 rounded-xl border transition-all
                      ${task.completed 
                        ? 'bg-white border-indigo-200 shadow-sm' 
                        : 'bg-gray-50 border-transparent text-gray-400'
                      }
                      ${isAdmin ? 'cursor-pointer hover:border-indigo-300 active:scale-[0.99]' : ''}
                    `}
                   >
                     <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${task.completed ? getTaskColor(task.type) : 'bg-gray-200'}`}>
                           {task.completed && <Check size={16} className="text-white" />}
                        </div>
                        <span className={`font-bold ${task.completed ? 'text-gray-800' : 'text-gray-500'}`}>
                          {getTaskLabel(task.type)}
                        </span>
                     </div>
                     <div className={`
                       w-5 h-5 rounded-full border-2 flex items-center justify-center
                       ${task.completed ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'}
                     `}>
                       {task.completed && <Check size={12} className="text-white" />}
                     </div>
                   </div>
                 ))}
              </div>

              {/* Note Section */}
              <div className="pt-2">
                 <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                      <MessageSquare size={12} /> 일일 메모/숙제 상세
                    </span>
                 </div>
                 
                 {isAdmin ? (
                   isEditingNote ? (
                     <div className="space-y-2">
                        <textarea
                          value={editingNote}
                          onChange={e => setEditingNote(e.target.value)}
                          placeholder="특이사항이나 구체적인 숙제 내용을 입력하세요 (예: 쎈 30~35p 완료)"
                          className="w-full p-3 border border-indigo-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 min-h-[80px] resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => setIsEditingNote(false)}
                            className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg"
                          >
                            취소
                          </button>
                          <button 
                            onClick={handleSaveNote}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                          >
                            저장
                          </button>
                        </div>
                     </div>
                   ) : (
                    <div 
                      onClick={() => {
                        setEditingNote(selectedDayData.note || '');
                        setIsEditingNote(true);
                      }}
                      className="w-full p-3 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-600 min-h-[60px] cursor-pointer hover:bg-gray-100 hover:border-gray-200 transition-colors"
                    >
                      {selectedDayData.note ? (
                        <span className="text-gray-800">{selectedDayData.note}</span>
                      ) : (
                        <span className="text-gray-400">메모를 입력하려면 클릭하세요...</span>
                      )}
                    </div>
                   )
                 ) : (
                   // Student View
                    <div className="w-full p-3 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-600 min-h-[60px]">
                      {selectedDayData.note ? (
                        <span className="text-gray-800">{selectedDayData.note}</span>
                      ) : (
                        <span className="text-gray-400 italic">등록된 메모가 없습니다.</span>
                      )}
                    </div>
                 )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
