import React, { useState } from 'react';
import { StudentData } from '../types';
import { Card } from './Card';
import { Users, Plus, ChevronRight, User, Trash2, Edit2, Save, X, Calendar, Key, Database, RefreshCw, Star } from 'lucide-react';
import { initializeDemoData } from '../lib/db';
import { hashPin } from '../lib/auth';

const WEEK_DAYS = ['월', '화', '수', '목', '금', '토', '일'];

interface Props {
  students: StudentData[];
  onSelectStudent: (id: string) => void;
  onAddStudent: (
    name: string,
    grade: string,
    school: string,
    pinHash: string,
    lessonDays?: string[],
    lessonFeeCycle?: number,
    parentPhone?: string,
    studentPhone?: string
  ) => void;
  onUpdateStudent: (student: StudentData) => void;
  onDeleteStudent: (id: string) => void;
  canEdit?: boolean;
}

export const StudentList: React.FC<Props> = ({ students, onSelectStudent, onAddStudent, onUpdateStudent, onDeleteStudent, canEdit = false }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGrade, setNewGrade] = useState('');
  const [newSchool, setNewSchool] = useState('');
  const [newPin, setNewPin] = useState('');
  
  // 신규 등록용 수업 및 연락처 상태
  const [newLessonDays, setNewLessonDays] = useState<string[]>([]);
  const [newLessonFeeCycle, setNewLessonFeeCycle] = useState<number | ''>('');
  const [newParentPhone, setNewParentPhone] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editSchool, setEditSchool] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editNewPin, setEditNewPin] = useState('');
  const [isResettingPin, setIsResettingPin] = useState(false);

  // 수정용 수업 및 연락처 상태
  const [editLessonDays, setEditLessonDays] = useState<string[]>([]);
  const [editLessonFeeCycle, setEditLessonFeeCycle] = useState<number | ''>('');
  const [editParentPhone, setEditParentPhone] = useState('');
  const [editStudentPhone, setEditStudentPhone] = useState('');

  // 오늘 날짜 자정 기준 생성 (종료 여부 판별용)
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  // 종료된 학생인지 판별하는 함수
  const isStudentEnded = (endDate?: string) => {
    if (!endDate) return false;
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    return end < todayMidnight;
  };

  // 종료된 학생을 맨 밑으로 내리도록 정렬
  const sortedStudents = [...students].sort((a, b) => {
    const aEnded = isStudentEnded(a.profile.endDate);
    const bEnded = isStudentEnded(b.profile.endDate);
    
    if (aEnded && !bEnded) return 1;
    if (!aEnded && bEnded) return -1;
    return 0; // 둘 다 종료 상태가 같으면 기존 순서 유지
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newName && newGrade && newSchool && newPin) {
      const hashed = await hashPin(newPin);
      onAddStudent(
        newName,
        newGrade,
        newSchool,
        hashed,
        newLessonDays.length > 0 ? newLessonDays : undefined,
        newLessonFeeCycle !== '' ? Number(newLessonFeeCycle) : undefined,
        newParentPhone || undefined,
        newStudentPhone || undefined
      );

      setNewName('');
      setNewGrade('');
      setNewSchool('');
      setNewPin('');
      setNewLessonDays([]);
      setNewLessonFeeCycle('');
      setNewParentPhone('');
      setNewStudentPhone('');
      setIsAdding(false);
    }
  };

  const startEditing = (e: React.MouseEvent, student: StudentData) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingId(student.id);
    setEditName(student.profile.name);
    setEditGrade(student.profile.grade);
    setEditSchool(student.profile.school);
    setEditStartDate(student.profile.startDate);
    setEditEndDate(student.profile.endDate || '');
    setEditNewPin('');
    setIsResettingPin(false);
    
    // 추가 필드 바인딩
    setEditLessonDays(student.profile.lessonDays || []);
    setEditLessonFeeCycle(student.profile.lessonFeeCycle !== undefined ? student.profile.lessonFeeCycle : '');
    setEditParentPhone(student.profile.parentPhone || '');
    setEditStudentPhone(student.profile.studentPhone || '');
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingId(null);
  };

  const saveEditing = async (e: React.MouseEvent, student: StudentData) => {
    e.stopPropagation();
    e.preventDefault();

    let updatedProfile = {
      ...student.profile,
      name: editName,
      grade: editGrade,
      school: editSchool,
      startDate: editStartDate,
      endDate: editEndDate,
      lessonDays: editLessonDays.length > 0 ? editLessonDays : undefined,
      lessonFeeCycle: editLessonFeeCycle !== '' ? Number(editLessonFeeCycle) : undefined,
      parentPhone: editParentPhone || undefined,
      studentPhone: editStudentPhone || undefined,
    };

    if (isResettingPin && editNewPin) {
      const hashed = await hashPin(editNewPin);
      updatedProfile = { ...updatedProfile, pinHash: hashed };
    }

    onUpdateStudent({
      ...student,
      profile: updatedProfile
    });
    setEditingId(null);
  };

  const handleDeleteInEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (window.confirm('정말 삭제하시겠습니까?')) {
      setEditingId(null);
      onDeleteStudent(id);
    }
  };

  const handleDeleteInView = (e: React.MouseEvent, student: StudentData) => {
    e.stopPropagation();
    e.preventDefault();
    if (window.confirm(`${student.profile.name} 학생을 삭제하시겠습니까?`)) {
      onDeleteStudent(student.id);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <Users className="text-indigo-600" />
            학생 관리
          </h1>
          <p className="text-gray-500 text-sm mt-1">등록된 학생들의 학습 현황을 관리합니다.</p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            className={`p-2 rounded-full transition-colors shadow-sm ${isAdding ? 'bg-red-50 text-red-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
          >
            {isAdding ? <X size={24} /> : <Plus size={24} />}
          </button>
        )}
      </div>

      {isAdding && (
        <Card className="border-2 border-indigo-100 ring-4 ring-indigo-50/50 animate-in slide-in-from-top-4 duration-200">
          {/* ... 기존 등록 폼 유지 ... */}
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <h3 className="font-bold text-gray-800 text-lg mb-4">새 학생 등록</h3>
            <div className="grid gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">이름</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
                  placeholder="홍길동"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">학년</label>
                  <input
                    type="text"
                    value={newGrade}
                    onChange={e => setNewGrade(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder="고등학교 1학년"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">학교</label>
                  <input
                    type="text"
                    value={newSchool}
                    onChange={e => setNewSchool(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder="서울고등학교"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">접속용 PIN 설정 (8자리 숫자 권장)</label>
                <input
                  type="text"
                  value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 font-mono tracking-widest text-indigo-600 font-bold"
                  placeholder="12345678"
                  inputMode="numeric"
                  required
                />
                <p className="text-[10px] text-gray-400 mt-1">* PIN 번호는 안전하게 암호화되어 저장됩니다.</p>
              </div>

              {/* 추가 입력 필드 (수업 정보 및 연락처) */}
              <div className="border-t border-gray-100 pt-3 mt-1 space-y-3">
                <span className="text-xs font-extrabold text-indigo-600 block uppercase tracking-wider">수업 일정 & 연락처 (선택 사항)</span>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">수업 요일 선택</label>
                  <div className="flex flex-wrap gap-2">
                    {WEEK_DAYS.map(day => {
                      const isChecked = newLessonDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            if (isChecked) {
                              setNewLessonDays(newLessonDays.filter(d => d !== day));
                            } else {
                              setNewLessonDays([...newLessonDays, day]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            isChecked
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold'
                              : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">수납 주기 (회차)</label>
                    <input
                      type="number"
                      value={newLessonFeeCycle}
                      onChange={e => setNewLessonFeeCycle(e.target.value !== '' ? Number(e.target.value) : '')}
                      placeholder="예: 8 (8회마다)"
                      className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 text-sm font-bold"
                      min={1}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">학생 번호</label>
                    <input
                      type="text"
                      value={newStudentPhone}
                      onChange={e => setNewStudentPhone(e.target.value)}
                      placeholder="010-0000-0000"
                      className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">학부모 번호</label>
                    <input
                      type="text"
                      value={newParentPhone}
                      onChange={e => setNewParentPhone(e.target.value)}
                      placeholder="010-0000-0000"
                      className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 text-sm font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors">
                등록하기
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4">
        {sortedStudents.map((student) => {
          const isEditing = editingId === student.id;
          const isEnded = isStudentEnded(student.profile.endDate);

          return (
            <div
              key={student.id}
              className={`
                group bg-white rounded-xl p-5 border shadow-sm transition-all relative overflow-hidden
                ${isEditing ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-gray-100 hover:shadow-md hover:border-indigo-200 cursor-pointer'}
                ${isEnded && !isEditing ? 'grayscale opacity-60 bg-gray-50' : ''} 
              `}
              onClick={!isEditing ? () => onSelectStudent(student.id) : undefined}
            >
              {isEditing ? (
                // Edit Mode
                <div className="space-y-3 relative z-10" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-indigo-700">정보 수정</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 font-bold">이름</label>
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="w-full p-1.5 border border-indigo-200 rounded text-sm font-bold focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 font-bold">학년</label>
                      <input
                        value={editGrade}
                        onChange={e => setEditGrade(e.target.value)}
                        className="w-full p-1.5 border border-indigo-200 rounded text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 font-bold">학교</label>
                      <input
                        value={editSchool}
                        onChange={e => setEditSchool(e.target.value)}
                        className="w-full p-1.5 border border-indigo-200 rounded text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 font-bold">시작일</label>
                      <div className="flex items-center border border-indigo-200 rounded px-2 bg-white">
                        <Calendar size={12} className="text-gray-400 mr-2" />
                        <input
                          type="date"
                          value={editStartDate}
                          onChange={e => setEditStartDate(e.target.value)}
                          className="w-full p-1.5 text-sm focus:outline-none bg-transparent"
                        />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-gray-400 font-bold">종료일</label>
                      <div className="flex items-center border border-indigo-200 rounded px-2 bg-white">
                        <Calendar size={12} className="text-gray-400 mr-2" />
                        <input
                          type="date"
                          value={editEndDate}
                          onChange={e => setEditEndDate(e.target.value)}
                          className="w-full p-1.5 text-sm focus:outline-none bg-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 수정용 추가 입력 필드 (수업 정보 및 연락처) */}
                  <div className="border-t border-gray-100 pt-3 mt-1 space-y-3">
                    <span className="text-xs font-extrabold text-indigo-600 block uppercase tracking-wider">수업 일정 & 연락처 (선택 사항)</span>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1">수업 요일 선택</label>
                      <div className="flex flex-wrap gap-1.5">
                        {WEEK_DAYS.map(day => {
                          const isChecked = editLessonDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                if (isChecked) {
                                  setEditLessonDays(editLessonDays.filter(d => d !== day));
                                } else {
                                  setEditLessonDays([...editLessonDays, day]);
                                }
                              }}
                              className={`px-2.5 py-1 rounded text-xs font-bold transition-all border ${
                                isChecked
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold'
                                  : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-400 font-bold block mb-1">수납 주기 (회차)</label>
                        <input
                          type="number"
                          value={editLessonFeeCycle}
                          onChange={e => setEditLessonFeeCycle(e.target.value !== '' ? Number(e.target.value) : '')}
                          placeholder="예: 8 (8회마다)"
                          className="w-full p-1.5 border border-indigo-200 rounded text-sm font-bold focus:outline-none focus:border-indigo-500"
                          min={1}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-400 font-bold block mb-1">학생 번호</label>
                        <input
                          type="text"
                          value={editStudentPhone}
                          onChange={e => setEditStudentPhone(e.target.value)}
                          placeholder="010-0000-0000"
                          className="w-full p-1.5 border border-indigo-200 rounded text-sm font-semibold focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 font-bold block mb-1">학부모 번호</label>
                        <input
                          type="text"
                          value={editParentPhone}
                          onChange={e => setEditParentPhone(e.target.value)}
                          placeholder="010-0000-0000"
                          className="w-full p-1.5 border border-indigo-200 rounded text-sm font-semibold focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* PIN Reset */}
                  <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 mt-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-gray-500">학생 접속용 PIN</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsResettingPin(!isResettingPin);
                          setEditNewPin('');
                        }}
                        className="text-[10px] text-indigo-600 font-bold flex items-center gap-1 hover:underline"
                      >
                        <RefreshCw size={10} /> {isResettingPin ? '변경 취소' : '비밀번호 재설정'}
                      </button>
                    </div>

                    {isResettingPin ? (
                      <input
                        type="text"
                        value={editNewPin}
                        onChange={e => setEditNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                        className="w-full p-1 border border-indigo-300 rounded text-indigo-600 font-mono font-bold tracking-widest text-center focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        inputMode="numeric"
                        placeholder="새 PIN 입력"
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-center justify-between text-xs text-gray-400 font-mono px-1">
                        <span>******** (보안 처리됨)</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteInEdit(e, student.id)}
                      className="px-3 py-1.5 rounded text-red-400 hover:bg-red-50 text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      <Trash2 size={14} /> 삭제
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="px-3 py-1.5 rounded text-gray-500 hover:bg-gray-100 text-xs font-bold"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={(e) => saveEditing(e, student)}
                        className="px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold flex items-center gap-1"
                      >
                        <Save size={14} /> 저장
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                      <User size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">
                          {student.profile.name}
                          {isEnded && <span className="ml-2 text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 font-normal">종료됨</span>}
                        </h3>
                        {/* 즐겨찾기 버튼 */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateStudent({
                              ...student,
                              profile: {
                                ...student.profile,
                                isFavorite: !student.profile.isFavorite,
                              },
                            });
                          }}
                          className="p-1 hover:bg-gray-100 rounded-full transition-colors relative z-20"
                          title="즐겨찾기"
                        >
                          <Star
                            size={18}
                            className={
                              student.profile.isFavorite
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-300 hover:text-yellow-400"
                            }
                          />
                        </button>
                        {/* PIN Status */}
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono flex items-center gap-0.5" title="접속 PIN (암호화됨)">
                          <Key size={10} /> ****
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{student.profile.school} • {student.profile.grade}</p>

                      {/* Start/End Date Display */}
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                          <Calendar size={10} className="text-gray-400" />
                          <span>기간: <span className="font-bold text-gray-700">{student.profile.startDate} ~ {student.profile.endDate || '현재'}</span></span>
                        </div>
                        <p className="text-xs text-gray-300">Last: {student.profile.lastUpdate}</p>
                      </div>

                    </div>
                  </div>

                  {canEdit ? (
                    <div className="flex items-center gap-1 md:gap-2">
                      <button
                        type="button"
                        onClick={(e) => startEditing(e, student)}
                        className="p-2 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all relative z-20"
                        title="정보 수정"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteInView(e, student)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all relative z-20"
                        title="학생 삭제"
                      >
                        <Trash2 size={18} />
                      </button>
                      <div className="w-px h-6 bg-gray-200 mx-1"></div>
                      <ChevronRight className="text-gray-300 group-hover:text-indigo-400" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 md:gap-2">
                      <ChevronRight className="text-gray-300 group-hover:text-indigo-400" />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {students.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="text-gray-400 mb-4">등록된 학생이 없습니다.</p>
            <button
              onClick={() => initializeDemoData()}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-bold rounded-lg hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-600 transition-colors flex items-center gap-2 mx-auto"
            >
              <Database size={16} />
              데모 데이터 생성하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};