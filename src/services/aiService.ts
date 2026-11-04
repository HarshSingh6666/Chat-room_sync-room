export interface MeetingContext {
  roomCode: string;
  participantCount: number;
  messages: Array<{
    senderName: string;
    senderRole: string;
    text: string;
    timestamp: number;
  }>;
}

function extractResultString(raw: any, fallback = ''): string {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && typeof raw.result === 'string') return raw.result;
  if (raw != null && typeof raw !== 'object') return String(raw);
  return fallback;
}

export async function generateMeetingSummary(
  context: MeetingContext
): Promise<string> {
  const res = await fetch('/api/ai/meeting-assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task: 'summarize',
      context,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate meeting summary.');
  }

  const data = await res.json();
  return extractResultString(data.result, 'No summary generated.');
}

export async function fetchSmartReplies(
  context: MeetingContext
): Promise<string[]> {
  try {
    const res = await fetch('/api/ai/meeting-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'smart-reply',
        context,
      }),
    });

    if (!res.ok) return ['Sounds good!', 'Understood', 'I will check on that.'];
    const data = await res.json();
    return Array.isArray(data.replies) ? data.replies : [];
  } catch {
    return ['Sounds good!', 'Understood', 'I will check on that.'];
  }
}

export async function askAiAssistant(
  prompt: string,
  context: MeetingContext
): Promise<string> {
  const res = await fetch('/api/ai/meeting-assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task: 'ask-ai',
      prompt,
      context,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to communicate with AI Assistant.');
  }

  const data = await res.json();
  return extractResultString(data.result, 'No response generated.');
}

export async function translateTextMessage(
  text: string,
  targetLanguage: string
): Promise<string> {
  const res = await fetch('/api/ai/meeting-assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task: 'translate',
      prompt: text,
      targetLanguage,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to translate message.');
  }

  const data = await res.json();
  return extractResultString(data.result, text);
}
