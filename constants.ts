
import { 
  StudentProfile, 
  DailyHomework, 
  UnitMastery, 
  WeakPoint, 
  LessonLog, 
  Textbook,
  UpcomingAssignmentsData,
  StudentData,
  HomeworkType
} from './types';

// Predefined Subject List
export const SUBJECT_OPTIONS = [
  '수학1',
  '수학2',
  '미적분',
  '확률과통계',
  '기하',
  '공통수학1',
  '공통수학2',
  '대수',
  '미적분1',
  '미적분2'
];

// Helper to generate a placeholder cover image based on subject
export const getPresetCoverUrl = (subject: string): string => {
  // Define colors for each subject to make them distinct
  const colorMap: Record<string, string> = {
    '수학1': '4f46e5', // Indigo
    '수학2': '0ea5e9', // Sky
    '미적분': 'db2777', // Pink
    '확률과통계': 'e11d48', // Rose
    '기하': '059669', // Emerald
    '공통수학1': '7c3aed', // Violet
    '공통수학2': '8b5cf6', // Purple
    '대수': 'd97706', // Amber
    '미적분1': 'c026d3', // Fuchsia
    '미적분2': 'be185d', // Pink-700
  };

  const color = colorMap[subject] || '6b7280'; // Default gray
  const text = encodeURIComponent(subject || 'Math');
  
  // Using placehold.co for reliable dynamic images
  return `https://placehold.co/300x400/${color}/ffffff?text=${text}&font=roboto`;
};

// Helper to generate empty month data
const createEmptyMonthHomework = (year: number, month: number): DailyHomework[] => {
  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return {
      date: dateStr,
      tasks: [] // Start empty
    };
  });
};

// Note: createNewStudent now expects an ALREADY HASHED pin
export const createNewStudent = (name: string, grade: string, school: string, pinHash: string): StudentData => {
  const today = new Date();
  // Standardized Format: YYYY.MM.DD
  const dateString = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
  const startDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return {
    id: `student-${Date.now()}`,
    profile: {
      name,
      grade,
      school,
      lastUpdate: dateString,
      startDate: startDateStr, 
      endDate: '',
      pinHash: pinHash,
      isFavorite: false,
    },
    homework: [],
    weakPoints: [],
    mastery: [
      { subject: '수학1', score: 50, fullMark: 100 },
      { subject: '수학2', score: 50, fullMark: 100 },
      { subject: '미적분', score: 50, fullMark: 100 },
    ],
    lessonLogs: [],
    textbooks: [],
    teacherNote: '',
    upcomingAssignments: {
      schedules: [],
      materials: []
    }
  };
};

// Helper to parse the custom pattern string from user request
// o, 1, 2 = True
// x, 0, _ = False
const parsePattern = (pattern: string): boolean[] => {
  const cleanStr = pattern.replace(/\s/g, ''); // Remove spaces
  return cleanStr.split('').map(char => {
    return ['o', '1', '2', 'O'].includes(char);
  });
};

