import React, { useState, useMemo } from 'react';
import { StudentData, UserRole } from '../types';
import {
  ExamRound,
  matchStudentByMask,
  calculateStudentHwRate,
  calculatePearson,
  calculateLinearRegression,
  parseMockExamText
} from '../lib/mockExamData';
import { useMockExamRounds } from '../lib/mockExamStore';
import { Card } from './Card';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  TrendingUp,
  ScatterChart as ScatterIcon,
  Layers,
  Table as TableIcon,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  Award,
  Database,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  Check,
  X
} from 'lucide-react';

interface Props {
  students: StudentData[];
  role: UserRole;
  onSelectStudent?: (id: string) => void;
}

export const MockExamStats: React.FC<Props> = ({ students, role, onSelectStudent }) => {
  const { rounds, updateRounds, isLoading: isRoundsLoading } = useMockExamRounds();

  const [activeSubTab, setActiveSubTab] = useState<'scatter' | 'timeseries' | 'cluster' | 'table' | 'raw'>('scatter');
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<string>('all');
  const [showRealName, setShowRealName] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Raw 데이터 관리 상태
  const [rawTextModalOpen, setRawTextModalOpen] = useState<boolean>(false);
  const [rawInputText, setRawInputText] = useState<string>('');
  const [selectedEditRound, setSelectedEditRound] = useState<number>(1);
  const [editingScores, setEditingScores] = useState<Record<string, number>>({});
  const [newStudentName, setNewStudentName] = useState<string>('');
  const [newStudentScore, setNewStudentScore] = useState<string>('');

  // 1. 실모반 전체 고유 학생 목록 수집 및 DB 연동 매칭
  const processedData = useMemo(() => {
    const allMasked = new Set<string>();
    rounds.forEach(r => {
      Object.keys(r.scores).forEach(name => allMasked.add(name));
    });

    const list = Array.from(allMasked).map(masked => {
      const student = matchStudentByMask(masked, students);

      // 각 회차별 점수 매핑
      const roundScores: Record<number, number | null> = {};
      const validScores: number[] = [];
      rounds.forEach(r => {
        const sc = r.scores[masked] ?? null;
        roundScores[r.round] = sc;
        if (typeof sc === 'number') validScores.push(sc);
      });

      const avgScore = validScores.length > 0
        ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10) / 10
        : null;

      let hwStats = {
        rate: 0,
        completed: 0,
        total: 0,
        wakeUpRate: 0,
        problem30Rate: 0,
        explanationRate: 0
      };

      if (student) {
        hwStats = calculateStudentHwRate(student);
      }

      return {
        maskedName: masked,
        studentId: student?.id ?? null,
        realName: student?.profile?.name ?? null,
        isMatched: !!student,
        startDate: student?.profile?.startDate ?? null,
        hwRate: student ? hwStats.rate : null,
        wakeUpRate: student ? hwStats.wakeUpRate : null,
        problem30Rate: student ? hwStats.problem30Rate : null,
        explanationRate: student ? hwStats.explanationRate : null,
        roundScores,
        avgScore,
        validCount: validScores.length
      };
    });

    return list;
  }, [students, rounds]);

  // 매칭 성공한 학생 목록 (과제율 존재하는 학생)
  const matchedStudents = useMemo(() => {
    return processedData.filter(d => d.isMatched && d.hwRate !== null);
  }, [processedData]);

  // 미매칭 학생 목록
  const unmatchedStudents = useMemo(() => {
    return processedData.filter(d => !d.isMatched);
  }, [processedData]);

  // 2. 상관관계 지표 계산
  const correlationStats = useMemo(() => {
    const roundCorrs: Record<number, number> = {};
    rounds.forEach(r => {
      const list = matchedStudents.filter(d => typeof d.roundScores[r.round] === 'number');
      const corr = calculatePearson(
        list.map(d => d.hwRate!),
        list.map(d => d.roundScores[r.round]!)
      );
      roundCorrs[r.round] = Math.round(corr * 1000) / 1000;
    });

    // 누적 평균
    const avgList = matchedStudents.filter(d => d.avgScore !== null);
    const avgCorr = calculatePearson(
      avgList.map(d => d.hwRate!),
      avgList.map(d => d.avgScore!)
    );

    return {
      roundCorrs,
      avg: Math.round(avgCorr * 1000) / 1000,
      count: matchedStudents.length
    };
  }, [matchedStudents, rounds]);

  // 3. 산점도 차트 데이터 및 선형 회귀선
  const scatterData = useMemo(() => {
    let targetList: { name: string; x: number; y: number; id: string | null }[] = [];
    let currentR = correlationStats.avg;

    if (selectedRoundFilter === 'all') {
      targetList = matchedStudents
        .filter(d => d.avgScore !== null)
        .map(d => ({
          name: showRealName && d.realName ? d.realName : d.maskedName,
          x: d.hwRate!,
          y: d.avgScore!,
          id: d.studentId
        }));
      currentR = correlationStats.avg;
    } else {
      const rNum = parseInt(selectedRoundFilter, 10);
      targetList = matchedStudents
        .filter(d => typeof d.roundScores[rNum] === 'number')
        .map(d => ({
          name: showRealName && d.realName ? d.realName : d.maskedName,
          x: d.hwRate!,
          y: d.roundScores[rNum]!,
          id: d.studentId
        }));
      currentR = correlationStats.roundCorrs[rNum] ?? 0;
    }

    const reg = calculateLinearRegression(targetList);
    const sortedX = [...targetList].sort((a, b) => a.x - b.x);
    const minX = sortedX.length > 0 ? sortedX[0].x : 0;
    const maxX = sortedX.length > 0 ? sortedX[sortedX.length - 1].x : 100;

    const linePoints = [
      { x: minX, y: Math.round((reg.slope * minX + reg.intercept) * 10) / 10 },
      { x: maxX, y: Math.round((reg.slope * maxX + reg.intercept) * 10) / 10 }
    ];

    return {
      points: targetList,
      linePoints,
      r: currentR,
      count: targetList.length
    };
  }, [matchedStudents, selectedRoundFilter, showRealName, correlationStats]);

  // 4. 시계열 추이 차트 데이터
  const timeSeriesData = useMemo(() => {
    const sorted = [...matchedStudents].sort((a, b) => (b.hwRate || 0) - (a.hwRate || 0));
    const k = Math.max(1, Math.floor(sorted.length * 0.3));
    const topGroup = sorted.slice(0, k);
    const bottomGroup = sorted.slice(-k);

    const getGroupMean = (group: typeof matchedStudents, rNum: number) => {
      const valid = group
        .filter(d => typeof d.roundScores[rNum] === 'number')
        .map(d => d.roundScores[rNum]!);
      return valid.length > 0
        ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10
        : null;
    };

    return rounds.map(r => ({
      round: `${r.round}회차`,
      r: correlationStats.roundCorrs[r.round] ?? 0,
      전체평균: r.mean,
      과제상위30: getGroupMean(topGroup, r.round),
      과제하위30: getGroupMean(bottomGroup, r.round)
    }));
  }, [matchedStudents, correlationStats, rounds]);

  // 5. 군집 분석 (4분면 매트릭스)
  const clusters = useMemo(() => {
    const list = matchedStudents.filter(d => d.avgScore !== null);
    const avgHwThreshold = 50;
    const avgScoreThreshold = 72;

    const quadrant1: typeof list = [];
    const quadrant2: typeof list = [];
    const quadrant3: typeof list = [];
    const quadrant4: typeof list = [];

    list.forEach(item => {
      const highHw = (item.hwRate || 0) >= avgHwThreshold;
      const highScore = (item.avgScore || 0) >= avgScoreThreshold;

      if (highHw && highScore) quadrant1.push(item);
      else if (!highHw && highScore) quadrant2.push(item);
      else if (highHw && !highScore) quadrant3.push(item);
      else quadrant4.push(item);
    });

    return { quadrant1, quadrant2, quadrant3, quadrant4 };
  }, [matchedStudents]);

  // 6. 학생별 성적표 목록 필터링
  const filteredTableData = useMemo(() => {
    let list = [...processedData];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d =>
        d.maskedName.includes(q) || (d.realName && d.realName.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0));
  }, [processedData, searchQuery]);

  // Raw 데이터 텍스트 파싱 및 추가 핸들러
  const handleParseAndSaveText = async () => {
    if (!rawInputText.trim()) return;
    try {
      const parsed = parseMockExamText(rawInputText);
      const existingIndex = rounds.findIndex(r => r.round === parsed.round);
      let updated: ExamRound[];
      if (existingIndex >= 0) {
        if (!window.confirm(`${parsed.round}회차 데이터가 이미 존재합니다. 덮어쓰시겠습니까?`)) {
          return;
        }
        updated = [...rounds];
        updated[existingIndex] = parsed;
      } else {
        updated = [...rounds, parsed].sort((a, b) => a.round - b.round);
      }
      await updateRounds(updated);
      setRawInputText('');
      setRawTextModalOpen(false);
      alert(`${parsed.round}회차 결과(${Object.keys(parsed.scores).length}명)가 성공적으로 저장되었습니다!`);
    } catch (e) {
      console.error(e);
      alert('텍스트 파싱 중 오류가 발생했습니다. 양식을 확인해주세요.');
    }
  };

  // 회차 편집 점수 임시 로드
  const activeEditRoundData = useMemo(() => {
    return rounds.find(r => r.round === selectedEditRound) || rounds[0];
  }, [rounds, selectedEditRound]);

  // 특정 회차 삭제
  const handleDeleteRound = async (roundNum: number) => {
    if (!window.confirm(`${roundNum}회차 데이터를 삭제하시겠습니까?`)) return;
    const updated = rounds.filter(r => r.round !== roundNum);
    await updateRounds(updated);
    if (selectedEditRound === roundNum && updated.length > 0) {
      setSelectedEditRound(updated[0].round);
    }
  };

  // 특정 회차 학생 점수 업데이트
  const handleSaveStudentScore = async (studentName: string, score: number) => {
    const updated = rounds.map(r => {
      if (r.round === selectedEditRound) {
        return {
          ...r,
          scores: {
            ...r.scores,
            [studentName]: score
          }
        };
      }
      return r;
    });
    await updateRounds(updated);
  };

  // 특정 회차 학생 삭제
  const handleDeleteStudentScore = async (studentName: string) => {
    const updated = rounds.map(r => {
      if (r.round === selectedEditRound) {
        const nextScores = { ...r.scores };
        delete nextScores[studentName];
        return {
          ...r,
          scores: nextScores
        };
      }
      return r;
    });
    await updateRounds(updated);
  };

  // 신규 학생 점수 추가
  const handleAddNewStudentToRound = async () => {
    if (!newStudentName.trim() || !newStudentScore.trim()) return;
    const sc = parseInt(newStudentScore, 10);
    if (isNaN(sc)) {
      alert('점수를 숫자로 입력해주세요.');
      return;
    }
    await handleSaveStudentScore(newStudentName.trim(), sc);
    setNewStudentName('');
    setNewStudentScore('');
  };

  const latestRound = rounds[rounds.length - 1];

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      {/* 섹션 상단 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-100">
              <TrendingUp size={22} />
            </span>
            <div>
              <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                실모반 데이터 & 상관분석
                <span className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold px-2.5 py-0.5 rounded-full">
                  {rounds.length}회차 진행 중 (총 11회 예정)
                </span>
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                실전 모의고사 성적 데이터 관리 및 과외 과제제출률과의 상관관계·성취도 추이를 분석합니다.
              </p>
            </div>
          </div>
        </div>

        {/* 우측 상단 액션 버튼 그룹 */}
        <div className="flex items-center gap-2 flex-wrap">
          {role === 'teacher' && (
            <button
              onClick={() => setRawTextModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>성적 텍스트 입력</span>
            </button>
          )}

          {role === 'teacher' && (
            <button
              onClick={() => setShowRealName(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                showRealName
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {showRealName ? <Eye size={14} /> : <EyeOff size={14} />}
              <span>{showRealName ? '실명 표시 중' : '마스킹 표시 중'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 핵심 지표 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">최신 상관계수 ({latestRound?.round}회차)</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-indigo-600">
              r = +{correlationStats.roundCorrs[latestRound?.round] ?? 0}
            </span>
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {rounds.map(r => `${r.round}회(${correlationStats.roundCorrs[r.round]})`).join(' → ')}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">분석 연동 학생</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-gray-900">{matchedStudents.length}명</span>
            <span className="text-xs text-gray-400 font-medium">/ {processedData.length}명</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">과외 DB 연동 학생 대상 분석</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">최신 {latestRound?.round}회차 평균</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-emerald-600">{latestRound?.mean}점</span>
            <span className="text-xs text-emerald-500 font-bold">최고 {latestRound?.highest}점</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">응시 {latestRound?.recordedCandidates}명 집계</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">과제 영향도 1위 항목</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-purple-600">기상 인증</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">기상(0.21) &gt; 해설(0.15) &gt; 30제(0.02)</p>
        </div>
      </div>

      {/* 분석 서브 탭 컨트롤바 */}
      <div className="flex items-center justify-between border-b border-gray-200 gap-2 overflow-x-auto pb-1">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab('scatter')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeSubTab === 'scatter'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <ScatterIcon size={14} />
            <span>상관관계 산점도</span>
          </button>
          <button
            onClick={() => setActiveSubTab('timeseries')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeSubTab === 'timeseries'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <TrendingUp size={14} />
            <span>시계열 추이 분석</span>
          </button>
          <button
            onClick={() => setActiveSubTab('cluster')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeSubTab === 'cluster'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Layers size={14} />
            <span>4분면 군집 분석</span>
          </button>
          <button
            onClick={() => setActiveSubTab('table')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeSubTab === 'table'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <TableIcon size={14} />
            <span>실모 성적표</span>
          </button>
          {role === 'teacher' && (
            <button
              onClick={() => setActiveSubTab('raw')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeSubTab === 'raw'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Database size={14} />
              <span>Raw 데이터 편집</span>
            </button>
          )}
        </div>

        {activeSubTab === 'scatter' && (
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setSelectedRoundFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                selectedRoundFilter === 'all'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              누적 평균
            </button>
            {rounds.map(r => (
              <button
                key={r.round}
                onClick={() => setSelectedRoundFilter(String(r.round))}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  selectedRoundFilter === String(r.round)
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {r.round}회차
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 탭 1: 산점도 & 상관관계 */}
      {activeSubTab === 'scatter' && (
        <Card className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                과제제출률(X) vs 모의고사 성적(Y) 산점도
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  {selectedRoundFilter === 'all' ? '누적 평균 성적' : `${selectedRoundFilter}회차 결과`}
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                각 점에 마우스를 올리면 학생 정보와 점수를 확인할 수 있습니다.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-gray-500">피어슨 상관계수: </span>
              <span className="text-base font-black text-indigo-600">
                r = {scatterData.r >= 0 ? `+${scatterData.r}` : scatterData.r}
              </span>
              <span className="text-[10px] text-gray-400 ml-1">({scatterData.count}명)</span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="과제제출률"
                  unit="%"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  label={{ value: '과제 제출률 (%)', position: 'bottom', offset: 0, fontSize: 11, fill: '#64748b' }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="모의고사 점수"
                  unit="점"
                  domain={[40, 100]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  label={{ value: '성적 (점)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#64748b' }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (payload && payload.length > 0) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-gray-900 text-white p-2.5 rounded-xl text-xs shadow-xl space-y-1">
                          <p className="font-extrabold text-yellow-300">{data.name}</p>
                          <p>과제제출률: <span className="font-bold">{data.x}%</span></p>
                          <p>모의고사 점수: <span className="font-bold text-indigo-200">{data.y}점</span></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={72} stroke="#cbd5e1" strokeDasharray="3 3" label={{ value: '평균 약 72점', fill: '#94a3b8', fontSize: 10 }} />
                <ReferenceLine x={50} stroke="#cbd5e1" strokeDasharray="3 3" label={{ value: '과제 50%', fill: '#94a3b8', fontSize: 10 }} />
                <Scatter
                  name="학생"
                  data={scatterData.points}
                  fill="#4f46e5"
                  shape="circle"
                  onClick={(node: any) => {
                    if (node && node.id && role !== 'guest' && onSelectStudent) {
                      onSelectStudent(node.id);
                    }
                  }}
                  className="cursor-pointer"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-900">
            <Sparkles size={16} className="text-indigo-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-bold">상관관계 요약: </span>
              {selectedRoundFilter === 'all'
                ? `전체 회차 누적 기준 상관계수는 r = +${scatterData.r}입니다. 과제 수행 루틴이 안정적인 학생일수록 고득점을 유지하고 있습니다.`
                : `${selectedRoundFilter}회차 기준 상관계수는 r = +${scatterData.r}입니다. 회차가 누적될수록 성실도가 점수에 미치는 영향력이 점진적으로 강화되는 추세를 보입니다.`}
            </div>
          </div>
        </Card>
      )}

      {/* 탭 2: 시계열 추이 분석 */}
      {activeSubTab === 'timeseries' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-5 space-y-3">
            <div>
              <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-1.5">
                <TrendingUp size={16} className="text-indigo-600" />
                회차별 과제제출률-성적 상관계수($r$) 추이
              </h3>
              <p className="text-xs text-gray-400">회차가 거듭될수록 상관계수가 가파르게 상승하고 있습니다.</p>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesData} margin={{ top: 20, right: 20, bottom: 10, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="round" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[0, 0.4]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    content={({ payload }) => {
                      if (payload && payload.length > 0) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-gray-900 text-white p-2 rounded-xl text-xs space-y-1">
                            <p className="font-bold text-yellow-300">{d.round}</p>
                            <p>상관계수: <span className="font-bold text-indigo-300">r = +{d.r}</span></p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line type="monotone" dataKey="r" stroke="#4f46e5" strokeWidth={3} dot={{ r: 6, fill: '#4f46e5' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[11px] text-gray-500 font-medium bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              📊 1회차(+0.20) → 2회차(+0.25) → 3회차(+0.32). 실전 모의고사 훈련이 누적될수록 평소 과제량이 점수 하방을 지지합니다.
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <div>
              <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-1.5">
                <Award size={16} className="text-emerald-600" />
                과제 상위 30% vs 하위 30% 성적 격차
              </h3>
              <p className="text-xs text-gray-400">과제 성실도에 따른 집단별 평균 점수 추이</p>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesData} margin={{ top: 20, right: 20, bottom: 10, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="round" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[50, 90]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Line type="monotone" dataKey="과제상위30" stroke="#10b981" strokeWidth={2.5} dot={{ r: 5 }} />
                  <Line type="monotone" dataKey="전체평균" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="과제하위30" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[11px] text-gray-500 font-medium bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              💡 과제 상위 그룹은 3회차에서 전원 76점 이상의 고득점을 기록하며 점수 안정성이 대폭 상승했습니다.
            </div>
          </Card>
        </div>
      )}

      {/* 탭 3: 4분면 군집 분석 */}
      {activeSubTab === 'cluster' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-gray-900 text-sm">4사분면 학생 특성 분류 (Matrix)</h3>
              <p className="text-xs text-gray-500">과제제출률(50% 기준)과 모의고사 평균 성적(72점 기준) 매트릭스</p>
            </div>
            <span className="text-xs font-bold text-gray-400">분석 대상: {matchedStudents.length}명</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 border-l-4 border-l-emerald-500 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  제1군집: 성실 우수형 (과제 高 / 성적 高)
                </span>
                <span className="text-xs font-extrabold text-emerald-600">{clusters.quadrant1.length}명</span>
              </div>
              <p className="text-[11px] text-gray-500">평소 과제 이행률이 높고 실모에서도 최상위권 점수를 유지하는 그룹</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {clusters.quadrant1.map(s => (
                  <span
                    key={s.maskedName}
                    onClick={() => s.studentId && onSelectStudent && onSelectStudent(s.studentId)}
                    className="inline-flex items-center gap-1 bg-gray-50 hover:bg-emerald-50 border border-gray-200 px-2 py-1 rounded-lg text-xs font-bold text-gray-700 cursor-pointer transition-colors"
                  >
                    <span>{showRealName && s.realName ? s.realName : s.maskedName}</span>
                    <span className="text-[10px] text-emerald-600 font-extrabold">{s.avgScore}점</span>
                    <span className="text-[10px] text-gray-400">({s.hwRate}%)</span>
                  </span>
                ))}
              </div>
            </Card>

            <Card className="p-4 border-l-4 border-l-blue-500 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                  제2군집: 기본기 강세형 (과제 低 / 성적 高)
                </span>
                <span className="text-xs font-extrabold text-blue-600">{clusters.quadrant2.length}명</span>
              </div>
              <p className="text-[11px] text-gray-500">기본 수학 실력은 뛰어나나 과제 루틴 유지가 필요한 그룹</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {clusters.quadrant2.map(s => (
                  <span
                    key={s.maskedName}
                    onClick={() => s.studentId && onSelectStudent && onSelectStudent(s.studentId)}
                    className="inline-flex items-center gap-1 bg-gray-50 hover:bg-blue-50 border border-gray-200 px-2 py-1 rounded-lg text-xs font-bold text-gray-700 cursor-pointer transition-colors"
                  >
                    <span>{showRealName && s.realName ? s.realName : s.maskedName}</span>
                    <span className="text-[10px] text-blue-600 font-extrabold">{s.avgScore}점</span>
                    <span className="text-[10px] text-gray-400">({s.hwRate}%)</span>
                  </span>
                ))}
              </div>
            </Card>

            <Card className="p-4 border-l-4 border-l-yellow-500 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-yellow-800 bg-yellow-50 px-2 py-0.5 rounded-md">
                  제3군집: 잠재 성장형 (과제 高 / 성적 中·低)
                </span>
                <span className="text-xs font-extrabold text-yellow-600">{clusters.quadrant3.length}명</span>
              </div>
              <p className="text-[11px] text-gray-500">과제 성실도가 매우 높아 시험 운용 스킬 보완 시 점수 급상승이 기대되는 그룹</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {clusters.quadrant3.map(s => (
                  <span
                    key={s.maskedName}
                    onClick={() => s.studentId && onSelectStudent && onSelectStudent(s.studentId)}
                    className="inline-flex items-center gap-1 bg-gray-50 hover:bg-yellow-50 border border-gray-200 px-2 py-1 rounded-lg text-xs font-bold text-gray-700 cursor-pointer transition-colors"
                  >
                    <span>{showRealName && s.realName ? s.realName : s.maskedName}</span>
                    <span className="text-[10px] text-yellow-700 font-extrabold">{s.avgScore}점</span>
                    <span className="text-[10px] text-gray-400">({s.hwRate}%)</span>
                  </span>
                ))}
              </div>
            </Card>

            <Card className="p-4 border-l-4 border-l-rose-500 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                  제4군집: 집중 관리형 (과제 低 / 성적 中·低)
                </span>
                <span className="text-xs font-extrabold text-rose-600">{clusters.quadrant4.length}명</span>
              </div>
              <p className="text-[11px] text-gray-500">매일 과제 인증 독려와 기본 문항 확보 훈련이 동시에 시급한 그룹</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {clusters.quadrant4.map(s => (
                  <span
                    key={s.maskedName}
                    onClick={() => s.studentId && onSelectStudent && onSelectStudent(s.studentId)}
                    className="inline-flex items-center gap-1 bg-gray-50 hover:bg-rose-50 border border-gray-200 px-2 py-1 rounded-lg text-xs font-bold text-gray-700 cursor-pointer transition-colors"
                  >
                    <span>{showRealName && s.realName ? s.realName : s.maskedName}</span>
                    <span className="text-[10px] text-rose-600 font-extrabold">{s.avgScore}점</span>
                    <span className="text-[10px] text-gray-400">({s.hwRate}%)</span>
                  </span>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* 탭 4: 학생별 실모 성적표 */}
      {activeSubTab === 'table' && (
        <Card className="p-0 overflow-hidden border border-gray-100 shadow-sm">
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <input
              type="text"
              placeholder="학생 이름 검색..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="px-3.5 py-1.5 w-full sm:w-64 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-medium text-gray-700"
            />
            <span className="text-xs text-gray-400 font-bold">
              총 {filteredTableData.length}명 집계 (정렬: 평균 점수순)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-600 font-extrabold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">학생명</th>
                  <th className="py-3 px-3">과제제출률</th>
                  {rounds.map(r => (
                    <th key={r.round} className="py-3 px-2 text-center">{r.round}회차</th>
                  ))}
                  <th className="py-3 px-3 text-center">평균 점수</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTableData.map(d => {
                  return (
                    <tr
                      key={d.maskedName}
                      className="hover:bg-indigo-50/20 transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-gray-900">
                        <div className="flex items-center gap-1.5">
                          <span>{showRealName && d.realName ? d.realName : d.maskedName}</span>
                          {!d.isMatched && (
                            <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded font-semibold border border-amber-200">
                              DB미등록
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold">
                        {d.hwRate !== null ? (
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-indigo-600">{d.hwRate}%</span>
                            <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-indigo-500 h-full rounded-full"
                                style={{ width: `${d.hwRate}%` }}
                              ></div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      {rounds.map(r => {
                        const sc = d.roundScores[r.round];
                        return (
                          <td key={r.round} className="py-3 px-2 text-center font-bold text-gray-700">
                            {sc !== null && sc !== undefined ? sc : <span className="text-gray-300">-</span>}
                          </td>
                        );
                      })}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-gray-900 text-white font-black text-xs">
                          {d.avgScore !== null ? `${d.avgScore}점` : '-'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {unmatchedStudents.length > 0 && (
            <div className="p-3 bg-amber-50/70 border-t border-amber-100 text-[11px] text-amber-800 flex items-center gap-2">
              <AlertCircle size={14} className="text-amber-600 flex-shrink-0" />
              <span>
                <strong>DB 미등록 학생 ({unmatchedStudents.length}명)</strong>: {unmatchedStudents.map(s => s.maskedName).join(', ')} (과외 DB에 등록되지 않아 상관분석에서 제외됨)
              </span>
            </div>
          )}
        </Card>
      )}

      {/* 탭 5: Raw 데이터 관리 (교사용) */}
      {activeSubTab === 'raw' && role === 'teacher' && (
        <div className="space-y-4">
          {/* 회차 선택 및 관리 탭바 */}
          <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-black text-gray-400 mr-1">회차 선택:</span>
              {rounds.map(r => (
                <button
                  key={r.round}
                  onClick={() => setSelectedEditRound(r.round)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedEditRound === r.round
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {r.round}회차 ({Object.keys(r.scores).length}명)
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setRawTextModalOpen(true)}
                className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-all"
              >
                <Plus size={14} />
                <span>새 회차 텍스트 파싱</span>
              </button>
              {rounds.length > 1 && (
                <button
                  onClick={() => handleDeleteRound(selectedEditRound)}
                  className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition-all"
                  title="현재 선택된 회차 전체 삭제"
                >
                  <Trash2 size={14} />
                  <span>{selectedEditRound}회차 삭제</span>
                </button>
              )}
            </div>
          </div>

          {/* 회차 메타 정보 및 학생별 점수 편집기 */}
          {activeEditRoundData && (
            <Card className="p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                    {activeEditRoundData.title} 상세 데이터 ({activeEditRoundData.date})
                  </h3>
                  <p className="text-xs text-gray-400">
                    평균: {activeEditRoundData.mean}점 | 최고: {activeEditRoundData.highest}점 | 등록 인원: {Object.keys(activeEditRoundData.scores).length}명
                  </p>
                </div>
              </div>

              {/* 신규 학생 점수 추가 바 */}
              <div className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <input
                  type="text"
                  placeholder="마스킹 학생명 (예: 홍○동)"
                  value={newStudentName}
                  onChange={e => setNewStudentName(e.target.value)}
                  className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-800 flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
                <input
                  type="number"
                  placeholder="점수 (0~100)"
                  value={newStudentScore}
                  onChange={e => setNewStudentScore(e.target.value)}
                  className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-800 w-28 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  onClick={handleAddNewStudentToRound}
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                >
                  <Plus size={14} />
                  <span>추가 / 갱신</span>
                </button>
              </div>

              {/* 회차 학생별 점수 그리드 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(activeEditRoundData.scores)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, sc]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200/70 hover:border-indigo-200 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-gray-900">{name}</span>
                        <input
                          type="number"
                          defaultValue={sc}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val !== sc) {
                              handleSaveStudentScore(name, val);
                            }
                          }}
                          className="w-14 bg-white border border-gray-300 rounded px-1.5 py-0.5 text-xs font-bold text-indigo-700 text-center"
                        />
                        <span className="text-[10px] text-gray-400">점</span>
                      </div>
                      <button
                        onClick={() => handleDeleteStudentScore(name)}
                        className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                        title="삭제"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* 새 회차 텍스트 입력 및 자동 파싱 모달 */}
      {rawTextModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <Database size={18} className="text-indigo-600" />
                  실모반 성적 텍스트 입력 및 자동 파싱
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  카카오톡/노션 등에 공지된 회차별 성적 텍스트를 그대로 붙여넣으면 자동 추출됩니다.
                </p>
              </div>
              <button
                onClick={() => setRawTextModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <textarea
                rows={12}
                value={rawInputText}
                onChange={e => setRawInputText(e.target.value)}
                placeholder="예시:&#10;[실모반 4회차 전체 성적]&#10;응시 인원: 30명&#10;평균: 약 75.2점&#10;&#10;1등 채○린 96점&#10;2등 추○재 92점&#10;..."
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
              />
              <div className="text-[11px] text-gray-400 bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 text-indigo-900">
                💡 '○회차', '평균', '1등 이름 점수' 등의 패턴을 자동으로 인식하여 회차 생성 및 학생별 점수로 분필합니다.
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setRawTextModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-200 transition-all"
              >
                취소
              </button>
              <button
                onClick={handleParseAndSaveText}
                className="px-5 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 transition-all"
              >
                파싱 및 저장하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
