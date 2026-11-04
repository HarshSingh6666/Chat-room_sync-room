
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

export interface MeetingMessage {
  senderName: string;
  senderRole: string;
  text: string;
  timestamp: number;
}

export interface MeetingContext {
  roomCode: string;
  participantCount: number;
  messages: MeetingMessage[];
}

// API key is read only on the backend.
const apiKey =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY;

if (!apiKey) {
  throw new Error(
    'Gemini API key missing. Add GEMINI_API_KEY to your backend .env file.'
  );
}

const ai = new GoogleGenAI({ apiKey });

// Model configuration
const MODEL = 'gemini-3.8-flash';

// Common Gemini response function
async function generateAIResponse(
  prompt: string,
  systemInstruction: string
): Promise<string> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      systemInstruction,
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  });

  const result = response.text?.trim();

  if (!result) {
    throw new Error('Gemini returned an empty response.');
  }

  return result;
}

// Format meeting messages
function formatMessages(messages: MeetingMessage[]): string {
  if (!messages.length) {
    return 'No chat messages are available yet.';
  }

  return messages
    .map((message) => {
      const time = message.timestamp
        ? new Date(message.timestamp).toLocaleString()
        : 'Unknown time';

      return `[${time}] ${message.senderName} (${message.senderRole}): ${message.text}`;
    })
    .join('\n');
}

// 1. MEETING SUMMARY
export async function summarizeMeeting(
  context: MeetingContext,
  messages: MeetingMessage[]
): Promise<string> {
  const conversation = formatMessages(messages);

  const prompt = `
Create a professional meeting summary.

Room Code: ${context?.roomCode || 'Unknown'}
Participants: ${context?.participantCount || 0}

Meeting Conversation:
${conversation}

Include the following sections:

1. Meeting Overview
2. Key Discussion Points
3. Important Decisions
4. Action Items
5. Pending Questions
6. Conclusion

Important:
- Use only information available in the conversation.
- Do not invent decisions or action items.
- If information is missing, mention that clearly.
- Keep the summary clear and professional.
`;

  return generateAIResponse(
    prompt,
    'You are a professional meeting assistant who creates accurate meeting summaries.'
  );
}

// 2. SMART REPLIES
export async function generateSmartReplies(
  messages: MeetingMessage[]
): Promise<string[]> {
  const conversation = formatMessages(messages);

  const prompt = `
Based on this meeting conversation, suggest exactly 3 short and useful chat replies.

Conversation:
${conversation}

Return only a JSON array of 3 strings.

Example:
["I agree with this approach.", "Let's discuss this further.", "I will take care of this."]
`;

  const result = await generateAIResponse(
    prompt,
    'You generate relevant, natural and professional meeting chat replies.'
  );

  try {
    const cleaned = result
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    if (
      Array.isArray(parsed) &&
      parsed.every((item) => typeof item === 'string')
    ) {
      return parsed.slice(0, 3);
    }
  } catch (error) {
    console.error('Smart reply parsing error:', error);
  }

  return result
    .split('\n')
    .map((line) => line.replace(/^\d+[\).\s-]*/, '').trim())
    .filter(Boolean)
    .slice(0, 3);
}

// 3. TRANSLATOR
export async function translateText(
  text: string,
  targetLanguage: string
): Promise<string> {
  if (!text.trim()) {
    throw new Error('Text cannot be empty.');
  }

  if (!targetLanguage?.trim()) {
    throw new Error('Target language is required.');
  }

  const prompt = `
Translate the following text into ${targetLanguage}.

Text:
${text}

Instructions:
- Preserve the original meaning.
- Use natural and grammatically correct language.
- Do not add explanations.
- Return only the translated text.
`;

  return generateAIResponse(
    prompt,
    'You are an accurate professional translator.'
  );
}

// 4. ASK AI CO-HOST
export async function askMeetingAssistant(
  question: string,
  messages: MeetingMessage[]
): Promise<string> {
  const conversation = formatMessages(messages);

  const prompt = `
You are an AI Co-Host helping participants during a live meeting.

Meeting Conversation:
${conversation}

Participant Question:
${question}

Instructions:
- Answer clearly and helpfully.
- Use the meeting conversation when relevant.
- If the answer is not available in the conversation, say so.
- Do not invent meeting decisions or participant statements.
- You may also answer general knowledge questions.
- Keep answers easy to understand.
`;

  return generateAIResponse(
    prompt,
    'You are a helpful, professional AI meeting co-host.'
  );
}
