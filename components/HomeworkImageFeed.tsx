import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { StudentData } from '../types';
import { Calendar as CalendarIcon, User, Loader2, Filter, ChevronLeft, ChevronRight, CheckCircle2, Image as ImageIcon } from 'lucide-react';

interface GeminiAnalysis {
  id: string;
  studentId: string;
  senderName: string;
  dateStr?: string;
  taskType?: string;
  imageUrl: string;
  analysisResult: string;
  createdAt: any;
}

interface Props {
  students: StudentData[];
  selectedStudentId?: string | null;
  onUpdateStudent?: (student: StudentData) => void;
}

export const HomeworkImageFeed: React.FC<Props> = ({ students, selectedStudentId = null, onUpdateStudent }) => {
  const [analyses, setAnalyses] = useState<GeminiAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStudentId, setFilterStudentId] = useState<string>(selectedStudentId || 'all');

  // 현재 달력의 연도 및 월 관리 (기본값: 오늘)
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0 ~ 11

  // 선택된 날짜 (기본값: 오늘 YYYY-MM-DD)
  const formatZeroPad = (n: number) => String(n).padStart(2, '0');
  const todayStr = `${today.getFullYear()}-${formatZeroPad(today.getMonth() + 1)}-${formatZeroPad(today.getDate())}`;
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  useEffect(() => {
    if (selectedStudentId) {
      setFilterStudentId(selectedStudentId);
    }
  }, [selectedStudentId]);

  // 선택된 날짜(selectedDate)를 기준으로 Firestore에서 인증 사진 쿼리
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'gemini_analyses'),
      where('dateStr', '==', selectedDate)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: GeminiAnalysis[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          studentId: data.studentId || '',
          senderName: data.senderName || '알 수 없음',
          dateStr: data.dateStr,
          taskType: data.taskType,
          imageUrl: data.imageUrl || '',
          analysisResult: data.analysisResult || '',
          createdAt: data.createdAt,
        });
      });
      
      list.sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });

      setAnalyses(list);
      setLoading(false);
    }, (error) => {
      console.error("Error subscribing homework analyses for date:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedDate]);

  // 수업 진행 중인(종료되지 않은) 학생 필터링 및 정렬 목록
  const sortedStudents = useMemo(() => {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    const activeStudents = students.filter(student => {
      if (!student.profile.endDate) return true;
      const endDateObj = new Date(student.profile.endDate);
      endDateObj.setHours(0, 0, 0, 0);
      return endDateObj >= todayMidnight;
    });

    return activeStudents.sort((a, b) => {
      const aFav = a.profile.isFavorite ? 1 : 0;
      const bFav = b.profile.isFavorite ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      return a.profile.name.localeCompare(b.profile.name);
    });
  }, [students]);

  // 필터 적용 대상 학생 목록
  const displayStudents = useMemo(() => {
    if (filterStudentId === 'all') return sortedStudents;
    return sortedStudents.filter(s => s.id === filterStudentId);
  }, [sortedStudents, filterStudentId]);

  // 필터링된 이미지 목록
  const displayAnalyses = useMemo(() => {
    return analyses.filter(item => {
      if (filterStudentId === 'all') return true;
      return item.studentId === filterStudentId || item.senderName === students.find(s => s.id === filterStudentId)?.profile.name;
    });
  }, [analyses, filterStudentId, students]);

  // 달력 연/월 이동
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // 달력 날짜 매트릭스 계산
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ dateStr: '', dayNum: 0, isCurrentMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${formatZeroPad(currentMonth + 1)}-${formatZeroPad(d)}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: true });
    }
    return days;
  }, [currentYear, currentMonth]);

  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // 학생별 제출 건수
  const studentSubmissionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    analyses.forEach(a => {
      if (a.studentId) counts[a.studentId] = (counts[a.studentId] || 0) + 1;
      const matched = students.find(s => s.profile.name === a.senderName);
      if (matched && matched.id !== a.studentId) {
        counts[matched.id] = (counts[matched.id] || 0) + 1;
      }
    });
    return counts;
  }, [analyses, students]);

  // --- 빠른 기록 업데이터 핸들러 ---
  const handleToggleProblem30 = (targetStudent: StudentData) => {
    if (!onUpdateStudent) return;
    const homeworkList = targetStudent.homework || [];
    const existingIndex = homeworkList.findIndex(h => h.date === selectedDate);
    let newHomeworkList = [...homeworkList];

    if (existingIndex !== -1) {
      const dayHomework = newHomeworkList[existingIndex];
      let tasks = dayHomework.tasks ? [...dayHomework.tasks] : [];
      const taskIdx = tasks.findIndex(t => t.type === 'problem_30');
      if (taskIdx !== -1) {
        const curCompleted = tasks[taskIdx].completed;
        tasks[taskIdx] = { ...tasks[taskIdx], completed: !curCompleted, count: !curCompleted ? 1 : 0 };
      } else {
        tasks.push({ type: 'problem_30', completed: true, count: 1 });
      }
      newHomeworkList[existingIndex] = { ...dayHomework, tasks };
    } else {
      newHomeworkList.push({
        date: selectedDate,
        tasks: [
          { type: 'wake_up', completed: false },
          { type: 'problem_30', completed: true, count: 1 },
          { type: 'explanation', completed: false, count: 0 }
        ]
      });
    }

    onUpdateStudent({ ...targetStudent, homework: newHomeworkList });
  };

  const handleUpdateExplanationCount = (targetStudent: StudentData, count: number) => {
    if (!onUpdateStudent) return;
    const targetCount = count < 0 ? 0 : count;
    const homeworkList = targetStudent.homework || [];
    const existingIndex = homeworkList.findIndex(h => h.date === selectedDate);
    let newHomeworkList = [...homeworkList];

    if (existingIndex !== -1) {
      const dayHomework = newHomeworkList[existingIndex];
      let tasks = dayHomework.tasks ? [...dayHomework.tasks] : [];
      const taskIdx = tasks.findIndex(t => t.type === 'explanation');
      if (taskIdx !== -1) {
        tasks[taskIdx] = { ...tasks[taskIdx], completed: targetCount > 0, count: targetCount };
      } else {
        tasks.push({ type: 'explanation', completed: targetCount > 0, count: targetCount });
      }
      newHomeworkList[existingIndex] = { ...dayHomework, tasks };
    } else {
      newHomeworkList.push({
        date: selectedDate,
        tasks: [
          { type: 'wake_up', completed: false },
          { type: 'problem_30', completed: false },
          { type: 'explanation', completed: targetCount > 0, count: targetCount }
        ]
      });
    }

    onUpdateStudent({ ...targetStudent, homework: newHomeworkList });
  };

  const getProblem30Status = (targetStudent: StudentData): boolean => {
    const day = targetStudent.homework?.find(h => h.date === selectedDate);
    return !!day?.tasks?.find(t => t.type === 'problem_30')?.completed;
  };

  const getExplanationCount = (targetStudent: StudentData): number => {
    const day = targetStudent.homework?.find(h => h.date === selectedDate);
    return day?.tasks?.find(t => t.type === 'explanation')?.count || 0;
  };

  return (
    <div className="max-w-6xl mx-auto p-2 sm:p-4 space-y-5">
      {/* 2열 레이아웃: 메인 캘린더 & 빠른 채점 피드 (좌측) + 학생 사이드바 (우측) */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        
        {/* 메인 피드 & 채점 영역 */}
        <div className="flex-1 w-full space-y-5">
          {/* 1. 캘린더 (Calendar) UI 컴포넌트 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <CalendarIcon size={18} className="text-indigo-600" />
                <h3 className="text-sm font-black text-gray-800">
                  {currentYear}년 {currentMonth + 1}월
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                  title="이전 달"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => {
                    setCurrentYear(today.getFullYear());
                    setCurrentMonth(today.getMonth());
                    setSelectedDate(todayStr);
                  }}
                  className="px-2.5 py-1 text-xs font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  오늘
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                  title="다음 달"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 text-center text-[11px] font-extrabold text-gray-400 border-b border-gray-50 pb-2">
              <span className="text-red-400">일</span>
              <span>월</span>
              <span>화</span>
              <span>수</span>
              <span>목</span>
              <span>금</span>
              <span className="text-blue-400">토</span>
            </div>

            {/* 일자 그리드 */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                if (!day.isCurrentMonth) {
                  return <div key={`empty-${idx}`} className="h-10" />;
                }

                const isSelected = day.dateStr === selectedDate;
                const isToday = day.dateStr === todayStr;

                return (
                  <button
                    key={day.dateStr}
                    onClick={() => setSelectedDate(day.dateStr)}
                    className={`h-10 rounded-xl flex flex-col items-center justify-center relative transition-all text-xs font-bold ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105 z-10'
                        : isToday
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>{day.dayNum}</span>
                    {isSelected && (
                      <span className="w-1 h-1 rounded-full bg-white mt-0.5"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. 선택된 날짜 헤더 & 총계 정보 */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-indigo-900 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                📅 {selectedDate}
              </span>
              {filterStudentId !== 'all' && (
                <span className="text-xs font-bold text-indigo-600 bg-indigo-100/70 px-2.5 py-1 rounded-xl">
                  👤 {students.find(s => s.id === filterStudentId)?.profile.name || '선택된 학생'}
                </span>
              )}
              <span className="text-xs font-bold text-gray-500">
                (총 {displayAnalyses.length}장 수신됨)
              </span>
            </div>
            {filterStudentId !== 'all' && !selectedStudentId && (
              <button
                onClick={() => setFilterStudentId('all')}
                className="text-[11px] font-bold text-indigo-600 hover:underline"
              >
                전체 보기로 해제
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2 bg-white rounded-2xl border border-gray-100">
              <Loader2 className="animate-spin text-indigo-600" size={28} />
              <span className="text-xs font-bold">선택한 날짜의 인증 사진 로딩 중...</span>
            </div>
          ) : (
            <div className="space-y-5">
              {/* --- [섹션 1] 📝 30문제 과제 관리 (작은 썸네일 + 성공 여부) --- */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-indigo-900 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                      📝 30문제 과제
                    </span>
                    <span className="text-xs font-bold text-gray-400">
                      (완료: {displayStudents.filter(s => getProblem30Status(s)).length}명 / 총 {displayStudents.length}명)
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {displayStudents.map(student => {
                    const photos = displayAnalyses.filter(a => 
                      (a.studentId === student.id || a.senderName === student.profile.name) && 
                      (a.taskType === 'problem_30' || a.taskType === 'unknown')
                    );
                    const isCompleted = getProblem30Status(student);

                    return (
                      <div key={`p30-${student.id}`} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 w-28 flex-shrink-0">
                          <User size={13} className="text-gray-400" />
                          <div>
                            <div className="text-xs font-bold text-gray-800">{student.profile.name}</div>
                            <div className="text-[10px] text-gray-400">{student.profile.grade || '학년 미기재'}</div>
                          </div>
                        </div>

                        {/* 매우 작게 표시되는 썸네일 리스트 (클릭 시 원본 모달) */}
                        <div className="flex-1 flex items-center gap-2 overflow-x-auto py-1 px-2">
                          {photos.length > 0 ? (
                            photos.map(photo => (
                              <div key={photo.id} className="relative group flex-shrink-0 cursor-pointer" onClick={() => setPreviewImageUrl(photo.imageUrl)}>
                                <img
                                  src={photo.imageUrl}
                                  alt="30문제 제출"
                                  className="w-11 h-11 object-cover rounded-xl border border-gray-200 shadow-sm group-hover:scale-105 transition-transform"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white text-[10px] font-bold">
                                  🔍
                                </div>
                              </div>
                            ))
                          ) : (
                            <span className="text-[11px] text-gray-400 font-medium italic bg-gray-50 px-2.5 py-1 rounded-md">
                              제출 사진 없음
                            </span>
                          )}
                        </div>

                        {/* 30문제 성공 여부 토글 버튼 */}
                        <button
                          type="button"
                          onClick={() => handleToggleProblem30(student)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0 ${
                            isCompleted
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100 scale-102'
                              : 'bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 border border-gray-200'
                          }`}
                        >
                          {isCompleted ? <><CheckCircle2 size={14} /> 30문제 성공</> : '+ 성공 체크'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* --- [섹션 2] 💡 해설 과제 관리 (작은 썸네일 + 개수 입력) --- */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-purple-900 bg-purple-50 px-3 py-1 rounded-lg border border-purple-100">
                      💡 해설 과제
                    </span>
                    <span className="text-xs font-bold text-gray-400">
                      (완료: {displayStudents.filter(s => getExplanationCount(s) > 0).length}명 / 총 {displayStudents.length}명)
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {displayStudents.map(student => {
                    const photos = displayAnalyses.filter(a => 
                      (a.studentId === student.id || a.senderName === student.profile.name) && 
                      a.taskType === 'explanation'
                    );
                    const count = getExplanationCount(student);

                    return (
                      <div key={`exp-${student.id}`} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 w-28 flex-shrink-0">
                          <User size={13} className="text-gray-400" />
                          <div>
                            <div className="text-xs font-bold text-gray-800">{student.profile.name}</div>
                            <div className="text-[10px] text-gray-400">{student.profile.grade || '학년 미기재'}</div>
                          </div>
                        </div>

                        {/* 매우 작게 표시되는 썸네일 리스트 (클릭 시 원본 모달) */}
                        <div className="flex-1 flex items-center gap-2 overflow-x-auto py-1 px-2">
                          {photos.length > 0 ? (
                            photos.map(photo => (
                              <div key={photo.id} className="relative group flex-shrink-0 cursor-pointer" onClick={() => setPreviewImageUrl(photo.imageUrl)}>
                                <img
                                  src={photo.imageUrl}
                                  alt="해설 제출"
                                  className="w-11 h-11 object-cover rounded-xl border border-gray-200 shadow-sm group-hover:scale-105 transition-transform"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white text-[10px] font-bold">
                                  🔍
                                </div>
                              </div>
                            ))
                          ) : (
                            <span className="text-[11px] text-gray-400 font-medium italic bg-gray-50 px-2.5 py-1 rounded-md">
                              제출 사진 없음
                            </span>
                          )}
                        </div>

                        {/* 해설 개수 선택 버튼 & 입력 박스 (빠른 기록 스타일) */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                            {[1, 2, 3, 4, 5].map(num => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => handleUpdateExplanationCount(student, count === num ? 0 : num)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                                  count === num
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                {num}개
                              </button>
                            ))}
                          </div>

                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              value={count || ''}
                              onChange={(e) => handleUpdateExplanationCount(student, parseInt(e.target.value) || 0)}
                              placeholder="0"
                              className="w-12 text-center text-xs font-extrabold bg-gray-50 border border-gray-300 rounded-lg py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <span className="text-xs font-bold text-gray-500">개</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 우측 세로 학생 필터 카드 목록 영역 */}
        {!selectedStudentId && (
          <div className="w-full lg:w-64 bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 space-y-3 sticky top-20 flex-shrink-0">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <div className="flex items-center gap-1.5">
                <Filter className="text-indigo-600" size={16} />
                <h4 className="text-xs font-black text-gray-800">학생 선택 필터</h4>
              </div>
              <span className="text-[10px] text-gray-400 font-bold">총 {students.length}명</span>
            </div>

            <div className="space-y-1.5 max-h-[500px] lg:max-h-[600px] overflow-y-auto pr-0.5">
              <button
                onClick={() => setFilterStudentId('all')}
                className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                  filterStudentId === 'all'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-black'
                    : 'bg-gray-50 text-gray-700 border-gray-100 hover:bg-gray-100 font-bold'
                }`}
              >
                <span className="text-xs flex items-center gap-1.5">
                  <User size={14} /> 전체 학생 보기
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  filterStudentId === 'all' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {analyses.length}장
                </span>
              </button>

              {sortedStudents.map(student => {
                const isSelected = filterStudentId === student.id;
                const count = studentSubmissionCounts[student.id] || 0;

                return (
                  <button
                    key={student.id}
                    onClick={() => setFilterStudentId(student.id)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100 scale-[1.02]'
                        : 'bg-white text-gray-800 border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/40'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="flex items-center gap-1 text-xs font-bold truncate">
                        <span>{student.profile.name}</span>
                        {student.profile.isFavorite && (
                          <span className="text-amber-400 text-[10px]">★</span>
                        )}
                      </div>
                      <div className={`text-[10px] truncate ${isSelected ? 'text-indigo-100' : 'text-gray-400'}`}>
                        {student.profile.school || '학교 미기재'} {student.profile.grade ? `(${student.profile.grade})` : ''}
                      </div>
                    </div>

                    {count > 0 ? (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold flex-shrink-0 flex items-center gap-0.5 ${
                        isSelected 
                          ? 'bg-emerald-400 text-gray-900' 
                          : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}>
                        <CheckCircle2 size={10} /> {count}장
                      </span>
                    ) : (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        isSelected ? 'text-indigo-200' : 'text-gray-300'
                      }`}>
                        0장
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 원본 사진 확대 모달 */}
      {previewImageUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl">
            <img 
              src={previewImageUrl} 
              alt="Expanded Submission" 
              className="max-w-full max-h-[85vh] object-contain rounded-xl"
            />
            <button 
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-3 right-3 bg-black/60 text-white rounded-full p-2 text-xs font-bold hover:bg-black/80"
            >
              ✕ 닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
