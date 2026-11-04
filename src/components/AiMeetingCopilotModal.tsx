import React, { useState } from 'react';
import {
  Sparkles,
  X,
  FileText,
  MessageSquare,
  Globe,
  Copy,
  Check,
  Send,
  Loader2,
  ListTodo,
  Bot,
  ArrowRight,
} from 'lucide-react';
import {
  generateMeetingSummary,
  askAiAssistant,
  translateTextMessage,
  MeetingContext,
} from '../services/aiService';

interface AiMeetingCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: MeetingContext;
  onSendChatMessage: (text: string) => void;
}

export const AiMeetingCopilotModal: React.FC<AiMeetingCopilotModalProps> = ({
  isOpen,
  onClose,
  context,
  onSendChatMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'ask' | 'translate'>('summary');

  // Summary state
  const [summary, setSummary] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Ask AI state
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswers, setAiAnswers] = useState<
    Array<{ q: string; a: string; timestamp: number }>
  >([]);
  const [isAskingAi, setIsAskingAi] = useState(false);

  // Translation state
  const [textToTranslate, setTextToTranslate] = useState('');
  const [targetLang, setTargetLang] = useState('Spanish');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  if (!isOpen) return null;

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const result = await generateMeetingSummary(context);
      setSummary(result);
    } catch (err: any) {
      setSummary(`Error generating summary: ${err.message}`);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(summary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleAskAi = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiQuestion.trim() || isAskingAi) return;

    const q = aiQuestion;
    setAiQuestion('');
    setIsAskingAi(true);

    try {
      const a = await askAiAssistant(q, context);
      setAiAnswers((prev) => [...prev, { q, a, timestamp: Date.now() }]);
    } catch (err: any) {
      setAiAnswers((prev) => [
        ...prev,
        { q, a: `Sorry, could not answer: ${err.message}`, timestamp: Date.now() },
      ]);
    } finally {
      setIsAskingAi(false);
    }
  };

  const handleTranslate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textToTranslate.trim() || isTranslating) return;

    setIsTranslating(true);
    try {
      const res = await translateTextMessage(textToTranslate, targetLang);
      setTranslatedText(res);
    } catch (err: any) {
      setTranslatedText(`Translation error: ${err.message}`);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full h-[85vh] flex flex-col shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">SyncRoom AI Copilot</h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Powered by Gemini 2.5 Flash
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Live meeting intelligence, summaries, Q&amp;A, and real-time translation
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'summary'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>AI Meeting Summary &amp; Action Items</span>
          </button>

          <button
            onClick={() => setActiveTab('ask')}
            className={`py-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'ask'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Ask AI Co-Host</span>
          </button>

          <button
            onClick={() => setActiveTab('translate')}
            className={`py-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'translate'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>AI Live Translator</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-5 overflow-y-auto">
          {/* TAB 1: SUMMARY & ACTION ITEMS */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <ListTodo className="w-4 h-4 text-indigo-400" />
                    <span>Executive Meeting Summary &amp; Tasks</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Analyzes current participant count ({context.participantCount}) and{' '}
                    {context.messages.length} chat message(s).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {summary && (
                    <button
                      onClick={handleCopySummary}
                      className="text-xs px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 transition"
                    >
                      {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSummary ? 'Copied' : 'Copy Notes'}</span>
                    </button>
                  )}
                  <button
                    onClick={handleGenerateSummary}
                    disabled={isGeneratingSummary}
                    className="text-xs px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-60 transition"
                  >
                    {isGeneratingSummary ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Analyzing with Gemini...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate Notes Now</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {summary ? (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line shadow-inner">
                  {summary}
                </div>
              ) : (
                <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-2xl p-10 text-center text-slate-500 space-y-2">
                  <FileText className="w-10 h-10 mx-auto text-slate-700" />
                  <p className="text-xs font-semibold text-slate-400">No notes generated yet</p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Click "Generate Notes Now" to let Gemini summarize the meeting discussion, outline key decisions, and compile action items.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ASK AI CO-HOST */}
          {activeTab === 'ask' && (
            <div className="flex flex-col h-full space-y-4">
              <div className="flex-1 space-y-3 overflow-y-auto">
                {aiAnswers.length === 0 ? (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 space-y-3">
                    <Bot className="w-10 h-10 mx-auto text-indigo-400" />
                    <div>
                      <h4 className="text-sm font-bold text-white">Ask your Meeting AI Co-Host</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        Ask any question about the ongoing conversation, request draft emails, or ask for clarifications.
                      </p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-2 pt-2">
                      {[
                        'Summarize the decisions made so far',
                        'Draft an email follow-up for participants',
                        'Suggest 3 follow-up agenda items',
                      ].map((promptText) => (
                        <button
                          key={promptText}
                          onClick={() => {
                            setAiQuestion(promptText);
                          }}
                          className="text-[11px] px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-indigo-500/20 transition text-left"
                        >
                          &ldquo;{promptText}&rdquo;
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  aiAnswers.map((item, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                        <span className="w-5 h-5 rounded-full bg-indigo-900/50 flex items-center justify-center text-[10px]">
                          Q
                        </span>
                        <span>{item.q}</span>
                      </div>
                      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-200 whitespace-pre-line">
                        {item.a}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input Form */}
              <form onSubmit={handleAskAi} className="flex gap-2 pt-2 border-t border-slate-800 shrink-0">
                <input
                  type="text"
                  placeholder="Ask AI anything about this meeting..."
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!aiQuestion.trim() || isAskingAi}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2"
                >
                  {isAskingAi ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Ask AI</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: AI LIVE TRANSLATOR */}
          {activeTab === 'translate' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-indigo-400" />
                  <span>Real-Time Message Translation</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Translate messages to communicate effortlessly with international guests.
                </p>
              </div>

              <form onSubmit={handleTranslate} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Message to Translate:
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Type or paste a message from chat..."
                      value={textToTranslate}
                      onChange={(e) => setTextToTranslate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Target Language:
                    </label>
                    <select
                      value={targetLang}
                      onChange={(e) => setTargetLang(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="German">German</option>
                      <option value="Japanese">Japanese</option>
                      <option value="Chinese (Mandarin)">Chinese (Mandarin)</option>
                      <option value="Portuguese">Portuguese</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Arabic">Arabic</option>
                    </select>

                    <button
                      type="submit"
                      disabled={!textToTranslate.trim() || isTranslating}
                      className="w-full mt-3 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      {isTranslating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>Translate</span>
                    </button>
                  </div>
                </div>
              </form>

              {translatedText && (
                <div className="bg-slate-950 border border-indigo-500/30 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-indigo-300 font-semibold">
                    <span>Translated Output ({targetLang}):</span>
                    <button
                      onClick={() => onSendChatMessage(`[Translated ${targetLang}]: ${translatedText}`)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-white border border-indigo-500/40 transition flex items-center gap-1"
                    >
                      <span>Send to Room Chat</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-200">{translatedText}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
