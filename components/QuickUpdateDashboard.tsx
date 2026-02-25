import React, { useState } from 'react';
import { StudentData, HomeworkType } from '../types';
import { Calendar, CheckCircle2, Circle } from 'lucide-react';

interface Props {
  students: StudentData[];
  onUpdateStudent: (student: StudentData) => void;
}

export const QuickUpdateDashboard: React.FC<Props> = ({ students, onUpdateStudent }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  
  const getDailyData = (student: StudentData, date: string) => {
    return student.homework.find(d => d.date === date);
  };

  const handleToggleHomework = (student: StudentData, type: HomeworkType) => {
    const dailyData = getDailyData(student, selectedDate);
    let newHomework = [...student.homework];

    if (dailyData) {
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
      const newTasks = [
        { type: 'wake_up' as HomeworkType, completed: false },
        { type: 'problem_30' as HomeworkType, completed: false },
        { type: 'explanation' as HomeworkType, completed: false },
      ];
      const targetIndex = newTasks.findIndex(t => t.type === type);
      newTasks[targetIndex].completed = true;

      newHomework.push({
        date: selectedDate,
        tasks: newTasks
      });
    }

    onUpdateStudent({ ...student, homework: newHomework });
  };

  const getTaskStatus = (student: StudentData, type: HomeworkType) => {
    const day = getDailyData(student, selectedDate);
    if (!day) return false;
    return day.tasks.find(t => t.type === type)?.completed || false;
  };

  // 학생 가나다순 정렬
  const sortedStudents = [...students].sort((a, b) => 
    a.profile.name.localeCompare(b.profile.name)
  );

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      {/* Date Controller */}
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex items-center gap-3 sticky top-0 z-30">
        <Calendar className="text-indigo-600" size={20} />
        <span className="font-bold text-gray-700 text-sm">기록 날짜:</span>
        <input 
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      {/* Compact List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-4 bg-gray-50 p-2 border-b border-gray-200 font-bold text-xs text-gray-500 text-center">
          <div className="text-left pl-2">학생 정보</div>
          <div>기상</div>
          <div>30문제</div>
          <div>해설</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-100">
          {sortedStudents.map(student => (
            <div key={student.id} className="grid grid-cols-4 items-center p-2 hover:bg-gray-50 transition-colors">
              {/* Student Info */}
              <div className="pl-2 flex flex-col">
                <span className="font-bold text-gray-800 text-sm">{student.profile.name}</span>
                <span className="text-[10px] text-gray-400">{student.profile.grade}</span>
              </div>

              {/* Toggles */}
              <div className="flex justify-center">
                <button 
                  onClick={() => handleToggleHomework(student, 'wake_up')}
                  className={`p-1.5 rounded-full transition-all ${getTaskStatus(student, 'wake_up') ? 'text-blue-600 bg-blue-100' : 'text-gray-300 hover:text-gray-400 hover:bg-gray-200'}`}
                >
                  {getTaskStatus(student, 'wake_up') ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                </button>
              </div>
              
              <div className="flex justify-center">
                <button 
                  onClick={() => handleToggleHomework(student, 'problem_30')}
                  className={`p-1.5 rounded-full transition-all ${getTaskStatus(student, 'problem_30') ? 'text-emerald-600 bg-emerald-100' : 'text-gray-300 hover:text-gray-400 hover:bg-gray-200'}`}
                >
                  {getTaskStatus(student, 'problem_30') ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                </button>
              </div>

              <div className="flex justify-center">
                <button 
                  onClick={() => handleToggleHomework(student, 'explanation')}
                  className={`p-1.5 rounded-full transition-all ${getTaskStatus(student, 'explanation') ? 'text-purple-600 bg-purple-100' : 'text-gray-300 hover:text-gray-400 hover:bg-gray-200'}`}
                >
                  {getTaskStatus(student, 'explanation') ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};