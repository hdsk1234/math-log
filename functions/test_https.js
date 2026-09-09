const https = require("https");

const GEMINI_API_KEY = "AIzaSyB1hfg-sOGKvMVES1j6ZJsglCdVaYyNr04";

function testModel(modelName) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      contents: [{ parts: [{ text: "Hello" }] }]
    });

    const options = {
      hostname: "generativelanguage.googleapis.com",
      port: 443,
      path: `/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => {
        resolve({
          model: modelName,
          statusCode: res.statusCode,
          body: body
        });
      });
    });

    req.on("error", (e) => {
      resolve({
        model: modelName,
        error: e.message
      });
    });

    req.write(data);
    req.end();
  });
}

async function run() {
  const models = [
    "gemini-1.5-flash",
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash-lite",
    "gemini-3.5-flash"
  ];
  for (const model of models) {
    const res = await testModel(model);
    console.log(`Model: ${res.model}`);
    console.log(`Status Code: ${res.statusCode}`);
    if (res.error) {
      console.log(`Error: ${res.error}`);
    } else {
      console.log(`Response Snippet: ${res.body.substring(0, 300)}`);
    }
    console.log("-----------------------------------------");
  }
}

run();
