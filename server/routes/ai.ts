
import { Router, Request, Response } from 'express';
import {
  summarizeMeeting,
  generateSmartReplies,
  translateText,
  askMeetingAssistant,
} from '../services/gemini';

export const aiRouter = Router();

aiRouter.post('/meeting-assistant', async (req: Request, res: Response) => {
  const { task, context, prompt, targetLanguage } = req.body;

  if (!task) {
    return res.status(400).json({
      error: 'Missing AI task',
    });
  }

  const messages = Array.isArray(context?.messages)
    ? context.messages
    : Array.isArray((req.body as any).messages)
    ? (req.body as any).messages
    : [];

  try {
    // MEETING SUMMARY
    if (task === 'summarize') {
      const result = await summarizeMeeting(context, messages);
      return res.json({ result });
    }

    // SMART REPLIES
    if (task === 'smart-reply') {
      const replies = await generateSmartReplies(messages);
      return res.json({ replies });
    }

    // TRANSLATOR
    if (task === 'translate') {
      const textToTranslate = String(prompt || '');

      if (!textToTranslate.trim()) {
        return res.status(400).json({
          error: 'Missing text to translate',
        });
      }

      if (!targetLanguage) {
        return res.status(400).json({
          error: 'Missing target language',
        });
      }

      const translation = await translateText(
        textToTranslate,
        targetLanguage
      );

      return res.json({ result: translation });
    }

    // AI CO-HOST
    if (task === 'ask-ai') {
      if (!String(prompt || '').trim()) {
        return res.status(400).json({
          error: 'Missing question',
        });
      }

      const answer = await askMeetingAssistant(
        String(prompt),
        messages
      );

      return res.json({ result: answer });
    }

    return res.status(400).json({
      error: 'Unknown AI task requested.',
    });

  } catch (error: any) {
    console.error('Server AI Error:', error);

    return res.status(500).json({
      error: error.message || 'Failed to process AI request',
    });
  }
});
