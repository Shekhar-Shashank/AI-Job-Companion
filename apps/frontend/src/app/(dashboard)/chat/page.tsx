'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { chatApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: chatApi.conversations,
  });

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const loadConversation = async (id: string) => {
    try {
      const conversation = await chatApi.history(id) as any;
      const messages = conversation?.messages || conversation || [];
      setMessages(messages.map((m: any) => ({ id: m.id, role: m.role, content: m.content })));
      setConversationId(id);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const stream = chatApi.stream(userMessage.content, conversationId);
      for await (const chunk of stream) {
        try {
          const data = JSON.parse(chunk);

          // Handle different event types from backend
          switch (data.type) {
            case 'conversation_id':
              if (!conversationId) {
                setConversationId(data.content);
              }
              break;
            case 'token':
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessage.id ? { ...m, content: m.content + data.content } : m
                )
              );
              break;
            case 'error':
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessage.id
                    ? { ...m, content: `Error: ${data.content}` }
                    : m
                )
              );
              break;
            case 'done':
              // Stream complete
              break;
            default:
              // Ignore other event types like 'status', 'context'
              break;
          }
        } catch {
          // Non-JSON chunk, treat as plain text token
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id ? { ...m, content: m.content + chunk } : m
            )
          );
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Streaming error:', errorMessage, error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessage.id
            ? { ...m, content: `Sorry, an error occurred: ${errorMessage}` }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setConversationId(undefined);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 border rounded-lg bg-card">
        <div className="p-4 border-b">
          <Button onClick={startNewChat} className="w-full">
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </Button>
        </div>
        <ScrollArea className="h-[calc(100%-5rem)]">
          <div className="p-2 space-y-1">
            {conversations?.map((conv) => (
              <button
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-md text-sm truncate transition-colors',
                  conversationId === conv.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                {conv.title || 'New conversation'}
              </button>
            ))}
            {(!conversations || conversations.length === 0) && (
              <p className="text-sm text-muted-foreground px-3 py-2">No conversations yet</p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col border rounded-lg bg-card">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Career AI Assistant</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Ask me anything about your career, skills, job search, or life plans. I have access to your profile and documents.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {[
                    'What skills should I learn next?',
                    'Find jobs matching my profile',
                    'Help me prepare for interviews',
                    'Review my career progress',
                  ].map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      onClick={() => setInput(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn('flex gap-3', message.role === 'user' && 'flex-row-reverse')}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className={message.role === 'assistant' ? 'bg-primary text-primary-foreground' : ''}>
                    {message.role === 'assistant' ? 'AI' : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    'rounded-lg px-4 py-2 max-w-[80%]',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isStreaming && messages[messages.length - 1]?.content === '' && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t p-4">
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-3xl mx-auto">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your career, skills, or job search..."
              className="min-h-[44px] max-h-32 resize-none"
              rows={1}
              disabled={isStreaming}
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isStreaming}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
