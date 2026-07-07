
export type HomeworkType = 'wake_up' | 'problem_30' | 'explanation';
export type UserRole = 'guest' | 'student' | 'teacher';

export interface DailyHomework {
  date: string; // YYYY-MM-DD
  hasLesson?: boolean; 
  note?: string;       
  tasks: {
    type: HomeworkType;
    completed: boolean;
    count?: number;
  }[];
}

export interface UnitMastery {
  subject: string;
  score: number; // 0-100
  fullMark: number;
}

export interface WeakPoint {
  category: string; // Changed from 'unit' to 'category' (e.g., '계산 실수', '학습 태도')
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export interface LessonLog {
  session?: number; // Added session number
  date: string;
  unit: string;
  content: string;
  understanding: number; // 1-5
}

export interface ComparisonData {
  category: string;
  student: number;
  average: number;
}

export interface Range {
  start: number;
  end: number;
}

export interface Textbook {
  id: string;
  title: string;
  subject: string;
  coverImage: string;
  totalSteps: number;
  completedRanges: Range[]; // currentStep 대체
  status: 'active' | 'completed' | 'paused';
}

export interface RoadmapStep {
  id: string;
  title: string;
  date?: string;
  status: 'upcoming' | 'current' | 'completed';
}

export interface StudentProfile {
  name: string;
  grade: string;
  school: string;
  lastUpdate: string;
  startDate: string; // YYYY-MM-DD format
  endDate: string;
  pinHash: string; // Hashed PIN (SHA-256) for login verification
  isFavorite: boolean; // 즐겨찾기 여부
  lessonDays?: string[]; // 수업 요일 예: ['화', '목']
  lessonFeeCycle?: number; // 수납 주기 (예: 4, 8)
  parentPhone?: string; // 학부모 번호
  studentPhone?: string; // 학생 번호
  paymentMessageTemplate?: string; // 납부 안내 문자 템플릿
  lastPaymentSession?: number; // 마지막으로 수납된 세션 번호 (하위 호환성 유지)
  completedPaymentDates?: string[]; // 수납 완료 처리된 날짜들의 배열 (YYYY-MM-DD)
}

export interface AssignmentItem {
  text: string;
  completed: boolean;
}

export interface AssignmentCategory {
  title: string; // '[문제풀이]', '[해설작성]'
  items: AssignmentItem[];
}

export interface DailySchedule {
  date: string; // '2/13'
  categories: AssignmentCategory[];
}

export interface UpcomingAssignmentsData {
  schedules: DailySchedule[];
  materials: string[];
}

export interface StudentData {
  id: string;
  profile: StudentProfile;
  homework: DailyHomework[];
  weakPoints: WeakPoint[];
  mastery: UnitMastery[];
  lessonLogs: LessonLog[];
  textbooks: Textbook[]; // Changed from roadmap to textbooks
  teacherNote: string;
  upcomingAssignments: UpcomingAssignmentsData;
}

export interface TrendData {
  name: string;
  overall: number;
  wake_up: number;
  problem_30: number;
  explanation: number;
}

