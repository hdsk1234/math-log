import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Bot, Calendar, User, Clock, AlertTriangle, CheckCircle, Search, Filter, ShieldAlert, XCircle, Info, MessageSquare } from 'lucide-react';

interface TelegramLog {
  id: string;
  studentName: string;
  taskType: 'wake_up' | 'problem_30' | 'explanation' | 'unknown';
  dateStr: string;
  timestamp: any;
  analyzedCount: number;
  isTest: boolean;
  status: 'success' | 'failed' | 'ignored' | 'error';
  rawResponse: string;
  telegramMessageId: number;
  threadId: number | null;
  text: string;
}

export const TelegramLogTab: React.FC = () => {
  const [logs, setLogs] = useState<TelegramLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    const q = query(
      collection(db, 'gemini_telegram_logs'),
      orderBy('telegramMessageId', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: TelegramLog[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          studentName: data.studentName || '알 수 없음',
          taskType: data.taskType || 'unknown',
          dateStr: data.dateStr || '',
          timestamp: data.timestamp,
          analyzedCount: data.analyzedCount || 0,
          isTest: !!data.isTest,
          status: data.status || 'success',
          rawResponse: data.rawResponse || '',
          telegramMessageId: data.telegramMessageId || 0,
          threadId: data.threadId !== undefined ? data.threadId : null,
          text: data.text || ''
        });
      });
      setLogs(list);
      setLoading(false);
    }, (error) => {
      console.error("Error subscribing telegram logs:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '방금 전';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date);
  };

  const filteredLogs = logs.filter(log => {
    const matchesName = log.studentName.toLowerCase().includes(searchName.toLowerCase());
    const matchesType = filterType === 'all' ? true : log.taskType === filterType;
    const matchesStatus = filterStatus === 'all' ? true : log.status === filterStatus;
    return matchesName && matchesType && matchesStatus;
  });

  const getTaskTypeBadge = (type: string, threadId: number | null) => {
    switch (type) {
      case 'wake_up':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-100">기상 인증 (Topic #{threadId})</span>;
      case 'problem_30':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100">30문제 (Topic #{threadId})</span>;
      case 'explanation':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-600 border border-purple-100">해설 오답 (Topic #{threadId})</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gray-50 text-gray-600 border border-gray-100">일반 대화 / 기타 (Topic #{threadId || '없음'})</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      {/* 필터 헤더 영역 */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* 학생 이름 검색 */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="보낸 사람 이름 검색..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="pl-9 pr-4 py-1.5 w-full text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-medium text-gray-700"
            />
          </div>

          {/* 과제 유형 필터 */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5">
            <Filter size={12} className="text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-600 focus:outline-none cursor-pointer"
            >
              <option value="all">모든 스레드</option>
              <option value="wake_up">기상 인증</option>
              <option value="problem_30">30문제</option>
              <option value="explanation">해설 오답</option>
              <option value="unknown">일반 대화/기타</option>
            </select>
          </div>

          {/* 상태 필터 */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5">
            <Bot size={12} className="text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-600 focus:outline-none cursor-pointer"
            >
              <option value="all">모든 상태</option>
              <option value="success">성공 (Success)</option>
              <option value="failed">분석 실패 (Failed)</option>
              <option value="ignored">무시됨 (Ignored)</option>
              <option value="error">시스템 에러 (Error)</option>
            </select>
          </div>
        </div>

        <div className="text-[10px] text-gray-400 font-extrabold bg-gray-100 px-2.5 py-1 rounded-full w-fit">
          실시간 웹훅 모니터링 중
        </div>
      </div>

      {/* 로그 타임라인 / 리스트 영역 */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
          <div className="animate-spin text-indigo-600">
            <Bot size={28} />
          </div>
          <span className="text-xs font-bold">텔레그램 웹훅 수신 로그 로딩 중...</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white border border-gray-200 border-dashed rounded-2xl p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-full">
            <Bot size={26} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-700">수신된 텔레그램 메시지 로그가 없습니다.</p>
            <p className="text-[10px] mt-1">텔레그램 봇으로 메시지나 사진을 전송하면 모든 수신 기록이 이곳에 저장됩니다.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const isError = log.status === 'error';
            const isFailed = log.status === 'failed';
            const isIgnored = log.status === 'ignored';

            let cardBorder = 'border-gray-100 bg-white';
            if (isError) cardBorder = 'border-red-200 bg-red-50/5';
            else if (isFailed) cardBorder = 'border-amber-200 bg-amber-50/5';
            else if (isIgnored) cardBorder = 'border-gray-200 bg-gray-50/20 opacity-80';

            return (
              <div
                key={log.id}
                className={`rounded-2xl border transition-all hover:shadow-md p-4 space-y-3 ${cardBorder}`}
              >
                {/* 로그 상단 요약 바 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-50 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-gray-800 flex items-center gap-1.5">
                      <User size={14} className="text-gray-400" />
                      {log.studentName}
                    </span>
                    {log.isTest && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                        TEST
                      </span>
                    )}
                    {getTaskTypeBadge(log.taskType, log.threadId)}
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-gray-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {formatTimestamp(log.timestamp)}
                    </span>
                    <span>•</span>
                    <span>메시지 ID: #{log.telegramMessageId}</span>
                  </div>
                </div>

                {/* 상세 분석 내용 및 제미나이 원문 */}
                <div className="grid grid-cols-1 md:grid-cols-[1.5fr_2fr] gap-4">
                  {/* 채점 요약 카드 */}
                  <div className="bg-gray-50/50 rounded-xl p-3 border border-gray-100 flex flex-col justify-center space-y-2">
                    <span className="text-[10px] text-gray-400 font-extrabold block">처리 결과</span>
                    <div className="flex items-center gap-2">
                      {isError ? (
                        <>
                          <XCircle className="text-red-500 flex-shrink-0" size={18} />
                          <span className="text-xs font-bold text-red-600">시스템 에러 발생</span>
                        </>
                      ) : isFailed ? (
                        <>
                          <ShieldAlert className="text-amber-500 flex-shrink-0" size={18} />
                          <span className="text-xs font-bold text-amber-600">분석 실패 (기본 1개 처리)</span>
                        </>
                      ) : isIgnored ? (
                        <>
                          <Info className="text-gray-400 flex-shrink-0" size={18} />
                          <span className="text-xs font-bold text-gray-500">메시지 무시됨</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="text-emerald-500 flex-shrink-0" size={18} />
                          <span className="text-xs font-extrabold text-emerald-600">
                            {log.taskType === 'wake_up' 
                              ? '기상 인증 완료' 
                              : log.taskType === 'problem_30'
                              ? '30문제 제출 완료'
                              : log.taskType === 'explanation'
                              ? '해설 제출 완료'
                              : '제출 완료'
                            }
                          </span>
                        </>
                      )}
                    </div>

                    {/* 텔레그램 전송 원문 요약 */}
                    {log.text && (
                      <div className="border-t border-gray-100 pt-1.5 flex items-start gap-1">
                        <MessageSquare size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-[10px] text-gray-500 break-all line-clamp-2">
                          전송문: {log.text}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Gemini 원문 응답 / 시스템 처리 로그 박스 */}
                  <div className="bg-gray-900 rounded-xl p-3 border border-gray-800 flex flex-col relative group">
                    <span className="text-[9px] text-indigo-400 font-extrabold uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Bot size={10} /> Webhook Processing Log
                    </span>
                    <pre className="text-[10px] font-mono text-gray-300 whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-[120px]">
                      {log.rawResponse || "(상세 응답 내용 없음)"}
                    </pre>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
