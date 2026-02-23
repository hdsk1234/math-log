import React, { useState } from 'react';
import { StudentData } from '../types';
import { StudentList } from '../components/StudentList';
import { QuickUpdateDashboard } from '../components/QuickUpdateDashboard';
import { GraduationCap, LogOut, List, Zap } from 'lucide-react';

interface Props {
  students: StudentData[];
  onSelectStudent: (id: string) => void;
  onAddStudent: (name: string, grade: string, school: string, pin: string) => void;
  onUpdateStudent: (student: StudentData) => void;
  onDeleteStudent: (id: string) => void;
  onLogout: () => void;
}

export const StudentManagementDashboard: React.FC<Props> = ({
  students,
  onSelectStudent,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onLogout,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'quick'>('list');

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="bg-white px-6 py-4 border-b border-gray-100 sticky top-0 z-50">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="text-indigo-600" size={24} />
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight hidden md:block">Math Tutor Admin</h1>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  viewMode === 'list' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <List size={14} /> 학생 관리
              </button>
              <button
                onClick={() => setViewMode('quick')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  viewMode === 'quick' 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Zap size={14} /> 빠른 기록
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

      {viewMode === 'list' ? (
        <StudentList 
          students={students} 
          onSelectStudent={onSelectStudent} 
          onAddStudent={onAddStudent}
          onUpdateStudent={onUpdateStudent}
          onDeleteStudent={onDeleteStudent}
        />
      ) : (
        <QuickUpdateDashboard 
          students={students}
          onUpdateStudent={onUpdateStudent}
        />
      )}
    </div>
  );
};