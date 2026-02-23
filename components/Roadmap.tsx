
import React, { useState } from 'react';
import { RoadmapStep } from '../types';
import { Card } from './Card';
import { Map, CheckCircle2, Timer, Plus, Trash2, Edit2, Save, X } from 'lucide-react';

interface Props {
  steps: RoadmapStep[];
  isAdmin?: boolean;
  onUpdate?: (steps: RoadmapStep[]) => void;
}

export const Roadmap: React.FC<Props> = ({ steps, isAdmin, onUpdate }) => {
  // Add State
  const [newDate, setNewDate] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newStatus, setNewStatus] = useState<'upcoming' | 'current' | 'completed'>('upcoming');

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editStatus, setEditStatus] = useState<'upcoming' | 'current' | 'completed'>('upcoming');

  const handleDelete = (id: string) => {
    if (!onUpdate) return;
    if (window.confirm('이 진도 항목을 삭제하시겠습니까?')) {
      onUpdate(steps.filter(s => s.id !== id));
    }
  };

  const handleAdd = () => {
    if (!onUpdate || !newTitle) return;
    const newStep: RoadmapStep = {
      id: Date.now().toString(),
      title: newTitle,
      date: newDate ? `${newDate} 목표` : undefined,
      status: newStatus
    };
    onUpdate([...steps, newStep]);
    setNewTitle('');
    setNewDate('');
    setNewStatus('upcoming');
  };

  const startEditing = (step: RoadmapStep) => {
    setEditingId(step.id);
    setEditDate(step.date ? step.date.replace(' 목표', '') : '');
    setEditTitle(step.title);
    setEditStatus(step.status);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditDate('');
    setEditTitle('');
    setEditStatus('upcoming');
  };

  const saveEditing = () => {
    if (!onUpdate || !editingId) return;
    
    const updatedSteps = steps.map(s => {
      if (s.id === editingId) {
        return {
          ...s,
          title: editTitle,
          date: editDate ? `${editDate} 목표` : undefined,
          status: editStatus
        };
      }
      return s;
    });
    
    onUpdate(updatedSteps);
    cancelEditing();
  };

  return (
    <Card title="월별 학습 진도표" icon={<Map className="text-indigo-600" size={20} />}>
      <div className="overflow-hidden rounded-xl border border-gray-100">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
              <th className="py-3 px-3 font-semibold w-[25%]">기간</th>
              <th className="py-3 px-3 font-semibold w-[45%]">학습 목표</th>
              <th className="py-3 px-3 font-semibold w-[15%] text-center">상태</th>
              {isAdmin && <th className="py-3 px-3 w-[15%]"></th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-50">
            {steps.map((step) => {
              const isCurrent = step.status === 'current';
              const isCompleted = step.status === 'completed';
              const isEditing = editingId === step.id;
              
              if (isEditing) {
                return (
                  <tr key={step.id} className="bg-indigo-50/50">
                    <td className="p-2 align-middle">
                      <input 
                        value={editDate}
                        onChange={e => setEditDate(e.target.value)}
                        className="w-full text-xs p-1.5 border border-indigo-200 rounded focus:outline-none focus:border-indigo-500 text-center bg-white"
                        placeholder="날짜"
                      />
                    </td>
                    <td className="p-2 align-middle">
                       <input 
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className="w-full text-xs p-1.5 border border-indigo-200 rounded focus:outline-none focus:border-indigo-500 bg-white"
                        placeholder="학습 목표"
                      />
                    </td>
                    <td className="p-2 align-middle">
                      <select
                       value={editStatus}
                       onChange={e => setEditStatus(e.target.value as any)}
                       className="w-full text-xs p-1.5 border border-indigo-200 rounded focus:outline-none focus:border-indigo-500 bg-white"
                      >
                        <option value="upcoming">예정</option>
                        <option value="current">진행</option>
                        <option value="completed">완료</option>
                      </select>
                    </td>
                    <td className="p-2 align-middle text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                         onClick={saveEditing}
                         className="text-emerald-600 hover:bg-emerald-100 p-1 rounded"
                         title="저장"
                        >
                          <Save size={14} />
                        </button>
                        <button 
                         onClick={cancelEditing}
                         className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded"
                         title="취소"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr 
                  key={step.id} 
                  className={`
                    transition-colors
                    ${isCurrent ? 'bg-indigo-50/40' : 'hover:bg-gray-50/50'}
                  `}
                >
                  <td className="py-3 px-3 align-middle">
                    <div className={`
                      inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold whitespace-nowrap
                      ${isCurrent 
                        ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' 
                        : 'bg-gray-100 text-gray-500 border border-gray-200'}
                    `}>
                      {step.date ? step.date.replace(' 목표', '') : '-'}
                    </div>
                  </td>
                  <td className="py-3 px-3 align-middle">
                    <span className={`
                      block font-medium text-sm
                      ${isCurrent ? 'text-indigo-900' : 'text-gray-700'}
                      ${isCompleted ? 'text-gray-400 line-through decoration-gray-300' : ''}
                    `}>
                      {step.title}
                    </span>
                  </td>
                  <td className="py-3 px-3 align-middle text-center">
                    {isCompleted && (
                      <div className="flex justify-center" title="완료">
                        <CheckCircle2 size={18} className="text-emerald-500" />
                      </div>
                    )}
                    {isCurrent && (
                      <div className="flex justify-center" title="진행중">
                        <Timer size={18} className="text-indigo-600" />
                      </div>
                    )}
                    {step.status === 'upcoming' && (
                      <div className="w-2 h-2 rounded-full bg-gray-200 mx-auto" title="예정" />
                    )}
                  </td>
                  {isAdmin && (
                    <td className="py-3 px-3 align-middle text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => startEditing(step)}
                          className="text-gray-300 hover:text-indigo-500 p-1 rounded hover:bg-indigo-50 transition-colors"
                          title="수정"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(step.id)}
                          className="text-gray-300 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                          title="삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            
            {/* Input Row for Admin */}
            {isAdmin && !editingId && (
              <tr className="bg-indigo-50/30">
                 <td className="p-2">
                   <input 
                     placeholder="2023.11"
                     value={newDate}
                     onChange={e => setNewDate(e.target.value)}
                     className="w-full text-xs p-1.5 border border-indigo-100 rounded focus:outline-none focus:border-indigo-300 text-center"
                   />
                 </td>
                 <td className="p-2">
                    <input 
                     placeholder="새 학습 목표"
                     value={newTitle}
                     onChange={e => setNewTitle(e.target.value)}
                     className="w-full text-xs p-1.5 border border-indigo-100 rounded focus:outline-none focus:border-indigo-300"
                   />
                 </td>
                 <td className="p-2">
                   <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value as any)}
                    className="w-full text-xs p-1.5 border border-indigo-100 rounded focus:outline-none focus:border-indigo-300"
                   >
                     <option value="upcoming">예정</option>
                     <option value="current">진행</option>
                     <option value="completed">완료</option>
                   </select>
                 </td>
                 <td className="p-2 text-center">
                   <button 
                    onClick={handleAdd}
                    disabled={!newTitle}
                    className="bg-indigo-500 text-white p-1.5 rounded hover:bg-indigo-600 disabled:opacity-50"
                   >
                     <Plus size={14} />
                   </button>
                 </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex justify-end gap-4 text-[10px] text-gray-400 font-medium">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={12} className="text-emerald-500" />
          완료
        </div>
        <div className="flex items-center gap-1.5">
          <Timer size={12} className="text-indigo-600" />
          진행중
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-gray-200" />
          예정
        </div>
      </div>
    </Card>
  );
};
