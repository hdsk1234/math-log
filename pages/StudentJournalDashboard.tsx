
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
import { 
  GraduationCap, LogOut, Settings, ArrowLeft, Pencil, X, Edit2
} from 'lucide-react';

interface Props {
  student: StudentData;
  currentUserRole: UserRole;
  onUpdateStudent: (updatedStudent: StudentData) => void;
  onDeleteStudent: (id: string) => void;
  onBack?: () => void;
  onLogout: () => void;
}

export const StudentJournalDashboard: React.FC<Props> = ({
  student,
  currentUserRole,
  onUpdateStudent,
  onDeleteStudent,
  onBack,
  onLogout
}) => {
  const isAdmin = currentUserRole === 'teacher';

  // --- Profile Editing State ---
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSchool, setEditSchool] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editStartDate, setEditStartDate] = useState('');

  // --- Teacher Note Editing State ---
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteContent, setNoteContent] = useState('');

  // --- Stats Calculation Logic (Monthly Focused) ---
  const comparisonData = useMemo(() => {
    // Safety check for homework array
    const homework = student.homework || [];
    
    // Calculate stats for THIS MONTH
    const stats = {
      wake_up: { total: 0, completed: 0 },
      problem_30: { total: 0, completed: 0 },
      explanation: { total: 0, completed: 0 }
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-11
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Iterate through all days of the current month
    for (let day = 1; day <= daysInMonth; day++) {
       const currentDay = new Date(year, month, day);
       
       // Don't count future days for the denominator
       if (currentDay > today) continue;

       // If student hasn't started yet, skip
       if (student.profile.startDate) {
         const startDate = new Date(student.profile.startDate);
         startDate.setHours(0,0,0,0);
         if (currentDay < startDate) continue;
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

    const calculateRate = (type: keyof typeof stats) => {
      const { total, completed } = stats[type];
      return total === 0 ? 0 : Math.round((completed / total) * 100);
    };

    return [
      { category: '기상 미션', student: calculateRate('wake_up'), average: 75 },
      { category: '매일 30문제', student: calculateRate('problem_30'), average: 80 },
      { category: '해설 작성', student: calculateRate('explanation'), average: 55 },
    ];
  }, [student.homework, student.profile.startDate]);

  // --- Handlers ---

  const startEditingProfile = () => {
    setEditName(student.profile.name);
    setEditSchool(student.profile.school);
    setEditGrade(student.profile.grade);
    setEditStartDate(student.profile.startDate || new Date().toISOString().split('T')[0]);
    setIsEditingProfile(true);
  };

  const handleProfileUpdate = () => {
    onUpdateStudent({
      ...student,
      profile: { 
        ...student.profile, 
        name: editName, 
        school: editSchool, 
        grade: editGrade,
        startDate: editStartDate 
      }
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
    onUpdateStudent({ ...student, homework: newHomework });
  };

  const toggleLesson = (date: string) => {
    if (!isAdmin) return;
    const homework = student.homework || [];
    const existingDayIndex = homework.findIndex(d => d.date === date);
    let newHomework = [...homework];

    if (existingDayIndex !== -1) {
      const day = newHomework[existingDayIndex];
      newHomework[existingDayIndex] = { ...day, hasLesson: !day.hasLesson };
    } else {
      const newTasks = [
        { type: 'wake_up' as HomeworkType, completed: false },
        { type: 'problem_30' as HomeworkType, completed: false },
        { type: 'explanation' as HomeworkType, completed: false },
      ];
      newHomework.push({ date, tasks: newTasks, hasLesson: true });
    }
    onUpdateStudent({ ...student, homework: newHomework });
  };

  const updateNote = (date: string, note: string) => {
    if (!isAdmin) return;
    const homework = student.homework || [];
    const existingDayIndex = homework.findIndex(d => d.date === date);
    let newHomework = [...homework];

    if (existingDayIndex !== -1) {
      newHomework[existingDayIndex] = { ...newHomework[existingDayIndex], note };
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
    onUpdateStudent({ ...student, homework: newHomework });
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

  // Determine Next Lesson Date
  // Source of Truth: Calendar (student.homework)
  // We only consider dates marked as 'hasLesson' by the teacher in the Calendar.
  // Assignments (upcomingAssignments) are tasks and do not define the lesson date itself.
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
          </div>
          <button 
            onClick={onLogout}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
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
                <button 
                  onClick={startEditingProfile}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors backdrop-blur-sm"
                >
                  <Settings size={20} />
                </button>
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
          </div>
        </div>

        {/* Profile Edit Modal */}
        {isEditingProfile && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <Card className="w-full max-w-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">학생 정보 수정</h3>
                <button onClick={() => setIsEditingProfile(false)}><X size={20}/></button>
              </div>
              <div className="space-y-3">
                <input 
                  placeholder="이름" 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
                <input 
                  placeholder="학교" 
                  value={editSchool} 
                  onChange={e => setEditSchool(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
                <input 
                  placeholder="학년" 
                  value={editGrade} 
                  onChange={e => setEditGrade(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
                <input 
                  type="date"
                  value={editStartDate} 
                  onChange={e => setEditStartDate(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
                <button 
                  onClick={handleProfileUpdate}
                  className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors"
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
            <ComparisonChart data={comparisonData} />
            
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
      </main>
    </div>
  );
};
