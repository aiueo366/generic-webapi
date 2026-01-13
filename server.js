const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Node18未満対策（既にある場合は不要）
const fetch = global.fetch || require('node-fetch');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static('public'));

// ==============================
// LLM Configuration
// ==============================

// 'openai' or 'gemini'
const PROVIDER = 'openai';

// OpenAI: 'gpt-4o-mini'
// Gemini: 'gemini-2.5-flash'
const MODEL = 'gpt-4o-mini';

// ==============================
// Prompt Template
// ==============================

let promptTemplate;
try {
  promptTemplate = fs.readFileSync('prompt.md', 'utf8');
} catch (error) {
  console.error('Error reading prompt.md:', error);
  process.exit(1);
}

// ==============================
// API Endpoints
// ==============================

// 音楽特徴量 → ビジュアルパラメータ
app.post('/api/visual-params', async (req, res) => {
  try {
    const audioFeatures = req.body;

    let finalPrompt = promptTemplate;

    // prompt.md 内の ${key} を audioFeatures で置換
    for (const [key, value] of Object.entries(audioFeatures)) {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      finalPrompt = finalPrompt.replace(regex, value);
    }

    let visualParams;
    if (PROVIDER === 'openai') {
      visualParams = await callOpenAI(finalPrompt);
    } else if (PROVIDER === 'gemini') {
      visualParams = await callGemini(finalPrompt);
    } else {
      return res.status(400).json({ error: 'Invalid provider configuration' });
    }

    res.json(visualParams);

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==============================
// OpenAI
// ==============================

const OPENAI_API_ENDPOINT = 'https://openai-api-proxy-746164391621.us-west1.run.app';

async function callOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  const response = await fetch(OPENAI_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: prompt }
      ],
      max_completion_tokens: 1000,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API error');
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

// ==============================
// Gemini
// ==============================

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const response = await fetch(
    `${GEMINI_API_BASE_URL}${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          maxOutputTokens: 1000,
          response_mime_type: "application/json"
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Gemini API error');
  }

  const data = await response.json();
  return JSON.parse(data.candidates[0].content.parts[0].text);
}

// ==============================
// Server Start
// ==============================

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`LLM Provider: ${PROVIDER}`);
  console.log(`Model: ${MODEL}`);
});


//音声解析API
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

app.post('/api/analyze-audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    // 🔹 ダミー音声特徴量
    const audioFeatures = {
      bpm: 80 + Math.floor(Math.random() * 80),          // 80–160
      energy: Math.random(),                             // 0–1
      brightness: Math.random(),
      mood: ['calm', 'uplifting', 'dark', 'aggressive'][Math.floor(Math.random() * 4)],
      dynamics: Math.random(),
      rhythmComplexity: Math.random()
    };

    console.log('Dummy audioFeatures:', audioFeatures);

    res.json(audioFeatures);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Audio analysis failed' });
  }
});

