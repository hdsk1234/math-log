
import React, { useState, useEffect } from 'react';
import { LessonLog } from '../types';
import { Card } from './Card';
import { Star, Trash2, Plus, Edit2, Save, X, ChevronDown, ChevronUp, FileText } from 'lucide-react';

interface Props {
  logs: LessonLog[];
  isAdmin?: boolean;
  onAdd?: (log: LessonLog) => void;
  onDelete?: (index: number) => void;
  onEdit?: (index: number, log: LessonLog) => void;
}

export const LessonTable: React.FC<Props> = ({ logs, isAdmin, onAdd, onDelete, onEdit }) => {
  // Add State
  const [newDate, setNewDate] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [newSession, setNewSession] = useState(1);

  // Edit State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editSession, setEditSession] = useState(0);
  const [editDate, setEditDate] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editRating, setEditRating] = useState(5);

  // View State
  const [isExpanded, setIsExpanded] = useState(false);

  // Update next session number when logs change
  useEffect(() => {
    // Calculate next session based on max session number found in logs
    const maxSession = logs.reduce((max, log) => Math.max(max, log.session || 0), 0);
    setNewSession(maxSession + 1);
  }, [logs]);

  const handleSubmit = () => {
    // Allow empty content
    if (onAdd && newDate) {
      // Convert YYYY-MM-DD to MM.DD format to match existing data style
      const [y, m, d] = newDate.split('-');
      const formattedDate = `${m}.${d}`;

      onAdd({
        session: newSession,
        date: formattedDate,
        unit: '',
        content: newContent,
        understanding: newRating
      });
      setNewDate('');
      setNewContent('');
      setNewRating(5);
      // newSession will be updated via useEffect
    }
  };

  const startEditing = (index: number, log: LessonLog) => {
    setEditingIndex(index);
    setEditSession(log.session || 0);
    
    // Convert display format to input format (YYYY-MM-DD)
    let isoDate = '';
    if (log.date) {
        // Try to parse typical formats
        if (log.date.includes('-') && log.date.length === 10) {
            // YYYY-MM-DD
            isoDate = log.date;
        } else if (log.date.includes('.')) {
            const parts = log.date.split('.');
            const today = new Date();
            if (parts.length === 2) {
                // MM.DD -> YYYY-MM-DD (Assume current year)
                isoDate = `${today.getFullYear()}-${parts[0]}-${parts[1]}`;
            } else if (parts.length === 3) {
                 // YY.MM.DD or YYYY.MM.DD
                 let y = parts[0];
                 if (y.length === 2) y = '20' + y;
                 isoDate = `${y}-${parts[1]}-${parts[2]}`;
            }
        }
    }
    setEditDate(isoDate);

    setEditContent(log.content);
    setEditRating(log.understanding);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
  };

  const saveEditing = (index: number) => {
    if (onEdit) {
      // Convert YYYY-MM-DD back to MM.DD
      let formattedDate = editDate;
      if (editDate.includes('-')) {
          const [y, m, d] = editDate.split('-');
          formattedDate = `${m}.${d}`;
      }

      onEdit(index, {
        session: editSession,
        date: formattedDate,
        unit: '', // Removed unit from UI
        content: editContent,
        understanding: editRating
      });
      setEditingIndex(null);
    }
  };

  // Logic for showing recent logs (Sort by Session Descending: Newest First)
  const RECENT_COUNT = 3;
  // Sort by session descending to show latest sessions first
  const displayLogs = logs
    .map((log, i) => ({ ...log, originalIndex: i }))
    .sort((a, b) => (b.session || 0) - (a.session || 0));
  
  const hasHiddenLogs = displayLogs.length > RECENT_COUNT;
  const hiddenCount = logs.length - RECENT_COUNT;

  return (
    <Card title="수업 일지" icon={<FileText className="text-indigo-600" size={20} />}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-3 py-3 font-medium text-center w-14 align-top">회차</th>
              <th className="px-3 py-3 font-medium w-32 align-top">날짜</th>
              <th className="px-3 py-3 font-medium align-top">내용</th>
              <th className="px-3 py-3 font-medium text-center w-32 align-top">이해도</th>
              {isAdmin && <th className="px-2 py-3 w-20 text-center align-top">관리</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* Input Row for Admin (Moved to Top) */}
            {isAdmin && onAdd && !editingIndex && (
              <tr className="bg-indigo-50/30 border-b-2 border-indigo-100">
                <td className="px-2 py-2 align-top">
                   <input 
                    type="number"
                    value={newSession}
                    onChange={(e) => setNewSession(parseInt(e.target.value) || 0)}
                    className="w-full text-xs p-1.5 border border-indigo-100 rounded focus:outline-none focus:border-indigo-300 text-center font-bold text-indigo-600"
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  <input 
                    type="date" 
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full text-xs p-1.5 border border-indigo-100 rounded focus:outline-none focus:border-indigo-300 text-center font-sans"
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  <textarea 
                    placeholder="수업 내용 (선택)" 
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="w-full text-xs p-1.5 border border-indigo-100 rounded focus:outline-none focus:border-indigo-300 resize-y min-h-[34px]"
                    rows={1}
                  />
                </td>
                <td className="px-2 py-2 text-center align-top">
                  <select 
                    value={newRating} 
                    onChange={(e) => setNewRating(Number(e.target.value))}
                    className="text-xs p-1.5 border border-indigo-100 rounded focus:outline-none focus:border-indigo-300 w-full"
                  >
                    <option value={1}>1점</option>
                    <option value={2}>2점</option>
                    <option value={3}>3점</option>
                    <option value={4}>4점</option>
                    <option value={5}>5점</option>
                  </select>
                </td>
                <td className="px-2 py-2 text-center align-top">
                  <button 
                    onClick={handleSubmit}
                    disabled={!newDate}
                    className="bg-indigo-500 text-white rounded p-1.5 hover:bg-indigo-600 disabled:bg-gray-300 transition-colors shadow-sm"
                  >
                    <Plus size={16} />
                  </button>
                </td>
              </tr>
            )}

            {displayLogs.map((item, idx) => {
              // Hide older logs (indices >= RECENT_COUNT in reversed list) if not expanded
              if (!isExpanded && idx >= RECENT_COUNT) {
                return null;
              }

              const { originalIndex, ...log } = item;
              const isEditing = editingIndex === originalIndex;
              
              if (isEditing) {
                return (
                  <tr key={originalIndex} className="bg-indigo-50/50">
                    <td className="px-2 py-2 align-top">
                      <input 
                        type="number"
                        value={editSession}
                        onChange={(e) => setEditSession(parseInt(e.target.value) || 0)}
                        className="w-full text-xs p-1.5 border border-indigo-200 rounded focus:outline-none focus:border-indigo-500 text-center font-bold text-indigo-600 bg-white"
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                       <input 
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full text-xs p-1.5 border border-indigo-200 rounded focus:outline-none focus:border-indigo-500 bg-white font-sans"
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                       <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full text-xs p-1.5 border border-indigo-200 rounded focus:outline-none focus:border-indigo-500 bg-white resize-y min-h-[34px]"
                        rows={1}
                      />
                    </td>
                    <td className="px-2 py-2 text-center align-top">
                       <select 
                        value={editRating} 
                        onChange={(e) => setEditRating(Number(e.target.value))}
                        className="text-xs p-1.5 border border-indigo-200 rounded focus:outline-none focus:border-indigo-500 bg-white"
                      >
                        <option value={1}>1점</option>
                        <option value={2}>2점</option>
                        <option value={3}>3점</option>
                        <option value={4}>4점</option>
                        <option value={5}>5점</option>
                      </select>
                    </td>
                    <td className="px-2 py-2 text-center align-top">
                       <div className="flex justify-center gap-1">
                          <button onClick={() => saveEditing(originalIndex)} className="text-emerald-600 hover:bg-emerald-100 p-1 rounded">
                             <Save size={14} />
                          </button>
                          <button onClick={cancelEditing} className="text-gray-400 hover:bg-gray-100 p-1 rounded">
                             <X size={14} />
                          </button>
                       </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={originalIndex} className="hover:bg-gray-50/50 transition-colors animate-in fade-in duration-300">
                  <td className="px-3 py-3 font-bold text-center text-indigo-600 align-top">#{log.session || '-'}</td>
                  <td className="px-3 py-3 font-medium text-gray-900 whitespace-nowrap align-top">{log.date}</td>
                  <td className="px-3 py-3 text-gray-600 min-w-[200px] whitespace-pre-wrap align-top">{log.content}</td>
                  <td className="px-3 py-3 text-center align-top">
                    <div className="flex justify-center">
                       {Array.from({length: 5}).map((_, i) => (
                         <Star 
                          key={i} 
                          size={12} 
                          className={i < log.understanding ? "fill-yellow-400 text-yellow-400" : "text-gray-200"} 
                         />
                       ))}
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-2 py-3 text-center align-top">
                      <div className="flex justify-center gap-1">
                        {onEdit && (
                          <button 
                            onClick={() => startEditing(originalIndex, log)}
                            className="text-gray-300 hover:text-indigo-600 p-1 rounded hover:bg-indigo-50 transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        {onDelete && (
                          <button 
                            onClick={() => onDelete(originalIndex)}
                            className="text-gray-300 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            
            {/* Toggle Button Row (Moved to Bottom) */}
            {hasHiddenLogs && (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="p-0">
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full py-2.5 text-xs text-gray-500 bg-gray-50/50 hover:bg-gray-100 font-bold border-b border-gray-100 flex items-center justify-center gap-1 transition-colors"
                  >
                    {isExpanded ? (
                      <>접기 <ChevronUp size={14} /></>
                    ) : (
                      <>이전 {hiddenCount}개 수업 기록 더 보기 <ChevronDown size={14} /></>
                    )}
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
