import React, { useState, useMemo, useEffect } from 'react';
import { StudentData, HomeworkType, UserRole } from '../types';
import { Card } from './Card';
import { Trophy, Search, Users, Calendar, Star, Award, Camera, ClipboardCheck } from 'lucide-react';
import { toPng, toBlob } from 'html-to-image';
import { DashboardImageRender, StudentStats } from './DashboardImageRender';

interface Props {
  students: StudentData[];
  onSelectStudent?: (id: string) => void;
  onUpdateStudent?: (student: StudentData) => void;
  role?: UserRole;
}

export const StudentRankings: React.FC<Props> = ({ students, onSelectStudent, onUpdateStudent, role = 'guest' }) => {
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. 기준일(오늘) 정보 설정
  const today = useMemo(() => new Date(), []);
  const todayMidnight = useMemo(() => {
    const d = new Date(today);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [today]);

  const yesterdayMidnight = useMemo(() => {
    const d = new Date(todayMidnight);
    d.setDate(d.getDate() - 1);
    return d;
  }, [todayMidnight]);

  const currentYear = todayMidnight.getFullYear();
  const currentMonth = todayMidnight.getMonth() + 1; // 1-indexed

  // 2. 연도, 월, 주차 선택 상태 및 졸업생 토글 상태
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(1);
  const [showGraduated, setShowGraduated] = useState<boolean>(false);

  // 3. 사용 가능한 연도 목록 (2025년부터 현재 연도까지)
  const years = useMemo(() => {
    const list = [];
    for (let y = 2025; y <= currentYear; y++) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  // 4. 선택된 연도에 따른 사용 가능한 월 목록 (현재 연도인 경우 현재 월까지만)
  const months = useMemo(() => {
    const maxMonth = selectedYear === currentYear ? currentMonth : 12;
    const list = [];
    for (let m = 1; m <= maxMonth; m++) {
      list.push(m);
    }
    return list;
  }, [selectedYear, currentYear, currentMonth]);

  // 안전장치: 연도가 변경되었을 때 월이 한계를 초과하면 현재 월로 자동 조정
  useEffect(() => {
    if (selectedYear === currentYear && selectedMonth > currentMonth) {
      setSelectedMonth(currentMonth);
    }
  }, [selectedYear, currentYear, currentMonth, selectedMonth]);

  // 5. 특정 년/월의 주차 목록 계산 헬퍼 함수 (일요일 시작 ~ 토요일 종료 기준)
  const getWeeksForMonth = (year: number, month: number) => {
    const weeks = [];
    const firstDayOfMonth = new Date(year, month - 1, 1);
    
    // 해당 월의 1일이 포함된 주의 일요일을 시작일로 잡음
    const temp = new Date(firstDayOfMonth);
    temp.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay());
    
    const endOfMonth = new Date(year, month, 0);
    
    let weekIndex = 1;
    while (temp <= endOfMonth) {
      const start = new Date(temp);
      const end = new Date(temp);
      end.setDate(temp.getDate() + 6);
      
      // 월 영역에 일주일 중 하루라도 걸치는지 판단
      const startInMonth = start.getMonth() === month - 1 && start.getFullYear() === year;
      const endInMonth = end.getMonth() === month - 1 && end.getFullYear() === year;
      
      if (startInMonth || endInMonth) {
        weeks.push({
          index: weekIndex,
          label: `${weekIndex}주차 (${start.getMonth() + 1}/${start.getDate()} ~ ${end.getMonth() + 1}/${end.getDate()})`,
          start,
          end
        });
        weekIndex++;
      }
      temp.setDate(temp.getDate() + 7);
    }
    return weeks;
  };

  // 6. 선택된 년/월에 따른 주차 리스트 (현재 년/월인 경우 시작일이 오늘 이전인 주차만)
  const weeksForMonth = useMemo(() => {
    const allWeeks = getWeeksForMonth(selectedYear, selectedMonth);
    if (selectedYear === currentYear && selectedMonth === currentMonth) {
      return allWeeks.filter(w => w.start <= todayMidnight);
    }
    return allWeeks;
  }, [selectedYear, selectedMonth, currentYear, currentMonth, todayMidnight]);

  // 7. 년/월/주차 목록 변경 시 주차 기본값(현재 주차 또는 마지막 주차)을 안전하게 자동 할당
  useEffect(() => {
    if (selectedYear === currentYear && selectedMonth === currentMonth) {
      const containingWeek = weeksForMonth.find(w => todayMidnight >= w.start && todayMidnight <= w.end);
      if (containingWeek) {
        setSelectedWeekIndex(containingWeek.index);
      } else {
        setSelectedWeekIndex(weeksForMonth.length > 0 ? weeksForMonth[weeksForMonth.length - 1].index : 1);
      }
    } else {
      setSelectedWeekIndex(1);
    }
  }, [selectedYear, selectedMonth, weeksForMonth, currentYear, currentMonth, todayMidnight]);

  // 8. 선택된 옵션 조합 기반의 분석 날짜 범위(range) 계산
  const range = useMemo(() => {
    if (period === 'weekly') {
      const activeWeek = weeksForMonth.find(w => w.index === selectedWeekIndex) || weeksForMonth[0];
      if (activeWeek) {
        // 현재 진행 중인 주차(오늘 포함)인 경우 어제 날짜까지만 캡핑
        const end = activeWeek.end > yesterdayMidnight ? yesterdayMidnight : activeWeek.end;
        return { start: activeWeek.start, end };
      }
      return { start: todayMidnight, end: todayMidnight };
    } else if (period === 'monthly') {
      const start = new Date(selectedYear, selectedMonth - 1, 1);
      const rawEnd = new Date(selectedYear, selectedMonth, 0);
      const end = rawEnd > yesterdayMidnight ? yesterdayMidnight : rawEnd;
      return { start, end };
    } else { // yearly
      const start = new Date(selectedYear, 0, 1);
      const rawEnd = new Date(selectedYear, 11, 31);
      const end = rawEnd > yesterdayMidnight ? yesterdayMidnight : rawEnd;
      return { start, end };
    }
  }, [period, selectedYear, selectedMonth, selectedWeekIndex, weeksForMonth, yesterdayMidnight, todayMidnight]);

  // 9. 해당 범위 내 일자 배열 생성 (YYYY-MM-DD 문자열 형태)
  const dateStrings = useMemo(() => {
    const dates: string[] = [];
    const curr = new Date(range.start);
    while (curr <= range.end) {
      const year = curr.getFullYear();
      const month = String(curr.getMonth() + 1).padStart(2, '0');
      const day = String(curr.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  }, [range]);

  // 10. 학생 목록 기반으로 통계 계산
  const calculatedRankings = useMemo(() => {
    // 10-1. 필터링: 선택된 기간에 과외 진행 중이었던 학생
    const targetStudents = students.filter(student => {
      const studentStart = student.profile.startDate ? new Date(student.profile.startDate) : null;
      if (studentStart) studentStart.setHours(0, 0, 0, 0);
      
      const studentEnd = student.profile.endDate ? new Date(student.profile.endDate) : null;
      if (studentEnd) studentEnd.setHours(0, 0, 0, 0);

      // (A) 현재 시점 기준 종료(졸업) 여부 검사 및 필터링
      const isGraduated = studentEnd ? studentEnd < todayMidnight : false;
      if (!showGraduated && isGraduated) {
        return false;
      }

      // (B) 분석 기간 중 하루라도 수업 진행 기간이 겹쳤는지 여부 검사
      const startedBeforeEnd = studentStart ? studentStart <= range.end : true;
      const endedAfterStart = studentEnd ? studentEnd >= range.start : true;

      return startedBeforeEnd && endedAfterStart;
    });

    const statsList: StudentStats[] = targetStudents.map(student => {
      const totalPeriodDays = dateStrings.filter(dateStr => {
        const currentDate = new Date(dateStr);
        currentDate.setHours(0, 0, 0, 0);
        return currentDate <= todayMidnight;
      }).length;

      const totalTasks = totalPeriodDays * 3;
      const activeDays = totalPeriodDays;
      let completedTasks = 0;
      let wakeUpCompleted = 0;
      let problem30Completed = 0;
      let explanationCompleted = 0;
      let totalExplanationCount = 0;

      const studentStart = student.profile.startDate ? new Date(student.profile.startDate) : null;
      if (studentStart) studentStart.setHours(0, 0, 0, 0);
      const studentEnd = student.profile.endDate ? new Date(student.profile.endDate) : null;
      if (studentEnd) studentEnd.setHours(0, 0, 0, 0);

      dateStrings.forEach(dateStr => {
        const currentDate = new Date(dateStr);
        currentDate.setHours(0, 0, 0, 0);

        // 해당 일자가 학생의 과외 유효 범위 내에 있는지 판별
        const isAfterStart = studentStart ? currentDate >= studentStart : true;
        const isBeforeEnd = studentEnd ? currentDate <= studentEnd : true;
        const isBeforeOrEqualToday = currentDate <= todayMidnight;

        if (isAfterStart && isBeforeEnd && isBeforeOrEqualToday) {
          const daily = student.homework?.find(h => h.date === dateStr);
          if (daily && daily.tasks) {
            const wakeUpTask = daily.tasks.find(t => t.type === 'wake_up');
            const problem30Task = daily.tasks.find(t => t.type === 'problem_30');
            const explanationTask = daily.tasks.find(t => t.type === 'explanation');

            if (wakeUpTask?.completed) {
              completedTasks += 1;
              wakeUpCompleted += 1;
            }
            if (problem30Task?.completed) {
              completedTasks += 1;
              problem30Completed += 1;
            }
            if (explanationTask?.completed) {
              completedTasks += 1;
              explanationCompleted += 1;
            }
            if (explanationTask) {
              totalExplanationCount += explanationTask.count || (explanationTask.completed ? 1 : 0);
            }
          }
        }
      });

      const overallRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
      const wakeUpRate = activeDays === 0 ? 0 : Math.round((wakeUpCompleted / activeDays) * 100);
      const problem30Rate = activeDays === 0 ? 0 : Math.round((problem30Completed / activeDays) * 100);
      const explanationRate = activeDays === 0 ? 0 : Math.round((explanationCompleted / activeDays) * 100);

      return {
        id: student.id,
        name: student.profile.name,
        grade: student.profile.grade,
        school: student.profile.school,
        isFavorite: student.profile.isFavorite || false,
        overallRate,
        wakeUpRate,
        problem30Rate,
        explanationRate,
        completedTasks,
        totalTasks,
        activeDays,
        totalExplanationCount
      };
    });

    // 전체 달성률 내림차순 -> 총 해설 개수 내림차순 -> 이름 사전식 정렬
    const sorted = statsList.sort((a, b) => {
      if (b.overallRate !== a.overallRate) {
        return b.overallRate - a.overallRate;
      }
      const aExp = a.totalExplanationCount || 0;
      const bExp = b.totalExplanationCount || 0;
      if (bExp !== aExp) {
        return bExp - aExp;
      }
      return a.name.localeCompare(b.name);
    });

    // 공동 등수 연산
    let currentRank = 1;
    let prevRate = -1;
    let prevExp = -1;
    return sorted.map((item, index) => {
      const expCount = item.totalExplanationCount || 0;
      if (item.overallRate !== prevRate || expCount !== prevExp) {
        currentRank = index + 1;
        prevRate = item.overallRate;
        prevExp = expCount;
      }
      return {
        ...item,
        rank: currentRank
      };
    });
  }, [students, dateStrings, range, todayMidnight, showGraduated]);

  // 11. 요약 통계 계산
  const summary = useMemo(() => {
    if (calculatedRankings.length === 0) {
      return {
        overallAverage: 0,
        wakeUpAverage: 0,
        problem30Average: 0,
        explanationAverage: 0,
        topStudents: [] as string[],
        topRate: 0
      };
    }

    const totalStudents = calculatedRankings.length;
    const overallSum = calculatedRankings.reduce((sum, item) => sum + item.overallRate, 0);
    const wakeUpSum = calculatedRankings.reduce((sum, item) => sum + item.wakeUpRate, 0);
    const problem30Sum = calculatedRankings.reduce((sum, item) => sum + item.problem30Rate, 0);
    const explanationSum = calculatedRankings.reduce((sum, item) => sum + item.explanationRate, 0);

    const topRate = calculatedRankings[0]?.overallRate || 0;
    const topStudents = calculatedRankings
      .filter(item => item.overallRate === topRate && topRate > 0)
      .map(item => item.name);

    return {
      overallAverage: Math.round(overallSum / totalStudents),
      wakeUpAverage: Math.round(wakeUpSum / totalStudents),
      problem30Average: Math.round(problem30Sum / totalStudents),
      explanationAverage: Math.round(explanationSum / totalStudents),
      topStudents,
      topRate
    };
  }, [calculatedRankings]);

  // 12. 이름 검색 필터링
  const filteredRankings = useMemo(() => {
    if (!searchQuery.trim()) return calculatedRankings;
    return calculatedRankings.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [calculatedRankings, searchQuery]);

  // 13. 한글 기간 텍스트 생성
  const formatDateRangeString = () => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const format = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일(${days[d.getDay()]})`;
    return `${format(range.start)} ~ ${format(range.end)}`;
  };

  const getRankBadge = (rank?: number) => {
    switch (rank) {
      case 1:
        return <span className="text-2xl" title="1등">🥇</span>;
      case 2:
        return <span className="text-2xl" title="2등">🥈</span>;
      case 3:
        return <span className="text-2xl" title="3등">🥉</span>;
      default:
        return (
          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 border border-gray-200">
            {rank}
          </div>
        );
    }
  };

  // 14. 최근 업데이트 날짜 계산 (lexicographically sortable)
  const lastUpdateTime = useMemo(() => {
    if (!students || students.length === 0) return '';
    const updates = students
      .map(s => s.profile.lastUpdate)
      .filter(Boolean);
    if (updates.length === 0) return '';
    return updates.sort((a, b) => b.localeCompare(a))[0];
  }, [students]);

  // 15. 캡처 상태를 표시하는 토스트 메시지 상태
  const [captureToast, setCaptureToast] = useState<{ message: string; isVisible: boolean } | null>(null);

  const handleDownloadImage = async () => {
    const node = document.getElementById('dashboard-image-export');
    if (!node) return;
    try {
      const dataUrl = await toPng(node, { cacheBust: true, backgroundColor: '#ffffff', pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `과제현황_${formatDateRangeString().replace(/\s+/g, '')}.png`;
      link.href = dataUrl;
      link.click();
      
      setCaptureToast({ message: "대시보드 이미지가 다운로드되었습니다.", isVisible: true });
      setTimeout(() => setCaptureToast(prev => prev ? { ...prev, isVisible: false } : null), 2000);
    } catch (error) {
      console.error('oops, something went wrong!', error);
      alert('이미지 저장에 실패했습니다. 브라우저 설정을 확인해주세요.');
    }
  };

  const handleCopyImage = async () => {
    const node = document.getElementById('dashboard-image-export');
    if (!node) return;
    try {
      // 1. Create a promise that resolves to the Blob
      const blobPromise = toBlob(node, { cacheBust: true, backgroundColor: '#ffffff', pixelRatio: 2 }).then(blob => {
        if (!blob) throw new Error("Blob creation failed");
        return blob;
      });

      // 2. Synchronously write a ClipboardItem with the promise to avoid user gesture timeout (Safari fix)
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blobPromise
        })
      ]);

      setCaptureToast({ message: "대시보드 이미지가 클립보드에 복사되었습니다! 카톡에 바로 붙여넣기(Ctrl+V) 해보세요.", isVisible: true });
      setTimeout(() => setCaptureToast(prev => prev ? { ...prev, isVisible: false } : null), 3000);
    } catch (error) {
      console.error('oops, something went wrong!', error);
      alert('이미지 복사에 실패했습니다. 브라우저 보안 정책에 의해 차단되었을 수 있습니다.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* 랭킹 조작 헤더 (이미지 캡처 대상 제외) */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <Trophy className="text-indigo-600" />
            과제 순위
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            학생들의 과제 제출 현황과 순위를 확인합니다.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap self-stretch lg:self-auto justify-end">
          {/* 이미지 저장 및 복사 버튼 (비로그인 게스트 뷰에서만 제공) */}
          {role === 'guest' && (
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200/50 gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <button
                onClick={handleDownloadImage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all cursor-pointer"
                title="대시보드를 이미지(PNG)로 다운로드합니다."
              >
                <Camera size={14} className="text-gray-500" />
                이미지 저장
              </button>
              <button
                onClick={handleCopyImage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all cursor-pointer border-l border-gray-100"
                title="대시보드 이미지를 복사하여 카카오톡 등에 바로 붙여넣기(Ctrl+V) 할 수 있습니다."
              >
                <ClipboardCheck size={14} className="text-indigo-600" />
                이미지 복사
              </button>
            </div>
          )}

          {/* 주간/월간/연간 탭 */}
          <div className="flex bg-gray-100 p-1 rounded-xl shadow-sm border border-gray-200/50 gap-1">
            <button
              onClick={() => setPeriod('weekly')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === 'weekly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              주간
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              월간
            </button>
            <button
              onClick={() => setPeriod('yearly')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === 'yearly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              연간
            </button>
          </div>
        </div>
      </div>

      {/* 캡처 대상 영역 시작 */}
      <div id="rankings-capture-area" className="bg-gray-50 p-6 rounded-3xl space-y-6 border border-gray-200/50">
        


        {/* 분석 기간 필터 컨트롤바 */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">분석 기준일:</span>
            
            {/* 연도 */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all cursor-pointer"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>

            {/* 월 (연간 순위일 때는 숨김) */}
            {period !== 'yearly' && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all cursor-pointer"
              >
                {months.map(m => (
                  <option key={m} value={m}>{m}월</option>
                ))}
              </select>
            )}

            {/* 주차 (주간 순위 탭 활성 시에만 노출) */}
            {period === 'weekly' && weeksForMonth.length > 0 && (
              <select
                value={selectedWeekIndex}
                onChange={(e) => setSelectedWeekIndex(Number(e.target.value))}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all cursor-pointer"
              >
                {weeksForMonth.map(w => (
                  <option key={w.index} value={w.index}>{w.label}</option>
                ))}
              </select>
            )}
          </div>

          {/* 졸업생(종료생) 포함 선택 여부 */}
          <div className="flex items-center gap-2 border-l border-gray-100 pl-0 md:pl-4">
            <label className="relative flex items-center cursor-pointer select-none gap-2">
              <input
                type="checkbox"
                checked={showGraduated}
                onChange={(e) => setShowGraduated(e.target.checked)}
                className="w-4 h-4 text-indigo-600 bg-gray-50 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 transition-all cursor-pointer"
              />
              <span className="text-xs font-bold text-gray-700">종료(졸업)생 포함</span>
            </label>
          </div>
        </div>

        {/* 날짜 범위 표시 배너 */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 flex items-center gap-2.5 text-indigo-700 text-xs font-bold">
          <Calendar size={16} />
          <span>실제 집계 범위: <span className="underline decoration-indigo-300">{formatDateRangeString()}</span></span>
          <span className="ml-auto text-[10px] text-indigo-500 bg-white px-2.5 py-0.5 rounded-full border border-indigo-100">
            {selectedYear === currentYear && (period === 'yearly' || selectedMonth === currentMonth)
              ? (lastUpdateTime ? `최근 업데이트: ${lastUpdateTime}` : '실시간 집계 중')
              : '기록 보관됨'}
          </span>
        </div>

        {/* 요약 대시보드 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 전체 평균 제출률 */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">전체 평균 제출률</span>
              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Users size={16} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-gray-900">{summary.overallAverage}%</span>
                <span className="text-xs text-gray-500 font-medium">/ 100%</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">해당 기간 내 분석 학생 {calculatedRankings.length}명 대상</p>
            </div>
          </div>

          {/* 이번 기간 1위 (우수 학생) */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-400/10 rounded-full -mr-8 -mt-8 blur-lg"></div>
            <div className="flex items-center justify-between mb-3 relative z-10">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                {period === 'weekly' ? '이주의 학생' : period === 'monthly' ? '이달의 학생' : '올해의 학생'}
              </span>
              <div className="w-8 h-8 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600">
                <Trophy size={16} />
              </div>
            </div>
            <div className="relative z-10">
              {summary.topStudents.length > 0 ? (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-yellow-600 truncate max-w-[150px]" title={summary.topStudents.join(', ')}>
                      {summary.topStudents.join(', ')}
                    </span>
                    <span className="text-sm text-gray-900 font-extrabold">({summary.topRate}%)</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">해당 기간의 누적 1위 과제 달성자</p>
                </>
              ) : (
                <>
                  <span className="text-xl font-bold text-gray-400">대상 학생 없음</span>
                  <p className="text-[10px] text-gray-400 mt-2">기간 내 제출 이력이 없습니다.</p>
                </>
              )}
            </div>
          </div>

          {/* 과제 유형별 평균 */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">과제별 평균 달성률</span>
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Award size={16} />
              </div>
            </div>
            <div className="space-y-2">
              {/* 기상 */}
              <div>
                <div className="flex justify-between text-[10px] font-bold text-gray-600 mb-0.5">
                  <span>기상 과제</span>
                  <span>{summary.wakeUpAverage}%</span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${summary.wakeUpAverage}%` }}></div>
                </div>
              </div>
              {/* 30문제 */}
              <div>
                <div className="flex justify-between text-[10px] font-bold text-gray-600 mb-0.5">
                  <span>매일 30문제</span>
                  <span>{summary.problem30Average}%</span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${summary.problem30Average}%` }}></div>
                </div>
              </div>
              {/* 해설 */}
              <div>
                <div className="flex justify-between text-[10px] font-bold text-gray-600 mb-0.5">
                  <span>해설 작성</span>
                  <span>{summary.explanationAverage}%</span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: `${summary.explanationAverage}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 리더보드 테이블 및 검색 */}
        <Card className="p-0 overflow-hidden border border-gray-100 shadow-sm">
          {/* 검색 툴바 */}
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="학생 이름 검색..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 w-full text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-medium text-gray-700"
              />
            </div>
            <span className="text-xs text-gray-400 font-bold ml-auto">
              정렬 기준: 전체 제출률 순
            </span>
          </div>

          {/* 랭킹 목록 */}
          <div className="divide-y divide-gray-100">
            {filteredRankings.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (role === 'guest') {
                    alert('로그인이 필요합니다');
                  } else if (onSelectStudent) {
                    onSelectStudent(item.id);
                  }
                }}
                className={`flex flex-col md:flex-row md:items-center justify-between p-4 transition-all cursor-pointer group ${
                  role !== 'guest' && onSelectStudent
                    ? 'hover:bg-indigo-50/20'
                    : 'hover:bg-gray-100'
                }`}
              >
                {/* 좌측: 순위, 이름, 학교 */}
                <div className="flex items-center gap-4 min-w-[200px] mb-3 md:mb-0">
                  <div className="w-10 flex justify-center">
                    {getRankBadge(item.rank)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {item.name}
                      </span>
                      {item.isFavorite && (
                        <Star size={14} className="text-yellow-400 fill-yellow-400" />
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold block mt-0.5">
                      {item.school} • {item.grade}
                    </span>
                  </div>
                </div>

                {/* 중앙: 제출률 프로그레스 바 */}
                <div className="flex-1 max-w-sm mx-0 md:mx-6 mb-3 md:mb-0">
                  <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                    <span>과제 제출률</span>
                    <span className="text-indigo-600">{item.overallRate}%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden border border-gray-200/50">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.overallRate}%` }}
                    ></div>
                  </div>
                  <span className="text-[9px] text-gray-400 block mt-1 font-medium">
                    {item.completedTasks}/{item.totalTasks}
                  </span>
                </div>

                {/* 우측: 과제별 제출 뱃지 */}
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-center bg-blue-50/50 border border-blue-100 rounded-xl px-2.5 py-1.5 min-w-[65px]">
                    <span className="text-[9px] text-blue-500 font-bold">기상</span>
                    <span className="text-xs font-black text-blue-700 mt-0.5">{item.wakeUpRate}%</span>
                  </div>
                  <div className="flex flex-col items-center bg-emerald-50/50 border border-emerald-100 rounded-xl px-2.5 py-1.5 min-w-[65px]">
                    <span className="text-[9px] text-emerald-500 font-bold">30문제</span>
                    <span className="text-xs font-black text-emerald-700 mt-0.5">{item.problem30Rate}%</span>
                  </div>
                  <div className="flex flex-col items-center bg-purple-50/50 border border-purple-100 rounded-xl px-2.5 py-1.5 min-w-[65px]">
                    <span className="text-[9px] text-purple-500 font-bold">해설</span>
                    <span className="text-xs font-black text-purple-700 mt-0.5">
                      {item.explanationRate}% ({item.totalExplanationCount || 0}개)
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {filteredRankings.length === 0 && (
              <div className="p-8 text-center text-gray-400 font-medium">
                {searchQuery ? '검색 결과에 해당하는 학생이 없습니다.' : '해당 기간에 등록된 활성 학생이 없습니다.'}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Hidden container for the Dashboard Image Render */}
      <div style={{ position: 'absolute', top: -9999, left: -9999, pointerEvents: 'none' }}>
        <DashboardImageRender
          students={students}
          calculatedRankings={calculatedRankings}
          dateStrings={dateStrings}
          range={range}
          period={period}
        />
      </div>

      {captureToast && (
        <div 
          className={`fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg z-[100] transition-opacity duration-500 ease-in-out ${
            captureToast.isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {captureToast.message}
        </div>
      )}
    </div>
  );
};
