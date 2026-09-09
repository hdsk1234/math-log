const admin = require("firebase-admin");

admin.initializeApp({
  projectId: "math-log-a777e"
});

const db = admin.firestore();

async function run() {
  const querySnapshot = await db.collection("gemini_telegram_logs")
    .where("telegramMessageId", "==", 230)
    .get();

  if (querySnapshot.empty) {
    console.log("No log found for message 230");
    return;
  }

  querySnapshot.forEach(doc => {
    console.log("Document ID:", doc.id);
    console.log("Data:", JSON.stringify(doc.data(), null, 2));
  });
}

run();
