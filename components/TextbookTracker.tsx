
import React, { useState } from 'react';
import { Textbook } from '../types';
import { Card } from './Card';
import { Book, Plus, Trash2, Edit2, Save, X, BookOpen, CheckCircle2, Image as ImageIcon, Wand2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { SUBJECT_OPTIONS, getPresetCoverUrl } from '../constants';

interface Props {
  textbooks: Textbook[];
  isAdmin?: boolean;
  onUpdate?: (textbooks: Textbook[]) => void;
}

export const TextbookTracker: React.FC<Props> = ({ textbooks = [], isAdmin, onUpdate }) => {
  // Add State
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState(SUBJECT_OPTIONS[0]);
  const [newCoverImage, setNewCoverImage] = useState('');
  const [newTotal, setNewTotal] = useState(100);
  const [newCurrent, setNewCurrent] = useState(0);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editCoverImage, setEditCoverImage] = useState('');
  const [editTotal, setEditTotal] = useState(0);
  const [editCurrent, setEditCurrent] = useState(0);
  const [editStatus, setEditStatus] = useState<'active' | 'completed' | 'paused'>('active');

  const handleDelete = (id: string) => {
    if (!onUpdate) return;
    if (window.confirm('이 교재를 목록에서 삭제하시겠습니까?')) {
      onUpdate(textbooks.filter(t => t.id !== id));
    }
  };

  const handleAdd = () => {
    if (!onUpdate || !newTitle) return;
    const newBook: Textbook = {
      id: Date.now().toString(),
      title: newTitle,
      subject: newSubject,
      coverImage: newCoverImage,
      totalSteps: Number(newTotal),
      currentStep: Number(newCurrent),
      status: 'active'
    };
    onUpdate([...textbooks, newBook]);
    setNewTitle('');
    setNewSubject(SUBJECT_OPTIONS[0]);
    setNewCoverImage('');
    setNewTotal(100);
    setNewCurrent(0);
  };

  const startEditing = (book: Textbook) => {
    setEditingId(book.id);
    setEditTitle(book.title);
    setEditSubject(book.subject || SUBJECT_OPTIONS[0]);
    setEditCoverImage(book.coverImage || '');
    setEditTotal(book.totalSteps);
    setEditCurrent(book.currentStep);
    setEditStatus(book.status);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEditing = () => {
    if (!onUpdate || !editingId) return;
    
    const updatedBooks = textbooks.map(t => {
      if (t.id === editingId) {
        return {
          ...t,
          title: editTitle,
          subject: editSubject,
          coverImage: editCoverImage,
          totalSteps: Number(editTotal),
          currentStep: Number(editCurrent),
          status: editStatus
        };
      }
      return t;
    });
    
    onUpdate(updatedBooks);
    cancelEditing();
  };

  const generatePresetCover = (isEdit: boolean) => {
    const subject = isEdit ? editSubject : newSubject;
    const url = getPresetCoverUrl(subject);
    if (isEdit) {
      setEditCoverImage(url);
    } else {
      setNewCoverImage(url);
    }
  };

  const getProgressColor = (status: string, percent: number) => {
    if (status === 'completed' || percent === 100) return '#10b981'; // emerald-500
    if (status === 'paused') return '#9ca3af'; // gray-400
    return '#4f46e5'; // indigo-600
  };

  return (
    <Card title="교재 진도 현황" icon={<BookOpen className="text-indigo-600" size={20} />}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {textbooks && textbooks.length > 0 ? (
          textbooks.map((book) => {
          const isEditing = editingId === book.id;
          const percentage = Math.min(Math.round((book.currentStep / book.totalSteps) * 100), 100);
          const chartData = [
            { name: 'Progress', value: book.currentStep },
            { name: 'Remaining', value: book.totalSteps - book.currentStep }
          ];
          const color = getProgressColor(book.status, percentage);

          if (isEditing) {
            return (
              <div key={book.id} className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-200 shadow-sm relative animate-in fade-in zoom-in-95">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                        <label className="text-xs font-bold text-gray-500">교재명</label>
                        <input 
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className="w-full text-sm font-bold p-1.5 border border-indigo-200 rounded focus:outline-none focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500">과목</label>
                        <select
                          value={editSubject}
                          onChange={e => setEditSubject(e.target.value)}
                          className="w-full text-sm p-1.5 border border-indigo-200 rounded focus:outline-none focus:border-indigo-500 bg-white"
                        >
                          {SUBJECT_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                    </div>
                    <div>
                         <label className="text-xs font-bold text-gray-500">표지 URL</label>
                         <div className="flex gap-1">
                           <input 
                             value={editCoverImage}
                             onChange={e => setEditCoverImage(e.target.value)}
                             className="w-full text-sm p-1.5 border border-indigo-200 rounded focus:outline-none focus:border-indigo-500"
                             placeholder="https://..."
                           />
                           <button 
                             onClick={() => generatePresetCover(true)}
                             className="p-1.5 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200 flex-shrink-0"
                             title="기본 표지 생성"
                           >
                             <Wand2 size={14} />
                           </button>
                         </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-gray-500">현재 (번/쪽)</label>
                      <input 
                        type="number"
                        value={editCurrent}
                        onChange={e => setEditCurrent(Number(e.target.value))}
                        className="w-full text-sm p-1.5 border border-indigo-200 rounded focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500">전체 (번/쪽)</label>
                      <input 
                        type="number"
                        value={editTotal}
                        onChange={e => setEditTotal(Number(e.target.value))}
                        className="w-full text-sm p-1.5 border border-indigo-200 rounded focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                     <label className="text-xs font-bold text-gray-500">상태</label>
                     <select
                       value={editStatus}
                       onChange={e => setEditStatus(e.target.value as any)}
                       className="w-full text-sm p-1.5 border border-indigo-200 rounded focus:outline-none focus:border-indigo-500 bg-white"
                     >
                       <option value="active">진행중</option>
                       <option value="paused">일시정지</option>
                       <option value="completed">완료</option>
                     </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={cancelEditing} className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-200 rounded">취소</button>
                    <button onClick={saveEditing} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 font-bold flex items-center gap-1">
                      <Save size={12} /> 저장
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={book.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex gap-3 relative group hover:shadow-md transition-shadow">
               {/* Left: Cover Image */}
               <div className="w-16 h-20 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden border border-gray-100 flex items-center justify-center">
                  {book.coverImage ? (
                     <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                     <Book size={24} className="text-gray-300" />
                  )}
               </div>

               {/* Right: Info & Chart */}
               <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 pr-1">
                      {book.subject && (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px] font-bold mb-1">
                          {book.subject}
                        </span>
                      )}
                      <h4 className="font-bold text-gray-800 text-sm leading-tight line-clamp-2" title={book.title}>{book.title}</h4>
                    </div>
                    {/* Donut Chart */}
                    <div className="w-10 h-10 flex-shrink-0 relative ml-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={12}
                                outerRadius={18}
                                startAngle={90}
                                endAngle={-270}
                                dataKey="value"
                                stroke="none"
                            >
                                <Cell key="progress" fill={color} />
                                <Cell key="remaining" fill="#f3f4f6" />
                            </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <div className="flex items-end justify-between mt-1">
                     <div>
                        <p className="text-xs text-gray-500 mb-1">
                          <span className="font-bold text-gray-700">{book.currentStep}</span> / {book.totalSteps}
                          <span className="text-[10px] text-gray-400 ml-1">({percentage}%)</span>
                        </p>
                        <div className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1 w-fit
                           ${book.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 
                             book.status === 'paused' ? 'bg-gray-100 text-gray-500' : 
                             'bg-indigo-50 text-indigo-700'}
                         `}>
                           {book.status === 'completed' && <CheckCircle2 size={10} />}
                           {book.status === 'completed' ? '완료' : 
                            book.status === 'paused' ? '중지' : '진행'}
                        </div>
                     </div>
                  </div>
               </div>

               {/* Admin Controls */}
               {isAdmin && (
                  <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white/80 rounded backdrop-blur-sm">
                    <button 
                      onClick={() => startEditing(book)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDelete(book.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
               )}
            </div>
          );
        })
        ) : (
          !isAdmin && (
             <div className="col-span-full py-8 text-center text-gray-400 text-xs flex flex-col items-center gap-2">
               <BookOpen size={24} className="opacity-20" />
               <p>등록된 교재가 없습니다.</p>
             </div>
          )
        )}

        {/* Add New Book Card */}
        {isAdmin && !editingId && (
           <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col justify-center items-center gap-3 hover:bg-indigo-50/50 hover:border-indigo-200 transition-colors">
              <div className="w-full space-y-2">
                 <input 
                   placeholder="새 교재명 (예: 쎈 수학)"
                   value={newTitle}
                   onChange={e => setNewTitle(e.target.value)}
                   className="w-full text-xs p-2 border border-gray-200 rounded focus:outline-none focus:border-indigo-300 bg-white"
                 />
                 <div className="flex gap-2">
                    <select
                      value={newSubject}
                      onChange={e => setNewSubject(e.target.value)}
                      className="w-1/2 text-xs p-2 border border-gray-200 rounded focus:outline-none focus:border-indigo-300 bg-white"
                    >
                      {SUBJECT_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <div className="relative w-1/2 flex gap-1 items-center">
                       <div className="relative flex-1">
                         <ImageIcon size={14} className="absolute left-2 top-2.5 text-gray-400" />
                         <input 
                           placeholder="표지 URL"
                           value={newCoverImage}
                           onChange={e => setNewCoverImage(e.target.value)}
                           className="w-full text-xs p-2 pl-7 border border-gray-200 rounded focus:outline-none focus:border-indigo-300 bg-white"
                         />
                       </div>
                       <button 
                         onClick={() => generatePresetCover(false)}
                         className="px-2 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200 text-xs whitespace-nowrap h-[34px]"
                         title="기본 표지 생성"
                       >
                         기본
                       </button>
                    </div>
                 </div>
                 <div className="flex gap-2">
                    <input 
                      type="number"
                      placeholder="현재"
                      value={newCurrent}
                      onChange={e => setNewCurrent(Number(e.target.value))}
                      className="w-1/2 text-xs p-2 border border-gray-200 rounded focus:outline-none focus:border-indigo-300 bg-white"
                    />
                    <input 
                      type="number"
                      placeholder="전체"
                      value={newTotal}
                      onChange={e => setNewTotal(Number(e.target.value))}
                      className="w-1/2 text-xs p-2 border border-gray-200 rounded focus:outline-none focus:border-indigo-300 bg-white"
                    />
                 </div>
                 <button 
                   onClick={handleAdd}
                   disabled={!newTitle}
                   className="w-full py-1.5 bg-white border border-gray-200 text-indigo-600 rounded text-xs font-bold hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                 >
                   <Plus size={12} /> 추가하기
                 </button>
              </div>
           </div>
        )}
      </div>
    </Card>
  );
};
