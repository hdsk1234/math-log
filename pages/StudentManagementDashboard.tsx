import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { StudentData, HomeworkType } from '../types';
import { StudentList } from '../components/StudentList';
import { QuickUpdateDashboard } from '../components/QuickUpdateDashboard';
import { StudentRankings } from '../components/StudentRankings';
import { GraduationCap, LogOut, List, Zap, Copy, Trophy, Shield } from 'lucide-react';
import { DashboardExportModal } from '../components/DashboardExportModal';

interface Props {
  students: StudentData[];
  onSelectStudent: (id: string) => void;
  onAddStudent: (
    name: string,
    grade: string,
    school: string,
    pin: string,
    lessonDays?: string[],
    lessonFeeCycle?: number,
    parentPhone?: string,
    studentPhone?: string
  ) => void;
  onUpdateStudent: (student: StudentData) => void;
  onDeleteStudent: (id: string) => void;
  onLogout: () => void;
  canEdit?: boolean;
  userEmail?: string | null;
}

export const StudentManagementDashboard: React.FC<Props> = ({
  students,
  onSelectStudent,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onLogout,
  canEdit = false,
  userEmail = null,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode = (searchParams.get('tab') as 'list' | 'quick' | 'rankings') || 'list';
  const setViewMode = (mode: 'list' | 'quick' | 'rankings') => setSearchParams({ tab: mode });
  const [showToast, setShowToast] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Redirect if they land on quick update but don't have canEdit permissions
  useEffect(() => {
    if (!canEdit && viewMode === 'quick') {
      setSearchParams({ tab: 'list' });
    }
  }, [canEdit, viewMode, setSearchParams]);

  const handleCopyAssignment = async () => {
    const today = new Date(); // 오늘 날짜 객체
    const currentDay = today.getDay(); // 0: 일요일 ~ 6: 토요일
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1); // 어제 날짜 객체
    const todayMidnight = new Date(today);
    todayMidnight.setHours(0, 0, 0, 0);

    // 헤더용 이번 주 일요일~토요일 범위 계산
    const weekStart = new Date(yesterday);
    weekStart.setDate(yesterday.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const dateRangeStr = `${weekStart.getMonth() + 1}월 ${weekStart.getDate()}일 ~ ${weekEnd.getMonth() + 1}월 ${weekEnd.getDate()}일`;
    const todayLabel = `${yesterday.getMonth() + 1}월 ${yesterday.getDate()}일`;

    const header = `❗과제 체크 표(${dateRangeStr})\n\n[기상/30문제/해설] ${todayLabel}\n\n`;

    // 가장 가까운 과거의 일요일부터 어제까지의 날짜 배열 생성
    const daysToFetch = currentDay === 0 ? 7 : currentDay;
    const fetchDates = Array.from({ length: daysToFetch }).map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - daysToFetch + i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`; // 로컬 시간 기준 YYYY-MM-DD
    });

    // 학생 배열을 복사한 뒤 이름 기준 가나다순 정렬
    const sortedStudents = [...students]
      .filter(student => {
          if (!student.profile.endDate) return true; // endDate 값이 없는 경우 예외 처리
          const endDateObj = new Date(student.profile.endDate);
          endDateObj.setHours(0, 0, 0, 0);
          return endDateObj >= todayMidnight;
        })
      .sort((a, b) =>
      a.profile.name.localeCompare(b.profile.name)
    );

    const body = sortedStudents.map(student => {
      const startDateObj = new Date(student.profile.startDate);
      startDateObj.setHours(0, 0, 0, 0);

      const getFormattedStatus = (type: HomeworkType, isCountBased: boolean = false) => {
        const rawStatus = fetchDates.map(dateStr => {
          const currentDateObj = new Date(dateStr);
          currentDateObj.setHours(0, 0, 0, 0);

          // 1. 과외 시작일 이전인 경우
          if (currentDateObj < startDateObj) {
            return '_';
          }

          // 2. 시작일 이후 데이터 확인
          const daily = student.homework?.find(h => h.date === dateStr);
          const task = daily?.tasks?.find(t => t.type === type);

          // 3. 개수 기반(해설) vs 달성 여부 기반(기상, 30문제) 분기 처리
          if (isCountBased) {
            const count = task?.count || 0;
            return count.toString();
          } else {
            if (task?.completed) {
              return 'o';
            }
            return 'x';
          }
        }).join('');

        // 3일치 이후 띄어쓰기 적용
        return rawStatus.length > 3
          ? `${rawStatus.slice(0, 3)} ${rawStatus.slice(3)}`
          : rawStatus;
      };

      const wakeup = getFormattedStatus('wake_up');
      const problem = getFormattedStatus('problem_30');
      // 해설 칸은 개수 기반 모드(true)로 호출
      const explanation = getFormattedStatus('explanation', true);

      return `*${student.profile.name}: \t ${wakeup} / ${problem} / ${explanation}`;
    }).join('\n');

    const fullText = header + body;

    try {
      await navigator.clipboard.writeText(fullText);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
    }
  };

  const displayStudents = [...students].sort((a, b) => {
    const aFav = a.profile.isFavorite ? 1 : 0;
    const bFav = b.profile.isFavorite ? 1 : 0;
    if (aFav !== bFav) return bFav - aFav;
    return a.profile.name.localeCompare(b.profile.name);
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-10 relative">
      <header className="bg-white px-4 sm:px-6 py-4 border-b border-gray-100 sticky top-0 z-50">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="text-indigo-600" size={24} />
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight hidden md:block">과외 일지</h1>
            </div>

            {/* 데스크톱 상단 탭바 (sm 이상에서만 노출) */}
            <div className="hidden sm:flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <List size={14} /> 학생 관리
              </button>
              {canEdit && (
                <button
                  onClick={() => setViewMode('quick')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'quick'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  <Zap size={14} /> 빠른 기록
                </button>
              )}
              <button
                onClick={() => setViewMode('rankings')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'rankings'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <Trophy size={14} /> 과제 순위
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {userEmail && (
              <button
                onClick={() => navigate('/mypage')}
                className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 px-2.5 py-1.5 rounded-md text-indigo-700 font-semibold text-xs transition-all cursor-pointer"
                title="마이페이지로 이동"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                <span className="hidden sm:inline">{userEmail} (교사)</span>
                <span className="sm:hidden">{userEmail.split('@')[0]} (교사)</span>
              </button>
            )}
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 p-2 sm:px-3 sm:py-1.5 rounded-md transition-all border border-gray-200 cursor-pointer"
              title="과제 현황 대시보드 이미지 및 텍스트 양식을 생성합니다."
            >
              <Copy size={16} className="text-indigo-600" />
              <span className="hidden md:inline">과제 현황 이미지 생성</span>
              <span className="md:hidden text-[10px]">이미지 생성</span>
            </button>
            {userEmail?.toLowerCase() === 'hdsk1234@naver.com' && (
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 p-2 sm:px-3 sm:py-1.5 rounded-md transition-colors"
                title="관리자 설정"
              >
                <Shield size={16} />
                <span className="hidden sm:inline">관리자 페이지</span>
              </button>
            )}
            <button
              onClick={onLogout}
              className="text-gray-400 hover:text-gray-600 p-1.5 sm:p-2 rounded-full hover:bg-gray-100 transition-colors"
              title="로그아웃"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* 모바일 전용 하단 고정 탭바 */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 flex justify-around py-2 shadow-lg">
        <button
          onClick={() => setViewMode('list')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
            viewMode === 'list' ? 'text-indigo-600' : 'text-gray-400'
          }`}
        >
          <List size={20} />
          <span>학생 관리</span>
        </button>
        {canEdit && (
          <button
            onClick={() => setViewMode('quick')}
            className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
              viewMode === 'quick' ? 'text-indigo-600' : 'text-gray-400'
            }`}
          >
            <Zap size={20} />
            <span>빠른 기록</span>
          </button>
        )}
        <button
          onClick={() => setViewMode('rankings')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
            viewMode === 'rankings' ? 'text-indigo-600' : 'text-gray-400'
          }`}
        >
          <Trophy size={20} />
          <span>과제 순위</span>
        </button>
      </div>

      {viewMode === 'list' && (
        <StudentList
          students={displayStudents}
          onSelectStudent={onSelectStudent}
          onAddStudent={onAddStudent}
          onUpdateStudent={onUpdateStudent}
          onDeleteStudent={onDeleteStudent}
          canEdit={canEdit}
        />
      )}
      {viewMode === 'quick' && (
        <QuickUpdateDashboard
          students={displayStudents}
          onUpdateStudent={onUpdateStudent}
        />
      )}
      {viewMode === 'rankings' && (
        <StudentRankings
          students={students}
          onSelectStudent={onSelectStudent}
          onUpdateStudent={onUpdateStudent}
          role="teacher"
        />
      )}

      <div
        className={`fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg transition-opacity duration-500 z-50 ${showToast ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
      >
        과제 체크 양식이 클립보드에 복사되었습니다
      </div>

      <DashboardExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        students={students}
      />
    </div>
  );
};