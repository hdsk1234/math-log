import React from 'react';
import { useNavigate } from 'react-router-dom';
import { StudentRankings } from '../components/StudentRankings';
import { StudentData, UserRole } from '../types';
import { GraduationCap, LogIn, ArrowLeft } from 'lucide-react';

interface Props {
  role: UserRole;
  students: StudentData[];
  activeStudentId: string | null;
}

export const RankingsPage: React.FC<Props> = ({ role, students, activeStudentId }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (role === 'teacher') {
      navigate('/teacher');
    } else if (role === 'student' && activeStudentId) {
      navigate(`/student/${activeStudentId}`);
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="bg-white px-6 py-4 border-b border-gray-100 sticky top-0 z-50">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="text-indigo-600" size={24} />
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">과외 일지</h1>
            </div>
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-extrabold">
              전체 순위
            </span>
          </div>

          <div className="flex items-center gap-2">
            {role === 'guest' ? (
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-1.5 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-all"
              >
                <LogIn size={16} />
                로그인 / 인증
              </button>
            ) : (
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition-all"
              >
                <ArrowLeft size={16} />
                대시보드로 돌아가기
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="pt-2">
        <StudentRankings
          students={students}
          role={role}
          onSelectStudent={(id) => {
            if (role !== 'guest') {
              navigate(`/student/${id}`);
            }
          }}
        />
      </main>
    </div>
  );
};
