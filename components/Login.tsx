import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, Mail, User, GraduationCap, Loader2, KeyRound, ShieldCheck, AlertCircle, EyeOff, Eye, Trophy } from 'lucide-react';
import { signIn, signUp, signInWithGoogle, hashPin, logOut } from '../lib/auth';
import { registerTeacher, isTeacherApproved } from '../lib/db';
import { UserRole } from '../types';

interface Props {
  onStudentLogin: (pinHash: string) => Promise<boolean>;
  authenticatedEmail?: string | null;
  googleDisplayName?: string | null;
}

const TEACHER_SECRET_CODE = "MATH_TEACHER";
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000;

export const Login: React.FC<Props> = ({ onStudentLogin, authenticatedEmail, googleDisplayName }) => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [secretCode, setSecretCode] = useState('');
  
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  // 구글 로그인 인증 코드용 상태
  const [needsGoogleAuthCode, setNeedsGoogleAuthCode] = useState(false);
  const [tempGoogleEmail, setTempGoogleEmail] = useState('');
  const [tempGoogleName, setTempGoogleName] = useState('');
  const [googleSecretCode, setGoogleSecretCode] = useState('');

  useEffect(() => {
    if (authenticatedEmail) {
      setNeedsGoogleAuthCode(true);
      setTempGoogleEmail(authenticatedEmail);
      setTempGoogleName(googleDisplayName || authenticatedEmail.split('@')[0]);
      setSelectedRole('teacher');
    } else {
      setNeedsGoogleAuthCode(false);
      setTempGoogleEmail('');
      setTempGoogleName('');
    }
  }, [authenticatedEmail, googleDisplayName]);

  useEffect(() => {
    const storedAttempts = localStorage.getItem('loginAttempts');
    const storedLockout = localStorage.getItem('lockoutUntil');

    if (storedAttempts) setAttempts(parseInt(storedAttempts));
    if (storedLockout) {
      const lockoutTime = parseInt(storedLockout);
      if (Date.now() < lockoutTime) {
        setLockoutUntil(lockoutTime);
      } else {
        localStorage.removeItem('lockoutUntil');
        localStorage.setItem('loginAttempts', '0');
        setAttempts(0);
        setLockoutUntil(null);
      }
    }
  }, []);

  useEffect(() => {
    if (!lockoutUntil) return;
    const interval = setInterval(() => {
      if (Date.now() > lockoutUntil) {
        setLockoutUntil(null);
        setAttempts(0);
        localStorage.removeItem('lockoutUntil');
        localStorage.setItem('loginAttempts', '0');
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const handleStudentFailure = () => {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    localStorage.setItem('loginAttempts', newAttempts.toString());

    if (newAttempts >= MAX_ATTEMPTS) {
      const lockoutTime = Date.now() + LOCKOUT_DURATION;
      setLockoutUntil(lockoutTime);
      localStorage.setItem('lockoutUntil', lockoutTime.toString());
      setLocalError(`입력 횟수 초과 (${MAX_ATTEMPTS}회). 5분 후에 다시 시도해주세요.`);
    } else {
      setLocalError(`PIN 번호가 올바르지 않습니다. (${newAttempts}/${MAX_ATTEMPTS})`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (lockoutUntil) {
       const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000 / 60);
       setLocalError(`입력 횟수 초과로 차단되었습니다. ${remaining}분 후에 시도해주세요.`);
       return;
    }

    setIsLoading(true);

    try {
      if (selectedRole === 'teacher') {
        if (isSignUp) {
          if (secretCode !== TEACHER_SECRET_CODE) {
             throw new Error("INVALID_CODE");
          }
          if (!nickname.trim()) {
            throw new Error("EMPTY_NICKNAME");
          }
          await registerTeacher(email, nickname);
          await signUp(email, password);
        } else {
          await signIn(email, password);
        }
      } else {
        const hashedPin = await hashPin(pin);
        const success = await onStudentLogin(hashedPin);
        
        if (!success) {
          handleStudentFailure();
        } else {
          setAttempts(0);
          localStorage.removeItem('loginAttempts');
          localStorage.removeItem('lockoutUntil');
        }
      }
    } catch (err: any) {
      if (err.message === "SECURE_CONTEXT_REQUIRED") {
        setLocalError('보안 환경(HTTPS 또는 localhost)에서만 로그인이 가능합니다.');
      } else if (err.message === "EMPTY_NICKNAME") {
        setLocalError('선생님 이름(닉네임)을 입력해 주세요.');
      } else if (err.message === "INVALID_CODE") {
        setLocalError('선생님 가입 코드가 올바르지 않습니다.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setLocalError('등록되지 않은 이메일이거나 비밀번호가 올바르지 않습니다.');
      } else if (err.code === 'auth/email-already-in-use') {
        setLocalError('이미 사용 중인 이메일입니다.');
      } else if (err.code === 'auth/weak-password') {
        setLocalError('비밀번호는 6자 이상이어야 합니다.');
      } else if (err.code === 'auth/network-request-failed') {
        setLocalError('네트워크 연결을 확인해주세요.');
      } else {
        setLocalError('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLocalError(null);
    setIsLoading(true);
    try {
      const result = await signInWithGoogle();
      const email = result.user.email;
      if (!email) return;

      const isApproved = await isTeacherApproved(email);
      
      if (!isApproved) {
        setNeedsGoogleAuthCode(true);
        setTempGoogleEmail(email);
        setTempGoogleName(result.user.displayName || email.split('@')[0]);
      }
    } catch (err: any) {
      setLocalError('Google 로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

const handleVerifyGoogleCode = async () => {
    if (!tempGoogleName.trim()) {
      setLocalError('선생님 이름(닉네임)을 입력해 주세요.');
      return;
    }
    if (googleSecretCode !== TEACHER_SECRET_CODE) {
      setLocalError('선생님 가입 코드가 올바르지 않습니다.');
      return;
    }
    
    setIsLoading(true);
    try {
      // 1. DB에 선생님 계정 등록 완료
      await registerTeacher(tempGoogleEmail, tempGoogleName);
      
      // 2. 인증 입력창 닫기
      setNeedsGoogleAuthCode(false);
      
    } catch (err) {
      setLocalError('등록 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="text-indigo-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">과외 일지</h1>
          <p className="text-gray-500 text-sm mt-2 text-center">
            {selectedRole === 'teacher' 
              ? (isSignUp ? '새 선생님 계정을 생성합니다.' : '이메일/비밀번호 또는 구글 계정으로 로그인하세요.')
              : '8자리 PIN 번호를 입력하세요.'}
          </p>
        </div>

        {needsGoogleAuthCode ? (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-indigo-50 p-4 rounded-xl mb-2 text-sm text-indigo-800 text-center">
              최초 1회 선생님 인증이 필요합니다.<br/>
              <span className="font-bold">({tempGoogleEmail})</span>
            </div>
            
            <div className="relative">
              <User className="absolute left-3 top-3.5 text-gray-400" size={18} />
              <input
                type="text"
                value={tempGoogleName}
                onChange={(e) => setTempGoogleName(e.target.value)}
                placeholder="선생님 이름 (닉네임)"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                required
              />
            </div>

            <div className="relative">
              <ShieldCheck className="absolute left-3 top-3.5 text-indigo-500" size={18} />
              <input
                type="password"
                value={googleSecretCode}
                onChange={(e) => setGoogleSecretCode(e.target.value)}
                placeholder="선생님 가입 인증 코드"
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-indigo-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-bold"
              />
            </div>

            {localError && (
              <div className="flex items-center gap-2 text-red-500 text-sm font-medium animate-pulse bg-red-50 p-3 rounded-lg border border-red-100">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{localError}</span>
              </div>
            )}
            
            <div className="space-y-2 pt-2">
              <button
                onClick={handleVerifyGoogleCode}
                disabled={isLoading || !tempGoogleName.trim() || !googleSecretCode.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : '인증 완료 및 시작하기'}
              </button>
              
              <button
                type="button"
                onClick={async () => {
                  try {
                    setIsLoading(true);
                    await logOut();
                    setNeedsGoogleAuthCode(false);
                    setTempGoogleEmail('');
                    setTempGoogleName('');
                    setGoogleSecretCode('');
                  } catch (e) {
                    console.error("Cancel logout error:", e);
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
                className="w-full bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 font-bold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
              >
                가입 취소 및 로그아웃
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('student');
                  setLocalError(null);
                  setIsSignUp(false);
                }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                  selectedRole === 'student' 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <User size={16} /> 학생/학부모
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('teacher');
                  setLocalError(null);
                }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                  selectedRole === 'teacher' 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <GraduationCap size={16} /> 선생님
              </button>
            </div>

            {/* 학생 폼 */}
            <form 
              onSubmit={handleSubmit} 
              className={`space-y-4 ${selectedRole !== 'student' ? 'hidden' : ''}`}
            >
              <div className="relative">
                <KeyRound className="absolute left-3 top-3.5 text-gray-400" size={18} />
                <input
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="8자리 인증번호 (PIN)"
                  disabled={!!lockoutUntil}
                  autoComplete="one-time-code"
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all tracking-widest font-bold text-center text-lg disabled:bg-gray-100 disabled:text-gray-400"
                  required={selectedRole === 'student'}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-indigo-600 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              {localError && selectedRole === 'student' && (
                <div className="flex items-center gap-2 text-red-500 text-sm font-medium animate-pulse bg-red-50 p-3 rounded-lg border border-red-100">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{localError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || (selectedRole === 'student' && !!lockoutUntil)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    로그인 <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* 선생님 폼 */}
            <form 
              onSubmit={handleSubmit} 
              className={`space-y-4 ${selectedRole !== 'teacher' ? 'hidden' : ''}`}
            >
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 text-gray-400" size={18} />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일 주소"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  required={selectedRole === 'teacher'}
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 (6자 이상)"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  required={selectedRole === 'teacher'}
                />
              </div>
              
              {isSignUp && (
                <>
                  <div className="relative animate-in fade-in zoom-in-95 duration-200">
                    <User className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="선생님 이름 (닉네임)"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                      required={selectedRole === 'teacher' && isSignUp}
                    />
                  </div>
                  <div className="relative animate-in fade-in zoom-in-95 duration-200">
                    <ShieldCheck className="absolute left-3 top-3.5 text-indigo-500" size={18} />
                    <input
                      type="password"
                      value={secretCode}
                      onChange={(e) => setSecretCode(e.target.value)}
                      placeholder="선생님 가입 인증 코드"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-indigo-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-indigo-50/30 font-bold"
                      required={selectedRole === 'teacher' && isSignUp}
                    />
                  </div>
                </>
              )}
              
              {localError && selectedRole === 'teacher' && (
                <div className="flex items-center gap-2 text-red-500 text-sm font-medium animate-pulse bg-red-50 p-3 rounded-lg border border-red-100">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{localError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    {isSignUp ? '가입 및 선생님 등록' : '로그인'} <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {selectedRole === 'teacher' && (
              <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                 <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-400 font-medium">또는</span>
                    </div>
                 </div>
                 
                 <div className="space-y-2">
                   <button
                     type="button"
                     onClick={handleGoogleLogin}
                     disabled={isLoading}
                     className="w-full bg-white border border-gray-200 text-gray-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center justify-center gap-2"
                   >
                     {isSignUp ? 'Google 계정으로 시작하기' : 'Google 계정으로 로그인'}
                   </button>
                 </div>
              </div>
            )}
            
            {selectedRole === 'teacher' && (
              <div className="mt-6 text-center">
                <button 
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setLocalError(null);
                    setSecretCode('');
                  }}
                  className="text-sm text-gray-500 hover:text-indigo-600 font-medium underline underline-offset-2"
                >
                  {isSignUp ? '이미 계정이 있으신가요? 로그인하기' : '계정이 없으신가요? 회원가입하기'}
                </button>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <button
                type="button"
                onClick={() => navigate('/rankings')}
                className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <Trophy size={16} className="text-indigo-500" />
                과제 제출 현황 보러가기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};