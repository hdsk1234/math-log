import { StudentData } from '../types';

export interface ExamRound {
  round: number;
  title: string;
  date: string;
  totalCandidates: number;
  recordedCandidates: number;
  mean: number;
  median: number;
  highest: number;
  scores: Record<string, number>; // maskedName -> score
}

// 1~11회차 실모반 데이터 (현재 3회차까지 입력됨)
export const MOCK_EXAM_ROUNDS: ExamRound[] = [
  {
    round: 1,
    title: '1회차 실모',
    date: '2026-09-06',
    totalCandidates: 28,
    recordedCandidates: 27,
    mean: 70.78,
    median: 70,
    highest: 92,
    scores: {
      '정○윤': 92,
      '김○욱': 88,
      '추○재': 88,
      '채○린': 86,
      '박○환': 80,
      '유○민': 80,
      '장○은': 77,
      '송○정': 74,
      '심○선': 74,
      '김○령': 72,
      '박○빈': 72,
      '서○원': 72,
      '안○연': 72,
      '이○아': 70,
      '함○민': 70,
      '권○림': 68,
      '김○': 68,
      '윤○준': 67,
      '권○범': 66,
      '장○원': 65,
      '조○우': 64,
      '김○은': 63,
      '김○경': 63,
      '이○린': 60,
      '고○찬': 56,
      '최○윤': 54,
      '이○승': 50,
    }
  },
  {
    round: 2,
    title: '2회차 실모',
    date: '2026-09-13',
    totalCandidates: 30,
    recordedCandidates: 29,
    mean: 72.59,
    median: 72,
    highest: 92,
    scores: {
      '이○수': 92,
      '채○린': 92,
      '정○윤': 88,
      '추○재': 88,
      '김○욱': 84,
      '유○민': 80,
      '박○환': 78,
      '권○범': 77,
      '박○빈': 77,
      '이○아': 77,
      '박○우': 76,
      '서○원': 76,
      '권○림': 73,
      '양○진': 73,
      '심○선': 72,
      '장○원': 72,
      '장○은': 71,
      '김○령': 69,
      '이○린': 69,
      '조○우': 68,
      '이○승': 67,
      '김○': 65,
      '김○경': 65,
      '김○은': 65,
      '함○민': 65,
      '고○찬': 61,
      '안○연': 61,
      '윤○준': 55,
      '최○윤': 49,
    }
  },
  {
    round: 3,
    title: '3회차 실모',
    date: '2026-09-20',
    totalCandidates: 30,
    recordedCandidates: 30,
    mean: 77.13,
    median: 76.5,
    highest: 88,
    scores: {
      '박○환': 88,
      '양○진': 88,
      '장○은': 88,
      '채○린': 88,
      '추○재': 88,
      '이○아': 84,
      '장○원': 84,
      '정○윤': 84,
      '김○욱': 81,
      '권○림': 80,
      '박○빈': 80,
      '유○민': 80,
      '송○정': 78,
      '심○선': 77,
      '윤○준': 77,
      '권○범': 76,
      '김○령': 76,
      '박○연': 76,
      '서○원': 76,
      '박○우': 73,
      '조○우': 73,
      '함○민': 73,
      '김○경': 72,
      '김○은': 72,
      '안○연': 72,
      '김○': 71,
      '고○찬': 69,
      '이○승': 68,
      '최○윤': 62,
      '이○린': 60,
    }
  }
];

// 마스킹 이름과 실제 DB 학생 일치 매칭 (이름 마스킹 패턴 기반)
export function matchStudentByMask(maskedName: string, students: StudentData[]): StudentData | null {
  const cleanMask = maskedName.trim();
  const matched = students.filter(s => {
    const cleanReal = (s.profile?.name || '').replace(/[0-9]/g, '').trim();
    if (cleanMask.length === 2) {
      return cleanReal.length === 2 && cleanReal[0] === cleanMask[0];
    } else if (cleanMask.length === 3) {
      return cleanReal.length === 3 && cleanReal[0] === cleanMask[0] && cleanReal[2] === cleanMask[2];
    }
    return false;
  });

  if (matched.length === 0) return null;
  if (matched.length === 1) return matched[0];

  // 동명이인 마스킹 충돌 시 최근 과제 활동이 있는 학생 우선 매칭
  matched.sort((a, b) => {
    const aEnd = a.profile?.endDate ? new Date(a.profile.endDate).getTime() : Infinity;
    const bEnd = b.profile?.endDate ? new Date(b.profile.endDate).getTime() : Infinity;
    if (aEnd !== bEnd) return bEnd - aEnd;
    return (b.homework?.length || 0) - (a.homework?.length || 0);
  });
  return matched[0];
}

// 학생별 수업 시작일 ~ 현재(today) 과제제출률 계산
export function calculateStudentHwRate(student: StudentData, today: Date = new Date()): {
  rate: number;
  completed: number;
  total: number;
  wakeUpRate: number;
  problem30Rate: number;
  explanationRate: number;
} {
  if (!student.profile?.startDate) {
    return { rate: 0, completed: 0, total: 0, wakeUpRate: 0, problem30Rate: 0, explanationRate: 0 };
  }

  const start = new Date(student.profile.startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  let curr = new Date(start);
  let totalDays = 0;
  let completed = 0;
  let wakeUpCompleted = 0;
  let problem30Completed = 0;
  let explanationCompleted = 0;

  while (curr <= end) {
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const d = String(curr.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    totalDays++;

    const daily = student.homework?.find(h => h.date === dateStr);
    if (daily && daily.tasks) {
      daily.tasks.forEach(t => {
        if (t.completed) {
          completed++;
          if (t.type === 'wake_up') wakeUpCompleted++;
          if (t.type === 'problem_30') problem30Completed++;
          if (t.type === 'explanation') explanationCompleted++;
        }
      });
    }
    curr.setDate(curr.getDate() + 1);
  }

  const totalTasks = totalDays * 3;
  const rate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

  return {
    rate,
    completed,
    total: totalTasks,
    wakeUpRate: totalDays > 0 ? Math.round((wakeUpCompleted / totalDays) * 100) : 0,
    problem30Rate: totalDays > 0 ? Math.round((problem30Completed / totalDays) * 100) : 0,
    explanationRate: totalDays > 0 ? Math.round((explanationCompleted / totalDays) * 100) : 0
  };
}

// 피어슨 상관계수 r 계산
export function calculatePearson(xArr: number[], yArr: number[]): number {
  const n = xArr.length;
  if (n < 2) return 0;
  const xMean = xArr.reduce((a, b) => a + b, 0) / n;
  const yMean = yArr.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xArr[i] - xMean;
    const dy = yArr[i] - yMean;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  if (denX === 0 || denY === 0) return 0;
  return num / Math.sqrt(denX * denY);
}

// 선형 회귀 계수 (y = mx + b)
export function calculateLinearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number } {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0 };
  const sumX = points.reduce((acc, p) => acc + p.x, 0);
  const sumY = points.reduce((acc, p) => acc + p.y, 0);
  const sumXY = points.reduce((acc, p) => acc + p.x * p.y, 0);
  const sumX2 = points.reduce((acc, p) => acc + p.x * p.x, 0);

  const denom = (n * sumX2 - sumX * sumX);
  if (denom === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}
