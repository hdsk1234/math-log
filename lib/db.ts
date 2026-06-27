
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  query,
  where,
  getDocs,
  limit
} from "firebase/firestore";
import { db } from "./firebase";
import { StudentData } from "../types";
import { generateDemoData } from "../constants";

const COLLECTION_NAME = "students";
const TEACHERS_COLLECTION = "teachers";

// undefined 값을 제거하기 위한 헬퍼 함수
const sanitizeData = (data: any) => {
  return JSON.parse(JSON.stringify(data));
};

// [보안] 선생님 승인 여부 확인
export const isTeacherApproved = async (email: string): Promise<boolean> => {
  if (!email) return false;
  try {
    const docRef = doc(db, TEACHERS_COLLECTION, email);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch (e) {
    console.error("Error checking teacher approval:", e);
    return false;
  }
};

// [보안] 선생님 등록 (인증 코드 통과 시 호출)
export const registerTeacher = async (email: string, name: string) => {
  if (!email) return;
  try {
    await setDoc(doc(db, TEACHERS_COLLECTION, email), {
      email,
      name,
      createdAt: new Date().toISOString(),
      role: 'teacher',
      canEdit: false
    });
  } catch (e) {
    console.error("Error registering teacher:", e);
  }
};

// [보안] 선생님 정보 조회
export const getTeacherData = async (email: string) => {
  if (!email) return null;
  try {
    const docRef = doc(db, TEACHERS_COLLECTION, email);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (e) {
    console.error("Error getting teacher data:", e);
    return null;
  }
};

// [보안] 선생님 편집 권한 확인
export const checkTeacherEditPermission = async (email: string): Promise<boolean> => {
  if (!email) return false;
  if (email.toLowerCase() === 'hdsk1234@naver.com') return true;
  try {
    const docRef = doc(db, TEACHERS_COLLECTION, email);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.canEdit === true;
    }
    return false;
  } catch (e) {
    console.error("Error checking edit permission:", e);
    return false;
  }
};

// [선생님용] 전체 학생 데이터 실시간 구독
export const subscribeToStudents = (callback: (students: StudentData[]) => void) => {
  const unsubscribe = onSnapshot(collection(db, COLLECTION_NAME), (snapshot) => {
    const students: StudentData[] = [];
    snapshot.forEach((doc) => {
      students.push(doc.data() as StudentData);
    });
    callback(students);
  });
  return unsubscribe;
};

// [학생용] 특정 학생 1명 데이터 실시간 구독
export const subscribeToSingleStudent = (id: string, callback: (student: StudentData | null) => void) => {
  const unsubscribe = onSnapshot(doc(db, COLLECTION_NAME, id), (doc) => {
    if (doc.exists()) {
      callback(doc.data() as StudentData);
    } else {
      callback(null);
    }
  });
  return unsubscribe;
};

// [로그인용] 해싱된 PIN 번호로 학생 검색
export const verifyStudentPin = async (hashedPin: string): Promise<StudentData | null> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME), 
      where("profile.pinHash", "==", hashedPin),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as StudentData;
    }
    return null;
  } catch (e) {
    console.error("Error verifying PIN:", e);
    return null;
  }
};

// 학생 추가 (Create)
export const addStudentToDB = async (student: StudentData) => {
  try {
    await setDoc(doc(db, COLLECTION_NAME, student.id), sanitizeData(student));
  } catch (e) {
    console.error("Error adding student: ", e);
  }
};

// 학생 정보 업데이트 (Update)
export const updateStudentInDB = async (student: StudentData) => {
  try {
    await setDoc(doc(db, COLLECTION_NAME, student.id), sanitizeData(student), { merge: true });
  } catch (e) {
    console.error("Error updating student: ", e);
  }
};

// 학생 삭제 (Delete)
export const deleteStudentFromDB = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (e) {
    console.error("Error deleting student: ", e);
  }
};

export const initializeDemoData = async () => {
  const demoData = generateDemoData();
  for (const student of demoData) {
    await addStudentToDB(student);
  }
};

// [관리자용] 전체 선생님 목록 실시간 구독
export const subscribeToTeachers = (callback: (teachers: any[]) => void) => {
  const unsubscribe = onSnapshot(collection(db, TEACHERS_COLLECTION), (snapshot) => {
    const teachers: any[] = [];
    snapshot.forEach((doc) => {
      teachers.push(doc.data());
    });
    // 가입일 기준 내림차순 정렬 (최신 가입 순)
    teachers.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    callback(teachers);
  });
  return unsubscribe;
};

// [관리자용] 선생님 권한 업데이트
export const updateTeacherPermission = async (email: string, canEdit: boolean) => {
  try {
    const docRef = doc(db, TEACHERS_COLLECTION, email);
    await setDoc(docRef, { canEdit }, { merge: true });
  } catch (e) {
    console.error("Error updating teacher permission:", e);
  }
};

// [관리자용] 선생님 계정 삭제
export const deleteTeacherFromDB = async (email: string) => {
  try {
    await deleteDoc(doc(db, TEACHERS_COLLECTION, email));
  } catch (e) {
    console.error("Error deleting teacher:", e);
  }
};

