import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { StudentData, UserRole } from '../types';
import { 
  ArrowLeft, User, Shield, Key, CheckCircle, AlertTriangle, ChevronRight, LogOut 
} from 'lucide-react';
import { hashPin } from '../lib/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Props {
  role: UserRole;
  activeStudentId: string | null;
  students: StudentData[];
  userEmail: string | null;
  teacherName: string | null;
  onUpdateStudent: (updatedStudent: StudentData) => void;
  onLogout: () => void;
  canEdit: boolean;
}

export const MyPage: React.FC<Props> = ({
  role,
  activeStudentId,
  students,
  userEmail,
  teacherName,
  onUpdateStudent,
  onLogout,
  canEdit
}) => {
  const navigate = useNavigate();

  // Find student if role is student
  const student = role === 'student' 
    ? students.find(s => s.id === activeStudentId) 
    : null;

  // Student PIN state
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  
  // Teacher Nickname state
  const [newNickname, setNewNickname] = useState(teacherName || '');

  // Status message state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (teacherName) {
      setNewNickname(teacherName);
    }
  }, [teacherName]);

  const handlePinChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      // 1. Verify current PIN
      const hashedCurrentInput = await hashPin(currentPin);
      if (hashedCurrentInput !== student.profile.pinHash) {
        setError('현재 PIN 번호가 올바르지 않습니다.');
        setIsSubmitting(false);
        return;
      }

      // 2. Validate new PIN
      if (newPin.length !== 8 || !/^\d+$/.test(newPin)) {
        setError('새로운 PIN 번호는 8자리 숫자여야 합니다.');
        setIsSubmitting(false);
        return;
      }

      if (newPin !== confirmPin) {
        setError('새로운 PIN 번호 확인이 일치하지 않습니다.');
        setIsSubmitting(false);
        return;
      }

      if (currentPin === newPin) {
        setError('현재 사용 중인 PIN 번호와 새로운 PIN 번호가 동일합니다.');
        setIsSubmitting(false);
        return;
      }

      // 3. Hash new PIN and update student
      const hashedNewPin = await hashPin(newPin);
      const updatedStudent: StudentData = {
        ...student,
        profile: {
          ...student.profile,
          pinHash: hashedNewPin
        }
      };

      await onUpdateStudent(updatedStudent);
      setSuccess('PIN 번호가 성공적으로 변경되었습니다.');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (err: any) {
      if (err.message === 'SECURE_CONTEXT_REQUIRED') {
        setError('보안 환경(HTTPS 또는 localhost)에서만 PIN 번호 변경이 가능합니다.');
      } else {
        setError('PIN 번호 변경 중 오류가 발생했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNicknameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail) return;

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      if (!newNickname.trim()) {
        setError('닉네임을 입력해 주세요.');
        setIsSubmitting(false);
        return;
      }

      const docRef = doc(db, 'teachers', userEmail);
      await updateDoc(docRef, { name: newNickname.trim() });
      setSuccess('선생님 닉네임이 성공적으로 변경되었습니다.');
    } catch (err) {
      console.error('Error updating nickname:', err);
      setError('닉네임 변경 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (role === 'teacher') {
      navigate('/teacher');
    } else if (role === 'student' && activeStudentId) {
      navigate(`/student/${activeStudentId}`);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-50">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleBack}
              className="p-2 -ml-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
              마이페이지
            </h1>
          </div>
          <button 
            onClick={onLogout}
            className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors flex items-center gap-1.5 text-sm font-bold"
            title="로그아웃"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">로그아웃</span>
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 mt-4 space-y-6">
        {/* Status Alerts */}
        {error && (
          <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-100 p-4 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200">
            <AlertTriangle size={18} className="flex-shrink-0 text-red-500" />
            <span className="text-sm font-semibold">{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 p-4 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200">
            <CheckCircle size={18} className="flex-shrink-0 text-emerald-500" />
            <span className="text-sm font-semibold">{success}</span>
          </div>
        )}

        {/* PROFILE CARD */}
        {role === 'student' && student && (
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center border border-white/20 text-indigo-100">
                <User size={32} />
              </div>
              <div>
                <span className="text-xs font-bold text-indigo-200 block uppercase">
                  {student.profile.school} • {student.profile.grade}
                </span>
                <h2 className="text-2xl font-black mt-0.5">{student.profile.name} (학생)</h2>
                <span className="text-[10px] bg-white/20 text-white border border-white/10 px-2 py-0.5 rounded-full inline-block mt-1.5 font-bold">
                  시작일: {student.profile.startDate}
                </span>
              </div>
            </div>
          </div>
        )}

        {role === 'teacher' && (
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center border border-white/20 text-indigo-100">
                <User size={32} />
              </div>
              <div>
                <span className="text-xs font-bold text-indigo-200 block">
                  {userEmail}
                </span>
                <h2 className="text-2xl font-black mt-0.5">{newNickname} (선생님)</h2>
                <span className="text-[10px] bg-white/20 text-white border border-white/10 px-2 py-0.5 rounded-full inline-block mt-1.5 font-bold">
                  {canEdit ? '과외 수정 권한: 있음' : '과외 수정 권한: 없음'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* FOR STUDENTS: PIN MANAGEMENT */}
        {role === 'student' && student && (
          <Card title="접속용 PIN 번호 변경" icon={<Key className="text-indigo-600" size={20} />}>
            <form onSubmit={handlePinChange} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">현재 PIN 번호</label>
                <input 
                  type="password"
                  value={currentPin}
                  onChange={e => setCurrentPin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="현재 8자리 PIN 번호"
                  maxLength={8}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-mono font-bold tracking-widest text-center"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">새로운 PIN 번호</label>
                <input 
                  type="password"
                  value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="새로운 8자리 PIN 번호 설정"
                  maxLength={8}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-mono font-bold tracking-widest text-center"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">새로운 PIN 번호 확인</label>
                <input 
                  type="password"
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="새로운 PIN 번호 다시 입력"
                  maxLength={8}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-mono font-bold tracking-widest text-center"
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md shadow-indigo-50 mt-2 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? '변경 중...' : 'PIN 번호 변경하기'}
              </button>
            </form>
          </Card>
        )}

        {/* FOR TEACHERS: NICKNAME & INFO */}
        {role === 'teacher' && (
          <Card title="닉네임 (이름) 변경" icon={<User className="text-indigo-600" size={20} />}>
            <form onSubmit={handleNicknameChange} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">선생님 닉네임</label>
                <input 
                  type="text"
                  value={newNickname}
                  onChange={e => setNewNickname(e.target.value)}
                  placeholder="과외 일지에 표시될 선생님 이름"
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-bold text-gray-700"
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md shadow-indigo-50 mt-2 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? '변경 중...' : '닉네임 변경하기'}
              </button>
            </form>
          </Card>
        )}


      </main>
    </div>
  );
};
