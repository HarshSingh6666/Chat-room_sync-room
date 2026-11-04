import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

export const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
].filter(Boolean) as string[];

export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = 15000
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error('AI request timeout')),
          timeoutMs
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function callGemini(params: {
  contents: string;
  config?: any;
  timeoutMs?: number;
}): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        }),
        params.timeoutMs || 15000
      );

      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn(`Gemini model ${model} failed (${err.status || err.message}). Trying next candidate...`);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini models failed');
}

export async function summarizeMeeting(context: any, messages: any[]): Promise<string> {
  const messagesText = messages
    .map(
      (message: any) =>
        `[${message.senderRole || 'guest'}] ${
          message.senderName || 'Participant'
        }: ${message.text || ''}`
    )
    .join('\n');

  const systemInstruction = `
You are SyncRoom AI Meeting Copilot.
Create concise, professional meeting notes in Markdown.

Include:
1. Executive Summary (2-3 sentences)
2. Key Discussion Points (bullets)
3. Action Items & Next Steps (checkboxes and owners when known)
4. AI Recommendations (1-2 tips)

Do not invent decisions or action owners.
Clearly distinguish missing information.
`;

  try {
    const text = await callGemini({
      contents: `
Meeting Code: ${context?.roomCode || 'N/A'}
Participants: ${context?.participantCount ?? 'Unknown'}

Chat Transcript:
${messagesText || 'No chat messages yet.'}

Generate structured meeting notes.
`,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    if (text) {
      return text;
    }
  } catch (error) {
    console.warn('Gemini summarize fallback:', error);
  }

  return `### 📌 Executive Summary
Meeting session for room **${context?.roomCode || 'SyncRoom'}**.
There are ${context?.participantCount ?? 1} participant(s) and ${messages.length} chat message(s).

### 🎯 Key Discussion Points
- Review the meeting transcript and shared updates.
- Confirm decisions made during the session.

### ⚡ Action Items & Next Steps
- [ ] Review meeting notes.
- [ ] Confirm outstanding tasks and their owners.
- [ ] Follow up on unresolved topics.

### 💡 AI Recommendations
- Record decisions and assign owners to action items.
`;
}

export async function generateSmartReplies(messages: any[]): Promise<string[]> {
  const lastMessages = messages
    .slice(-5)
    .map(
      (message: any) =>
        `${message.senderName || 'Participant'}: ${message.text || ''}`
    )
    .join('\n');

  try {
    const text = await callGemini({
      contents: `Recent conversation:
${lastMessages || 'No recent messages.'}

Suggest three short, relevant replies to the conversation.`,
      config: {
        systemInstruction: `You are an AI meeting assistant.
Return ONLY a valid JSON array containing exactly 3 professional reply strings, each 2-6 words. No markdown formatting.`,
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    if (text) {
      let clean = text.trim();
      if (clean.startsWith('```')) {
        clean = clean.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      }
      const replies = JSON.parse(clean);

      if (
        Array.isArray(replies) &&
        replies.length === 3 &&
        replies.every((reply) => typeof reply === 'string')
      ) {
        return replies;
      }
    }
  } catch (error) {
    console.warn('Gemini smart-reply fallback:', error);
  }

  return [
    'Sounds good to me!',
    'Let us review that next.',
    'I will follow up on this.',
  ];
}

export async function translateText(
  prompt: string,
  targetLanguage: string
): Promise<string> {
  const textToTranslate = String(prompt || '');
  const lang = String(targetLanguage || 'Spanish');

  try {
    const text = await callGemini({
      contents: `Translate the following text into ${lang}:\n\n${textToTranslate}`,
      config: {
        systemInstruction: `You are a professional translator. Translate the input text accurately into ${lang}.
Return ONLY the direct translated text. Do not provide notes, explanations, pronunciation guides, or multiple choices.`,
        temperature: 0.3,
      },
    });

    if (text?.trim()) {
      return text.trim();
    }
  } catch (error) {
    console.warn('Gemini translation fallback:', error);
  }

  return `[${lang}] ${textToTranslate}`;
}

export async function askMeetingAssistant(
  prompt: string,
  messages: any[]
): Promise<string> {
  const messagesText = messages
    .slice(-10)
    .map(
      (message: any) =>
        `[${message.senderRole || 'guest'}] ${
          message.senderName || 'Participant'
        }: ${message.text || ''}`
    )
    .join('\n');

  try {
    const text = await callGemini({
      contents: `Recent meeting chat:
${messagesText || 'No recent chat messages.'}

User question:
${String(prompt)}
`,
      config: {
        systemInstruction: `You are SyncRoom's intelligent in-meeting AI co-host.
Be helpful, concise, articulate, and direct.
Use no more than 2-3 short paragraphs or bullet points.
If the question is about the meeting, use the provided chat context. If it's a general question, answer accurately.`,
        temperature: 0.7,
      },
    });

    if (text?.trim()) {
      return text.trim();
    }
  } catch (error) {
    console.warn('Gemini ask-ai fallback:', error);
  }

  return 'The AI service is currently unavailable. Please try again shortly.';
}
