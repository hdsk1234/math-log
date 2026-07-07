import React, { useState, useEffect } from 'react';
import { StudentData, HomeworkType } from '../types';
import { Calendar, CheckCircle2, Circle, AlertCircle, Play, Trash2 } from 'lucide-react';

interface Props {
  students: StudentData[];
  onUpdateStudent: (student: StudentData) => void;
}

export const QuickUpdateDashboard: React.FC<Props> = ({ students, onUpdateStudent }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [rawData, setRawData] = useState('');
  const [manualCheckList, setManualCheckList] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'submit'>('name');
  const [submitSequence, setSubmitSequence] = useState<{ studentId: string; name: string }[]>([]);

  useEffect(() => {
    setSubmitSequence([]);
  }, [selectedDate]);

  const today = new Date();
  const todayMidnight = new Date(today);
  todayMidnight.setHours(0, 0, 0, 0);

  const getDailyData = (student: StudentData, date: string) => {
    return student.homework?.find(d => d.date === date);
  };

  const handleResetDailyData = () => {
    if (!window.confirm(`${selectedDate}의 모든 과제 기록을 삭제하시겠습니까?`)) return;

    students.forEach(student => {
      // 해당 날짜의 데이터가 있는지 확인
      const hasData = student.homework.some(d => d.date === selectedDate);
      if (!hasData) return;

      // 해당 날짜의 데이터만 제외하고 새로운 배열 생성
      const newHomework = student.homework.filter(d => d.date !== selectedDate);

      // DB 반영
      onUpdateStudent({ ...student, homework: newHomework });
    });

    setManualCheckList([]); // 수동 확인 리스트 비우기
    setSubmitSequence([]);  // 제출 순서 리스트 비우기

    setTimeout(() => {
      window.alert("성공적으로 삭제되었습니다.")
    }, 100)
  };

  const handleProcessRawData = () => {
    if (!rawData.trim()) return;

    const studentMap = new Map<string, { wakeUp: boolean; photoCount: number }>();
    const lines = rawData.trim().split('\n');
    const newSubmitSequence: { studentId: string; name: string }[] = [];

    // 1. 텍스트 파싱
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 3) continue;

      const ampm = parts[0];
      const time = parts[1];
      const name = parts[2];
      const content = parts.slice(3).join(' ');

      if (!studentMap.has(name)) {
        studentMap.set(name, { wakeUp: false, photoCount: 0 });
      }
      const data = studentMap.get(name)!;

      if (1) { // 기상은 시간만 맞추면 통과
        const [hourStr, minuteStr] = time.split(':');
        let hour = parseInt(hourStr, 10);
        const minute = parseInt(minuteStr, 10);
        
        if (ampm === '오전' && hour === 12) hour = 0;
        
        if (ampm === '오전' && (hour < 6 || (hour === 6 && minute <= 30))) {
          data.wakeUp = true;
        }
      }

      if (content.includes('사진')) {
        data.photoCount += 1;
        const targetStudent = students.find(s => s.profile.name === name);
        if (targetStudent) {
          newSubmitSequence.push({ studentId: targetStudent.id, name: targetStudent.profile.name });
        }
      }
    } // for lines

    // 알림창 확인 로직 추가
    if (!window.confirm(`파싱된 데이터를 ${selectedDate} 날짜에 적용하시겠습니까?`)) {
      return; // 취소 시 함수 종료
    }

    const newManualList: string[] = [];

    // 2. 학생 데이터 업데이트
    students.forEach(student => {
      const name = student.profile.name;
      if (!studentMap.has(name)) return;

      const parsedData = studentMap.get(name)!;
      const dailyData = getDailyData(student, selectedDate);
      
      let newTasks = dailyData ? [...dailyData.tasks] : [
        { type: 'wake_up' as HomeworkType, completed: false },
        { type: 'problem_30' as HomeworkType, completed: false },
        { type: 'explanation' as HomeworkType, completed: false, count: 0 }
      ];

      // 기상 체크
      if (parsedData.wakeUp) {
        const idx = newTasks.findIndex(t => t.type === 'wake_up');
        if (idx !== -1) newTasks[idx] = { ...newTasks[idx], completed: true };
        else newTasks.push({ type: 'wake_up', completed: true });
      }

      // 사진 체크 로직 수정 (해설 개수 파악 불가로 인한 Manual Check 강제)
      if (parsedData.photoCount >= 1) {
        // 사진이 1장이든 2장 이상이든 해설 확인이 필요하므로 무조건 수동 확인 명단에 추가
        newManualList.push(student.id);
      }

      if (parsedData.photoCount >= 2) {
        // 2장 이상일 경우 30문제 과제만 자동 완료 처리
        const p30Idx = newTasks.findIndex(t => t.type === 'problem_30');
        if (p30Idx !== -1) newTasks[p30Idx] = { ...newTasks[p30Idx], completed: true };
        else newTasks.push({ type: 'problem_30', completed: true });
      }

      let newHomework = [...student.homework];
      const dayIndex = newHomework.findIndex(d => d.date === selectedDate);
      
      if (dayIndex !== -1) {
        newHomework[dayIndex] = { ...newHomework[dayIndex], tasks: newTasks };
      } else {
        newHomework.push({ date: selectedDate, tasks: newTasks });
      }

      onUpdateStudent({ ...student, homework: newHomework });
    }); // forEach

    setSubmitSequence(newSubmitSequence);
    setSortBy('submit'); // 파싱 완료 시 자동으로 제출순 정렬로 변경
    setManualCheckList(newManualList);
    setRawData('');
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
    
    // 수동 조작 시 매뉴얼 체크 리스트에서 해제
    if (manualCheckList.includes(student.id)) {
      setManualCheckList(prev => prev.filter(id => id !== student.id));
    }
  };

  const handleUpdateExplanation = (student: StudentData, count: number) => {
    const dailyData = getDailyData(student, selectedDate);
    let newHomework = [...student.homework];

    if (dailyData) {
      let newTasks = [...dailyData.tasks];
      const existingTaskIndex = newTasks.findIndex(t => t.type === 'explanation');
      
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

    // 수동 조작 시 매뉴얼 체크 리스트에서 해제
    if (manualCheckList.includes(student.id)) {
      setManualCheckList(prev => prev.filter(id => id !== student.id));
    }
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

  const activeStudents = students.filter(student => {
    if (!student.profile.endDate) return true;
    const endDateObj = new Date(student.profile.endDate);
    endDateObj.setHours(0, 0, 0, 0);
    return endDateObj >= todayMidnight;
  });

  interface SortedStudentItem {
    student: StudentData;
    uniqueId: string;
    isSubmitted: boolean;
  }

  let sortedStudents: SortedStudentItem[] = [];

  if (sortBy === 'submit') {
    // 1. 제출 순서대로 중복 허용하여 구성
    const submitted = submitSequence
      .map((seq, idx) => {
        const student = activeStudents.find(s => s.id === seq.studentId);
        if (!student) return null;
        return {
          student,
          uniqueId: `${student.id}-submit-${idx}`,
          isSubmitted: true
        };
      })
      .filter((item): item is SortedStudentItem => item !== null);

    // 2. 제출하지 않은 학생들 가나다순으로 구성
    const submittedIds = new Set(submitSequence.map(seq => seq.studentId));
    const unsubmitted = activeStudents
      .filter(s => !submittedIds.has(s.id))
      .sort((a, b) => a.profile.name.localeCompare(b.profile.name))
      .map(student => ({
        student,
        uniqueId: `${student.id}-unsubmit`,
        isSubmitted: false
      }));

    sortedStudents = [...submitted, ...unsubmitted];
  } else {
    // 가나다순 정렬
    sortedStudents = activeStudents
      .sort((a, b) => a.profile.name.localeCompare(b.profile.name))
      .map(student => ({
        student,
        uniqueId: student.id,
        isSubmitted: false
      }));
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex flex-col gap-3 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Calendar className="text-indigo-600" size={20} />
          <span className="font-bold text-gray-700 text-sm">기록 날짜:</span>
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer"
          />
          <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
            <button
              onClick={() => setSortBy('name')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                sortBy === 'name'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              가나다순
            </button>
            <button
              onClick={() => setSortBy('submit')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                sortBy === 'submit'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              제출순
            </button>
          </div>
          <button
            onClick={handleResetDailyData}
            className="ml-auto px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-100 transition-colors"
          >
            기록 삭제
          </button>
        </div>

        

        {/* 카카오톡 데이터 입력 섹션 */}
        <div className="flex flex-col gap-2 border-t pt-2 mt-1">
          <span className="text-sm font-bold text-gray-700">카카오톡 로그 파싱</span>
          <div className="flex gap-2">
            <textarea
              value={rawData}
              onChange={(e) => setRawData(e.target.value)}
              placeholder="여기에 카카오톡 대화 로그를 붙여넣으세요..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded p-2 text-xs h-16 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <button
              onClick={handleProcessRawData}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded px-4 py-2 flex flex-col items-center justify-center transition-colors"
            >
              <Play size={16} className="mb-1" />
              <span className="text-xs font-bold">파싱 실행</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_2fr] bg-gray-50 p-2 border-b border-gray-200 font-bold text-xs text-gray-500 text-center">
          <div className="text-left pl-2">학생 정보</div>
          <div>기상</div>
          <div>30문제</div>
          <div>해설 개수</div>
        </div>

        <div className="divide-y divide-gray-100">
          {sortedStudents.map((item, index) => {
            const { student, uniqueId } = item;
            const isManualCheck = manualCheckList.includes(student.id);
            const submittedCount = submitSequence.length;

            return (
              <React.Fragment key={uniqueId}>
                {sortBy === 'submit' && index === 0 && submittedCount > 0 && (
                  <div className="bg-indigo-50/50 px-4 py-1.5 text-xs font-bold text-indigo-700 border-b border-indigo-100/50">
                    제출 순서 (카카오톡 파싱 기준)
                  </div>
                )}
                {sortBy === 'submit' && index === submittedCount && (
                  <div className="bg-gray-50 px-4 py-1.5 text-xs font-bold text-gray-500 border-b border-t border-gray-100">
                    미제출 학생 (가나다순)
                  </div>
                )}
                <div 
                  className={`grid grid-cols-[2fr_1fr_1fr_2fr] items-center p-2 transition-colors ${
                    isManualCheck ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="pl-2 flex items-center gap-2">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-800 text-sm flex items-center gap-1">
                        {student.profile.name}
                        {isManualCheck && <AlertCircle size={14} className="text-red-500" />}
                      </span>
                      <span className="text-[10px] text-gray-400">{student.profile.grade}</span>
                    </div>
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
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};