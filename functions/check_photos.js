const admin = require("firebase-admin");

// 로컬 환경의 gcloud/firebase 자격 증명을 활용해 math-log-a777e 데이터베이스 조회
admin.initializeApp({
  projectId: "math-log-a777e"
});

const db = admin.firestore();

async function check() {
  console.log("=== Checking telegram_photos collection ===");
  try {
    const snapshot = await db.collection("telegram_photos").get();
    console.log(`Total documents found: ${snapshot.size}`);
    snapshot.forEach(doc => {
      console.log(doc.id, "=>", doc.data());
    });
  } catch (err) {
    console.error("Error reading Firestore:", err);
  }
}

check();
