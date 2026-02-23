
export type HomeworkType = 'wake_up' | 'problem_30' | 'explanation';
export type UserRole = 'guest' | 'student' | 'teacher';

export interface DailyHomework {
  date: string; // YYYY-MM-DD
  tasks: {
    type: HomeworkType;
    completed: boolean;
  }[];
  hasLesson?: boolean;
  note?: string; // Daily memo/specific homework text
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

export interface Textbook {
  id: string;
  title: string; // e.g. "쎈 수학 I"
  subject?: string; // e.g. "수학 I"
  coverImage?: string; // Image URL
  currentStep: number; // e.g. 50 (pages or chapters)
  totalSteps: number; // e.g. 200
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
  pinHash: string; // Hashed PIN (SHA-256) for login verification
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
