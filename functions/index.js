const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();
const db = admin.firestore();

// 텔레그램 설정 상숫값
const TELEGRAM_BOT_TOKEN = "8841554005:AAFet5p8Bsjx0C5SPEu2aPkQLOTozw_2JHw";

// 텔레그램 주제(Topics) 스레드 ID 정의
const TOPIC_IDS = {
  WAKE_UP: 7,       // 기상인증 주제 ID
  PROBLEM_30: 38,    // 30문제 주제 ID
  EXPLANATION: 4    // 해설 주제 ID
};

/**
 * 텔레그램 사진을 Firebase Storage에 저장하고 Firestore에 메타데이터 기록
 * 저장 경로: [학생이름]/[YYYY-MM-DD]/[과제유형]/[메시지ID]_[fileId].jpg
 */
async function saveTelegramPhotoToStorage({ photoArray, senderName, dateStr, taskType, messageId, studentId }) {
  try {
    if (!photoArray || photoArray.length === 0) return null;
    const largestPhoto = photoArray[photoArray.length - 1];
    const fileId = largestPhoto.file_id;

    // 1. Telegram getFile API 호출
    const getFileUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`;
    const fileRes = await axios.get(getFileUrl);
    if (!fileRes.data || !fileRes.data.ok) {
      functions.logger.error("Failed to get Telegram file info", fileRes.data);
      return null;
    }
    const filePath = fileRes.data.result.file_path;

    // 2. Telegram 이미지 다운로드
    const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
    const imageRes = await axios.get(downloadUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(imageRes.data);

    // 3. Storage 업로드 (학생 이름 / YYYY-MM-DD / 과제유형 / 메시지ID_fileId.jpg)
    const bucket = admin.storage().bucket();
    const extension = filePath.split('.').pop() || 'jpg';
    const storagePath = `${senderName}/${dateStr}/${taskType}/${messageId}_${fileId}.${extension}`;
    const file = bucket.file(storagePath);

    await file.save(buffer, {
      metadata: {
        contentType: `image/${extension === 'png' ? 'png' : 'jpeg'}`
      }
    });

    const encodedPath = encodeURIComponent(storagePath);
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media`;

    // 4. Firestore gemini_analyses 컬렉션 기록 (기존 인증 이미지 탭 쿼리 호환)
    await db.collection("gemini_analyses").add({
      studentId: studentId || "",
      senderName: senderName,
      dateStr: dateStr,
      taskType: taskType,
      imageUrl: publicUrl,
      storagePath: storagePath,
      analysisResult: `${taskType === 'wake_up' ? '기상인증' : taskType === 'problem_30' ? '30문제' : '해설'} 인증 완료`,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    functions.logger.info(`Photo saved successfully to storage: ${storagePath}`);
    return publicUrl;
  } catch (err) {
    functions.logger.error("Error saving Telegram photo to storage:", err);
    return null;
  }
}

/**
 * KST(한국 표준시) 기준으로 연, 월, 일, 시, 분, 초 및 포맷팅된 문자열을 구합니다.
 */
function getKSTInfo(unixTimestamp) {
  const dateObj = unixTimestamp ? new Date(unixTimestamp * 1000) : new Date();
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const parts = formatter.formatToParts(dateObj);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  const hour = parseInt(parts.find(p => p.type === 'hour').value, 10);
  const minute = parseInt(parts.find(p => p.type === 'minute').value, 10);
  const second = parseInt(parts.find(p => p.type === 'second').value, 10);

  const dateStr = `${year}-${month}-${day}`; // YYYY-MM-DD
  const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
  return { year, month, day, hour, minute, second, dateStr, timeStr };
}

/**
 * 학생 이름으로 Firestore의 students 컬렉션에서 문서를 조회합니다.
 */
async function findStudentIdAndData(senderName) {
  const studentQuery = await db.collection("students").get();
  let matchedId = null;
  let matchedData = null;
  studentQuery.forEach(docSnap => {
    const profile = docSnap.data().profile || {};
    if (profile.name === senderName) {
      matchedId = docSnap.id;
      matchedData = docSnap.data();
    }
  });
  return { id: matchedId, data: matchedData };
}

// 1. 텔레그램 웹훅 트리거 API (실시간 수신 및 모든 유형의 웹훅 결과를 무조건 텔레그램 로그 컬렉션에 적재)
exports.telegramWebhook = functions.runWith({
  timeoutSeconds: 120,
  memory: "512MB"
}).https.onRequest(async (req, res) => {
  // 모든 실행 경로에서 종합 로그를 작성하기 위한 객체 선언
  let logData = {
    studentName: "Unknown",
    taskType: "unknown",
    dateStr: "",
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    analyzedCount: 0,
    isTest: false,
    status: "ignored", // success, failed, ignored, error
    rawResponse: "",
    telegramMessageId: 0,
    threadId: null,
    text: ""
  };

  try {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const update = req.body;
    functions.logger.info("Telegram Update Received:", update);

    const message = update.message;
    if (!message) {
      res.status(200).send("No message found");
      return;
    }

    const text = message.text || message.caption || "";
    const photo = message.photo;
    const threadId = message.message_thread_id;

    // 로그 객체에 기본 정보 세팅
    logData.telegramMessageId = message.message_id;
    logData.threadId = threadId || null;
    logData.text = text.substring(0, 500); // 텍스트 500자 제한하여 기록

    // 1-1. 보낸 사람 이름 및 테스트 모드 파싱
    let senderName = "";
    if (message.from.last_name && message.from.first_name) {
      senderName = `${message.from.last_name}${message.from.first_name}`.trim();
    } else {
      senderName = message.from.first_name || message.from.last_name || message.from.username || "Unknown";
    }
    logData.studentName = senderName;

    const mediaGroupId = message.media_group_id;
    let isTest = false;
    const testMatch = text.match(/\[test,\s*([^\]]+)\]\s*(.*)/);
    if (testMatch) {
      senderName = testMatch[1].trim();
      isTest = true;
      logData.studentName = senderName;
      logData.isTest = true;
      if (mediaGroupId) {
        await db.collection("media_group_tests").doc(mediaGroupId).set({
          senderName,
          isTest: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    } else if (mediaGroupId) {
      const mediaGroupDoc = await db.collection("media_group_tests").doc(mediaGroupId).get();
      if (mediaGroupDoc.exists) {
        const cached = mediaGroupDoc.data();
        senderName = cached.senderName;
        isTest = cached.isTest;
        logData.studentName = senderName;
        logData.isTest = isTest;
      }
    }

    // 1-2. KST 기준 시각 분석 및 포맷팅
    const { hour, minute, dateStr } = getKSTInfo(message.date);
    logData.dateStr = dateStr;

    // 1-3. 스레드(주제)별 처리 분기
    if (threadId === TOPIC_IDS.WAKE_UP) {
      logData.taskType = "wake_up";

      // A. 기상인증 처리 (오전 06시 30분 이전에 메시지를 보낸 사람 성공, 테스트 시 조건 우회)
      const isWakeUpSuccess = isTest || hour < 6 || (hour === 6 && minute <= 30);
      if (isWakeUpSuccess) {
        const { id: studentId, data: studentData } = await findStudentIdAndData(senderName);
        if (studentId && studentData) {
          let homework = studentData.homework || [];
          let dayRecord = homework.find(h => h.date === dateStr);
          if (!dayRecord) {
            dayRecord = {
              date: dateStr,
              tasks: [{ type: "wake_up", completed: true }]
            };
            homework.push(dayRecord);
          } else {
            let task = dayRecord.tasks.find(t => t.type === "wake_up");
            if (task) {
              task.completed = true;
            } else {
              dayRecord.tasks.push({ type: "wake_up", completed: true });
            }
          }
          homework.sort((a, b) => a.date.localeCompare(b.date));
          await db.collection("students").doc(studentId).update({ homework });
          functions.logger.info(`Wake-up success recorded for ${senderName} on ${dateStr}`);

          // 기상 인증 사진이 있을 경우 Firebase Storage 및 Firestore 저장
          if (photo && photo.length > 0) {
            await saveTelegramPhotoToStorage({
              photoArray: photo,
              senderName,
              dateStr,
              taskType: "wake_up",
              messageId: message.message_id,
              studentId
            });
          }

          logData.status = "success";
          logData.analyzedCount = 1;
          logData.rawResponse = "Wakeup success recorded in daily homework";
        } else {
          functions.logger.warn(`Wake-up: Student ${senderName} not found in database.`);
          logData.status = "ignored";
          logData.rawResponse = "Wakeup message ignored: Student not found in database";
        }
      } else {
        logData.status = "ignored";
        logData.rawResponse = `Wakeup time expired (${hour}:${minute} KST)`;
      }

      // 최종 로그 적재 후 응답
      await db.collection("gemini_telegram_logs").add(logData);
      res.status(200).send("Wakeup Handled");
      return;

    } else if (threadId === TOPIC_IDS.PROBLEM_30 || threadId === TOPIC_IDS.EXPLANATION) {
      const taskType = threadId === TOPIC_IDS.PROBLEM_30 ? "problem_30" : "explanation";
      logData.taskType = taskType;

      // A. 보낸 사람이 데이터베이스에 존재하는 학생인지 먼저 검증 (단, 테스트 모드일 경우 패스하여 로그를 적재하도록 조치)
      const { id: studentId, data: studentData } = await findStudentIdAndData(senderName);
      if (!isTest && (!studentId || !studentData)) {
        functions.logger.info(`Ignored submission: Sender ${senderName} is not a registered student.`);
        logData.status = "ignored";
        logData.rawResponse = `Ignored: Sender "${senderName}" is not a registered student.`;
        await db.collection("gemini_telegram_logs").add(logData);
        res.status(200).send("Ignored sender (not a registered student)");
        return;
      }

      // B. 30문제, 해설 제출 차단 조건 검사 (00시 01분 ~ 06시 30분 제출 불가, 테스트 시 우회)
      const isForbiddenTime = !isTest && ((hour === 0 && minute >= 1) || (hour > 0 && hour < 6) || (hour === 6 && minute <= 30));
      if (isForbiddenTime) {
        functions.logger.info(`Submission rejected: Forbidden time (${hour}:${minute}) for ${senderName} (${taskType})`);
        logData.status = "ignored";
        logData.rawResponse = `Forbidden KST time (${hour}:${minute}) submission.`;
        await db.collection("gemini_telegram_logs").add(logData);
        res.status(200).send("Submission forbidden during 00:01 ~ 06:30 KST");
        return;
      }

      // C. 1장 이상의 사진 확인
      if (!photo || photo.length === 0) {
        functions.logger.info(`Submission ignored: No photo found for ${senderName} (${taskType})`);
        logData.status = "ignored";
        logData.rawResponse = "No photo attached to the message.";
        await db.collection("gemini_telegram_logs").add(logData);
        res.status(200).send("No photo attached");
        return;
      }

      // D. Firebase Storage 및 Firestore gemini_analyses 저장
      await saveTelegramPhotoToStorage({
        photoArray: photo,
        senderName,
        dateStr,
        taskType,
        messageId: message.message_id,
        studentId
      });

      // E. 사진 제출 확인 시 완료 처리 (자동 누적 방식 제거, 웹 UI에서 직접 수정 가능)
      let status = "success";
      let rawResponse = taskType === "problem_30" ? "30문제 제출 완료 처리됨" : "해설 제출 완료 처리됨";

      // F. 학생의 dailyhomework 제출 완료 처리
      if (studentId && studentData) {
        let homework = studentData.homework || [];
        let dayRecord = homework.find(h => h.date === dateStr);

        if (!dayRecord) {
          dayRecord = {
            date: dateStr,
            tasks: [{ type: taskType, completed: true, count: 1 }]
          };
          homework.push(dayRecord);
        } else {
          let task = dayRecord.tasks.find(t => t.type === taskType);
          if (task) {
            task.completed = true;
            if (!task.count || task.count < 1) {
              task.count = 1;
            }
          } else {
            dayRecord.tasks.push({ type: taskType, completed: true, count: 1 });
          }
        }
        homework.sort((a, b) => a.date.localeCompare(b.date));
        await db.collection("students").doc(studentId).update({ homework });
        functions.logger.info(`Real-time task ${taskType} marked completed for ${senderName} on ${dateStr}`);
      } else {
        functions.logger.warn(`Task ${taskType}: DB update skipped (test mode non-registered student ${senderName}).`);
      }

      // G. 분석 로그 기록 저장 (Firestore 신설 컬렉션)
      logData.status = status;
      logData.analyzedCount = 1;
      logData.rawResponse = rawResponse;
      await db.collection("gemini_telegram_logs").add(logData);

      res.status(200).send("Success");
      return;
    } else {
      functions.logger.info(`Ignored thread topic: ${threadId}`);
      logData.status = "ignored";
      logData.rawResponse = `Ignored: thread ID #${threadId} is not configured for homework topic.`;
      await db.collection("gemini_telegram_logs").add(logData);
      res.status(200).send("Ignored Topic");
      return;
    }

  } catch (error) {
    functions.logger.error("Telegram Webhook Error:", error);
    logData.status = "error";
    logData.rawResponse = `Webhook Error: ${error.stack || error.message}`;
    await db.collection("gemini_telegram_logs").add(logData);
    res.status(500).send("Internal Server Error");
  }
});
