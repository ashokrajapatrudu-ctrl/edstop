'use client';

import { useState, useEffect, useRef } from 'react';
import HeaderBrand from '@/components/common/HeaderBrand';
import WalletIndicator from '@/components/common/WalletIndicator';
import Icon from '@/components/ui/AppIcon';
import ChatMessage from './ChatMessage';
import QuestionCounter from './QuestionCounter';
import SuggestedPrompts from './SuggestedPrompts';
import ChatHistory from './ChatHistory';
import PremiumUpgradeModal from './PremiumUpgradeModal';
import EmptyState from '@/components/ui/EmptyState';
import ErrorFallback from '@/components/ui/ErrorFallback';
import { useRetry } from '@/hooks/useRetry';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAICompanionRealtime } from '@/hooks/useAICompanionRealtime';
import { createClient } from '@/lib/supabase/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isBookmarked: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  date: string;
  messageCount: number;
  isBookmarked: boolean;
}

const AICompanionInteractive = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState('session-1');
  const [hasApiError, setHasApiError] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();

  // ── Live AI usage from Supabase ──────────────────────────────────────────
  const {
    questionsUsed,
    questionsLimit,
    isPremium,
    isLoading: usageLoading,
    isLive,
  } = useAICompanionRealtime(user?.id, 3, false);

  const questionsRemaining = questionsLimit - questionsUsed;

  const { retry: autoRetry, manualRetry, reset: resetRetry, isRetrying, retryCount, nextRetryIn, maxRetriesReached } = useRetry({
    maxRetries: 3,
    baseDelay: 1500,
    onRetry: async () => {
      if (lastUserMessage) {
        setHasApiError(false);
        await sendMessageToAI(lastUserMessage);
      }
    },
  });

  const toast = useToast();

  useEffect(() => {
    setIsHydrated(true);
    
    const initialMessages: Message[] = [
      {
        id: 'msg-1',
        role: 'assistant',
        content: 'Hello! I\'m your AI companion for IIT Kharagpur. I can help you with:\n\n• Academic questions and concepts\n• Campus information and facilities\n• Study tips and time management\n• General queries about student life\n\nHow can I assist you today?',
        timestamp: 'Today, 10:30 AM',
        isBookmarked: false
      }
    ];
    setMessages(initialMessages);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => {
      setIsOffline(false);
      if (hasApiError) {
        resetRetry();
        setHasApiError(false);
      }
    };
    const handleOffline = () => {
      setIsOffline(true);
      if (isLoading) {
        setIsLoading(false);
        setHasApiError(true);
        autoRetry();
      }
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, [hasApiError, isLoading, autoRetry, resetRetry]);

  useEffect(() => {
    if (isHydrated && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isHydrated]);

  const mockSessions: ChatSession[] = [
    {
      id: 'session-1',
      title: 'Algorithm Complexity Discussion',
      date: 'Today',
      messageCount: 8,
      isBookmarked: true
    },
    {
      id: 'session-2',
      title: 'Quantum Mechanics Help',
      date: 'Yesterday',
      messageCount: 12,
      isBookmarked: false
    },
    {
      id: 'session-3',
      title: 'Campus Facilities Query',
      date: 'Yesterday',
      messageCount: 5,
      isBookmarked: true
    },
    {
      id: 'session-4',
      title: 'Study Schedule Planning',
      date: '22/02/2026',
      messageCount: 15,
      isBookmarked: false
    }
  ];

  const sendMessageToAI = async (messageContent: string) => {
    setIsLoading(true);
    setHasApiError(false);

    // Simulate API call with potential failure
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const aiResponse: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: 'I understand your question. Let me provide you with a detailed explanation.\n\nBased on your query, here are the key points:\n\n1. The fundamental concept involves understanding the relationship between different variables\n2. Consider the practical applications in real-world scenarios\n3. Always verify your understanding with examples\n\nWould you like me to elaborate on any specific aspect?',
          timestamp: 'Just now',
          isBookmarked: false
        };
        setMessages(prev => [...prev, aiResponse]);
        setIsLoading(false);
        resetRetry();
        resolve();
      }, 2000);
    });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    if (questionsRemaining <= 0) {
      setShowUpgradeModal(true);
      return;
    }

    if (isOffline) {
      setHasApiError(true);
      autoRetry();
      return;
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: 'Just now',
      isBookmarked: false
    };

    setMessages(prev => [...prev, userMessage]);
    setLastUserMessage(inputValue);
    setInputValue('');
    setHasApiError(false);

    // Persist usage increment to Supabase so real-time listener picks it up
    if (user?.id) {
      try {
        const supabase = createClient();
        await supabase
          .from('ai_usage')
          .upsert(
            {
              user_id: user.id,
              questions_used: questionsUsed + 1,
              questions_limit: questionsLimit,
              is_premium: isPremium,
              last_reset_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );
      } catch {
        // Silently ignore — UI still works via local state
      }
    }

    try {
      await sendMessageToAI(inputValue);
    } catch {
      setHasApiError(true);
      setIsLoading(false);
      autoRetry();
    }
  };

  const handlePromptSelect = (prompt: string) => {
    setInputValue(prompt);
  };

  const handleBookmark = (messageId: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, isBookmarked: !msg.isBookmarked } : msg
      )
    );
  };

  const handleSessionSelect = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setShowHistory(false);
  };

  const handleSessionDelete = (sessionId: string) => {
    console.log('Delete session:', sessionId);
  };

  const handleUpgrade = async () => {
    setShowUpgradeModal(false);
    // Persist premium upgrade to Supabase
    if (user?.id) {
      try {
        const supabase = createClient();
        await supabase
          .from('ai_usage')
          .upsert(
            {
              user_id: user.id,
              questions_used: questionsUsed,
              questions_limit: 50,
              is_premium: true,
              last_reset_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );
      } catch {
        // Silently ignore
      }
    }
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-background">
        {/* Skeleton Header */}
        <header className="sticky top-0 z-40 glass-header">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/20 animate-pulse" />
                <div className="w-36 h-5 rounded-lg bg-primary/20 animate-pulse" />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 h-9 rounded-xl bg-primary/15 animate-pulse" />
                <div className="w-28 h-9 rounded-xl bg-primary/15 animate-pulse" />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Skeleton Left Sidebar */}
            <div className="lg:col-span-3 space-y-6">
              {/* Question Counter Skeleton */}
              <div className="glass-neon rounded-2xl p-5 space-y-3">
                <div className="w-32 h-5 rounded-lg bg-primary/20 animate-pulse" />
                <div className="w-full h-3 rounded-full bg-primary/15 animate-pulse" />
                <div className="flex justify-between">
                  <div className="w-16 h-4 rounded-lg bg-primary/15 animate-pulse" />
                  <div className="w-16 h-4 rounded-lg bg-primary/15 animate-pulse" />
                </div>
              </div>
              {/* Suggested Prompts Skeleton */}
              <div className="glass-neon rounded-2xl p-5 space-y-3">
                <div className="w-36 h-5 rounded-lg bg-primary/20 animate-pulse" />
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 rounded-xl bg-primary/10 animate-pulse" style={{animationDelay: `${i * 0.08}s`}} />
                ))}
              </div>
            </div>

            {/* Skeleton Chat Area */}
            <div className="lg:col-span-9">
              <div className="glass-neon rounded-2xl overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>
                {/* Chat Header Skeleton */}
                <div className="flex items-center justify-between p-4 border-b border-primary/20 bg-gradient-to-r from-purple-900/40 to-indigo-900/40">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/25 animate-pulse" />
                    <div className="space-y-1.5">
                      <div className="w-28 h-4 rounded-lg bg-primary/20 animate-pulse" />
                      <div className="w-36 h-3 rounded-lg bg-primary/15 animate-pulse" />
                    </div>
                  </div>
                  <div className="w-24 h-9 rounded-xl bg-primary/15 animate-pulse" />
                </div>

                {/* Chat Messages Skeleton */}
                <div className="flex-1 p-6 space-y-4 overflow-hidden">
                  {/* AI message skeleton */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/20 animate-pulse flex-shrink-0" />
                    <div className="max-w-lg space-y-2">
                      <div className="h-4 w-64 rounded-lg bg-primary/15 animate-pulse" />
                      <div className="h-4 w-80 rounded-lg bg-primary/15 animate-pulse" />
                      <div className="h-4 w-48 rounded-lg bg-primary/10 animate-pulse" />
                    </div>
                  </div>
                  {/* User message skeleton */}
                  <div className="flex gap-3 justify-end">
                    <div className="max-w-sm space-y-2">
                      <div className="h-4 w-48 rounded-lg bg-purple-500/20 animate-pulse" />
                      <div className="h-4 w-36 rounded-lg bg-purple-500/15 animate-pulse" />
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 animate-pulse flex-shrink-0" />
                  </div>
                  {/* Another AI message skeleton */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/20 animate-pulse flex-shrink-0" />
                    <div className="max-w-lg space-y-2">
                      <div className="h-4 w-72 rounded-lg bg-primary/15 animate-pulse" />
                      <div className="h-4 w-56 rounded-lg bg-primary/15 animate-pulse" />
                      <div className="h-4 w-64 rounded-lg bg-primary/10 animate-pulse" />
                      <div className="h-4 w-40 rounded-lg bg-primary/10 animate-pulse" />
                    </div>
                  </div>
                </div>

                {/* Input Skeleton */}
                <div className="p-4 border-t border-primary/20">
                  <div className="flex gap-3">
                    <div className="flex-1 h-12 rounded-xl bg-primary/15 animate-pulse" />
                    <div className="w-12 h-12 rounded-xl bg-primary/20 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Floating background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-20 right-10 w-64 h-64 rounded-full bg-pink-600/8 blur-3xl animate-orb-float" />
        <div className="absolute bottom-40 left-10 w-80 h-80 rounded-full bg-purple-600/8 blur-3xl animate-orb-float" style={{animationDelay: '3s'}} />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full bg-indigo-600/6 blur-3xl animate-orb-float" style={{animationDelay: '6s'}} />
      </div>

      <header className="sticky top-0 z-40 glass-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <HeaderBrand showBackButton={true} />
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 px-4 py-2 glass-neon hover:border-primary/50 rounded-xl transition-all duration-300 press-scale focus-ring hover-glow-purple"
              >
                <Icon name="ClockIcon" size={18} className="text-primary" />
                <span className="font-caption text-sm font-semibold hidden sm:inline text-foreground">History</span>
              </button>
              {isLive && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="font-caption text-xs font-semibold text-green-400">LIVE</span>
                </div>
              )}
              <WalletIndicator balance={1250.50} />
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {usageLoading ? (
              <div className="bg-card border border-border rounded-md p-4 animate-pulse">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-32 h-4 rounded-lg bg-primary/20" />
                  <div className="w-12 h-4 rounded-lg bg-primary/20" />
                </div>
                <div className="w-full h-2 rounded-full bg-primary/15" />
              </div>
            ) : (
              <QuestionCounter
                questionsUsed={questionsUsed}
                questionsLimit={questionsLimit}
                isPremium={isPremium}
                onUpgradeClick={() => setShowUpgradeModal(true)}
              />
            )}
            <SuggestedPrompts
              onPromptSelect={handlePromptSelect}
              disabled={questionsRemaining <= 0}
            />
          </div>

          <div className="lg:col-span-9">
            <div className="glass-neon rounded-2xl overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 border-b border-primary/20 bg-gradient-to-r from-purple-900/40 to-indigo-900/40">
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl shadow-lg shadow-purple-500/30 animate-glow-pulse">
                    <Icon name="SparklesIcon" size={24} variant="solid" className="text-white" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-background animate-pulse" />
                  </div>
                  <div>
                    <h2 className="font-heading font-bold text-base text-gradient-purple">
                      AI Companion
                    </h2>
                    <p className="font-caption text-xs text-text-secondary flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse"></span>
                      Online • Powered by AI
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMessages([{
                      id: 'msg-welcome',
                      role: 'assistant',
                      content: 'Hello! I\'m your AI companion for IIT Kharagpur. How can I assist you today?',
                      timestamp: 'Just now',
                      isBookmarked: false
                    }]);
                  }}
                  className="flex items-center gap-2 px-3 py-2 glass hover:border-primary/50 rounded-xl transition-all duration-300 press-scale focus-ring hover-glow-purple"
                >
                  <Icon name="PlusIcon" size={16} className="text-primary" />
                  <span className="font-caption text-xs font-semibold text-foreground">New Chat</span>
                </button>
              </div>

              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin"
              >
                {isOffline && (
                  <ErrorFallback
                    type="network"
                    onRetry={() => { manualRetry(true); }}
                    className="mb-4"
                    isRetrying={isRetrying}
                    retryCount={retryCount}
                    nextRetryIn={nextRetryIn}
                    maxRetriesReached={maxRetriesReached}
                    autoRetryEnabled={true}
                  />
                )}
                {hasApiError && !isOffline && (
                  <ErrorFallback
                    type="api"
                    onRetry={() => { manualRetry(true); }}
                    className="mb-4"
                    isRetrying={isRetrying}
                    retryCount={retryCount}
                    nextRetryIn={nextRetryIn}
                    maxRetriesReached={maxRetriesReached}
                    autoRetryEnabled={true}
                  />
                )}
                {messages.length === 0 ? (
                  <EmptyState
                    icon="🤖"
                    title="Start a conversation"
                    description="Ask me anything about academics, campus life, or study tips!"
                    variant="minimal"
                  />
                ) : (
                  messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      role={message.role}
                      content={message.content}
                      timestamp={message.timestamp}
                      isBookmarked={message.isBookmarked}
                      onBookmark={() => handleBookmark(message.id)}
                    />
                  ))
                )}
                {isLoading && (
                  <div className="flex items-start gap-3 animate-slide-up">
                    <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl flex-shrink-0">
                      <Icon name="SparklesIcon" size={16} variant="solid" className="text-white" />
                    </div>
                    <div className="glass-neon rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                        </div>
                        <span className="font-caption text-xs text-text-secondary">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-primary/20 bg-gradient-to-r from-purple-900/20 to-indigo-900/20">
                {questionsRemaining <= 2 && questionsRemaining > 0 && (
                  <div className="mb-3 p-2 bg-warning/10 border border-warning/30 rounded-xl flex items-center gap-2">
                    <Icon name="ExclamationTriangleIcon" size={14} className="text-warning" />
                    <span className="font-caption text-xs text-warning">
                      ⚡ Only {questionsRemaining} question{questionsRemaining !== 1 ? 's' : ''} remaining today
                    </span>
                  </div>
                )}
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={questionsRemaining <= 0 ? 'Upgrade to Premium for more questions...' : 'Ask me anything about IIT KGP... ✨'}
                      disabled={questionsRemaining <= 0}
                      rows={1}
                      className="w-full px-4 py-3 glass-neon rounded-xl font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-all duration-300 resize-none disabled:opacity-50"
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading || questionsRemaining <= 0}
                    className={`
                      flex items-center justify-center w-12 h-12 rounded-xl
                      transition-all duration-300 press-scale focus-ring btn-glow flex-shrink-0
                      ${inputValue.trim() && !isLoading && questionsRemaining > 0
                        ? 'bg-gradient-to-br from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50'
                        : 'bg-muted/50 text-muted-foreground cursor-not-allowed'
                      }
                    `}
                  >
                    <Icon name="PaperAirplaneIcon" size={20} variant="solid" />
                  </button>
                </div>
                <p className="font-caption text-xs text-text-secondary mt-2 text-center">
                  Press Enter to send • Shift+Enter for new line
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="relative w-full max-w-md glass-ultra rounded-2xl shadow-2xl animate-scale-in">
            <ChatHistory
              sessions={mockSessions}
              currentSessionId={currentSessionId}
              onSessionSelect={handleSessionSelect}
              onSessionDelete={handleSessionDelete}
            />
          </div>
        </div>
      )}

      {showUpgradeModal && (
        <PremiumUpgradeModal
          onUpgrade={handleUpgrade}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </div>
  );
};

export default AICompanionInteractive;