// Initial Demo Data Generator
export const generateDemoData = (): StudentData[] => {
  // Pre-calculated SHA-256 hash for '12345678'
  const DEMO_PIN_HASH = "ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f";
  
  const student = createNewStudent('하주원', '고등학교 2학년', '세화고등학교', DEMO_PIN_HASH);
  
  // 1. Homework Data Injection based on the provided patterns
  const patterns = [
    { wake: "___ __oo", prob: "___ __ox", expl: "___ __10" },
    { wake: "ooo oooo", prob: "ooo xooo", expl: "110 0110" },
    { wake: "ooo ooox", prob: "ooo oooo", expl: "100 0010" },
    { wake: "ooo oooo", prob: "xxx oxxx", expl: "000 1000" },
    { wake: "xoo oooo", prob: "oox xoxx", expl: "110 0100" },
    { wake: "xoo oooo", prob: "oxx xxxx", expl: "100 0001" },
    { wake: "xoo oooo", prob: "xxx oooo", expl: "000 1120" }
  ];

  // Flatten the patterns into a single array of days
  const flatData: { wake: boolean, prob: boolean, expl: boolean }[] = [];
  
  patterns.forEach(week => {
    const wakeBools = parsePattern(week.wake);
    const probBools = parsePattern(week.prob);
    const explBools = parsePattern(week.expl);
    
    // Assuming all strings in a row have same length after stripping spaces (usually 7)
    const length = Math.max(wakeBools.length, probBools.length, explBools.length);
    
    for (let i = 0; i < length; i++) {
      flatData.push({
        wake: wakeBools[i] || false,
        prob: probBools[i] || false,
        expl: explBools[i] || false
      });
    }
  });

  // Map flatData to dates ending today
  const today = new Date();
  const homeworkData: DailyHomework[] = [];
  
  // Iterate backwards from today to fill the history
  // flatData[last] is today
  for (let i = 0; i < flatData.length; i++) {
    const dataIndex = flatData.length - 1 - i;
    const dayData = flatData[dataIndex];
    
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    homeworkData.unshift({ // Add to beginning to keep chronological order
      date: dateStr,
      tasks: [
        { type: 'wake_up', completed: dayData.wake },
        { type: 'problem_30', completed: dayData.prob },
        { type: 'explanation', completed: dayData.expl }
      ],
      // Randomly assign lesson days for demo visualization if completion is high
      hasLesson: d.getDay() === 1 || d.getDay() === 4, // Mon, Thu lessons
      note: dayData.prob ? '과제 완료 확인' : '' 
    });
  }

  // Determine start date based on data length
  const firstDataDate = new Date(today);
  firstDataDate.setDate(today.getDate() - (flatData.length - 1));
  student.profile.startDate = `${firstDataDate.getFullYear()}-${String(firstDataDate.getMonth() + 1).padStart(2, '0')}-${String(firstDataDate.getDate()).padStart(2, '0')}`;
  
  student.homework = homeworkData;

  // 2. Other Demo Content - Updated for WeakPoint (Category based)
  student.weakPoints = [
    { category: '삼각함수 활용', description: '사인법칙과 코사인법칙의 혼용 문제에서 오답률 높음', severity: 'high' },
    { category: '계산 실수', description: '복잡한 다항식 계산이나 부호 실수 잦음', severity: 'medium' },
    { category: '학습 태도', description: '오답 노트 작성을 미루는 경향이 있음', severity: 'low' },
  ];
  
  student.mastery = [
    { subject: '수학1', score: 95, fullMark: 100 },
    { subject: '수학2', score: 60, fullMark: 100 },
    { subject: '미적분', score: 85, fullMark: 100 },
    { subject: '확률과통계', score: 75, fullMark: 100 },
    { subject: '기하', score: 90, fullMark: 100 },
  ];

  student.lessonLogs = [
    { session: 1, date: '01.04', unit: '삼각함수', content: '사인법칙 기본 개념 및 예제 풀이', understanding: 4 },
    { session: 2, date: '01.08', unit: '삼각함수', content: '코사인법칙 증명 및 활용', understanding: 3 },
    { session: 3, date: '01.11', unit: '삼각함수', content: '삼각함수의 활용 심화 문제', understanding: 3 },
    { session: 4, date: '01.15', unit: '수열', content: '등차수열과 등비수열', understanding: 5 },
  ];

  student.textbooks = [
    { 
      id: '1', 
      title: '쎈 수학 I', 
      subject: '수학1',
      coverImage: 'https://image.yes24.com/goods/115222047/XL',
      completedRanges: [{ start: 1, end: 720 }], 
      totalSteps: 1200, 
      status: 'active' 
    },
    { 
      id: '2', 
      title: '블랙라벨 수학 I',
      subject: '수학1', 
      coverImage: 'https://image.yes24.com/goods/114343828/XL',
      completedRanges: [{ start: 1, end: 150 }], 
      totalSteps: 500, 
      status: 'active' 
    },
    { 
      id: '3', 
      title: '자이스토리 수학 II',
      subject: '수학2', 
      coverImage: 'https://image.yes24.com/goods/115560667/XL',
      completedRanges: [], 
      totalSteps: 1500, 
      status: 'paused' 
    },
  ];

  student.teacherNote = `주원이가 최근 기상 과제 성공률이 높아지고 있습니다. 다만, 해설 작성 과제는 조금 더 꼼꼼히 진행할 필요가 있습니다.`;
  
  student.upcomingAssignments = {
    schedules: [
      {
        date: '2/15',
        categories: [
          { title: '문제풀이', items: [{ text: '쎈 수학 800번 ~ 850번', completed: false }] },
          { title: '해설작성', items: [{ text: '지난 주 테스트 오답 정리', completed: false }] },
        ]
      }
    ],
    materials: ['오답노트', '쎈 수학 I']
  };

  return [student];
};

export const INITIAL_STUDENTS: StudentData[] = generateDemoData();
