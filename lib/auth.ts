
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User 
} from "firebase/auth";
import { auth } from "./firebase";

// 인증 상태 변경 구독
export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
};

// 회원가입
export const signUp = async (email: string, pass: string) => {
  return createUserWithEmailAndPassword(auth, email, pass);
};

// 로그인 (이메일)
export const signIn = async (email: string, pass: string) => {
  return signInWithEmailAndPassword(auth, email, pass);
};

// 로그인 (구글)
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

// 로그아웃
export const logOut = async () => {
  return signOut(auth);
};

// PIN 번호 해싱 (SHA-256)
export const hashPin = async (pin: string): Promise<string> => {
  // Mobile/Dev Environment Check:
  // crypto.subtle is ONLY available in Secure Contexts (HTTPS or localhost).
  // If testing on mobile via local IP (HTTP), this will be undefined.
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error("SECURE_CONTEXT_REQUIRED");
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};
