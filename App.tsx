import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import Callback from './pages/Callback';
import { createNewStudent } from './constants';
import { Login } from './components/Login';
import { StudentManagementDashboard } from './pages/StudentManagementDashboard';
import { StudentJournalDashboard } from './pages/StudentJournalDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { RankingsPage } from './pages/RankingsPage';
import { UserRole, StudentData } from './types';
import { 
  subscribeToStudents, 
  subscribeToSingleStudent,
  verifyStudentPin,
  addStudentToDB, 
  updateStudentInDB, 
  deleteStudentFromDB, 
  isTeacherApproved,
  checkTeacherEditPermission,
  getTeacherData
} from './lib/db';
import { subscribeToAuthChanges, logOut } from './lib/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './lib/firebase';

function AppContent() {
  const [role, setRole] = useState<UserRole>(() => {
    const savedRole = sessionStorage.getItem('user_role');
    return (savedRole as UserRole) || 'guest';
  });
  const [students, setStudents] = useState<StudentData[]>([]);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(() => {
    return sessionStorage.getItem('active_student_id');
  });
  const [canEdit, setCanEdit] = useState<boolean>(() => {
    return sessionStorage.getItem('can_edit') === 'true';
  });
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return sessionStorage.getItem('user_email');
  });
  const [teacherName, setTeacherName] = useState<string | null>(() => {
    return sessionStorage.getItem('teacher_name');
  });
  const [googleDisplayName, setGoogleDisplayName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // 1. Auth Observer & Teacher Data Subscription
  useEffect(() => {
    let unsubscribeTeacher: (() => void) | null = null;
    setIsLoading(true);

    const unsubscribeAuth = subscribeToAuthChanges((user) => {
      if (unsubscribeTeacher) {
        unsubscribeTeacher();
        unsubscribeTeacher = null;
      }

      if (user && user.email) {
        setGoogleDisplayName(user.displayName);
        const docRef = doc(db, 'teachers', user.email);
        unsubscribeTeacher = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const teacherData = docSnap.data();
            setRole('teacher');
            sessionStorage.setItem('user_role', 'teacher');
            setUserEmail(user.email);
            sessionStorage.setItem('user_email', user.email!);
            
            const name = teacherData.name || user.email!.split('@')[0];
            setTeacherName(name);
            sessionStorage.setItem('teacher_name', name);
            
            const hasEditPermission = teacherData.canEdit === true || user.email!.toLowerCase() === 'hdsk1234@naver.com';
            setCanEdit(hasEditPermission);
            sessionStorage.setItem('can_edit', hasEditPermission ? 'true' : 'false');
            setIsLoading(false);
          } else {
            // Google authenticated, but pending registration in Firestore
            setRole('guest');
            setCanEdit(false);
            setUserEmail(user.email);
            setTeacherName(null);
            setIsLoading(false);
          }
        }, (error) => {
          console.error("Teacher subscription error:", error);
          setRole('guest');
          setCanEdit(false);
          setUserEmail(user.email);
          setTeacherName(null);
          setIsLoading(false);
        });
      } else {
        setRole('guest');
        setCanEdit(false);
        setUserEmail(null);
        setTeacherName(null);
        setGoogleDisplayName(null);
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeTeacher) unsubscribeTeacher();
    };
  }, []);

  // 2. Data Subscription
  useEffect(() => {
    let unsubscribeDB: () => void;
    setIsLoading(true);

    if (role === 'teacher' || role === 'student' || location.pathname === '/rankings') {
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
    } else {
      setStudents([]);
      setIsLoading(false);
    }

    return () => {
      if (unsubscribeDB) unsubscribeDB();
    };
  }, [role, activeStudentId, location.pathname]);

  const handleStudentLoginAttempt = async (pinHash: string): Promise<boolean> => {
    const student = await verifyStudentPin(pinHash);
    if (student) {
      sessionStorage.setItem('user_role', 'student');
      sessionStorage.setItem('active_student_id', student.id);
      sessionStorage.setItem('can_edit', 'false');
      setActiveStudentId(student.id);
      setRole('student');
      setCanEdit(false);
      navigate(`/student/${student.id}`);
      return true;
    }
    return false;
  };

  const handleLogout = async () => {
    if (!window.confirm("로그아웃 하시겠습니까?")) {
      return;
    }
    sessionStorage.removeItem('user_role');
    sessionStorage.removeItem('active_student_id');
    sessionStorage.removeItem('can_edit');
    sessionStorage.removeItem('user_email');
    sessionStorage.removeItem('teacher_name');
    if (role === 'teacher') {
      try {
        await logOut();
      } catch (error) {
        console.error("Logout failed", error);
      }
    }
    setRole('guest');
    setCanEdit(false);
    setUserEmail(null);
    setTeacherName(null);
    setActiveStudentId(null);
    setStudents([]);
    navigate('/login');
  };

  const handleAddStudent = (name: string, grade: string, school: string, pinHash: string) => {
    if (!canEdit) return;
    const newStudent = createNewStudent(name, grade, school, pinHash);
    addStudentToDB(newStudent);
  };

  const handleDeleteStudent = (id: string) => {
    if (!canEdit) return;
    deleteStudentFromDB(id);
    if (activeStudentId === id) {
      setActiveStudentId(null);
      sessionStorage.removeItem('active_student_id');
    }
  };

  const handleUpdateStudent = (updatedStudent: StudentData) => {
    if (!canEdit) return;
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

  if (isLoading && role !== 'guest') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/" 
        element={
          role === 'teacher' ? (
            <Navigate to="/teacher" replace />
          ) : role === 'student' && activeStudentId ? (
            <Navigate to={`/student/${activeStudentId}`} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />
      <Route 
        path="/login" 
        element={
          role === 'teacher' ? (
            <Navigate to="/teacher" replace />
          ) : role === 'student' && activeStudentId ? (
            <Navigate to={`/student/${activeStudentId}`} replace />
          ) : (
            <Login 
              onStudentLogin={handleStudentLoginAttempt} 
              authenticatedEmail={userEmail}
              googleDisplayName={googleDisplayName}
            />
          )
        } 
      />
      <Route 
        path="/teacher" 
        element={
          role !== 'teacher' ? (
            <Navigate to="/login" replace />
          ) : (
            <StudentManagementDashboard 
              students={students}
              onSelectStudent={(id) => navigate(`/student/${id}`)}
              onAddStudent={handleAddStudent}
              onUpdateStudent={handleUpdateStudent}
              onDeleteStudent={handleDeleteStudent}
              onLogout={handleLogout}
              canEdit={canEdit}
              userEmail={teacherName || userEmail}
            />
          )
        } 
      />
      <Route 
        path="/admin" 
        element={
          role === 'teacher' && userEmail?.toLowerCase() === 'hdsk1234@naver.com' ? (
            <AdminDashboard 
              userEmail={teacherName || userEmail}
              onLogout={handleLogout}
            />
          ) : (
            <Navigate to="/" replace />
          )
        } 
      />
      <Route 
        path="/student/:studentId" 
        element={
          <StudentWrapper 
            role={role}
            activeStudentId={activeStudentId}
            students={students}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            onLogout={handleLogout}
            canEdit={canEdit}
            userEmail={teacherName || userEmail}
          />
        } 
      />
      <Route 
        path="/rankings" 
        element={
          <RankingsPage 
            role={role}
            students={students}
            activeStudentId={activeStudentId}
          />
        } 
      />
      <Route path="/callback" element={<Callback />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

interface StudentWrapperProps {
  role: UserRole;
  activeStudentId: string | null;
  students: StudentData[];
  onUpdateStudent: (student: StudentData) => void;
  onDeleteStudent: (id: string) => void;
  onLogout: () => void;
  canEdit: boolean;
  userEmail: string | null;
}

const StudentWrapper: React.FC<StudentWrapperProps> = ({
  role,
  activeStudentId,
  students,
  onUpdateStudent,
  onDeleteStudent,
  onLogout,
  canEdit,
  userEmail
}) => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  if (role === 'guest') {
    return <Navigate to="/login" replace />;
  }

  if (role === 'student' && activeStudentId !== studentId) {
    return <Navigate to={`/student/${activeStudentId}`} replace />;
  }

  const currentStudent = students.find(s => s.id === studentId);
  if (!currentStudent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <StudentJournalDashboard
      student={currentStudent}
      students={students}
      currentUserRole={role}
      onUpdateStudent={onUpdateStudent}
      onDeleteStudent={(id) => {
        onDeleteStudent(id);
        navigate('/teacher');
      }}
      onBack={role === 'teacher' ? () => navigate(-1) : undefined}
      onLogout={onLogout}
      canEdit={canEdit}
      userEmail={userEmail}
    />
  );
};


function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;