
import React, { useState, useMemo } from 'react';
import { 
  StudentData, 
  UserRole, 
  HomeworkType, 
  LessonLog,
  UnitMastery,
  WeakPoint,
  Textbook
} from '../types';
import { HomeworkCalendar } from '../components/HomeworkCalendar';
import { WeakPointList } from '../components/WeakPointList';
import { ComparisonChart } from '../components/ComparisonChart';
import { MasteryChart } from '../components/MasteryChart';
import { LessonTable } from '../components/LessonTable';
import { TextbookTracker } from '../components/TextbookTracker';
import { UpcomingAssignments } from '../components/UpcomingAssignments';
import { Card } from '../components/Card';
import { useNavigate } from 'react-router-dom';
import { StudentRankings } from '../components/StudentRankings';
import { ParentReportModal } from '../components/ParentReportModal';
import { 
  GraduationCap, LogOut, Settings, ArrowLeft, Pencil, X, Edit2, Copy, Trophy, BookOpen, Send
} from 'lucide-react';

interface Props {
  student: StudentData;
  students?: StudentData[];
  currentUserRole: UserRole;
  onUpdateStudent: (updatedStudent: StudentData) => void;
  onDeleteStudent: (id: string) => void;
  onBack?: () => void;
  onLogout: () => void;
  canEdit?: boolean;
  userEmail?: string | null;
}

export const StudentJournalDashboard: React.FC<Props> = ({
  student,
  students = [],
  currentUserRole,
  onUpdateStudent,
  onDeleteStudent,
  onBack,
  onLogout,
  canEdit = false,
  userEmail = null
}) => {
  if (!student) return <div>Loading...</div>;
  
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'journal' | 'rankings'>('journal');
  const isAdmin = currentUserRole === 'teacher' && !!canEdit;
  const [isParentReportModalOpen, setIsParentReportModalOpen] = useState(false);

  // toastMessage State
  const [toast, setToast] = useState<{ message: string; isVisible: boolean } | null>(null);
  
  // --- Profile Editing State ---
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSchool, setEditSchool] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editNewPin, setEditNewPin] = useState('');
  const [isResettingPin, setIsResettingPin] = useState(false);
  const [editLessonDays, setEditLessonDays] = useState<string[]>([]);
  const [editLessonFeeCycle, setEditLessonFeeCycle] = useState<number | ''>('');
  const [editParentPhone, setEditParentPhone] = useState('');
  const [editStudentPhone, setEditStudentPhone] = useState('');

  // 수업일과 수업 일지를 양방향으로 자동 동기화하는 함수
  const syncLessonLogs = (updatedStudent: StudentData): StudentData => {
    const homework = updatedStudent.homework || [];
    const profile = updatedStudent.profile;
    const currentLogs = updatedStudent.lessonLogs || [];
    
    if (!profile.startDate || !profile.lessonDays || profile.lessonDays.length === 0) {
      return updatedStudent;
    }

    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const startDateObj = new Date(profile.startDate);
    startDateObj.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDateObj = profile.endDate ? new Date(profile.endDate) : null;
    if (endDateObj) endDateObj.setHours(0, 0, 0, 0);

    // 동기화 마감 기준일 = 오늘(today)과 종료일(endDate) 중 이른 날짜
    const targetEndObj = endDateObj && endDateObj < today ? endDateObj : today;

    const lessonDates = new Set<string>();

    // 1. 수업 시작일부터 마감 기준일(오늘)까지 모든 날짜를 돌며 수업 요일에 해당하는 날짜 수집
    let tempDate = new Date(startDateObj);
    const maxIterations = 10000;
    let iterations = 0;
    while (tempDate <= targetEndObj && iterations < maxIterations) {
      iterations++;
      const yyyy = tempDate.getFullYear();
      const mm = String(tempDate.getMonth() + 1).padStart(2, '0');
      const dd = String(tempDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const dayName = dayNames[tempDate.getDay()];
      const isScheduledDay = profile.lessonDays.includes(dayName);

      const dayRecord = homework.find(d => d.date === dateStr);
      let isLesson = isScheduledDay;
      if (dayRecord && dayRecord.hasLesson !== undefined) {
        isLesson = dayRecord.hasLesson;
      }

      if (isLesson) {
        lessonDates.add(dateStr);
      }

      tempDate.setDate(tempDate.getDate() + 1);
    }

    // 2. 마감 기준일(오늘) 이후의 날짜에 대해서는, homework에 이미 기록이 있으면서 hasLesson이 true인 것만 수집
    homework.forEach(day => {
      const [y, m, d] = day.date.split('-').map(Number);
      const dayDate = new Date(y, m - 1, d);
      dayDate.setHours(0, 0, 0, 0);

      if (dayDate > targetEndObj) {
        if (day.hasLesson === true) {
          lessonDates.add(day.date);
        }
      }
    });

    const lessonDatesArray = Array.from(lessonDates).sort();

    let logsChanged = false;
    let updatedLogs = [...currentLogs];

    // 3. 수업일인데 수업 일지(LessonLog)가 없으면 생성
    lessonDatesArray.forEach(dateStr => {
      const exists = updatedLogs.some(log => log.date === dateStr);
      if (!exists) {
        updatedLogs.push({
          date: dateStr,
          unit: '',
          content: '수업 예정',
          understanding: 3
        });
        logsChanged = true;
      }
    });

    // 4. 수업일이 아닌데 수업 일지가 등록되어 있으면 삭제
    const initialLen = updatedLogs.length;
    updatedLogs = updatedLogs.filter(log => lessonDatesArray.includes(log.date));
    if (updatedLogs.length !== initialLen) {
      logsChanged = true;
    }

    // 5. 날짜 순으로 정렬하고 세션(회차) 번호를 순차적으로 자동 계산하여 매김
    updatedLogs.sort((a, b) => a.date.localeCompare(b.date));
    updatedLogs.forEach((log, index) => {
      if (log.session !== index + 1) {
        log.session = index + 1;
        logsChanged = true;
      }
    });

    // 6. homework 배열에 수업일 날짜들의 레코드가 아예 없다면 자동으로 채워넣어 주기
    let homeworkChanged = false;
    let updatedHomework = [...homework];
    lessonDatesArray.forEach(dateStr => {
      const exists = updatedHomework.some(h => h.date === dateStr);
      if (!exists) {
        updatedHomework.push({
          date: dateStr,
          hasLesson: true,
          tasks: [
            { type: 'wake_up', completed: false },
            { type: 'problem_30', completed: false },
            { type: 'explanation', completed: false }
          ]
        });
        homeworkChanged = true;
      } else {
        const idx = updatedHomework.findIndex(h => h.date === dateStr);
        if (updatedHomework[idx].hasLesson !== true) {
          updatedHomework[idx] = { ...updatedHomework[idx], hasLesson: true };
          homeworkChanged = true;
        }
      }
    });

    if (logsChanged || homeworkChanged) {
      return {
        ...updatedStudent,
        homework: updatedHomework,
        lessonLogs: updatedLogs
      };
    }
    return updatedStudent;
  };

  const handleUpdateStudentAndSync = (updatedStudent: StudentData) => {
    const synced = syncLessonLogs(updatedStudent);
    onUpdateStudent(synced);
  };

  // 대시보드 로드 시 시작일부터 오늘까지의 모든 수업일지를 자동으로 보정하여 DB에 저장
  React.useEffect(() => {
    const synced = syncLessonLogs(student);
    const isDifferent = JSON.stringify(student.lessonLogs) !== JSON.stringify(synced.lessonLogs) ||
                        JSON.stringify(student.homework) !== JSON.stringify(synced.homework);

    if (isDifferent) {
      onUpdateStudent(synced);
    }
  }, [student.id, student.profile.lessonDays, student.profile.startDate, student.profile.endDate]);

  // --- Teacher Note Editing State ---
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteContent, setNoteContent] = useState('');

  // --- Selected Month for Stats ---
  const [selectedStatsMonth, setSelectedStatsMonth] = useState(new Date());

  // --- Stats Calculation Logic (Monthly Focused) ---
  const comparisonData = useMemo(() => {
    const studentsList = students || [student];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const year = selectedStatsMonth.getFullYear();
    const month = selectedStatsMonth.getMonth(); // 0-11
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const getStudentMonthlyStats = (s: StudentData) => {
      const homework = s.homework || [];
      const stats = {
        wake_up: { total: 0, completed: 0 },
        problem_30: { total: 0, completed: 0 },
        explanation: { total: 0, completed: 0 }
      };

      for (let day = 1; day <= daysInMonth; day++) {
        const currentDay = new Date(year, month, day);
        if (currentDay > today) continue;
        if (s.profile.startDate) {
          const startDate = new Date(s.profile.startDate);
          startDate.setHours(0, 0, 0, 0);
          if (currentDay < startDate) continue;
        }
        if (s.profile.endDate) {
          const endDate = new Date(s.profile.endDate);
          endDate.setHours(0, 0, 0, 0);
          if (currentDay > endDate) continue;
        }

        const dateStr = `${currentDay.getFullYear()}-${String(currentDay.getMonth() + 1).padStart(2, '0')}-${String(currentDay.getDate()).padStart(2, '0')}`;
        const homeworkRecord = homework.find(h => h.date === dateStr);

        (['wake_up', 'problem_30', 'explanation'] as const).forEach(type => {
          stats[type].total += 1;
          if (homeworkRecord && homeworkRecord.tasks) {
            const task = homeworkRecord.tasks.find(t => t.type === type);
            if (task?.completed) {
              stats[type].completed += 1;
            }
          }
        });
      }

      const totalTasks = stats.wake_up.total + stats.problem_30.total + stats.explanation.total;
      const completedTasks = stats.wake_up.completed + stats.problem_30.completed + stats.explanation.completed;
      const overall = totalTasks === 0 ? 0 : completedTasks / totalTasks;

      return {
        id: s.id,
        overall,
        totalTasks,
        stats
      };
    };

    const allStats = studentsList.map(getStudentMonthlyStats).filter(item => item.totalTasks > 0);

    const currentStudentStats = allStats.find(item => item.id === student.id) || {
      stats: {
        wake_up: { total: 0, completed: 0 },
        problem_30: { total: 0, completed: 0 },
        explanation: { total: 0, completed: 0 }
      }
    };

    const getRate = (itemStats: typeof currentStudentStats.stats, type: 'wake_up' | 'problem_30' | 'explanation') => {
      const { total, completed } = itemStats[type];
      return total === 0 ? 0 : Math.round((completed / total) * 100);
    };

    const studentWakeUp = getRate(currentStudentStats.stats, 'wake_up');
    const studentProblem = getRate(currentStudentStats.stats, 'problem_30');
    const studentExplanation = getRate(currentStudentStats.stats, 'explanation');

    let avgWakeUp = 75;
    let avgProblem = 80;
    let avgExplanation = 55;

    if (allStats.length > 0) {
      allStats.sort((a, b) => b.overall - a.overall);

      const topCount = Math.max(1, Math.ceil(allStats.length * 0.1));
      const topStudents = allStats.slice(0, topCount);

      const sumRates = { wake_up: 0, problem_30: 0, explanation: 0 };
      topStudents.forEach(item => {
        sumRates.wake_up += getRate(item.stats, 'wake_up');
        sumRates.problem_30 += getRate(item.stats, 'problem_30');
        sumRates.explanation += getRate(item.stats, 'explanation');
      });

      avgWakeUp = Math.round(sumRates.wake_up / topCount);
      avgProblem = Math.round(sumRates.problem_30 / topCount);
      avgExplanation = Math.round(sumRates.explanation / topCount);
    }

    return [
      { category: '기상 과제', student: studentWakeUp, average: avgWakeUp },
      { category: '매일 30문제', student: studentProblem, average: avgProblem },
      { category: '해설 작성', student: studentExplanation, average: avgExplanation },
    ];
  }, [student, students, selectedStatsMonth]);

  // --- Handlers ---

