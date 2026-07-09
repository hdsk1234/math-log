import React from 'react';
import { StudentData, LessonLog } from '../types';
import { BookOpen, Calendar, Star, CheckCircle, Award, Lightbulb } from 'lucide-react';

interface ParentReportRenderProps {
  student: StudentData;
  selectedLogsCount: number; // 최근 몇 회차 수업을 보여줄지 (예: 4, 8)
  parentFeedback: string;    // 선생님이 작성한 피드백 코멘트
  targetId?: string;         // html-to-image 캡처용 ID
}

export const ParentReportRender: React.FC<ParentReportRenderProps> = ({
  student,
  selectedLogsCount,
  parentFeedback,
  targetId = 'parent-report-card-capture',
}) => {
  const profile = student.profile;
  const homework = student.homework || [];
  const lessonLogs = student.lessonLogs || [];
  const weakPoints = student.weakPoints || [];
  const textbooks = student.textbooks || [];

  // 전체 수업 로그를 날짜 오름차순으로 정렬
  const sortedLogs = [...lessonLogs].sort((a, b) => a.date.localeCompare(b.date));

  // 화면 렌더링용 최근 N개 수업 로그 리스트 (최신순)
  const recentLogs = [...sortedLogs].reverse().slice(0, selectedLogsCount);

  // 최근 N개 수업 로그가 포함된 시작 인덱스 구하기
  const startIndex = Math.max(0, sortedLogs.length - selectedLogsCount);
  const startLog = sortedLogs[startIndex];
  const nextLog = sortedLogs[startIndex + selectedLogsCount]; // n+1번째 수업 로그

  // 시작일과 끝일 계산
  const startDateStr = startLog ? startLog.date : '';
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  let endDateStr = todayStr;
  if (nextLog) {
    const nextDate = new Date(nextLog.date);
    nextDate.setDate(nextDate.getDate() - 1);
    const ey = nextDate.getFullYear();
    const em = String(nextDate.getMonth() + 1).padStart(2, '0');
    const ed = String(nextDate.getDate()).padStart(2, '0');
    endDateStr = `${ey}-${em}-${ed}`;
  }

  // 시작일부터 끝일(n+1 수업일 또는 오늘)까지의 모든 날짜 생성
  const targetDates: string[] = [];
  if (startDateStr) {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    let temp = new Date(start);
    const maxIterations = 1000;
    let iterations = 0;
    while (temp <= end && iterations < maxIterations) {
      iterations++;
      const y = temp.getFullYear();
      const m = String(temp.getMonth() + 1).padStart(2, '0');
      const d = String(temp.getDate()).padStart(2, '0');
      targetDates.push(`${y}-${m}-${d}`);
      temp.setDate(temp.getDate() + 1);
    }
  }

  // 지정된 기간 동안의 과제 수행률 계산
  let totalTasks = 0;
  let completedTasks = 0;
  let wakeUpCompleted = 0;
  let problem30Completed = 0;
  let explanationCompleted = 0;
  let totalExplanationCount = 0;

  targetDates.forEach(dateStr => {
    const day = homework.find(d => d.date === dateStr);
    const wakeUpTask = day?.tasks?.find(t => t.type === 'wake_up');
    const problem30Task = day?.tasks?.find(t => t.type === 'problem_30');
    const explanationTask = day?.tasks?.find(t => t.type === 'explanation');

    totalTasks += 3;

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
  });

  const activeDays = targetDates.length;
  const overallRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const wakeUpRate = activeDays === 0 ? 0 : Math.round((wakeUpCompleted / activeDays) * 100);
  const problem30Rate = activeDays === 0 ? 0 : Math.round((problem30Completed / activeDays) * 100);
  const explanationRate = activeDays === 0 ? 0 : Math.round((explanationCompleted / activeDays) * 100);

  // 오늘 날짜 문자열
  const todayString = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const renderStars = (understanding: number) => {
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={12}
            className={i < understanding ? "text-amber-400 fill-amber-400" : "text-gray-200"}
          />
        ))}
      </div>
    );
  };

  return (
    <div
      id={targetId}
      className="bg-slate-50 text-gray-900 w-[480px] rounded-3xl overflow-hidden border border-gray-100 flex flex-col p-6 gap-5 shadow-sm"
      style={{ fontFamily: '"Pretendard", -apple-system, BlinkMacSystemFont, sans-serif' }}
    >
      {/* Header Card (Gradient background) */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 text-white rounded-2xl p-5 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-6 -mt-6 blur-md"></div>
        <span className="text-[10px] uppercase font-black tracking-widest bg-white/10 px-2 py-0.5 rounded border border-white/10">
          Math Tutoring Report
        </span>
        <h1 className="text-2xl font-black mt-2.5 tracking-tight flex items-baseline gap-1.5">
          {profile.name} <span className="text-sm font-semibold text-indigo-100">학생 학습 리포트</span>
        </h1>
        <p className="text-xs text-indigo-100 font-bold mt-1">
          {profile.school && `${profile.school} • `}{profile.grade && `${profile.grade}`}
        </p>

        <div className="border-t border-white/10 mt-4 pt-3 flex justify-between items-center text-xs font-bold text-indigo-100">
          <span>최근 {selectedLogsCount}회차 분석 리포트</span>
          <span className="bg-indigo-500/30 px-2.5 py-1 rounded-lg border border-indigo-400/20">{todayString}</span>
        </div>
      </div>

      {/* Homework Stats */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col gap-3">
        <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <Award size={14} className="text-indigo-500" />
          최근 과제 달성 현황 (평균 {overallRate}%)
        </h3>
        
        <div className="grid grid-cols-3 gap-2.5">
          {/* 기상 */}
          <div className="bg-blue-50/40 rounded-xl p-3 border border-blue-50/80 flex flex-col items-center justify-between text-center min-h-[85px]">
            <span className="text-[10px] text-blue-500 font-bold">기상 과제</span>
            <span className="text-base font-black text-blue-700 mt-1">{wakeUpRate}%</span>
            <div className="w-full bg-blue-100/60 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div className="bg-blue-500 h-full rounded-full" style={{ width: `${wakeUpRate}%` }}></div>
            </div>
          </div>

          {/* 30문제 */}
          <div className="bg-emerald-50/40 rounded-xl p-3 border border-emerald-50/80 flex flex-col items-center justify-between text-center min-h-[85px]">
            <span className="text-[10px] text-emerald-500 font-bold">매일 30문제</span>
            <span className="text-base font-black text-emerald-700 mt-1">{problem30Rate}%</span>
            <div className="w-full bg-emerald-100/60 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${problem30Rate}%` }}></div>
            </div>
          </div>

          {/* 해설 */}
          <div className="bg-purple-50/40 rounded-xl p-3 border border-purple-50/80 flex flex-col items-center justify-between text-center min-h-[85px]">
            <span className="text-[10px] text-purple-500 font-bold">해설 작성</span>
            <span className="text-base font-black text-purple-700 mt-1">{explanationRate}%</span>
            <span className="text-[9px] text-purple-400 font-bold mt-0.5">총 {totalExplanationCount}개 작성</span>
          </div>
        </div>
      </div>

      {/* Textbooks Progress */}
      {textbooks.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col gap-3">
          <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen size={14} className="text-indigo-500" />
            학습 교재 진행 현황
          </h3>
          <div className="flex flex-col gap-2.5">
            {textbooks.map((book) => {
              // 진행률 계산
              const totalSteps = book.totalSteps || 10;
              const completedSteps = book.completedRanges?.reduce((sum, r) => sum + (r.end - r.start + 1), 0) || 0;
              const progressPercent = Math.min(100, Math.round((completedSteps / totalSteps) * 100));

              return (
                <div key={book.id} className="flex justify-between items-center bg-gray-50/60 p-2.5 rounded-xl border border-gray-100">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                      <span className="truncate max-w-[200px]">{book.title}</span>
                      <span className="text-indigo-600">{progressPercent}% ({completedSteps}/{totalSteps}단계)</span>
                    </div>
                    <div className="w-full bg-gray-200/60 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lesson Logs */}
      {recentLogs.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col gap-3">
          <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={14} className="text-indigo-500" />
            최근 수업 일지 (최대 {selectedLogsCount}회)
          </h3>
          <div className="flex flex-col gap-3 divide-y divide-gray-100">
            {recentLogs.map((log, index) => {
              const formattedDate = new Date(log.date).toLocaleDateString('ko-KR', {
                month: 'short',
                day: 'numeric',
              });

              return (
                <div key={log.date} className={`flex gap-3 text-xs pt-3 ${index === 0 ? 'pt-0' : ''}`}>
                  <div className="text-center font-bold text-gray-400 flex flex-col justify-start">
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full block mb-1">
                      {log.session ? `${log.session}회차` : '-'}
                    </span>
                    <span className="text-[10px] text-gray-500">{formattedDate}</span>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-gray-800">{log.unit || "수업 진행"}</span>
                      {renderStars(log.understanding)}
                    </div>
                    <p className="text-gray-600 leading-relaxed break-all whitespace-pre-wrap">{log.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weak points */}
      {weakPoints.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col gap-2.5">
          <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Lightbulb size={14} className="text-amber-500" />
            집중 보완 필요 사항
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {weakPoints.slice(0, 3).map((wp, i) => (
              <span 
                key={i} 
                className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-lg"
              >
                {wp.category}: {wp.description}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Teacher's Feedback */}
      {parentFeedback && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col gap-2">
          <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle size={14} className="text-indigo-500" />
            선생님 피드백 코멘트
          </h3>
          <p className="text-xs text-gray-700 leading-relaxed break-all whitespace-pre-wrap bg-indigo-50/20 p-3 rounded-xl border border-indigo-50/50">
            {parentFeedback}
          </p>
        </div>
      )}
    </div>
  );
};
