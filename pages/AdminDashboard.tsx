import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Shield, 
  Search, 
  UserCheck, 
  UserX, 
  Users, 
  Trash2, 
  LogOut,
  Mail,
  Calendar,
  ShieldAlert
} from 'lucide-react';
import { subscribeToTeachers, updateTeacherPermission, deleteTeacherFromDB } from '../lib/db';

interface TeacherData {
  email: string;
  name?: string;
  createdAt?: string;
  role?: string;
  canEdit?: boolean;
}

interface Props {
  userEmail: string | null;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<Props> = ({ userEmail, onLogout }) => {
  const [teachers, setTeachers] = useState<TeacherData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const ADMIN_EMAIL = 'hdsk1234@naver.com';

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToTeachers((data) => {
      setTeachers(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleTogglePermission = async (email: string, currentCanEdit: boolean) => {
    if (email.toLowerCase() === ADMIN_EMAIL) {
      alert("관리자 본인의 권한은 변경할 수 없습니다.");
      return;
    }
    const newCanEdit = !currentCanEdit;
    await updateTeacherPermission(email, newCanEdit);
  };

  const handleDeleteTeacher = async (email: string) => {
    if (email.toLowerCase() === ADMIN_EMAIL) {
      alert("관리자 본인의 계정은 삭제할 수 없습니다.");
      return;
    }
    if (window.confirm(`${email} 선생님 계정을 시스템에서 영구 삭제하시겠습니까?\n삭제된 계정은 더 이상 대시보드에 로그인할 수 없습니다.`)) {
      await deleteTeacherFromDB(email);
    }
  };

  const filteredTeachers = teachers.filter((teacher) =>
    teacher.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Statistics calculation
  const totalTeachers = teachers.length;
  const approvedEditors = teachers.filter((t) => t.canEdit || t.email.toLowerCase() === ADMIN_EMAIL).length;
  const pendingTeachers = teachers.filter((t) => !t.canEdit && t.email.toLowerCase() !== ADMIN_EMAIL).length;

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <header className="bg-white px-6 py-4 border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="flex justify-between items-center max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/teacher')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"
              title="대시보드로 돌아가기"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <Shield className="text-indigo-600" size={24} />
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Admin Console</h1>
            </div>
            <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-indigo-200">
              최고 관리자
            </span>
          </div>

          <div className="flex items-center gap-3">
            {userEmail && (
              <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-2.5 py-1.5 rounded-md text-indigo-700 font-semibold text-xs transition-all">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                <span className="hidden sm:inline">{userEmail} (교사)</span>
                <span className="sm:hidden">{userEmail.split('@')[0]} (교사)</span>
              </div>
            )}
            <button
              onClick={onLogout}
              className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
              title="로그아웃"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">전체 가입 선생님</p>
              <h2 className="text-2xl font-extrabold text-gray-900 mt-0.5">{isLoading ? '-' : `${totalTeachers}명`}</h2>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <UserCheck size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">편집 승인 계정</p>
              <h2 className="text-2xl font-extrabold text-gray-900 mt-0.5">{isLoading ? '-' : `${approvedEditors}명`}</h2>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl">
              <UserX size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">조회 전용(대기)</p>
              <h2 className="text-2xl font-extrabold text-gray-900 mt-0.5">{isLoading ? '-' : `${pendingTeachers}명`}</h2>
            </div>
          </div>
        </div>

        {/* Teachers List Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
            <div>
              <h3 className="text-lg font-extrabold text-gray-900">교사 계정 권한 관리</h3>
              <p className="text-gray-400 text-sm mt-0.5">승인된 계정만 대시보드의 학생 데이터 수정 및 추가가 가능합니다.</p>
            </div>
            {/* Search Input */}
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="이메일 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
              <span>선생님 목록을 실시간으로 가져오는 중...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-extrabold text-gray-400 uppercase tracking-wider">선생님 정보</th>
                    <th className="px-6 py-4 text-xs font-extrabold text-gray-400 uppercase tracking-wider">가입 일시</th>
                    <th className="px-6 py-4 text-xs font-extrabold text-gray-400 uppercase tracking-wider">역할</th>
                    <th className="px-6 py-4 text-xs font-extrabold text-gray-400 uppercase tracking-wider">편집 권한</th>
                    <th className="px-6 py-4 text-xs font-extrabold text-gray-400 uppercase tracking-wider text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTeachers.map((teacher) => {
                    const isSelfAdmin = teacher.email.toLowerCase() === ADMIN_EMAIL;
                    const canEdit = teacher.canEdit || isSelfAdmin;

                    return (
                      <tr 
                        key={teacher.email} 
                        className={`hover:bg-gray-50/50 transition-colors ${isSelfAdmin ? 'bg-indigo-50/10' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold ${isSelfAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                              {(teacher.name || teacher.email).charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                {teacher.name || teacher.email.split('@')[0]}
                                {isSelfAdmin && (
                                  <span title="최고 관리자 계정">
                                    <ShieldAlert size={14} className="text-indigo-600 inline" />
                                  </span>
                                )}
                              </span>
                              <span className="text-xs text-gray-400">{teacher.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="flex items-center gap-1.5">
                            <Calendar size={14} className="text-gray-400" />
                            {formatDate(teacher.createdAt)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isSelfAdmin ? (
                            <span className="px-2 py-1 text-xs font-bold bg-indigo-100 text-indigo-800 rounded-md border border-indigo-200">
                              최고 관리자
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-md">
                              선생님
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleTogglePermission(teacher.email, !!teacher.canEdit)}
                            disabled={isSelfAdmin}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                              canEdit
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 disabled:hover:bg-emerald-50'
                                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${canEdit ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                            {canEdit ? '편집 및 수정 가능' : '조회 전용 대기'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleDeleteTeacher(teacher.email)}
                            disabled={isSelfAdmin}
                            className={`p-2 rounded-full transition-all text-gray-300 ${
                              isSelfAdmin 
                                ? 'cursor-not-allowed opacity-30' 
                                : 'hover:text-red-500 hover:bg-red-50'
                            }`}
                            title={isSelfAdmin ? "관리자 계정은 삭제할 수 없습니다" : "선생님 계정 제거"}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredTeachers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">
                        <Mail className="mx-auto mb-2 text-gray-300" size={24} />
                        검색 조건에 맞는 선생님 계정이 존재하지 않습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
