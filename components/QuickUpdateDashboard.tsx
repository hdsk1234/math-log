
import React, { useState } from 'react';
import { StudentData, HomeworkType, LessonLog } from '../types';
import { Card } from './Card';
import { 
  Calendar, CheckCircle2, Circle, Plus, Save, X, BookOpen, Star 
} from 'lucide-react';

interface Props {
  students: StudentData[];
  onUpdateStudent: (student: StudentData) => void;
}

export const QuickUpdateDashboard: React.FC<Props> = ({ students, onUpdateStudent }) => {
  // Default to today YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  
  // Lesson Modal State
  const [lessonModalStudentId, setLessonModalStudentId] = useState<string | null>(null);
  const [newLessonContent, setNewLessonContent] = useState('');
  const [newLessonRating, setNewLessonRating] = useState(5);

  // Helper: Find or Create Daily Data
  const getDailyData = (student: StudentData, date: string) => {
    return student.homework.find(d => d.date === date);
  };

  const handleToggleHomework = (student: StudentData, type: HomeworkType) => {
    const dailyData = getDailyData(student, selectedDate);
    let newHomework = [...student.homework];

    if (dailyData) {
      // Update existing day
      const existingTaskIndex = dailyData.tasks.findIndex(t => t.type === type);
      let newTasks = [...dailyData.tasks];
      
      if (existingTaskIndex !== -1) {
        newTasks[existingTaskIndex] = { ...newTasks[existingTaskIndex], completed: !newTasks[existingTaskIndex].completed };
      } else {
        newTasks.push({ type, completed: true });
      }
      
      const dayIndex = newHomework.findIndex(d => d.date === selectedDate);
      newHomework[dayIndex] = { ...dailyData, tasks: newTasks };
    } else {
      // Create new day entry
      const newTasks = [
        { type: 'wake_up' as HomeworkType, completed: false },
        { type: 'problem_30' as HomeworkType, completed: false },
        { type: 'explanation' as HomeworkType, completed: false },
      ];
      // Toggle the specific one
      const targetIndex = newTasks.findIndex(t => t.type === type);
      newTasks[targetIndex].completed = true;

      newHomework.push({
        date: selectedDate,
        tasks: newTasks
      });
    }

    onUpdateStudent({ ...student, homework: newHomework });
  };

  const handleNoteBlur = (student: StudentData, note: string) => {
    if (student.teacherNote === note) return; // No change
    onUpdateStudent({ ...student, teacherNote: note });
  };

  const openLessonModal = (id: string) => {
    setLessonModalStudentId(id);
    setNewLessonContent('');
    setNewLessonRating(5);
  };

  const saveLesson = () => {
    if (!lessonModalStudentId) return;
    const student = students.find(s => s.id === lessonModalStudentId);
    if (!student) return;

    const nextSession = student.lessonLogs.length > 0 
      ? (student.lessonLogs[student.lessonLogs.length - 1].session || 0) + 1 
      : 1;

    const newLog: LessonLog = {
      session: nextSession,
      date: selectedDate.substring(5).replace('-', '.'), // MM.DD format
      unit: '', // Removed unit
      content: newLessonContent,
      understanding: newLessonRating
    };

    // Also mark the day as having a lesson in homework calendar
    let newHomework = [...student.homework];
    const dailyIndex = newHomework.findIndex(d => d.date === selectedDate);
    if (dailyIndex !== -1) {
       newHomework[dailyIndex] = { ...newHomework[dailyIndex], hasLesson: true };
    } else {
       newHomework.push({
         date: selectedDate,
         tasks: [],
         hasLesson: true
       });
    }

    onUpdateStudent({
      ...student,
      lessonLogs: [...student.lessonLogs, newLog],
      homework: newHomework
    });

    setLessonModalStudentId(null);
  };

  const getTaskStatus = (student: StudentData, type: HomeworkType) => {
    const day = getDailyData(student, selectedDate);
    if (!day) return false;
    return day.tasks.find(t => t.type === type)?.completed || false;
  };

  const hasLessonToday = (student: StudentData) => {
    // Check calendar marker first
    const day = getDailyData(student, selectedDate);
    if (day?.hasLesson) return true;
    
    // Check lesson logs just in case
    const formattedDate = selectedDate.substring(5).replace('-', '.');
    return student.lessonLogs.some(l => l.date === formattedDate);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Date Controller */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between sticky top-20 z-30">
        <div className="flex items-center gap-2">
          <Calendar className="text-indigo-600" />
          <span className="font-bold text-gray-700">기록 날짜 선택:</span>
        </div>
        <input 
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      <div className="grid gap-4">
        {students.map(student => (
          <div key={student.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-indigo-300 transition-colors">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              
              {/* Student Info */}
              <div className="min-w-[120px]">
                <h3 className="text-lg font-extrabold text-gray-800">{student.profile.name}</h3>
                <p className="text-xs text-gray-400">{student.profile.grade}</p>
              </div>

              {/* Quick Homework Toggles */}
              <div className="flex-1 flex flex-wrap gap-2 items-center bg-gray-50 px-3 py-2 rounded-lg w-full md:w-auto">
                <span className="text-xs font-bold text-gray-400 mr-2">숙제체크</span>
                
                <button 
                  onClick={() => handleToggleHomework(student, 'wake_up')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${getTaskStatus(student, 'wake_up') ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' : 'bg-white text-gray-400 border border-gray-200 hover:bg-gray-100'}`}
                >
                  {getTaskStatus(student, 'wake_up') ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                  기상
                </button>
                
                <button 
                  onClick={() => handleToggleHomework(student, 'problem_30')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${getTaskStatus(student, 'problem_30') ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300' : 'bg-white text-gray-400 border border-gray-200 hover:bg-gray-100'}`}
                >
                  {getTaskStatus(student, 'problem_30') ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                  30문제
                </button>

                <button 
                  onClick={() => handleToggleHomework(student, 'explanation')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${getTaskStatus(student, 'explanation') ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300' : 'bg-white text-gray-400 border border-gray-200 hover:bg-gray-100'}`}
                >
                  {getTaskStatus(student, 'explanation') ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                  해설
                </button>
              </div>

              {/* Lesson & Note Actions */}
              <div className="flex gap-2 w-full md:w-auto">
                <button 
                  onClick={() => openLessonModal(student.id)}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${hasLessonToday(student) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'}`}
                >
                  {hasLessonToday(student) ? <BookOpen size={14} /> : <Plus size={14} />}
                  {hasLessonToday(student) ? '수업완료' : '수업추가'}
                </button>
              </div>
            </div>

            {/* Quick Note Input */}
            <div className="mt-3 relative">
               <input 
                 defaultValue={student.teacherNote}
                 onBlur={(e) => handleNoteBlur(student, e.target.value)}
                 placeholder="학부모님께 전달할 코멘트 (입력 후 포커스 해제 시 자동 저장)"
                 className="w-full text-sm bg-gray-50 border-b border-gray-200 focus:border-indigo-500 px-2 py-1.5 outline-none transition-colors placeholder:text-xs"
               />
               <div className="absolute right-2 top-2 text-[10px] text-gray-300 pointer-events-none">자동저장</div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Lesson Modal */}
      {lessonModalStudentId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                 <h3 className="font-bold text-lg text-gray-800">수업 일지 작성</h3>
                 <button onClick={() => setLessonModalStudentId(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              
              <div className="space-y-3">
                 <div>
                   <label className="text-xs font-bold text-gray-500 mb-1 block">날짜</label>
                   <div className="text-sm font-bold text-indigo-600">{selectedDate}</div>
                 </div>
                 {/* Unit input removed */}
                 <div>
                   <label className="text-xs font-bold text-gray-500 mb-1 block">수업 내용</label>
                   <textarea 
                     value={newLessonContent}
                     onChange={e => setNewLessonContent(e.target.value)}
                     className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500 resize-none h-20"
                     placeholder="학습 내용 요약 (선택)"
                     autoFocus
                   />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-gray-500 mb-1 block">학생 이해도</label>
                   <div className="flex gap-2 justify-center py-2 bg-gray-50 rounded-lg">
                      {[1, 2, 3, 4, 5].map((rate) => (
                        <button key={rate} onClick={() => setNewLessonRating(rate)} className="transition-transform hover:scale-110 focus:outline-none">
                           <Star 
                             size={24} 
                             className={rate <= newLessonRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"} 
                           />
                        </button>
                      ))}
                   </div>
                 </div>
                 <button 
                   onClick={saveLesson}
                   className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl mt-2 hover:bg-indigo-700 flex items-center justify-center gap-2"
                 >
                   <Save size={18} /> 기록 저장하기
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
