import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { ExamRound, MOCK_EXAM_ROUNDS } from './mockExamData';

const COLLECTION_NAME = 'settings';
const DOC_ID = 'mock_exams_data';
const STORAGE_KEY = 'local_mock_exam_rounds';

// 초기 데이터 로드 (Firestore -> localStorage -> 기본 상수 MOCK_EXAM_ROUNDS)
export function getInitialMockExamRounds(): ExamRound[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to load local mock exam rounds:", e);
  }
  return MOCK_EXAM_ROUNDS;
}

// 실모반 데이터 저장 (Firestore 및 localStorage 동시 반영)
export async function saveMockExamRounds(rounds: ExamRound[]): Promise<boolean> {
  try {
    // 1. localStorage 즉시 저장
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rounds));

    // 2. Firestore 저장 (권한이 있는 경우)
    const docRef = doc(db, COLLECTION_NAME, DOC_ID);
    await setDoc(docRef, {
      rounds,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return true;
  } catch (e) {
    console.warn("Failed to save mock exam rounds to Firestore (saved to localStorage):", e);
    return true;
  }
}

// 실모반 데이터 실시간 구독 훅
export function useMockExamRounds() {
  const [rounds, setRounds] = useState<ExamRound[]>(getInitialMockExamRounds);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    try {
      const docRef = doc(db, COLLECTION_NAME, DOC_ID);
      unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data?.rounds) && data.rounds.length > 0) {
            setRounds(data.rounds);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data.rounds));
          }
        }
        setIsLoading(false);
      }, (error) => {
        console.warn("Firestore subscription error for mock exams:", error);
        setIsLoading(false);
      });
    } catch (e) {
      console.warn("Error setting up mock exam subscription:", e);
      setIsLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const updateRounds = async (newRounds: ExamRound[]) => {
    setRounds(newRounds);
    await saveMockExamRounds(newRounds);
  };

  return { rounds, updateRounds, isLoading };
}
