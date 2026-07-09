import React, { useState, useMemo } from 'react';
import { X, Copy, Download, Loader2, Calendar, Users, FileText } from 'lucide-react';
import { toPng, toBlob } from 'html-to-image';
import { StudentData, HomeworkType } from '../types';
import { DashboardImageRender, StudentStats } from './DashboardImageRender';

interface DashboardExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentData[];
}

export const DashboardExportModal: React.FC<DashboardExportModalProps> = ({
  isOpen,
  onClose,
  students,
}) => {
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [showGraduated, setShowGraduated] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'rate' | 'name'>('rate');

  // 1. 기준 날짜 설정 (기본값: 어제)
  const [targetDateString, setTargetDateString] = useState<string>(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const baseDate = useMemo(() => {
    const d = new Date(targetDateString);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [targetDateString]);

  // 2. 조회 기간 범위 계산 (기준 날짜 기반)
  const range = useMemo(() => {
    const date = new Date(baseDate);
    if (period === 'weekly') {
      const day = date.getDay(); // 0(일) ~ 6(토)
      const start = new Date(date);
      start.setDate(date.getDate() - day);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    } else if (period === 'monthly') {
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    } else {
      const start = new Date(date.getFullYear(), 0, 1);
      const end = new Date(date.getFullYear(), 11, 31);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
  }, [period, baseDate]);

  // 3. 날짜 문자열 배열 생성 (범위 내 전체 일자)
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

  // 4. 통계 및 랭킹 계산
  const calculatedRankings = useMemo(() => {
    const targetStudents = students.filter(student => {
      const studentStart = student.profile.startDate ? new Date(student.profile.startDate) : null;
      if (studentStart) studentStart.setHours(0, 0, 0, 0);

      const studentEnd = student.profile.endDate ? new Date(student.profile.endDate) : null;
      if (studentEnd) studentEnd.setHours(0, 0, 0, 0);

      const isGraduated = studentEnd ? studentEnd < baseDate : false;
      if (!showGraduated && isGraduated) {
        return false;
      }

      const startedBeforeEnd = studentStart ? studentStart <= range.end : true;
      const endedAfterStart = studentEnd ? studentEnd >= range.start : true;
      return startedBeforeEnd && endedAfterStart;
    });

    const statsList: StudentStats[] = targetStudents.map(student => {
      const totalPeriodDays = dateStrings.filter(dateStr => {
        const currentDate = new Date(dateStr);
        currentDate.setHours(0, 0, 0, 0);
        return currentDate <= baseDate;
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

        const isAfterStart = studentStart ? currentDate >= studentStart : true;
        const isBeforeEnd = studentEnd ? currentDate <= studentEnd : true;
        const isBeforeOrEqualToday = currentDate <= baseDate;

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

    let currentRank = 1;
    let prevRate = -1;
    let prevExp = -1;
    const ranked = sorted.map((item, index) => {
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

    if (sortBy === 'name') {
      return [...ranked].sort((a, b) => a.name.localeCompare(b.name));
    }
    return ranked;
  }, [students, dateStrings, range, baseDate, showGraduated, sortBy]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 이미지 저장
  const handleDownloadImage = async () => {
    const node = document.getElementById('dashboard-image-export-preview');
    if (!node) return;
    setIsGenerating(true);
    // Yield to the event loop so the browser can paint the loading overlay
    await new Promise(resolve => setTimeout(resolve, 300));
    try {
      const dataUrl = await toPng(node, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 1.5,
        skipFonts: true,
      });
      const link = document.createElement('a');
      link.download = `과제현황_${targetDateString}.png`;
      link.href = dataUrl;
      link.click();
      showToast("대시보드 이미지가 다운로드되었습니다.");
    } catch (error) {
      console.error(error);
      alert("이미지 다운로드 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  // 이미지 복사
  const handleCopyImage = async () => {
    const node = document.getElementById('dashboard-image-export-preview');
    if (!node) return;
    setIsGenerating(true);
    // Yield to the event loop so the browser can paint the loading overlay
    await new Promise(resolve => setTimeout(resolve, 300));
    try {
      const blobPromise = toBlob(node, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 1.5,
        skipFonts: true,
      }).then(blob => {
        if (!blob) throw new Error("Blob 생성 실패");
        return blob;
      });

      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blobPromise,
        }),
      ]);
      showToast("이미지가 클립보드에 복사되었습니다! 카톡에 붙여넣어 보세요.");
    } catch (error) {
      console.error(error);
      alert("이미지 복사에 실패했습니다. 브라우저 보안 정책에 의한 차단일 수 있습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  // 기존 텍스트 양식 복사 (기준일 연동)
  const handleCopyText = async () => {
    const currentDay = baseDate.getDay();
    
    // 헤더용 이번 주 일요일~토요일 범위 계산
    const weekStart = new Date(baseDate);
    weekStart.setDate(baseDate.getDate() - currentDay);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const dateRangeStr = `${weekStart.getMonth() + 1}월 ${weekStart.getDate()}일 ~ ${weekEnd.getMonth() + 1}월 ${weekEnd.getDate()}일`;
    const dateLabel = `${baseDate.getMonth() + 1}월 ${baseDate.getDate()}일`;

    const header = `❗과제 체크 표(${dateRangeStr})\n\n[기상/30문제/해설] ${dateLabel}\n\n`;

    // 가장 가까운 과거의 일요일부터 기준일까지의 날짜 배열 생성
    const daysToFetch = currentDay === 0 ? 7 : currentDay;
    const fetchDates = Array.from({ length: daysToFetch }).map((_, i) => {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - daysToFetch + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });

    const sortedStudents = [...students]
      .filter(student => {
        if (!student.profile.endDate) return true;
        const endDateObj = new Date(student.profile.endDate);
        endDateObj.setHours(0, 0, 0, 0);
        return endDateObj >= baseDate;
      })
      .sort((a, b) => a.profile.name.localeCompare(b.profile.name));

    const body = sortedStudents.map(student => {
      const startDateObj = new Date(student.profile.startDate);
      startDateObj.setHours(0, 0, 0, 0);

      const getFormattedStatus = (type: HomeworkType, isCountBased: boolean = false) => {
        const rawStatus = fetchDates.map(dateStr => {
          const currentDateObj = new Date(dateStr);
          currentDateObj.setHours(0, 0, 0, 0);

          if (currentDateObj < startDateObj) {
            return '_';
          }

          const daily = student.homework?.find(h => h.date === dateStr);
          const task = daily?.tasks?.find(t => t.type === type);

          if (isCountBased) {
            return (task?.count || 0).toString();
          } else {
            return task?.completed ? 'o' : 'x';
          }
        }).join('');

        return rawStatus.length > 3
          ? `${rawStatus.slice(0, 3)} ${rawStatus.slice(3)}`
          : rawStatus;
      };

      const wakeup = getFormattedStatus('wake_up');
      const problem = getFormattedStatus('problem_30');
      const explanation = getFormattedStatus('explanation', true);

      return `*${student.profile.name}: \t ${wakeup} / ${problem} / ${explanation}`;
    }).join('\n');

    const fullText = header + body;

    try {
      await navigator.clipboard.writeText(fullText);
      showToast("기존 텍스트 과제 양식이 클립보드에 복사되었습니다!");
    } catch (err) {
      console.error(err);
      alert("텍스트 복사에 실패했습니다.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <Calendar className="text-indigo-600" size={20} />
              과제 현황 이미지 생성 및 관리
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">원하는 기준일과 설정을 조율하여 공유용 체크표 이미지를 생성합니다.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
          
          {/* Controls Panel (Left side) */}
          <div className="w-full lg:w-80 flex flex-col gap-5 flex-shrink-0 bg-gray-50 p-5 rounded-2xl border border-gray-100">
            {/* 1. Date Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-500 uppercase tracking-wider block">기준 날짜 선택</label>
              <input
                type="date"
                value={targetDateString}
                onChange={(e) => setTargetDateString(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all cursor-pointer"
              />
            </div>

            {/* 2. Period Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-500 uppercase tracking-wider block">조회 기간 구분</label>
              <div className="grid grid-cols-3 bg-white p-1 rounded-xl border border-gray-200 gap-1">
                {(['weekly', 'monthly', 'yearly'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      period === p
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {p === 'weekly' ? '주간' : p === 'monthly' ? '월간' : '연간'}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Graduated Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-3 rounded-xl border border-gray-200 hover:bg-gray-100/50 transition-colors">
              <input
                type="checkbox"
                checked={showGraduated}
                onChange={(e) => setShowGraduated(e.target.checked)}
                className="w-4 h-4 text-indigo-600 bg-gray-50 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 transition-all cursor-pointer"
              />
              <span className="text-xs font-bold text-gray-700">종료(졸업)생 포함</span>
            </label>

            {/* 4. Sort Order */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-500 uppercase tracking-wider block">정렬 기준</label>
              <div className="grid grid-cols-2 bg-white p-1 rounded-xl border border-gray-200 gap-1">
                {(['rate', 'name'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSortBy(s)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      sortBy === s
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {s === 'rate' ? '제출률순' : '이름순 (가나다)'}
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* 4. Actions */}
            <div className="space-y-2.5 mt-auto">
              <button
                onClick={handleCopyImage}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-2.5 rounded-xl text-xs font-black shadow-md shadow-indigo-100 hover:shadow-lg transition-all cursor-pointer"
              >
                {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
                이미지 클립보드 복사
              </button>
              
              <button
                onClick={handleDownloadImage}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 disabled:bg-gray-50 text-gray-700 border border-gray-200 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                이미지 파일 저장
              </button>

              <button
                onClick={handleCopyText}
                className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="기존 텍스트 형식의 과제체크 양식을 복사합니다."
              >
                <FileText size={14} />
                기존 텍스트 양식 복사
              </button>
            </div>
          </div>

          {/* Preview Panel (Right side) */}
          <div className="flex-1 bg-gray-100 rounded-2xl border border-gray-200 overflow-hidden relative flex flex-col min-h-[300px] lg:min-h-0">
            {/* Generating Loading Overlay */}
            {isGenerating && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-50 flex flex-col items-center justify-center gap-3 animate-in fade-in duration-200">
                <Loader2 size={36} className="text-indigo-600 animate-spin" />
                <span className="text-sm font-black text-gray-700">이미지 파일 생성 중...</span>
              </div>
            )}

            {/* Preview Banner Header */}
            <div className="bg-gray-200/50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500">대시보드 이미지 미리보기</span>
              <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-400 font-bold">1000px</span>
            </div>

            {/* Image Preview Container (Scaled down slightly to fit or scrollable) */}
            <div className="flex-1 overflow-auto p-6 flex justify-start items-start">
              {/* Scaled wrapper to fit nicely on medium screens */}
              <div className="origin-top-left scale-[0.55] sm:scale-[0.65] md:scale-[0.7] lg:scale-[0.75] xl:scale-[0.85] shadow-xl rounded-2xl bg-white flex-shrink-0">
                <div id="dashboard-image-export-preview" className="bg-white">
                  <DashboardImageRender
                    students={students}
                    calculatedRankings={calculatedRankings}
                    dateStrings={dateStrings}
                    range={range}
                    period={period}
                    targetDate={baseDate}
                    id="dashboard-image-export-render"
                    sortBy={sortBy}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg z-[200] text-xs font-bold animate-in fade-in slide-in-from-bottom-2 duration-300">
          {toastMessage}
        </div>
      )}
    </div>
  );
};
