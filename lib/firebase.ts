
// @ts-ignore
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// ------------------------------------------------------------------
// [중요] Firebase 콘솔에서 발급받은 실제 설정값으로 아래 내용을 교체하세요.
// 1. https://console.firebase.google.com/ 접속
// 2. 프로젝트 설정(톱니바퀴) -> 일반 -> 내 앱 -> SDK 설정 및 구성
// 3. firebaseConfig 객체 내용을 복사하여 아래에 붙여넣기
// ------------------------------------------------------------------

const firebaseConfig = {
  apiKey: "AIzaSyBrQEDCQ571qkU4nleIa5qJ5gIyvkmcZxw",
  authDomain: "math-log-a777e.firebaseapp.com",
  projectId: "math-log-a777e",
  storageBucket: "math-log-a777e.firebasestorage.app",
  messagingSenderId: "696361548700",
  appId: "1:696361548700:web:0d51f9ef38f961172ba659",
  measurementId: "G-9S8G4QTSWX"
};

// Initialize Firebase (Check if already initialized to prevent errors in development)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
