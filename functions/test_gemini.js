const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyB1hfg-sOGKvMVES1j6ZJsglCdVaYyNr04";
console.log("Using API key:", GEMINI_API_KEY ? "Found" : "Missing");

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function test() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const response = await model.generateContent("Hello, say 'Gemini 2.5 Flash works!'");
    console.log("Success with gemini-2.5-flash:", response.response.text());
  } catch (err) {
    console.error("Failed with gemini-2.5-flash:", err);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const response = await model.generateContent("Hello, say 'Gemini 2.0 Flash works!'");
    console.log("Success with gemini-2.0-flash:", response.response.text());
  } catch (err) {
    console.error("Failed with gemini-2.0-flash:", err);
  }
}

test();
