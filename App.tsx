
import React, { useState, useEffect } from 'react';
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
  // Role 'guest': Login screen
  // Role 'teacher': Firebase Auth (Email/Google)
  // Role 'student': PIN Auth
  const [role, setRole] = useState<UserRole>('guest');
  
  const [students, setStudents] = useState<StudentData[]>([]);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Auth Observer (Firebase Auth for Teachers)
  useEffect(() => {
    const unsubscribeAuth = subscribeToAuthChanges(async (user) => {
      if (user) {
        // [Security Check] Check if the user is an approved teacher
        if (user.email) {
          const approved = await isTeacherApproved(user.email);
          if (approved) {
            setRole('teacher');
          } else {
            // Not approved -> Force Logout
            await logOut();
            alert("승인되지 않은 선생님 계정입니다. 관리자에게 문의하거나 회원가입 시 인증 코드를 입력해주세요.");
            setRole('guest');
          }
        } else {
           // No email? Safety fallback
           await logOut();
           setRole('guest');
        }
      } else {
        // Teacher logged out -> Guest
        // If currently 'student', stay 'student' (Auth doesn't affect PIN login)
        setRole((prev) => {
          if (prev === 'teacher') return 'guest';
          return prev;
        });
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // 2. Data Subscription (Based on Role)
  useEffect(() => {
    let unsubscribeDB: () => void;
    setIsLoading(true);

    if (role === 'teacher') {
      // Teacher sees ALL students
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
      // Student sees ONLY their own data
      unsubscribeDB = subscribeToSingleStudent(activeStudentId, (student) => {
        if (student) {
          setStudents([student]); // Store in array for compatibility
        } else {
          // If student data deleted while logged in
          alert('학생 데이터를 찾을 수 없습니다.');
          setRole('guest');
          setActiveStudentId(null);
        }
        setIsLoading(false);
      });
    } else {
      // Guest sees NOTHING (Security)
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
    // Check Firestore for PIN (using Hash)
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
      // Student logout: just reset state
      setRole('guest');
      setActiveStudentId(null);
      setStudents([]);
    }
  };

  // Note: pin argument here expects HASH
  const handleAddStudent = (name: string, grade: string, school: string, pinHash: string) => {
    // Pass Hash PIN to generator
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
    // Automatically update the 'lastUpdate' field to today's date whenever data changes
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

  // --- Render ---

  if (isLoading && role !== 'guest') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // 1. Guest: Login
  if (role === 'guest') {
    return (
      <Login 
        onStudentLogin={handleStudentLoginAttempt} 
      />
    );
  }

  // 2. Teacher: List Dashboard
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

  // 3. Student/Teacher: Detail View
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
}

export default App;
