import React, { useState, useMemo } from 'react';
import { StudentData, UserRole } from '../types';
import {
  MOCK_EXAM_ROUNDS,
  matchStudentByMask,
  calculateStudentHwRate,
  calculatePearson,
  calculateLinearRegression
} from '../lib/mockExamData';
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
  HelpCircle,
  Award,
  CheckCircle2
} from 'lucide-react';

interface Props {
  students: StudentData[];
  role: UserRole;
  onSelectStudent?: (id: string) => void;
}

export const MockExamStats: React.FC<Props> = ({ students, role, onSelectStudent }) => {
  const [activeSubTab, setActiveSubTab] = useState<'scatter' | 'timeseries' | 'cluster' | 'table'>('scatter');
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<'all' | '1' | '2' | '3'>('all');
  const [showRealName, setShowRealName] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. 실모반 전체 고유 학생 목록 수집 및 DB 연동 매칭
  const processedData = useMemo(() => {
    const allMasked = new Set<string>();
    MOCK_EXAM_ROUNDS.forEach(r => {
      Object.keys(r.scores).forEach(name => allMasked.add(name));
    });

    const list = Array.from(allMasked).map(masked => {
      const student = matchStudentByMask(masked, students);
      const r1 = MOCK_EXAM_ROUNDS[0].scores[masked] ?? null;
      const r2 = MOCK_EXAM_ROUNDS[1].scores[masked] ?? null;
      const r3 = MOCK_EXAM_ROUNDS[2].scores[masked] ?? null;

      const validScores = [r1, r2, r3].filter((s): s is number => typeof s === 'number');
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
        r1,
        r2,
        r3,
        avgScore,
        validCount: validScores.length
      };
    });

    return list;
  }, [students]);

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
    // 1회차
    const r1List = matchedStudents.filter(d => d.r1 !== null);
    const r1Corr = calculatePearson(
      r1List.map(d => d.hwRate!),
      r1List.map(d => d.r1!)
    );

    // 2회차
    const r2List = matchedStudents.filter(d => d.r2 !== null);
    const r2Corr = calculatePearson(
      r2List.map(d => d.hwRate!),
      r2List.map(d => d.r2!)
    );

    // 3회차
    const r3List = matchedStudents.filter(d => d.r3 !== null);
    const r3Corr = calculatePearson(
      r3List.map(d => d.hwRate!),
      r3List.map(d => d.r3!)
    );

    // 누적 평균
    const avgList = matchedStudents.filter(d => d.avgScore !== null);
    const avgCorr = calculatePearson(
      avgList.map(d => d.hwRate!),
      avgList.map(d => d.avgScore!)
    );

    return {
      r1: Math.round(r1Corr * 1000) / 1000,
      r2: Math.round(r2Corr * 1000) / 1000,
      r3: Math.round(r3Corr * 1000) / 1000,
      avg: Math.round(avgCorr * 1000) / 1000,
      count: matchedStudents.length
    };
  }, [matchedStudents]);

  // 3. 산점도 차트 데이터 및 선형 회귀선
  const scatterData = useMemo(() => {
    let targetList: { name: string; x: number; y: number; id: string | null }[] = [];

    if (selectedRoundFilter === '1') {
      targetList = matchedStudents
        .filter(d => d.r1 !== null)
        .map(d => ({
          name: showRealName && d.realName ? d.realName : d.maskedName,
          x: d.hwRate!,
          y: d.r1!,
          id: d.studentId
        }));
    } else if (selectedRoundFilter === '2') {
      targetList = matchedStudents
        .filter(d => d.r2 !== null)
        .map(d => ({
          name: showRealName && d.realName ? d.realName : d.maskedName,
          x: d.hwRate!,
          y: d.r2!,
          id: d.studentId
        }));
    } else if (selectedRoundFilter === '3') {
      targetList = matchedStudents
        .filter(d => d.r3 !== null)
        .map(d => ({
          name: showRealName && d.realName ? d.realName : d.maskedName,
          x: d.hwRate!,
          y: d.r3!,
          id: d.studentId
        }));
    } else {
      // all (평균)
      targetList = matchedStudents
        .filter(d => d.avgScore !== null)
        .map(d => ({
          name: showRealName && d.realName ? d.realName : d.maskedName,
          x: d.hwRate!,
          y: d.avgScore!,
          id: d.studentId
        }));
    }

    const reg = calculateLinearRegression(targetList);
    const sortedX = [...targetList].sort((a, b) => a.x - b.x);
    const minX = sortedX.length > 0 ? sortedX[0].x : 0;
    const maxX = sortedX.length > 0 ? sortedX[sortedX.length - 1].x : 100;

    const linePoints = [
      { x: minX, y: Math.round((reg.slope * minX + reg.intercept) * 10) / 10 },
      { x: maxX, y: Math.round((reg.slope * maxX + reg.intercept) * 10) / 10 }
    ];

    const currentR = selectedRoundFilter === '1'
      ? correlationStats.r1
      : selectedRoundFilter === '2'
        ? correlationStats.r2
        : selectedRoundFilter === '3'
          ? correlationStats.r3
          : correlationStats.avg;

    return {
      points: targetList,
      linePoints,
      r: currentR,
      count: targetList.length
    };
  }, [matchedStudents, selectedRoundFilter, showRealName, correlationStats]);

  // 4. 시계열 추이 차트 데이터 (회차별 평균 & 상관계수 추이)
  const timeSeriesData = useMemo(() => {
    // 과제제출률 기준 상위 30% vs 하위 30% 그룹 분할
    const sorted = [...matchedStudents].sort((a, b) => (b.hwRate || 0) - (a.hwRate || 0));
    const k = Math.max(1, Math.floor(sorted.length * 0.3));
    const topGroup = sorted.slice(0, k);
    const bottomGroup = sorted.slice(-k);

    const getGroupMean = (group: typeof matchedStudents, key: 'r1' | 'r2' | 'r3') => {
      const valid = group.filter(d => d[key] !== null).map(d => d[key]!);
      return valid.length > 0
        ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10
        : null;
    };

    return [
      {
        round: '1회차',
        r: correlationStats.r1,
        전체평균: MOCK_EXAM_ROUNDS[0].mean,
        과제상위30: getGroupMean(topGroup, 'r1'),
        과제하위30: getGroupMean(bottomGroup, 'r1'),
      },
      {
        round: '2회차',
        r: correlationStats.r2,
        전체평균: MOCK_EXAM_ROUNDS[1].mean,
        과제상위30: getGroupMean(topGroup, 'r2'),
        과제하위30: getGroupMean(bottomGroup, 'r2'),
      },
      {
        round: '3회차',
        r: correlationStats.r3,
        전체평균: MOCK_EXAM_ROUNDS[2].mean,
        과제상위30: getGroupMean(topGroup, 'r3'),
        과제하위30: getGroupMean(bottomGroup, 'r3'),
      }
    ];
  }, [matchedStudents, correlationStats]);

  // 5. 군집 분석 (4분면 매트릭스)
  const clusters = useMemo(() => {
    const list = matchedStudents.filter(d => d.avgScore !== null);
    const avgHwThreshold = 50; // 과제 50% 기준
    const avgScoreThreshold = 72; // 전체 평균 약 72점 기준

    const quadrant1: typeof list = []; // 고제출 + 고득점 (성실 우수형)
    const quadrant2: typeof list = []; // 저제출 + 고득점 (기본기 강세형)
    const quadrant3: typeof list = []; // 고제출 + 중저득점 (잠재 성장형)
    const quadrant4: typeof list = []; // 저제출 + 중저득점 (집중 보완형)

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
    // 기본 정렬: 평균 점수 내림차순
    return list.sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0));
  }, [processedData, searchQuery]);

  return (
    <div className="space-y-6 pt-6 border-t border-gray-200">
      {/* 섹션 상단 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-100">
              <TrendingUp size={20} />
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                실전 모의고사 상관관계 분석
                <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                  1~3회차 집계 (총 11회 예정)
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                과외 과제제출률(시작일~현재)과 실모반 모의고사 성적 간의 상관관계 및 성취도 추이를 분석합니다.
              </p>
            </div>
          </div>
        </div>

        {/* 교사용 실명 토글 스위치 */}
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

      {/* 핵심 지표 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">최신 상관계수 (3회차)</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-indigo-600">r = +{correlationStats.r3}</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">1회(0.20) → 2회(0.25) → 3회(0.32) 지속 상승</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">분석 연동 학생</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-gray-900">{matchedStudents.length}명</span>
            <span className="text-xs text-gray-400 font-medium">/ 31명</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">math-log DB 일치율 87.1%</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">최신 3회차 평균</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-emerald-600">77.1점</span>
            <span className="text-xs text-emerald-500 font-bold">▲ 4.5점</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">1회 70.8점 → 2회 72.6점</p>
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
        </div>

        {activeSubTab === 'scatter' && (
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            {(['all', '1', '2', '3'] as const).map(rf => (
              <button
                key={rf}
                onClick={() => setSelectedRoundFilter(rf)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  selectedRoundFilter === rf
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {rf === 'all' ? '누적 평균' : `${rf}회차`}
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
                  {selectedRoundFilter === 'all' ? '3회 누적 평균' : `${selectedRoundFilter}회차 결과`}
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

          {/* 회차별 상관관계 해석 가이드 */}
          <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-900">
            <Sparkles size={16} className="text-indigo-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-bold">회차별 상관계수 해석: </span>
              {selectedRoundFilter === '1' && '1회차(r = +0.200)는 시험 적응 단계로 성실도와 점수의 상관성이 약하게 나타났습니다.'}
              {selectedRoundFilter === '2' && '2회차(r = +0.252)부터 과제 이행 수준이 점수에 긍정적인 영향을 미치기 시작했습니다.'}
              {selectedRoundFilter === '3' && '3회차(r = +0.317)에서는 양의 상관성이 뚜렷해졌으며, 과제를 꾸준히 이행한 학생들의 상위권 진입이 두드러집니다.'}
              {selectedRoundFilter === 'all' && '3회 전체 누적에서는 과제율이 90% 이상인 학생군(추○재, 서○원, 박○빈)이 높은 점수를 안정적으로 유지하고 있습니다.'}
            </div>
          </div>
        </Card>
      )}

      {/* 탭 2: 시계열 추이 분석 */}
      {activeSubTab === 'timeseries' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 회차별 상관계수 추이 그래프 */}
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
              📊 1회차(+0.200) → 2회차(+0.252) → 3회차(+0.317)로 점진적 강화. 실전 모의고사 훈련이 누적될수록 평소 과제량이 점수 하방을 지지합니다.
            </div>
          </Card>

          {/* 과제 성실 그룹 vs 저제출 그룹 성적 추이 */}
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
            {/* 1사분면: 성실 우수형 */}
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

            {/* 2사분면: 기본기 강세형 */}
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

            {/* 3사분면: 잠재 성장형 */}
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

            {/* 4사분면: 집중 관리형 */}
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
                  <th className="py-3 px-2 text-center">1회차</th>
                  <th className="py-3 px-2 text-center">2회차</th>
                  <th className="py-3 px-2 text-center">3회차</th>
                  <th className="py-3 px-3 text-center">평균 점수</th>
                  <th className="py-3 px-3">추이 / 상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTableData.map(d => {
                  const scoreDiff = d.r3 !== null && d.r1 !== null ? d.r3 - d.r1 : null;
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
                      <td className="py-3 px-2 text-center font-bold text-gray-700">
                        {d.r1 ?? <span className="text-gray-300">-</span>}
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-gray-700">
                        {d.r2 ?? <span className="text-gray-300">-</span>}
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-gray-700">
                        {d.r3 ?? <span className="text-gray-300">-</span>}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-gray-900 text-white font-black text-xs">
                          {d.avgScore !== null ? `${d.avgScore}점` : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {scoreDiff !== null ? (
                          scoreDiff > 0 ? (
                            <span className="text-[11px] font-extrabold text-emerald-600">▲ +{scoreDiff}점</span>
                          ) : scoreDiff < 0 ? (
                            <span className="text-[11px] font-extrabold text-rose-500">▼ {scoreDiff}점</span>
                          ) : (
                            <span className="text-[11px] font-bold text-gray-400">변동 없음</span>
                          )
                        ) : (
                          <span className="text-[10px] text-gray-400">일부 미응시</span>
                        )}
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
                <strong>DB 미등록 학생 ({unmatchedStudents.length}명)</strong>: {unmatchedStudents.map(s => s.maskedName).join(', ')} (과제 기록이 없어 상관관계 계산 시 제외됨)
              </span>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
