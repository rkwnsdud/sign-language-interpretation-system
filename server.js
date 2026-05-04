import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const VARCO_API_KEY = process.env.VARCO_API_KEY;

// 일단 Lite 사용
const VARCO_TTS_URL = "https://openapi.ai.nc.com/tts/lite/v1/api/synthesize";

console.log("VARCO_API_KEY loaded:", !!VARCO_API_KEY);

// 서버 기본 확인용
app.get("/", (req, res) => {
  res.send("TTS server is running");
});

// 서버 + .env 확인용
app.get("/api/test", (req, res) => {
  res.json({
    message: "server is working",
    hasApiKey: !!VARCO_API_KEY,
  });
});

// VARCO TTS 직접 테스트용
app.get("/api/tts-test", async (req, res) => {
  try {
    if (!VARCO_API_KEY) {
      return res.status(500).json({
        error: "VARCO_API_KEY가 .env에 없습니다.",
      });
    }

    const response = await fetch(VARCO_TTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        OPENAPI_KEY: VARCO_API_KEY,
      },
      body: JSON.stringify({
        text: "안녕하세요. 음성 테스트입니다.",
        language: "korean",
        voice: "멀더",
        properties: {
          speed: 1,
          pitch: 1,
        },
        return_metadata: false,
      }),
    });

    const rawText = await response.text();

    console.log("VARCO status:", response.status);
    console.log("VARCO raw response:", rawText.slice(0, 500));

    if (!response.ok) {
      return res.status(response.status).send(rawText);
    }

    const data = JSON.parse(rawText);

    res.json({
      success: true,
      keys: Object.keys(data),
      preview: rawText.slice(0, 200),
    });
  } catch (error) {
    console.error("TTS TEST ERROR:", error);

    res.status(500).json({
      error: String(error),
    });
  }
});

// 실제 HTML에서 호출하는 TTS API
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voice = "멀더", speed = 1, pitch = 1 } = req.body;

    if (!text) {
      return res.status(400).json({
        error: "text가 필요합니다.",
      });
    }

    if (!VARCO_API_KEY) {
      return res.status(500).json({
        error: "VARCO_API_KEY가 .env에 없습니다.",
      });
    }

    const response = await fetch(VARCO_TTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        OPENAPI_KEY: VARCO_API_KEY,
      },
      body: JSON.stringify({
        text,
        language: "korean",
        voice,
        properties: {
          speed,
          pitch,
        },
        return_metadata: false,
      }),
    });

    const rawText = await response.text();

    console.log("VARCO status:", response.status);
    console.log("VARCO raw response:", rawText.slice(0, 300));

    if (!response.ok) {
      return res.status(response.status).send(rawText);
    }

    const data = JSON.parse(rawText);

    const audio =
      data.audio ||
      data.audioContent ||
      data.audio_content ||
      data.result?.audio ||
      data.result?.audioContent ||
      data.result?.audio_content ||
      data.data?.audio ||
      data.data?.audioContent ||
      data.data?.audio_content;

    if (!audio) {
      return res.status(500).json({
        error: "VARCO 응답에서 audio 필드를 찾지 못했습니다.",
        keys: Object.keys(data),
        raw: data,
      });
    }

    res.json({
      audio,
    });
  } catch (err) {
    console.error("Server Error:", err);

    res.status(500).json({
      error: "서버 내부 오류",
      detail: String(err),
    });
  }
});

app.listen(3000, () => {
  console.log("TTS server running on http://localhost:3000");
});