const express = require('express');
const router = express.Router();
let OpenAI;
try {
  OpenAI = require('openai');
} catch (e) {
  OpenAI = null;
}

// In-memory rate limiting map: ip -> array of timestamps
const rateLimits = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

const checkRateLimit = (key) => {
  const now = Date.now();
  const history = (rateLimits.get(key) || []).filter((time) => now - time < RATE_LIMIT_WINDOW_MS);
  if (history.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  history.push(now);
  rateLimits.set(key, history);
  return true;
};

// Helper for contextual fallback description (graceful degradation)
const generateLocalContextDescription = (title) => {
  const cleanTitle = title.trim();
  return `Plan project scope, implement core requirements, and thoroughly test all deliverables for ${cleanTitle}.`;
};

// POST /api/ai/generate-description (and /ai/generate-description)
router.post('/generate-description', async (req, res) => {
  try {
    const { title } = req.body || {};

    // 1. Validation: Title must be present and non-empty
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ message: 'Task title is required' });
    }

    // 2. Validation: Title character limit (max 200 chars)
    if (title.trim().length > 200) {
      return res.status(400).json({ message: 'Task title cannot exceed 200 characters' });
    }

    // 3. Rate limiting check
    const clientKey = req.ip || req.headers['x-forwarded-for'] || 'default-client';
    if (!checkRateLimit(clientKey)) {
      return res.status(429).json({
        message: 'Rate limit exceeded: Maximum 5 AI description requests per minute. Please wait a moment before trying again.',
      });
    }

    const cleanTitle = title.trim();
    const apiKey = process.env.OPENAI_API_KEY;

    // 4. Graceful handling if API key is not configured
    if (!apiKey || apiKey.trim() === '' || apiKey === 'your_key_here' || apiKey.startsWith('sk-placeholder')) {
      return res.status(200).json({
        description: generateLocalContextDescription(cleanTitle),
        fallback: true,
        notice: 'OpenAI API key is not configured in backend/.env. Generated contextual description via local assistant.',
      });
    }

    // 5. External OpenAI API call with timeout protection
    if (!OpenAI) {
      return res.status(200).json({
        description: generateLocalContextDescription(cleanTitle),
        fallback: true,
        notice: 'OpenAI client SDK not initialized. Generated contextual description via local assistant.',
      });
    }

    const client = new OpenAI({
      apiKey,
      timeout: Number(process.env.AI_REQUEST_TIMEOUT_MS) || 6000,
    });

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a task management assistant. Given a task title, generate a clear, professional, single-paragraph action plan and task description (maximum 2-3 sentences).',
        },
        {
          role: 'user',
          content: `Write a short task description for: ${cleanTitle}`,
        },
      ],
      max_tokens: 120,
      temperature: 0.7,
    });

    const aiDescription = completion.choices?.[0]?.message?.content?.trim();

    if (!aiDescription) {
      return res.status(200).json({
        description: generateLocalContextDescription(cleanTitle),
        fallback: true,
        notice: 'Empty response received from AI model. Fallback description provided.',
      });
    }

    return res.status(200).json({
      description: aiDescription,
      fallback: false,
      provider: 'openai',
    });
  } catch (err) {
    console.error('[AI Route Error Caught - Graceful Degradation]:', err.message);

    // Graceful degradation: never crash or return 500 when third-party AI fails
    const cleanTitle = (req.body && req.body.title && req.body.title.trim()) || 'the task';
    return res.status(200).json({
      description: generateLocalContextDescription(cleanTitle),
      fallback: true,
      notice: `AI service unavailable (${err.message || 'connection failed'}). Generated contextual description via local assistant.`,
      error: err.message,
    });
  }
});

// Helper for testing to reset rate limit state
router._resetRateLimits = () => {
  rateLimits.clear();
};

module.exports = router;
