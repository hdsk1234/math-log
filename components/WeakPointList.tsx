import React, { useState } from 'react';
import { WeakPoint } from '../types';
import { Card } from './Card';
import { AlertTriangle, Trash2, Plus, Edit2, Save } from 'lucide-react';

interface Props {
  weakPoints: WeakPoint[];
  isAdmin?: boolean;
  onDelete?: (index: number) => void;
  onAdd?: (item: WeakPoint) => void;
  onEdit?: (index: number, item: WeakPoint) => void;
}

export const WeakPointList: React.FC<Props> = ({ weakPoints, isAdmin = false, onDelete, onAdd, onEdit }) => {
  // Add State
  const [newCategory, setNewCategory] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSeverity, setNewSeverity] = useState<'high' | 'medium' | 'low'>('medium');

  // Edit State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSeverity, setEditSeverity] = useState<'high' | 'medium' | 'low'>('medium');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAdd && newCategory && newDesc) {
      onAdd({ category: newCategory, description: newDesc, severity: newSeverity });
      setNewCategory('');
      setNewDesc('');
      setNewSeverity('medium');
    }
  };

  const startEditing = (index: number, wp: WeakPoint) => {
    setEditingIndex(index);
    setEditCategory(wp.category);
    setEditDesc(wp.description);
    setEditSeverity(wp.severity);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
  };

  const saveEditing = (index: number) => {
    if (onEdit && editCategory && editDesc) {
        onEdit(index, { category: editCategory, description: editDesc, severity: editSeverity });
        setEditingIndex(null);
    }
  };

  return (
    <Card title="취약 포인트" icon={<AlertTriangle className="text-orange-500" size={20} />}>
      <div className="space-y-3">
        {weakPoints.length === 0 && (
          <div className="text-center py-4 text-gray-400 text-sm">등록된 취약 포인트가 없습니다.</div>
        )}
        
        {weakPoints.map((wp, idx) => {
          const isEditing = editingIndex === idx;

          if (isEditing) {
            return (
              <div key={idx} className="p-3 bg-white rounded-xl border-2 border-orange-200 ring-2 ring-orange-50 space-y-2 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex gap-2">
                       <input
                          type="text"
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="flex-1 text-sm font-bold p-1.5 border border-gray-200 rounded focus:outline-none focus:border-orange-500"
                          placeholder="유형 (예: 계산 실수, 태도)"
                       />
                       <select
                          value={editSeverity}
                          onChange={(e) => setEditSeverity(e.target.value as any)}
                          className="text-xs p-1.5 border border-gray-200 rounded focus:outline-none focus:border-orange-500 bg-white"
                       >
                         <option value="high">심각</option>
                         <option value="medium">보통</option>
                         <option value="low">경미</option>
                       </select>
                  </div>
                  <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full text-sm p-1.5 border border-gray-200 rounded focus:outline-none focus:border-orange-500 resize-none h-16"
                      placeholder="구체적인 취약 내용 설명"
                  />
                  <div className="flex justify-end gap-2">
                      <button
                          type="button"
                          onClick={cancelEditing}
                          className="text-xs px-3 py-1.5 rounded text-gray-500 hover:bg-gray-100 font-bold"
                      >
                          취소
                      </button>
                      <button
                          type="button"
                          onClick={() => saveEditing(idx)}
                          className="text-xs px-3 py-1.5 rounded bg-orange-500 text-white hover:bg-orange-600 font-bold flex items-center gap-1"
                      >
                          <Save size={12} /> 저장
                      </button>
                  </div>
              </div>
            );
          }

          return (
            <div key={idx} className="flex gap-3 items-start p-3 bg-orange-50/50 rounded-xl border border-orange-100 group relative transition-colors hover:bg-orange-50">
              <div className={`mt-1.5 min-w-[6px] min-h-[6px] rounded-full flex-shrink-0 ${wp.severity === 'high' ? 'bg-red-500' : 'bg-orange-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-bold text-gray-800 text-sm truncate">{wp.category}</span>
                  {wp.severity === 'high' && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold whitespace-nowrap">심각</span>}
                </div>
                {/* whitespace-pre-wrap 클래스 추가됨 */}
                <p className="text-sm text-gray-600 leading-snug break-words whitespace-pre-wrap">{wp.description}</p>
              </div>
              
              {isAdmin && (
                <div className="flex flex-col sm:flex-row gap-1">
                  {onEdit && (
                    <button 
                      onClick={() => startEditing(idx, wp)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      title="수정"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                  {onDelete && (
                    <button 
                      onClick={() => onDelete(idx)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {isAdmin && onAdd && (
          <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-gray-100 bg-gray-50 p-3 rounded-lg">
             <h4 className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
               <Plus size={12} /> 새로운 취약 포인트 추가
             </h4>
             <div className="space-y-2">
               <input 
                 type="text" 
                 placeholder="유형 (예: 삼각함수, 계산 실수, 학습 태도)" 
                 value={newCategory}
                 onChange={e => setNewCategory(e.target.value)}
                 className="w-full text-xs p-2 border border-gray-200 rounded focus:outline-none focus:border-orange-300"
                 required
               />
               <textarea 
                 placeholder="구체적인 내용 (예: 부호 실수가 잦음, 숙제를 자주 미룸)" 
                 value={newDesc}
                 onChange={e => setNewDesc(e.target.value)}
                 className="w-full text-xs p-2 border border-gray-200 rounded focus:outline-none focus:border-orange-300 resize-none h-16"
                 required
               />
               <div className="flex gap-2">
                 <select 
                   value={newSeverity} 
                   onChange={(e) => setNewSeverity(e.target.value as any)}
                   className="text-xs p-2 border border-gray-200 rounded focus:outline-none focus:border-orange-300 flex-1 bg-white"
                 >
                   <option value="high">심각함</option>
                   <option value="medium">보통</option>
                   <option value="low">경미함</option>
                 </select>
                 <button type="submit" className="bg-orange-500 text-white text-xs px-4 rounded font-bold hover:bg-orange-600">
                   저장
                 </button>
               </div>
             </div>
          </form>
        )}
      </div>
    </Card>
  );
};