const handleCopyReport = async () => {
    if (!isAdmin) return;

    const today = new Date();
    const month = today.getMonth() + 1;
    const dateStr = today.getDate();
    const sessionCount = (student.lessonLogs?.length || 0);

    // 1. 당월 과제 달성률 계산
    const stats = {
      wake_up: { total: 0, completed: 0 },
      problem_30: { total: 0, completed: 0 },
      explanation: { total: 0, completed: 0 }
    };

    today.setHours(0, 0, 0, 0);
    const year = today.getFullYear();
    const monthIndex = today.getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const homework = student.homework || [];

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDay = new Date(year, monthIndex, day);
      if (currentDay > today) continue;
      if (student.profile.startDate) {
        const startDate = new Date(student.profile.startDate);
        startDate.setHours(0,0,0,0);
        if (currentDay < startDate) continue;
      }

      const formattedDateStr = `${currentDay.getFullYear()}-${String(currentDay.getMonth() + 1).padStart(2, '0')}-${String(currentDay.getDate()).padStart(2, '0')}`;
      const homeworkRecord = homework.find(h => h.date === formattedDateStr);

      (['wake_up', 'problem_30', 'explanation'] as const).forEach(type => {
        stats[type].total += 1;
        if (homeworkRecord?.tasks?.find(t => t.type === type)?.completed) {
          stats[type].completed += 1;
        }
      });
    }

    const formatRate = (type: keyof typeof stats) => {
      const { total, completed } = stats[type];
      const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
      return `${percent}%(${completed}/${total})`;
    };

    const latestLog = student.lessonLogs && student.lessonLogs.length > 0 
      ? student.lessonLogs[student.lessonLogs.length - 1] 
      : null;
    const lessonContent = latestLog?.content || '1. 내용을 입력해주세요.';

    // 2. 텍스트 포맷팅
    let reportText = `${month}월 ${dateStr}일 (${sessionCount}회차) 수업 내용 및 과제 안내드립니다!\n\n`;
    reportText += `❗ 과제1: 기상인증 성공률: ${formatRate('wake_up')}\n`;
    reportText += `❗ 과제2: 30문제 풀이 성공률: ${formatRate('problem_30')}\n`;
    reportText += `❗ 과제3: 1일 1제 해설 작성 성공률: ${formatRate('explanation')}\n\n`;

    reportText += `✅ 수업 진행 내용\n${lessonContent}\n\n`;
    reportText += `✅ 숙제\n`;

    // 날짜(M/D)에 요일을 추가하는 헬퍼 함수
    const getDateWithDay = (dateString: string) => {
      const parts = dateString.split('/');
      if (parts.length === 2) {
        const m = parseInt(parts[0], 10);
        const d = parseInt(parts[1], 10);
        if (!isNaN(m) && !isNaN(d)) {
          const currentYear = new Date().getFullYear();
          const targetDate = new Date(currentYear, m - 1, d);
          const days = ['일', '월', '화', '수', '목', '금', '토'];
          return `${dateString}(${days[targetDate.getDay()]})`;
        }
      }
      return dateString;
    };

    // 숙제를 카테고리별로 그룹화 (요일 포함 적용)
    const categoryMap: Record<string, string[]> = {};
    student.upcomingAssignments?.schedules?.forEach(schedule => {
      const dateWithDay = getDateWithDay(schedule.date);
      schedule.categories.forEach(category => {
        if (!categoryMap[category.title]) categoryMap[category.title] = [];
        category.items.forEach(item => {
          categoryMap[category.title].push(`${dateWithDay} ${item.text}`);
        });
      });
    });

    Object.entries(categoryMap).forEach(([title, items]) => {
      reportText += `${title}\n`;
      items.forEach(item => {
        reportText += `${item}\n`;
      });
      reportText += `\n`;
    });

    // 3. 클립보드 복사 및 Toast 알림
    try {
      await navigator.clipboard.writeText(reportText.trim());
      setToast({ message: '수업 일지 양식이 클립보드에 복사되었습니다.', isVisible: true });
      
      setTimeout(() => setToast(prev => prev ? { ...prev, isVisible: false } : null), 2500);
      setTimeout(() => setToast(null), 3000);
      
    } catch (err) {
      console.error('복사 실패:', err);
      setToast({ message: '복사에 실패했습니다.', isVisible: true });
      
      setTimeout(() => setToast(prev => prev ? { ...prev, isVisible: false } : null), 2500);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const startEditingProfile = () => {
    setEditName(student.profile.name);
    setEditSchool(student.profile.school);
    setEditGrade(student.profile.grade);
    setEditStartDate(student.profile.startDate || new Date().toISOString().split('T')[0]);
    setEditEndDate(student.profile.endDate || '');
    setEditLessonDays(student.profile.lessonDays || []);
    setEditLessonFeeCycle(student.profile.lessonFeeCycle !== undefined ? student.profile.lessonFeeCycle : '');
    setEditParentPhone(student.profile.parentPhone || '');
    setEditStudentPhone(student.profile.studentPhone || '');
    setIsResettingPin(false);
    setEditNewPin('');
    setIsEditingProfile(true);
  };

  const handleProfileUpdate = async () => {
    if (isResettingPin && editNewPin.length !== 8) {
      alert('PIN 번호는 반드시 8자리 숫자여야 합니다.');
      return;
    }

    let updatedProfile = { 
      ...student.profile, 
      name: editName, 
      school: editSchool, 
      grade: editGrade,
      startDate: editStartDate,
      endDate: editEndDate,
      lessonDays: editLessonDays.length > 0 ? editLessonDays : undefined,
      lessonFeeCycle: editLessonFeeCycle !== '' ? Number(editLessonFeeCycle) : undefined,
      parentPhone: editParentPhone || undefined,
      studentPhone: editStudentPhone || undefined
    };

    if (isResettingPin && editNewPin) {
      const hashedPin = await hashPin(editNewPin);
      updatedProfile.pinHash = hashedPin;
    }

    handleUpdateStudentAndSync({
      ...student,
      profile: updatedProfile
    });
    setIsEditingProfile(false);
  };

  const toggleHomeworkTask = (date: string, taskIndex: number) => {
    if (!isAdmin) return;
    const homework = student.homework || [];
    const existingDayIndex = homework.findIndex(d => d.date === date);
    let newHomework = [...homework];

    if (existingDayIndex !== -1) {
      const day = newHomework[existingDayIndex];
      let currentTasks = day.tasks || [];
      if (currentTasks.length === 0) {
          currentTasks = [
            { type: 'wake_up' as HomeworkType, completed: false },
            { type: 'problem_30' as HomeworkType, completed: false },
            { type: 'explanation' as HomeworkType, completed: false },
          ];
      }
      const newTasks = [...currentTasks];
      newTasks[taskIndex] = { ...newTasks[taskIndex], completed: !newTasks[taskIndex].completed };
      newHomework[existingDayIndex] = { ...day, tasks: newTasks };
    } else {
      const newTasks = [
        { type: 'wake_up' as HomeworkType, completed: false },
        { type: 'problem_30' as HomeworkType, completed: false },
        { type: 'explanation' as HomeworkType, completed: false },
      ];
      newTasks[taskIndex].completed = true;
      newHomework.push({ date, tasks: newTasks });
    }
    handleUpdateStudentAndSync({ ...student, homework: newHomework });
  };

  const getHasLesson = (dateStr: string) => {
    const dayData = (student.homework || []).find(d => d.date === dateStr);
    if (dayData && dayData.hasLesson !== undefined) {
      return dayData.hasLesson;
    }
    const profile = student.profile;
    if (!profile || !profile.lessonDays || profile.lessonDays.length === 0) {
      return false;
    }
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dateParts = dateStr.split('-').map(Number);
    const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    const dayName = dayNames[date.getDay()];
    
    const startDateObj = profile.startDate ? new Date(profile.startDate) : null;
    if (startDateObj) startDateObj.setHours(0,0,0,0);
    const endDateObj = profile.endDate ? new Date(profile.endDate) : null;
    if (endDateObj) endDateObj.setHours(0,0,0,0);
    
    const curr = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    curr.setHours(0,0,0,0);
    
    if (startDateObj && curr < startDateObj) return false;
    if (endDateObj && curr > endDateObj) return false;
    
    return profile.lessonDays.includes(dayName);
  };

  const toggleLesson = (date: string) => {
    if (!isAdmin) return;
    const homework = student.homework || [];
    const existingDayIndex = homework.findIndex(d => d.date === date);
    let newHomework = [...homework];

    const currentHasLesson = getHasLesson(date);
    const targetHasLesson = !currentHasLesson;

    if (existingDayIndex !== -1) {
      const day = newHomework[existingDayIndex];
      newHomework[existingDayIndex] = { ...day, hasLesson: targetHasLesson };
    } else {
      const newTasks = [
        { type: 'wake_up' as HomeworkType, completed: false },
        { type: 'problem_30' as HomeworkType, completed: false },
        { type: 'explanation' as HomeworkType, completed: false },
      ];
      newHomework.push({ date, tasks: newTasks, hasLesson: targetHasLesson });
    }
    handleUpdateStudentAndSync({ ...student, homework: newHomework });
  };

  const updateNote = (date: string, note: string) => {
    if (!isAdmin) return;
    const homework = student.homework || [];
    const existingDayIndex = homework.findIndex(d => d.date === date);
    let newHomework = [...homework];

    if (existingDayIndex !== -1) {
      const day = newHomework[existingDayIndex];
      newHomework[existingDayIndex] = { ...day, note };
    } else {
      newHomework.push({
        date,
        tasks: [
          { type: 'wake_up' as HomeworkType, completed: false },
          { type: 'problem_30' as HomeworkType, completed: false },
          { type: 'explanation' as HomeworkType, completed: false },
        ],
        note
      });
    }
    handleUpdateStudentAndSync({ ...student, homework: newHomework });
  };

  const updateMastery = (mastery: UnitMastery[]) => {
    onUpdateStudent({ ...student, mastery });
  };

  const addWeakPoint = (wp: WeakPoint) => {
    onUpdateStudent({ ...student, weakPoints: [...(student.weakPoints || []), wp] });
  };

  const deleteWeakPoint = (index: number) => {
    const newWeakPoints = [...(student.weakPoints || [])];
    newWeakPoints.splice(index, 1);
    onUpdateStudent({ ...student, weakPoints: newWeakPoints });
  };

  const editWeakPoint = (index: number, wp: WeakPoint) => {
    const newWeakPoints = [...(student.weakPoints || [])];
    newWeakPoints[index] = wp;
    onUpdateStudent({ ...student, weakPoints: newWeakPoints });
  };

  const addLessonLog = (log: LessonLog) => {
    onUpdateStudent({ ...student, lessonLogs: [...(student.lessonLogs || []), log] });
  };

  const deleteLessonLog = (index: number) => {
    const newLogs = [...(student.lessonLogs || [])];
    newLogs.splice(index, 1);
    onUpdateStudent({ ...student, lessonLogs: newLogs });
  };

  const editLessonLog = (index: number, log: LessonLog) => {
    const newLogs = [...(student.lessonLogs || [])];
    newLogs[index] = log;
    onUpdateStudent({ ...student, lessonLogs: newLogs });
  };

  const updateTextbooks = (textbooks: Textbook[]) => {
    onUpdateStudent({ ...student, textbooks });
  };

  // --- Upcoming Assignments Handlers ---
  const addAssignmentSchedule = () => {
    const nextSchedules = [...(student.upcomingAssignments?.schedules || [])];
    
    // Auto-calculate next date (Next day after last schedule, or Today if empty)
    let nextDateStr = '';
    const today = new Date();
    
    if (nextSchedules.length > 0) {
      const lastSchedule = nextSchedules[nextSchedules.length - 1];
      const parts = lastSchedule.date.split('/');
      
      if (parts.length === 2) {
        // Assume format is M/D
        const m = parseInt(parts[0]);
        const d = parseInt(parts[1]);
        
        if (!isNaN(m) && !isNaN(d)) {
          // Create date object (Using current year)
          const lastDate = new Date(today.getFullYear(), m - 1, d);
          lastDate.setDate(lastDate.getDate() + 1); // Add 1 day
          nextDateStr = `${lastDate.getMonth() + 1}/${lastDate.getDate()}`;
        }
      }
    }

    // Default to today if parsing failed or no previous schedules
    if (!nextDateStr) {
       nextDateStr = `${today.getMonth() + 1}/${today.getDate()}`;
    }

    nextSchedules.push({
      date: nextDateStr,
      categories: [
        { title: '[문제풀이]', items: [] },
        { title: '[해설작성]', items: [] },
      ]
    });
    onUpdateStudent({
      ...student,
      upcomingAssignments: { ...student.upcomingAssignments, schedules: nextSchedules }
    });
  };

  const deleteAssignmentSchedule = (sIdx: number) => {
    const nextSchedules = [...(student.upcomingAssignments?.schedules || [])];
    nextSchedules.splice(sIdx, 1);
    onUpdateStudent({
      ...student,
      upcomingAssignments: { ...student.upcomingAssignments, schedules: nextSchedules }
    });
  };

  const updateAssignmentDate = (sIdx: number, newDate: string) => {
    const nextSchedules = [...(student.upcomingAssignments?.schedules || [])];
    nextSchedules[sIdx] = { ...nextSchedules[sIdx], date: newDate };
    onUpdateStudent({
      ...student,
      upcomingAssignments: { ...student.upcomingAssignments, schedules: nextSchedules }
    });
  };

  const addAssignmentItem = (sIdx: number, cIdx: number) => {
    const nextSchedules = [...(student.upcomingAssignments?.schedules || [])];
    const category = nextSchedules[sIdx].categories[cIdx];
    category.items.push({ text: '새 과제', completed: false });
    onUpdateStudent({
      ...student,
      upcomingAssignments: { ...student.upcomingAssignments, schedules: nextSchedules }
    });
  };

  const updateAssignmentItem = (sIdx: number, cIdx: number, iIdx: number, text: string) => {
    const nextSchedules = [...(student.upcomingAssignments?.schedules || [])];
    nextSchedules[sIdx].categories[cIdx].items[iIdx] = {
      ...nextSchedules[sIdx].categories[cIdx].items[iIdx],
      text
    };
    onUpdateStudent({
      ...student,
      upcomingAssignments: { ...student.upcomingAssignments, schedules: nextSchedules }
    });
  };

  const deleteAssignmentItem = (sIdx: number, cIdx: number, iIdx: number) => {
    const nextSchedules = [...(student.upcomingAssignments?.schedules || [])];
    nextSchedules[sIdx].categories[cIdx].items.splice(iIdx, 1);
    onUpdateStudent({
      ...student,
      upcomingAssignments: { ...student.upcomingAssignments, schedules: nextSchedules }
    });
  };

  const addMaterial = (text: string) => {
    const nextMaterials = [...(student.upcomingAssignments?.materials || []), text];
    onUpdateStudent({
      ...student,
      upcomingAssignments: { ...student.upcomingAssignments, materials: nextMaterials }
    });
  };

  const deleteMaterial = (index: number) => {
    const nextMaterials = [...(student.upcomingAssignments?.materials || [])];
    nextMaterials.splice(index, 1);
    onUpdateStudent({
      ...student,
      upcomingAssignments: { ...student.upcomingAssignments, materials: nextMaterials }
    });
  };

  // Determine Next Lesson Date (수업 요일과 지정 수업일을 기반으로 향후 30일 중 탐색)
  const nextLessonDate = useMemo(() => {
    if (!student.homework) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureLessons = student.homework
      .filter(day => day.hasLesson)
      .map(day => {
        // Parse "YYYY-MM-DD"
        const [y, m, d] = day.date.split('-').map(Number);
        return new Date(y, m - 1, d);
      })
      .filter(date => date >= today) // Include today if it is a lesson day
      .sort((a, b) => a.getTime() - b.getTime());

    if (futureLessons.length > 0) {
      const next = futureLessons[0];
      return `${next.getMonth() + 1}/${next.getDate()}`;
    }

    return null;
  }, [student.homework]);

  // 다음 수납 예정일 자동 계산 (미납인 상태 중 가장 이른 수납일)
  const nextPaymentDate = useMemo(() => {
    const profile = student.profile;
    const cycle = profile.lessonFeeCycle;
    if (!cycle || !profile.startDate) return '수업 설정 미완료';
    if (!profile.lessonDays || profile.lessonDays.length === 0) return '수업 설정 미완료';

    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const startDateStr = profile.startDate;
    const completedPaid = new Set(profile.completedPaymentDates || []);

    // Walk from startDate far enough to find unpaid payment dates
    // Use today + 2 years as a safe upper bound
    const today = new Date();
    const limitDate = new Date(today.getFullYear() + 2, today.getMonth(), today.getDate());
    const limitStr = `${limitDate.getFullYear()}-${String(limitDate.getMonth() + 1).padStart(2, '0')}-${String(limitDate.getDate()).padStart(2, '0')}`;

    const endDateObj = profile.endDate ? new Date(profile.endDate) : null;
    if (endDateObj) endDateObj.setHours(0, 0, 0, 0);

    let sessionCount = 0;
    let tempDate = new Date(startDateStr);
    const maxIterations = 10000;
    let iterations = 0;

    while (iterations < maxIterations) {
      iterations++;
      const yyyy = tempDate.getFullYear();
      const mm = String(tempDate.getMonth() + 1).padStart(2, '0');
      const dd = String(tempDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      if (dateStr > limitStr) break;

      // Determine if this day has a lesson (matches HomeworkCalendar's lessonSessionMap logic)
      const dayData = (student.homework || []).find(d => d.date === dateStr);
      let isLesson = false;

      if (dayData && dayData.hasLesson !== undefined) {
        isLesson = dayData.hasLesson;
      } else {
        const dayName = dayNames[tempDate.getDay()];
        const curr = new Date(tempDate);
        curr.setHours(0, 0, 0, 0);
        const isWithinRange = !endDateObj || curr <= endDateObj;
        isLesson = isWithinRange && profile.lessonDays.includes(dayName);
      }

      if (isLesson) {
        sessionCount++;
        // This is a payment-due date when sessionCount is a multiple of cycle
        if (sessionCount % cycle === 0) {
          // Return the first unpaid payment-due date
          if (!completedPaid.has(dateStr)) {
            const [y, m, d] = dateStr.split('-');
            return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`;
          }
        }
      }

      tempDate.setDate(tempDate.getDate() + 1);
    }

    return '납부 완료 (스케줄 확인)';
  }, [student.homework, student.profile]);

  // 이번 회차 진행 완료된 수업 횟수 (마지막 납부 완료일 이후 오늘까지 완료된 실제 수업 수)
  const completedLessonsSincePayment = useMemo(() => {
    const profile = student.profile;
    const cycle = profile.lessonFeeCycle;
    if (!cycle || !profile.startDate) return 0;
    if (!profile.lessonDays || profile.lessonDays.length === 0) return 0;

    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const startDateStr = profile.startDate;
    const todayStr = new Date().toISOString().split('T')[0];

    const completedPaid = profile.completedPaymentDates || [];
    const sortedPaid = [...completedPaid].sort();
    const lastPaidDate = sortedPaid[sortedPaid.length - 1];

    let startTemp: Date;
    if (lastPaidDate) {
      const [py, pm, pd] = lastPaidDate.split('-').map(Number);
      startTemp = new Date(py, pm - 1, pd + 1); // day AFTER the last payment date
    } else {
      const [sy, sm, sd] = startDateStr.split('-').map(Number);
      startTemp = new Date(sy, sm - 1, sd);
    }

    const [ty, tm, td] = todayStr.split('-').map(Number);
    const todayObj = new Date(ty, tm - 1, td);
    todayObj.setHours(0, 0, 0, 0);

    const endDateObj = profile.endDate ? new Date(profile.endDate) : null;
    if (endDateObj) endDateObj.setHours(0, 0, 0, 0);

    let count = 0;
    let tempDate = new Date(startTemp);
    const maxIterations = 10000;
    let iterations = 0;

    while (tempDate <= todayObj && iterations < maxIterations) {
      iterations++;
      const yyyy = tempDate.getFullYear();
      const mm = String(tempDate.getMonth() + 1).padStart(2, '0');
      const dd = String(tempDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      // Check if it's a lesson day
      const dayData = (student.homework || []).find(d => d.date === dateStr);
      let isLesson = false;

      if (dayData && dayData.hasLesson !== undefined) {
        isLesson = dayData.hasLesson;
      } else {
        const dayName = dayNames[tempDate.getDay()];
        const curr = new Date(tempDate);
        curr.setHours(0, 0, 0, 0);
        const isWithinRange = !endDateObj || curr <= endDateObj;
        isLesson = isWithinRange && profile.lessonDays.includes(dayName);
      }

      if (isLesson) {
        count++;
      }

      tempDate.setDate(tempDate.getDate() + 1);
    }

    return count;
  }, [student.homework, student.profile]);

  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsTemplate, setSmsTemplate] = useState(student.profile.paymentMessageTemplate || "안녕하세요, {studentName} 학생 수학 과외 교사입니다. 이번 {cycle}회차 수업이 완료되어 안내드립니다. 수업료 납부 부탁드립니다. 감사합니다.");
  const [smsPreview, setSmsPreview] = useState("");
  const [smsTargetPhone, setSmsTargetPhone] = useState("");
  const [isSmsTransmitting, setIsSmsTransmitting] = useState(false);

  const openSmsSimulator = () => {
    const profile = student.profile;
    const phone = profile.parentPhone || profile.studentPhone || "";
    setSmsTargetPhone(phone);
    const template = profile.paymentMessageTemplate || "안녕하세요, {studentName} 학생 수학 과외 교사입니다. 이번 {cycle}회차 수업이 완료되어 안내드립니다. 수업료 납부 부탁드립니다. 감사합니다.";
    setSmsTemplate(template);
    const cycle = profile.lessonFeeCycle || 8;
    const preview = template.replace(/{studentName}/g, profile.name).replace(/{cycle}/g, String(cycle));
    setSmsPreview(preview);
    setIsSendingSms(true);
  };

  const handleTemplateChange = (val: string) => {
    setSmsTemplate(val);
    const profile = student.profile;
    const cycle = profile.lessonFeeCycle || 8;
    const preview = val.replace(/{studentName}/g, profile.name).replace(/{cycle}/g, String(cycle));
    setSmsPreview(preview);
  };

  const saveSmsTemplate = () => {
    handleUpdateStudentAndSync({
      ...student,
      profile: {
        ...student.profile,
        paymentMessageTemplate: smsTemplate
      }
    });
    setToast({ message: "문자 멘트 템플릿이 저장되었습니다.", isVisible: true });
    setTimeout(() => {
      setToast(prev => prev ? { ...prev, isVisible: false } : null);
    }, 2000);
  };

  const copySmsToClipboard = () => {
    navigator.clipboard.writeText(smsPreview).then(() => {
      setToast({ message: "안내 문자 내용이 클립보드에 복사되었습니다! 카카오톡 등에 붙여넣어 전송하세요.", isVisible: true });
      setTimeout(() => {
        setToast(prev => prev ? { ...prev, isVisible: false } : null);
      }, 2500);
    }).catch(err => {
      console.error("Failed to copy text:", err);
      alert("텍스트 복사에 실패했습니다. 직접 선택하여 복사해 주세요.");
    });
  };

  const triggerSmsSend = () => {
    if (!smsTargetPhone) {
      alert("수신할 번호가 없습니다. 학생 혹은 학부모 전화번호를 등록해 주세요.");
      return;
    }
    setIsSmsTransmitting(true);
    const isApple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
    const separator = isApple ? "&" : "?";
    const cleanPhone = smsTargetPhone.replace(/[^0-9+]/g, "");
    try {
      window.location.href = `sms:${cleanPhone}${separator}body=${encodeURIComponent(smsPreview)}`;
    } catch (err) {
      console.error("Failed to open SMS scheme:", err);
    }
    setTimeout(() => {
      setIsSmsTransmitting(false);
      setIsSendingSms(false);
      setToast({ message: `문자 전송 앱을 실행했습니다. (수신: ${smsTargetPhone})`, isVisible: true });
      setTimeout(() => {
        setToast(prev => prev ? { ...prev, isVisible: false } : null);
      }, 2500);
    }, 1500);
  };

  // 개별 날짜 납부 토글
  const togglePaymentPaidStatus = (dateStr: string) => {
    if (!isAdmin) return;
    const completedPaid = student.profile.completedPaymentDates || [];
    let newCompletedPaid = [...completedPaid];
    
    const index = newCompletedPaid.indexOf(dateStr);
    if (index !== -1) {
      newCompletedPaid.splice(index, 1);
      setToast({ message: '납부 취소 처리되었습니다.', isVisible: true });
    } else {
      newCompletedPaid.push(dateStr);
      setToast({ message: '납부 완료 처리되었습니다.', isVisible: true });
    }
    
    handleUpdateStudentAndSync({
      ...student,
      profile: {
        ...student.profile,
        completedPaymentDates: newCompletedPaid
      }
    });
    setTimeout(() => setToast(prev => prev ? { ...prev, isVisible: false } : null), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            {onBack && (
              <button 
                onClick={onBack}
                className="p-2 -ml-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="flex items-center gap-2">
              <GraduationCap className="text-indigo-600" size={24} />
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
                Math Log
              </h1>
            </div>

            {/* Tab switch for Journal vs Rankings (Only visible to students) */}
            {currentUserRole === 'student' && (
              <div className="flex bg-gray-100 p-1 rounded-xl ml-4 shadow-sm border border-gray-200/50">
                <button
                  onClick={() => setActiveTab('journal')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'journal'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  학습 일지
                </button>
                <button
                  onClick={() => setActiveTab('rankings')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'rankings'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  과제 순위
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {currentUserRole === 'student' ? (
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-md text-emerald-700 font-semibold text-xs transition-all">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{student.profile.name} (학생)</span>
              </div>
            ) : (
              userEmail && (
                <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-2.5 py-1.5 rounded-md text-indigo-700 font-semibold text-xs transition-all">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  <span className="hidden sm:inline">{userEmail} (교사)</span>
                  <span className="sm:hidden">{userEmail.split('@')[0]} (교사)</span>
                </div>
              )
            )}
            <button 
              onClick={onLogout}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
              title="로그아웃"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Toast Notification UI */}
        {toast && (
          <div 
            className={`fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg z-[100] transition-opacity duration-500 ease-in-out ${
              toast.isVisible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {toast.message}
          </div>
        )}


        {activeTab === 'rankings' ? (
          <StudentRankings
            students={students}
            onSelectStudent={(id) => {
              if (currentUserRole === 'teacher') {
                navigate(`/student/${id}`);
                setActiveTab('journal');
              } else {
                if (id === student.id) {
                  setActiveTab('journal');
                } else {
                  alert("다른 학생의 상세 일지 열람 권한이 없습니다.");
                }
              }
            }}
            onUpdateStudent={onUpdateStudent}
            role={currentUserRole}
          />
        ) : (
          <>
            {/* Profile Card */}
            <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
              {/* Decorative element */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-bold text-indigo-100 uppercase tracking-widest">{student.profile.grade} • {student.profile.school}</span>
                    <h2 className="text-3xl font-black mt-1">{student.profile.name}</h2>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setIsParentReportModalOpen(true)}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors backdrop-blur-sm flex items-center gap-1.5 text-xs font-bold"
                        title="학부모 피드백 리포트 이미지 생성"
                      >
                        <BookOpen size={16} />
                        <span className="hidden sm:inline">학부모 리포트</span>
                      </button>
                      <button 
                        onClick={handleCopyReport}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors backdrop-blur-sm flex items-center gap-1"
                        title="수업/과제 양식 복사"
                      >
                        <Copy size={20} />
                      </button>
                      <button 
                        onClick={startEditingProfile}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors backdrop-blur-sm"
                      >
                        <Settings size={20} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm border border-white/10">
                    <span className="text-[10px] font-bold text-indigo-100 block uppercase">마지막 업데이트</span>
                    <span className="text-sm font-bold">{student.profile.lastUpdate}</span>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm border border-white/10">
                    <span className="text-[10px] font-bold text-indigo-100 block uppercase">다음 수업</span>
                    <span className="text-sm font-bold">{nextLessonDate || '미정'}</span>
                  </div>
                </div>
                
                {/* Teacher Note Section */}
                {(student.teacherNote || isAdmin) && (
                  <div className="mt-6 bg-white/20 p-4 rounded-2xl border border-white/20 backdrop-blur-md transition-all hover:bg-white/25">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Pencil size={14} className="text-indigo-100" />
                        <span className="text-xs font-bold text-indigo-100">선생님 한마디</span>
                      </div>
                      {isAdmin && !isEditingNote && (
                        <button 
                          onClick={() => {
                            setNoteContent(student.teacherNote || '');
                            setIsEditingNote(true);
                          }}
                          className="p-1.5 text-indigo-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          title="수정"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                    </div>
                    
                    {isEditingNote ? (
                      <div className="space-y-3 animate-in fade-in duration-200">
                        <textarea 
                          value={noteContent}
                          onChange={(e) => setNoteContent(e.target.value)}
                          className="w-full bg-black/20 text-white placeholder-white/50 text-sm p-3 rounded-xl border border-white/10 focus:outline-none focus:border-white/30 focus:bg-black/30 resize-none min-h-[80px]"
                          placeholder="학생에게 전달할 응원의 메시지나 피드백을 적어주세요."
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => setIsEditingNote(false)}
                            className="px-3 py-1.5 text-xs font-bold text-indigo-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          >
                            취소
                          </button>
                          <button 
                            onClick={() => {
                              onUpdateStudent({ ...student, teacherNote: noteContent });
                              setIsEditingNote(false);
                            }}
                            className="px-4 py-1.5 text-xs font-bold text-indigo-600 bg-white hover:bg-indigo-50 rounded-lg shadow-sm transition-colors"
                          >
                            저장
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed font-medium text-white/90 whitespace-pre-wrap">
                        {student.teacherNote || (isAdmin ? "아직 등록된 메시지가 없습니다. 펜 아이콘을 눌러 작성해보세요!" : "")}
                      </p>
                    )}
                  </div>
                )}

                {/* 수업료 관리 및 알림 패널 (교사 전용) */}
                {isAdmin && (
                  <div className="mt-6 bg-white/20 p-4 rounded-2xl border border-white/20 backdrop-blur-md text-white">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                      <BookOpen size={16} className="text-indigo-100" />
                      <span className="text-sm font-bold">수업료 및 납부 관리 (교사용)</span>
                    </div>

                    {!student.profile.lessonFeeCycle ? (
                      <div className="text-xs text-indigo-100 font-medium py-1">
                        * 우측 상단의 톱니바퀴 버튼을 눌러 <strong>수업 요일</strong>과 <strong>수납 주기(회차)</strong>를 설정하시면 자동 시수 카운트 및 문자 알림 기능이 활성화됩니다.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-black/10 rounded-xl p-3 border border-white/5">
                            <span className="text-[10px] font-bold text-indigo-100 block uppercase">이번 회차 진행도</span>
                            <div className="flex items-baseline gap-1 mt-1">
                              <span className="text-xl font-black">{completedLessonsSincePayment}</span>
                              <span className="text-xs text-indigo-200">/ {student.profile.lessonFeeCycle} 회차</span>
                            </div>
                            {/* Progress bar */}
                            <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  completedLessonsSincePayment >= (student.profile.lessonFeeCycle || 8)
                                    ? 'bg-amber-400'
                                    : 'bg-emerald-400'
                                }`}
                                style={{
                                  width: `${Math.min(
                                    100,
                                    (completedLessonsSincePayment / (student.profile.lessonFeeCycle || 8)) * 100
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                          <div className="bg-black/10 rounded-xl p-3 border border-white/5">
                            <span className="text-[10px] font-bold text-indigo-100 block uppercase">다음 납부 예정일</span>
                            <span className="text-sm font-bold block mt-1.5">{nextPaymentDate}</span>
                          </div>
                        </div>

                        {completedLessonsSincePayment >= (student.profile.lessonFeeCycle || 8) && (
                          <div className="bg-amber-500/20 border border-amber-500/30 text-amber-200 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-pulse">
                            ⚠️ 이번 {student.profile.lessonFeeCycle}회차 시수가 모두 완료되어 수업료 수납일이 도래했습니다!
                          </div>
                        )}

                        <div className="flex flex-col gap-2">
                          <button
                            onClick={openSmsSimulator}
                            className="w-full bg-white text-indigo-600 hover:bg-indigo-50 font-bold py-2.5 rounded-xl text-xs transition-colors shadow-md flex items-center justify-center gap-1.5"
                          >
                            <span>안내 문자 발송</span>
                          </button>
                          <p className="text-[10px] text-indigo-100 text-center font-medium mt-1">
                            * 수업료 수납 완료 여부는 하단 <strong>캘린더의 동전(₩) 아이콘이 표시된 날짜</strong>를 눌러 직접 토글 스위치로 설정할 수 있습니다.
                          </p>
                        </div>

                        {/* 문자 템플릿 설정 */}
                        <div className="bg-black/15 p-3 rounded-xl border border-white/5 space-y-2 mt-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-indigo-100">안내 문자 템플릿 설정</span>
                            <button
                              onClick={saveSmsTemplate}
                              className="text-[10px] font-extrabold text-indigo-200 hover:text-white transition-colors"
                            >
                              템플릿 저장
                            </button>
                          </div>
                          <textarea
                            value={smsTemplate}
                            onChange={e => handleTemplateChange(e.target.value)}
                            placeholder="문자 멘트를 작성하세요. ({studentName}, {cycle} 사용 가능)"
                            className="w-full bg-black/20 text-white border border-white/10 rounded-lg text-xs p-2 focus:outline-none min-h-[60px] resize-none placeholder-white/30"
                          />
                          <p className="text-[9px] text-indigo-200 font-medium">
                            * 치환 문자: {'{studentName}'} (학생 이름), {'{cycle}'} (수납 주기)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* SMS 모의 발송 모달 */}
            {isSendingSms && (
              <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
                <Card className="w-full max-w-sm border-2 border-indigo-100 shadow-2xl relative overflow-hidden">
                  {/* Web 발신 상단 로고 */}
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-black">WEB 발신</span>
                      <h3 className="text-sm font-bold text-gray-900">알림 문자 시뮬레이터</h3>
                    </div>
                    <button onClick={() => setIsSendingSms(false)} className="text-gray-400 hover:text-gray-600">
                      <X size={18} />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1">수신 번호 (학부모/학생)</label>
                      <input
                        type="text"
                        value={smsTargetPhone}
                        onChange={e => setSmsTargetPhone(e.target.value)}
                        placeholder="수신 전화번호가 없습니다."
                        className="w-full p-2 border border-gray-200 rounded-lg text-xs font-semibold bg-gray-50 focus:outline-none focus:bg-white focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1">발송 내용 (치환 적용)</label>
                      <div className="w-full bg-blue-50/50 border border-blue-100 rounded-xl p-3 text-xs text-gray-700 min-h-[90px] whitespace-pre-wrap leading-relaxed font-medium">
                        {smsPreview || '발송할 내용이 존재하지 않습니다.'}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={copySmsToClipboard}
                        className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5 text-xs border border-gray-200/50 shadow-sm"
                        type="button"
                      >
                        <Copy size={14} />
                        <span>텍스트 복사</span>
                      </button>
                      <button
                        onClick={triggerSmsSend}
                        disabled={isSmsTransmitting || !smsTargetPhone}
                        className="flex-[1.5] bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-xs shadow-md"
                      >
                        {isSmsTransmitting ? (
                          <>
                            <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent animate-spin"></div>
                            <span>실행 중...</span>
                          </>
                        ) : (
                          <>
                            <Send size={14} />
                            <span>문자앱 열기</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Profile Edit Modal */}
            {isEditingProfile && (
              <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b">
                    <h3 className="text-lg font-bold text-gray-900">학생 정보 수정</h3>
                    <button onClick={() => setIsEditingProfile(false)}><X size={20} /></button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">이름 (필수)</label>
                      <input
                        placeholder="이름"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="w-full p-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">학교 (선택)</label>
                        <input
                          placeholder="학교"
                          value={editSchool}
                          onChange={e => setEditSchool(e.target.value)}
                          className="w-full p-2 border rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">학년 (선택)</label>
                        <input
                          placeholder="학년"
                          value={editGrade}
                          onChange={e => setEditGrade(e.target.value)}
                          className="w-full p-2 border rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">수업 시작일</label>
                        <input
                          type="date"
                          value={editStartDate}
                          onChange={e => setEditStartDate(e.target.value)}
                          className="w-full p-2 border rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">수업 종료일 (선택)</label>
                        <input
                          type="date"
                          value={editEndDate}
                          onChange={e => setEditEndDate(e.target.value)}
                          className="w-full p-2 border rounded-lg text-sm"
                        />
                      </div>
                    </div>

                    <div className="border-t pt-3 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5">수업 요일 선택</label>
                        <div className="flex flex-wrap gap-1.5">
                          {['월', '화', '수', '목', '금', '토', '일'].map(day => {
                            const isChecked = editLessonDays.includes(day);
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => {
                                  if (isChecked) {
                                    setEditLessonDays(editLessonDays.filter(d => d !== day));
                                  } else {
                                    setEditLessonDays([...editLessonDays, day]);
                                  }
                                }}
                                className={`px-2.5 py-1 rounded text-xs font-bold transition-all border ${
                                  isChecked
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold'
                                    : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                                }`}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 font-bold block mb-1">수납 주기 (회차)</label>
                          <input
                            type="number"
                            value={editLessonFeeCycle}
                            onChange={e => setEditLessonFeeCycle(e.target.value !== '' ? Number(e.target.value) : '')}
                            placeholder="예: 8 (8회마다)"
                            className="w-full p-2 border border-gray-200 rounded-lg text-sm font-bold"
                            min={1}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 font-bold block mb-1">학생 번호</label>
                          <input
                            type="text"
                            value={editStudentPhone}
                            onChange={e => setEditStudentPhone(e.target.value)}
                            placeholder="010-0000-0000"
                            className="w-full p-2 border border-gray-200 rounded-lg text-sm font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 font-bold block mb-1">학부모 번호</label>
                          <input
                            type="text"
                            value={editParentPhone}
                            onChange={e => setEditParentPhone(e.target.value)}
                            placeholder="010-0000-0000"
                            className="w-full p-2 border border-gray-200 rounded-lg text-sm font-semibold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* PIN Reset */}
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-gray-500">학생 접속용 PIN (필수)</span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsResettingPin(!isResettingPin);
                            setEditNewPin('');
                          }}
                          className="text-[10px] text-indigo-600 font-bold flex items-center gap-1 hover:underline"
                        >
                          <RefreshCw size={10} /> {isResettingPin ? '변경 취소' : '비밀번호 재설정'}
                        </button>
                      </div>

                      {isResettingPin ? (
                        <div className="animate-in fade-in duration-200 mt-2">
                          <input
                            type="text"
                            value={editNewPin}
                            onChange={e => setEditNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                            className="w-full p-2 border border-indigo-200 rounded-lg text-xs font-mono tracking-widest text-indigo-600 font-bold focus:outline-none focus:border-indigo-500"
                            placeholder="새 PIN 8자리 입력 (필수)"
                            inputMode="numeric"
                            minLength={8}
                            maxLength={8}
                            pattern="\d{8}"
                            required
                          />
                          <p className="text-[10px] text-gray-400 mt-1">* 8자리 숫자로 입력해야 저장 가능합니다.</p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-400 font-medium">********</p>
                      )}
                    </div>

                    <button
                      onClick={handleProfileUpdate}
                      className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors mt-2"
                    >
                      저장하기
                    </button>
                  </div>
                </Card>
              </div>
            )}

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (8/12) */}
              <div className="lg:col-span-8 space-y-6">
                <UpcomingAssignments 
                  data={student.upcomingAssignments || { schedules: [], materials: [] }}
                  isAdmin={isAdmin}
                  onAddSchedule={addAssignmentSchedule}
                  onDeleteSchedule={deleteAssignmentSchedule}
                  onUpdateDate={updateAssignmentDate}
                  onAddItem={addAssignmentItem}
                  onUpdateItem={updateAssignmentItem}
                  onDeleteItem={deleteAssignmentItem}
                  onAddMaterial={addMaterial}
                  onDeleteMaterial={deleteMaterial}
                />
                
                <HomeworkCalendar 
                  data={student.homework || []} 
                  isAdmin={isAdmin}
                  onToggleTask={toggleHomeworkTask}
                  onToggleLesson={toggleLesson}
                  onUpdateNote={updateNote}
                  startDate={student.profile.startDate}
                  studentProfile={student.profile}
                  onTogglePaymentPaid={togglePaymentPaidStatus}
                />
                
                <TextbookTracker 
                  textbooks={student.textbooks || []} 
                  isAdmin={isAdmin} 
                  onUpdate={updateTextbooks}
                />

                <LessonTable 
                  logs={student.lessonLogs || []} 
                  isAdmin={isAdmin}
                  onAdd={addLessonLog}
                  onDelete={deleteLessonLog}
                  onEdit={editLessonLog}
                />
              </div>

              {/* Right Column (4/12) */}
              <div className="lg:col-span-4 space-y-6">
                {/* Charts show Weekly Data */}
                <ComparisonChart 
                  data={comparisonData} 
                  selectedMonth={selectedStatsMonth}
                  onMonthChange={setSelectedStatsMonth}
                  startDate={student.profile.startDate}
                />
                
                <MasteryChart 
                  data={student.mastery || []} 
                  isAdmin={isAdmin}
                  onUpdate={updateMastery}
                />

                <WeakPointList 
                  weakPoints={student.weakPoints || []} 
                  isAdmin={isAdmin}
                  onAdd={addWeakPoint}
                  onDelete={deleteWeakPoint}
                  onEdit={editWeakPoint}
                />
              </div>
            </div>
          </>
        )}
      </main>

      <ParentReportModal
        isOpen={isParentReportModalOpen}
        onClose={() => setIsParentReportModalOpen(false)}
        student={student}
      />
    </div>
  );
};
