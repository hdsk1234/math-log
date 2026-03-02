
import React, { useState, useEffect, useRef } from 'react';
import { UpcomingAssignmentsData } from '../types';
import { Card } from './Card';
import { CheckSquare, Pencil, Backpack, Plus, X, Trash2, CalendarPlus, Save, RotateCcw } from 'lucide-react';

interface Props {
  data: UpcomingAssignmentsData;
  isAdmin?: boolean;
  onAddSchedule?: () => void;
  onDeleteSchedule?: (sIdx: number) => void;
  onUpdateDate?: (sIdx: number, newDate: string) => void;
  onAddItem?: (sIdx: number, cIdx: number) => void;
  onUpdateItem?: (sIdx: number, cIdx: number, iIdx: number, text: string) => void;
  onDeleteItem?: (sIdx: number, cIdx: number, iIdx: number) => void;
  onAddMaterial?: (text: string) => void;
  onDeleteMaterial?: (index: number) => void;
}

// Component to handle View/Edit mode, Undo/Redo, and local state
const AssignmentItem: React.FC<{
  value: string;
  isAdmin?: boolean;
  onSave: (text: string) => void;
  onDelete: () => void;
  isPast?: boolean;
}> = ({ value, isAdmin, onSave, onDelete, isPast }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  // Undo/Redo History State
  const [history, setHistory] = useState<string[]>([value]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync with prop when not editing
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value);
      setHistory([value]);
      setHistoryIndex(0);
    }
  }, [value, isEditing]);

  const startEditing = () => {
    setIsEditing(true);
    setLocalValue(value);
    setHistory([value]);
    setHistoryIndex(0);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setLocalValue(value);
  };

  const handleSave = () => {
    onSave(localValue);
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setLocalValue(newVal);

    // Debounce history snapshot for undo/redo
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setHistory(prev => {
        const current = prev.slice(0, historyIndex + 1);
        return [...current, newVal];
      });
      setHistoryIndex(prev => prev + 1);
    }, 500);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const prevValue = history[newIndex];
      setHistoryIndex(newIndex);
      setLocalValue(prevValue);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const nextValue = history[newIndex];
      setHistoryIndex(newIndex);
      setLocalValue(nextValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Save on Ctrl+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
      return;
    }

    // Cancel on Escape
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
      return;
    }

    // Undo: Ctrl+Z
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        handleRedo();
      } else {
        handleUndo();
      }
    }
    // Redo: Ctrl+Y
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      handleRedo();
    }
  };

  if (isEditing) {
    return (
      <div className="bg-white border-2 border-indigo-200 rounded-lg p-2 shadow-sm animate-in fade-in zoom-in-95 duration-200">
        <div className="grid relative w-full mb-2">
          {/* Invisible element to set size */}
          <div className="col-start-1 row-start-1 invisible whitespace-pre-wrap break-all text-sm leading-snug font-sans px-1">
            {localValue || ' '}
          </div>
          <textarea
            value={localValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="col-start-1 row-start-1 w-full h-full bg-transparent resize-none overflow-hidden focus:outline-none text-sm leading-snug font-sans"
            placeholder="과제 내용 입력"
            autoFocus
          />
        </div>
        <div className="flex justify-between items-center border-t border-gray-100 pt-2 mt-1">
          <div className="text-[10px] text-gray-400 flex items-center gap-2">
            <span>실행취소: Ctrl+Z</span>
            {historyIndex > 0 && <RotateCcw size={10} className="text-gray-400" />}
          </div>
          <div className="flex gap-1">
            <button
              onClick={cancelEditing}
              className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded font-bold"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="px-2 py-1 text-xs bg-indigo-600 text-white hover:bg-indigo-700 rounded font-bold flex items-center gap-1"
            >
              <Save size={12} /> 저장
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-2 group/item min-h-[24px]">
      <span className={`text-sm leading-snug whitespace-pre-wrap break-all py-0.5 ${isPast ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
        {value}
      </span>

      {isAdmin && (
        <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity flex-shrink-0 bg-white/80 backdrop-blur-sm rounded">
          <button
            onClick={startEditing}
            className="text-gray-400 hover:text-indigo-600 p-1 rounded hover:bg-indigo-50 transition-colors"
            title="수정"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => {
              if (window.confirm('이 항목을 삭제하시겠습니까?')) {
                onDelete();
              }
            }}
            className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
            title="삭제"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export const UpcomingAssignments: React.FC<Props> = ({
  data,
  isAdmin,
  onAddSchedule,
  onDeleteSchedule,
  onUpdateDate,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onAddMaterial,
  onDeleteMaterial
}) => {
  const [newMaterial, setNewMaterial] = useState('');

  const getCategoryIcon = (title: string, isPast: boolean) => {
    if (title.includes('문제')) return <Pencil size={14} className={isPast ? "text-gray-400" : "text-emerald-600"} />;
    if (title.includes('해설')) return <CheckSquare size={14} className={isPast ? "text-gray-400" : "text-indigo-600"} />;
    return null;
  };

  const getCategoryStyle = (title: string, isPast: boolean) => {
    if (isPast) return 'bg-gray-50 text-gray-400 border-gray-100 line-through decoration-gray-300';
    if (title.includes('문제')) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (title.includes('해설')) return 'bg-indigo-50 text-indigo-700 border-indigo-100';
    return 'bg-gray-50 text-gray-700 border-gray-100';
  };

  const handleMaterialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMaterial.trim() && onAddMaterial) {
      onAddMaterial(newMaterial.trim());
      setNewMaterial('');
    }
  };

  // Helper to check if a schedule date is in the past
  const isDatePast = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parts = dateStr.split('/');
    if (parts.length !== 2) return false;

    const m = parseInt(parts[0]);
    const d = parseInt(parts[1]);
    let y = today.getFullYear();

    if (m >= 11 && today.getMonth() <= 1) {
      y--;
    }
    if (today.getMonth() >= 10 && m <= 2) {
      y++;
    }

    const targetDate = new Date(y, m - 1, d);
    return targetDate < today;
  };

  const getDayOfWeek = (dateStr: string) => {
    const parts = dateStr.split('/');
    if (parts.length !== 2) return '';

    const m = parseInt(parts[0]);
    const d = parseInt(parts[1]);
    const today = new Date();
    let y = today.getFullYear();

    if (m >= 11 && today.getMonth() <= 1) y--;
    if (today.getMonth() >= 10 && m <= 2) y++;

    const targetDate = new Date(y, m - 1, d);
    const days = ['일', '월', '화', '수', '목', '금', '토'];

    return days[targetDate.getDay()];
  };

  const getDayColor = (dateStr: string, isPast: boolean) => {
    if (isPast) return 'text-gray-400';
    const day = getDayOfWeek(dateStr);
    if (day === '일') return 'text-red-500';
    if (day === '토') return 'text-blue-500';
    return 'text-gray-500';
  };

  // Helper for Date Input Conversion (M/D -> YYYY-MM-DD)
  const getIsoDate = (dateStr: string) => {
    const currentYear = new Date().getFullYear();
    if (!dateStr || !dateStr.includes('/')) return new Date().toISOString().split('T')[0];

    const [m, d] = dateStr.split('/').map(Number);
    if (isNaN(m) || isNaN(d)) return new Date().toISOString().split('T')[0];

    return `${currentYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const handleDateChange = (sIdx: number, isoDate: string) => {
    if (!onUpdateDate || !isoDate) return;
    const [y, m, d] = isoDate.split('-');
    // Store as M/D
    const newDateStr = `${parseInt(m)}/${parseInt(d)}`;
    onUpdateDate(sIdx, newDateStr);
  };

  return (
    <Card
      title="다음 수업 과제"
      icon={<Pencil className="text-indigo-600" size={20} />}
      className="border-indigo-100 ring-4 ring-indigo-50/50"
    >
      <div className="space-y-6">
        {/* Daily Schedules */}
        <div className="space-y-4">
          {data.schedules.map((schedule, sIdx) => {
            const isPast = isDatePast(schedule.date);

            return (
              <div key={sIdx} className={`flex gap-4 group/schedule relative transition-opacity ${isPast ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                {/* Date Column */}
                <div className="flex-shrink-0 w-14 pt-1 flex flex-col items-center gap-1">
                  <div className={`relative rounded-lg py-1 px-1 w-full text-center transition-colors ${isPast ? 'bg-gray-100' : 'bg-gray-100 group-hover/schedule:bg-indigo-50'}`}>

                    {/* Visual Display (Always visible) */}
                    <div className="flex flex-col items-center py-1">
                      {/* 월 표시 (작게) */}
                      <span className={`text-[10px] font-bold leading-none mb-0.5 ${isPast ? 'text-gray-400' : 'text-indigo-600/70'}`}>
                        {schedule.date.includes('/') ? `${schedule.date.split('/')[0]}월` : ''}
                      </span>

                      {/* 일 숫자 (크고 굵게) */}
                      <span className={`text-xl font-black tracking-tighter leading-none ${isPast ? 'text-gray-400' : 'text-gray-800'}`}>
                        {schedule.date.includes('/') ? schedule.date.split('/')[1] : schedule.date}
                      </span>

                      {/* 요일 표시 */}
                      <span className={`text-[11px] font-bold mt-0.5 ${getDayColor(schedule.date, isPast)}`}>
                        {schedule.date.includes('/') ? getDayOfWeek(schedule.date) : ''}
                      </span>
                    </div>

                    {/* Invisible Date Input for Admin */}
                    {isAdmin && (
                      <input
                        type="date"
                        value={getIsoDate(schedule.date)}
                        onChange={(e) => handleDateChange(sIdx, e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        title="날짜 변경 (클릭)"
                      />
                    )}
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => {
                        if (window.confirm('정말 이 과제 일정을 삭제하시겠습니까?')) {
                          onDeleteSchedule && onDeleteSchedule(sIdx);
                        }
                      }}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1"
                      title="일정 삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* Tasks Column */}
                <div className="flex-grow space-y-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  {schedule.categories.map((category, cIdx) => (
                    <div key={cIdx} className="relative">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded border flex items-center gap-1.5 ${getCategoryStyle(category.title, isPast)}`}>
                          {getCategoryIcon(category.title, isPast)}
                          {category.title.replace(/[\[\]]/g, '')}
                        </span>
                        {isAdmin && (
                          <button
                            onClick={() => onAddItem && onAddItem(sIdx, cIdx)}
                            className="p-0.5 rounded bg-gray-100 text-gray-500 hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
                            title="항목 추가"
                          >
                            <Plus size={12} />
                          </button>
                        )}
                      </div>

                      {category.items.length > 0 ? (
                        <ul className="space-y-1 pl-1">
                          {category.items.map((item, iIdx) => (
                            <li key={iIdx} className="relative pl-2 border-l-2 border-gray-100 hover:border-indigo-200 transition-colors mb-1 last:mb-0">
                              <AssignmentItem
                                value={item.text}
                                isAdmin={isAdmin}
                                onSave={(text) => onUpdateItem && onUpdateItem(sIdx, cIdx, iIdx, text)}
                                onDelete={() => onDeleteItem && onDeleteItem(sIdx, cIdx, iIdx)}
                                isPast={isPast}
                              />
                            </li>
                          ))}
                        </ul>
                      ) : (
                        !isAdmin && <p className="text-xs text-gray-300 pl-3 italic">과제 없음</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Add New Schedule Button */}
          {isAdmin && (
            <button
              onClick={onAddSchedule}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-bold text-sm hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
            >
              <CalendarPlus size={18} />
              다음 수업 과제 추가 (자동 날짜)
            </button>
          )}
        </div>

        {/* Materials */}
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
          <div className="flex gap-3 items-start">
            <Backpack className="text-amber-500 mt-0.5 flex-shrink-0" size={18} />
            <div className="w-full">
              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">준비물</h4>
              <div className="flex flex-wrap gap-2 items-center">
                {data.materials.map((item, idx) => (
                  <span key={idx} className="bg-white text-amber-900 text-xs px-2 py-1 rounded shadow-sm border border-amber-100 flex items-center gap-1 group">
                    {item}
                    {isAdmin && (
                      <button
                        onClick={() => onDeleteMaterial && onDeleteMaterial(idx)}
                        className="text-amber-300 hover:text-red-500"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </span>
                ))}
                {isAdmin && (
                  <form onSubmit={handleMaterialSubmit} className="flex gap-1">
                    <input
                      type="text"
                      value={newMaterial}
                      onChange={(e) => setNewMaterial(e.target.value)}
                      placeholder="준비물 추가"
                      className="text-xs px-2 py-1 rounded border border-amber-200 focus:outline-none focus:border-amber-400 w-24"
                    />
                    <button type="submit" className="text-amber-600 hover:bg-amber-100 rounded p-1">
                      <Plus size={14} />
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
