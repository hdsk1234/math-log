
import React, { useState, useEffect } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { UnitMastery } from '../types';
import { Card } from './Card';
import { Edit2, Plus, Trash2, Check } from 'lucide-react';
import { SUBJECT_OPTIONS } from '../constants';

interface Props {
  data: UnitMastery[];
  isAdmin?: boolean;
  onUpdate?: (data: UnitMastery[]) => void;
}

export const MasteryChart: React.FC<Props> = ({ data, isAdmin, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newSubject, setNewSubject] = useState(SUBJECT_OPTIONS[0]);
  const [newScore, setNewScore] = useState(50);

  const handleScoreChange = (index: number, newScore: number) => {
    if (!onUpdate) return;
    const newData = [...data];
    newData[index] = { ...newData[index], score: newScore };
    onUpdate(newData);
  };

  const handleSubjectChange = (index: number, newSubjectName: string) => {
    if (!onUpdate) return;
    const newData = [...data];
    newData[index] = { ...newData[index], subject: newSubjectName };
    onUpdate(newData);
  };

  const handleDelete = (index: number) => {
    if (!onUpdate) return;
    const newData = data.filter((_, i) => i !== index);
    onUpdate(newData);
  };

  const handleAdd = () => {
    if (!onUpdate || !newSubject) return;
    onUpdate([...data, { subject: newSubject, score: newScore, fullMark: 100 }]);
    setNewSubject(SUBJECT_OPTIONS[0]);
    setNewScore(50);
  };

  return (
    <Card 
      title="단원별 이해도" 
      icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l10 6.5v7L12 22 2 15.5v-7L12 2z"/></svg>}
    >
      <div className="relative">
        {isAdmin && (
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={`absolute top-0 right-0 z-10 p-1.5 rounded-full transition-colors ${isEditing ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:bg-gray-100'}`}
            title={isEditing ? "편집 종료" : "점수 및 항목 수정"}
          >
            {isEditing ? <Check size={16} /> : <Edit2 size={16} />}
          </button>
        )}

        <div className="h-64 w-full flex justify-center items-center">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#4b5563', fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name="이해도"
                dataKey="score"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="#8b5cf6"
                fillOpacity={0.4}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {!isEditing && (
          <div className="flex justify-center gap-4 text-xs mt-2">
             <div className="flex items-center gap-1">
               <div className="w-2 h-2 rounded-full bg-violet-500"></div>
               <span>현재 이해도</span>
             </div>
          </div>
        )}

        {/* Edit Panel */}
        {isEditing && isAdmin && (
          <div className="mt-4 pt-4 border-t border-gray-100 animate-in slide-in-from-top-2">
            <h4 className="text-xs font-bold text-gray-500 mb-2">항목 및 점수 관리</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {data.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <select
                    value={item.subject}
                    onChange={(e) => handleSubjectChange(idx, e.target.value)}
                    className="w-24 p-1 text-xs border border-gray-200 rounded focus:border-indigo-500 focus:outline-none bg-transparent"
                  >
                     {SUBJECT_OPTIONS.map(opt => (
                       <option key={opt} value={opt}>{opt}</option>
                     ))}
                  </select>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={item.score} 
                    onChange={(e) => handleScoreChange(idx, Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <span className="w-8 text-right font-mono">{item.score}</span>
                  <button onClick={() => handleDelete(idx)} className="text-gray-400 hover:text-red-500">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="mt-3 flex gap-2 items-center">
              <select 
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                className="flex-1 text-xs p-1.5 border border-gray-200 rounded focus:outline-none focus:border-indigo-300 bg-white"
              >
                 {SUBJECT_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                 ))}
              </select>
              <input 
                type="number"
                min="0"
                max="100"
                value={newScore}
                onChange={e => setNewScore(Number(e.target.value))}
                className="w-12 text-xs p-1.5 border border-gray-200 rounded focus:outline-none text-center"
              />
              <button 
                onClick={handleAdd}
                disabled={!newSubject}
                className="bg-indigo-500 text-white p-1.5 rounded hover:bg-indigo-600 disabled:opacity-50"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
