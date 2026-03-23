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
  const today = new Date(); // 오늘 날짜 객체
  const currentDay = today.getDay(); // 0: 일요일 ~ 6: 토요일
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1); // 어제 날짜 객체
  const todayMidnight = new Date(today);
  todayMidnight.setHours(0, 0, 0, 0);

  const getDailyData = (student: StudentData, date: string) => {
    return student.homework?.find(d => d.date === date);
  };

  const handleToggleHomework = (student: StudentData, type: HomeworkType) => {
    const dailyData = getDailyData(student, selectedDate);
    let newHomework = [...student.homework];

    if (dailyData) {
      let newTasks = [...dailyData.tasks];
      const existingTaskIndex = newTasks.findIndex(t => t.type === type);
      
      if (existingTaskIndex !== -1) {
        newTasks[existingTaskIndex] = { ...newTasks[existingTaskIndex], completed: !newTasks[existingTaskIndex].completed };
      } else {
        newTasks.push({ type, completed: true });
      }
      
      const dayIndex = newHomework.findIndex(d => d.date === selectedDate);
      newHomework[dayIndex] = { ...dailyData, tasks: newTasks };
    } else {
      const newTasks = [
        { type: 'wake_up' as HomeworkType, completed: type === 'wake_up' },
        { type: 'problem_30' as HomeworkType, completed: type === 'problem_30' },
        { type: 'explanation' as HomeworkType, completed: false, count: 0 },
      ];

      newHomework.push({
        date: selectedDate,
        tasks: newTasks
      });
    }

    onUpdateStudent({ ...student, homework: newHomework });
  };

  const handleUpdateExplanation = (student: StudentData, count: number) => {
    const dailyData = getDailyData(student, selectedDate);
    let newHomework = [...student.homework];

    if (dailyData) {
      let newTasks = [...dailyData.tasks];
      const existingTaskIndex = newTasks.findIndex(t => t.type === 'explanation');
      
      // 이미 선택된 숫자를 다시 누르면 0으로 초기화
      const newCount = newTasks[existingTaskIndex]?.count === count ? 0 : count;

      if (existingTaskIndex !== -1) {
        newTasks[existingTaskIndex] = {
          ...newTasks[existingTaskIndex],
          completed: newCount > 0,
          count: newCount
        };
      } else {
        newTasks.push({ type: 'explanation', completed: newCount > 0, count: newCount });
      }
      
      const dayIndex = newHomework.findIndex(d => d.date === selectedDate);
      newHomework[dayIndex] = { ...dailyData, tasks: newTasks };
    } else {
      const newTasks = [
        { type: 'wake_up' as HomeworkType, completed: false },
        { type: 'problem_30' as HomeworkType, completed: false },
        { type: 'explanation' as HomeworkType, completed: count > 0, count: count },
      ];

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

  const getExplanationCount = (student: StudentData) => {
    const day = getDailyData(student, selectedDate);
    if (!day) return 0;
    return day.tasks.find(t => t.type === 'explanation')?.count || 0;
  };

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

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
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

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_2fr] bg-gray-50 p-2 border-b border-gray-200 font-bold text-xs text-gray-500 text-center">
          <div className="text-left pl-2">학생 정보</div>
          <div>기상</div>
          <div>30문제</div>
          <div>해설 개수</div>
        </div>

        <div className="divide-y divide-gray-100">
          {sortedStudents.map(student => (
            <div key={student.id} className="grid grid-cols-[2fr_1fr_1fr_2fr] items-center p-2 hover:bg-gray-50 transition-colors">
              <div className="pl-2 flex flex-col">
                <span className="font-bold text-gray-800 text-sm">{student.profile.name}</span>
                <span className="text-[10px] text-gray-400">{student.profile.grade}</span>
              </div>

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

              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map(num => (
                  <button
                    key={num}
                    onClick={() => handleUpdateExplanation(student, num)}
                    className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold transition-all ${
                      getExplanationCount(student) === num
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};