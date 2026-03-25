import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom'; // 추가된 라우터 모듈
import Callback from './pages/Callback'; // 새로 만든 밴드 API 콜백 컴포넌트
import { createNewStudent } from './constants';
import { Login } from './components/Login';
import { StudentManagementDashboard } from './pages/StudentManagementDashboard';
import { StudentJournalDashboard } from './pages/StudentJournalDashboard';
import { UserRole, StudentData } from './types';
import { 
  subscribeToStudents, 
  subscribeToSingleStudent,
  verifyStudentPin,
  addStudentToDB, 
  updateStudentInDB, 
  deleteStudentFromDB, 
  isTeacherApproved
} from './lib/db';
import { subscribeToAuthChanges, logOut } from './lib/auth';

function App() {
  const [role, setRole] = useState<UserRole>('guest');
  const [students, setStudents] = useState<StudentData[]>([]);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Auth Observer
  useEffect(() => {
    const unsubscribeAuth = subscribeToAuthChanges(async (user) => {
      if (user) {
        if (user.email) {
          const approved = await isTeacherApproved(user.email);
          if (approved) {
            setRole('teacher');
          } else {
            await logOut();
            alert("승인되지 않은 선생님 계정입니다. 관리자에게 문의하거나 회원가입 시 인증 코드를 입력해주세요.");
            setRole('guest');
          }
        } else {
           await logOut();
           setRole('guest');
        }
      } else {
        setRole((prev) => {
          if (prev === 'teacher') return 'guest';
          return prev;
        });
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // 2. Data Subscription
  useEffect(() => {
    let unsubscribeDB: () => void;
    setIsLoading(true);

    if (role === 'teacher') {
      try {
        unsubscribeDB = subscribeToStudents((data) => {
          setStudents(data);
          setIsLoading(false);
        });
      } catch (e) {
        console.warn("Firestore subscription failed:", e);
        setStudents([]); 
        setIsLoading(false);
      }
    } else if (role === 'student' && activeStudentId) {
      unsubscribeDB = subscribeToSingleStudent(activeStudentId, (student) => {
        if (student) {
          setStudents([student]); 
        } else {
          alert('학생 데이터를 찾을 수 없습니다.');
          setRole('guest');
          setActiveStudentId(null);
        }
        setIsLoading(false);
      });
    } else {
      setStudents([]);
      setIsLoading(false);
    }

    return () => {
      if (unsubscribeDB) unsubscribeDB();
    };
  }, [role, activeStudentId]);

  const activeStudent = students.find(s => s.id === activeStudentId);

  // --- Handlers ---
  const handleStudentLoginAttempt = async (pinHash: string): Promise<boolean> => {
    const student = await verifyStudentPin(pinHash);
    if (student) {
      setActiveStudentId(student.id);
      setRole('student');
      return true;
    }
    return false;
  };

  const handleLogout = async () => {
    if (role === 'teacher') {
      try {
        await logOut();
      } catch (error) {
        console.error("Logout failed", error);
      }
    } else {
      setRole('guest');
      setActiveStudentId(null);
      setStudents([]);
    }
  };

  const handleAddStudent = (name: string, grade: string, school: string, pinHash: string) => {
    const newStudent = createNewStudent(name, grade, school, pinHash);
    addStudentToDB(newStudent);
  };

  const handleDeleteStudent = (id: string) => {
    deleteStudentFromDB(id);
    if (activeStudentId === id) {
      setActiveStudentId(null);
    }
  };

  const handleUpdateStudent = (updatedStudent: StudentData) => {
    const today = new Date();
    const dateString = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

    const studentWithTimestamp = {
      ...updatedStudent,
      profile: {
        ...updatedStudent.profile,
        lastUpdate: dateString
      }
    };

    updateStudentInDB(studentWithTimestamp);
  };

  // 기존 메인 UI 렌더링 로직을 내부 컴포넌트로 분리
  const MainContent = () => {
    if (isLoading && role !== 'guest') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      );
    }

    if (role === 'guest') {
      return (
        <Login onStudentLogin={handleStudentLoginAttempt} />
      );
    }

    if (role === 'teacher' && !activeStudent) {
      return (
        <StudentManagementDashboard 
          students={students}
          onSelectStudent={setActiveStudentId}
          onAddStudent={handleAddStudent}
          onUpdateStudent={handleUpdateStudent}
          onDeleteStudent={handleDeleteStudent}
          onLogout={handleLogout}
        />
      );
    }

    if (activeStudent) {
      return (
        <StudentJournalDashboard
          student={activeStudent}
          currentUserRole={role}
          onUpdateStudent={handleUpdateStudent}
          onDeleteStudent={(id) => {
            handleDeleteStudent(id);
            setActiveStudentId(null);
          }}
          onBack={role === 'teacher' ? () => setActiveStudentId(null) : undefined}
          onLogout={handleLogout}
        />
      );
    }

    return null;
  };

  // 최종 렌더링: 라우터 적용
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainContent />} />
        <Route path="/callback" element={<Callback />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;