import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, RefreshCw, Square, Maximize2, Trash2, Settings, MessageSquare, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { WebSocketChatClient, ChatService, ErrorUtils } from '../services';
import type { Message } from '../App';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const normalizeMarkdownContent = (text: string): string => {
  if (!text) {
    return text;
  }

  let normalized = text.replace(/\r\n/g, '\n');

  // Convert common bullet glyphs to markdown list markers
  normalized = normalized.replace(/^[\t ]*[•●▪▫◾◼◦]\s*/gm, '- ');

  // Handle cases where the model emits "-" on one line and the content on the next
  normalized = normalized.replace(/^[\t ]*-\s*\n[\t ]*/gm, '- ');

  // Remove extra blank lines between bullet items (\n\n- -> \n-)
  normalized = normalized.replace(/\n{2}(-\s+)/g, '\n$1');

  // Collapse excessive blank lines to avoid accidental list termination
  normalized = normalized.replace(/\n{3,}/g, '\n\n');

  return normalized;
};

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  onClearChat: () => void;
  onPageReference: (page: number) => void;
  onSettingsClick: () => void;
  currentDocument?: {
    id: string;
    name: string;
    can_be_queried?: boolean;
    processing_status?: string;
  };
}

export function ChatPanel({
  messages,
  onSendMessage,
  onClearChat,
  onPageReference,
  onSettingsClick,
  currentDocument,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [wsClient, setWsClient] = useState<WebSocketChatClient | null>(null);
  const [chatSession, setChatSession] = useState<string | null>(null);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Initialize chat session and WebSocket connection
  useEffect(() => {
    const initializeChat = async () => {
      if (!currentDocument) {
        console.log('ChatPanel: No document selected, skipping WebSocket initialization');
        return;
      }

      // Check if document can be queried
      if (currentDocument.can_be_queried === false) {
        console.log('Document cannot be queried yet, status:', currentDocument.processing_status);
        return;
      }

      console.log('ChatPanel: Initializing chat for document:', currentDocument.id);

      try {
        // Create or get chat session for this document
        const session = await ChatService.createChatSession({
          document_id: currentDocument.id,
          title: `Chat with ${currentDocument.name}`,
        });

        console.log('Chat session created:', session);
        console.log('Session ID:', session.id);

        setChatSession(session.id);

        // Initialize WebSocket client
        const client = new WebSocketChatClient(session.id, currentDocument.id);
        console.log('WebSocket client initialized with session:', session.id, 'document:', currentDocument.id);
        
        client.onConnect = () => {
          setIsConnected(true);
          console.log('WebSocket connected');
        };

        client.onDisconnect = () => {
          setIsConnected(false);
          console.log('WebSocket disconnected');
        };

        client.onToken = (data) => {
          setStreamingMessage(prev => prev + data.token);
        };

        client.onResponseComplete = (data) => {
          // Extract page references from chunks
          const pageReferences = data.chunks
            ?.map((chunk: any) => chunk.page || chunk.page_number)
            .filter((page): page is number => typeof page === 'number' && page > 0) || [];
          
          // Remove duplicates
          const uniquePages = Array.from(new Set(pageReferences)).sort((a, b) => a - b);

          // Add completed message to chat
          const newMessage: Message = {
            id: data.message_id,
            role: 'ai',
            content: data.content,
            pageReferences: uniquePages,
            timestamp: new Date(data.timestamp),
          };

          // Add to messages via parent component
          onSendMessage('INTERNAL_AI_MESSAGE:' + JSON.stringify(newMessage));
          setStreamingMessage('');
          setIsGenerating(false);
        };

        client.onChatError = (data) => {
          toast.error(data.message);
          setIsGenerating(false);
          setStreamingMessage('');
        };

        // Connect to WebSocket
        console.log('Attempting to connect to WebSocket...');
        await client.connect();
        console.log('WebSocket connection established');
        setWsClient(client);

      } catch (error) {
        console.error('Failed to initialize chat:', error);
        toast.error('Failed to initialize chat: ' + (error instanceof Error ? error.message : String(error)));
      }
    };

    initializeChat();

    // Cleanup on unmount or document change
    return () => {
      if (wsClient) {
        console.log('ChatPanel: Cleaning up WebSocket connection');
        wsClient.disconnect();
        setWsClient(null);
        setIsConnected(false);
      }
    };
  }, [currentDocument]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, streamingMessage]);

  const handleSend = () => {
    if (input.trim() && wsClient?.isConnected() && !isGenerating) {
      const messageContent = input.trim();
      
      // Send message via WebSocket
      try {
        wsClient.sendMessage(messageContent);
        
      // Add user message to UI immediately
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
          content: messageContent,
        timestamp: new Date(),
      };
      
        onSendMessage(JSON.stringify(userMessage));
      
        setInput('');
        setIsGenerating(true);
        setStreamingMessage('');
      } catch (error) {
        console.error('Failed to send message:', error);
        toast.error('Failed to send message');
        setIsGenerating(false);
      }
    } else if (!wsClient?.isConnected()) {
      toast.error('Chat is not connected. Please try again.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Show empty state when no document is selected
  if (!currentDocument) {
    return (
      <div className="flex flex-col w-1/2 border-r border-gray-200 bg-white">
        <div className="flex-1 overflow-hidden flex items-center justify-center">
          <div className="flex flex-col items-center justify-center p-12 max-w-md text-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full blur-xl opacity-50"></div>
              <MessageSquare className="h-16 w-16 text-blue-500 relative z-10" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Pick a document to chat</h3>
            <p className="text-gray-600 mb-8">
              Choose a PDF from the sidebar and start asking questions.
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <FileText className="h-4 w-4" />
              <span>Select a document to begin</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show processing state if document is not ready
  if (currentDocument.can_be_queried === false) {
    return (
      <div className="flex flex-col w-1/2 border-r border-gray-200 bg-white">
        <div className="flex-1 overflow-hidden flex items-center justify-center">
          <div className="flex flex-col items-center justify-center p-12 max-w-md text-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full blur-xl opacity-50"></div>
              <MessageSquare className="h-16 w-16 text-yellow-500 relative z-10 animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Document is being processed</h3>
            <p className="text-gray-600 mb-4">
              Please wait while we prepare your document for chat. This usually takes 1-3 minutes.
            </p>
            <Badge variant="outline" className="text-yellow-600 border-yellow-300">
              {currentDocument.processing_status || 'Processing'}
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-1/2 border-r border-gray-200 bg-white">
      <div className="flex-1 overflow-hidden">
        <ScrollArea ref={scrollAreaRef} className="h-full px-6 py-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="flex flex-col items-center justify-center p-12 max-w-md text-center">
                  <div className="relative mb-8">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full blur-xl opacity-50"></div>
                    <MessageSquare className="h-16 w-16 text-blue-500 relative z-10" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Ready to chat?</h3>
                  <p className="text-gray-600 mb-8">
                    Ask me anything about{' '}
                    <span
                      className="font-medium inline-block max-w-[220px] truncate align-bottom"
                      title={currentDocument.name}
                    >
                      {currentDocument.name}
                    </span>.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <FileText className="h-4 w-4" />
                    <span>Try asking about pages or topics</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message: Message) => {
                  const isUserMessage = message.role === 'user';
                  const displayContent = isUserMessage
                    ? message.content
                    : normalizeMarkdownContent(message.content);
                  const messageTimestamp = message.timestamp instanceof Date
                    ? message.timestamp
                    : new Date(message.timestamp);
                  const timestampString = Number.isNaN(messageTimestamp.getTime())
                    ? ''
                    : messageTimestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                  return (
              <div
                key={message.id}
                      className={`flex ${isUserMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          isUserMessage
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                        {isUserMessage ? (
                          <p className="whitespace-pre-wrap">{displayContent}</p>
                        ) : (
                          <div className="markdown-content text-sm">
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                h1: ({node, ...props}) => <h1 className="text-xl font-semibold mt-4 mb-2" {...props} />, 
                                h2: ({node, ...props}) => <h2 className="text-lg font-semibold mt-3 mb-2" {...props} />,
                                h3: ({node, ...props}) => <h3 className="text-base font-semibold mt-2 mb-1" {...props} />, 
                                p: ({node, ...props}) => <p className="my-2 leading-relaxed" {...props} />,
                                ul: ({node, ...props}) => <ul className="list-disc list-inside my-2 space-y-1" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-inside my-2 space-y-1" {...props} />,
                                li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
                                code: ({node, inline, ...props}: any) =>
                                  inline ? (
                                    <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono" {...props} />
                                  ) : (
                                    <code className="block bg-gray-800 text-gray-100 px-3 py-2 rounded my-2 overflow-x-auto text-xs font-mono" {...props} />
                                  ),
                                strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                                em: ({node, ...props}) => <em className="italic" {...props} />,
                                a: ({node, ...props}) => <a className="text-blue-600 hover:underline" {...props} />,
                                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 my-2 italic text-gray-700" {...props} />,
                              }}
                            >
                              {displayContent}
                            </ReactMarkdown>
                          </div>
                        )}
                  {message.pageReferences && message.pageReferences.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {message.pageReferences.map((page) => (
                        <Badge
                          key={page}
                          variant="secondary"
                          className="cursor-pointer hover:bg-blue-100 transition-colors"
                          onClick={() => onPageReference(page)}
                        >
                          Page {page}
                        </Badge>
                      ))}
                    </div>
                  )}
                        {timestampString && (
                          <p className="text-xs mt-2 opacity-70">{timestampString}</p>
                        )}
                </div>
              </div>
                  );
                })}
                
            {isGenerating && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-gray-100 text-gray-900">
                  {streamingMessage ? (
                    <div className="markdown-content text-sm">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({node, ...props}) => <h1 className="text-xl font-semibold mt-4 mb-2" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-lg font-semibold mt-3 mb-2" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-base font-semibold mt-2 mb-1" {...props} />,
                          p: ({node, ...props}) => <p className="my-2 leading-relaxed" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc list-inside my-2 space-y-1" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-inside my-2 space-y-1" {...props} />,
                          li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
                          code: ({node, inline, ...props}: any) => 
                            inline ? (
                              <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono" {...props} />
                            ) : (
                              <code className="block bg-gray-800 text-gray-100 px-3 py-2 rounded my-2 overflow-x-auto text-xs font-mono" {...props} />
                            ),
                          strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                          em: ({node, ...props}) => <em className="italic" {...props} />,
                          a: ({node, ...props}) => <a className="text-blue-600 hover:underline" {...props} />,
                          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 my-2 italic text-gray-700" {...props} />,
                        }}
                      >
                        {normalizeMarkdownContent(streamingMessage)}
                      </ReactMarkdown>
                      <span className="inline-block w-1.5 h-4 bg-blue-500 ml-1 animate-pulse"></span>
                    </div>
                  ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                  )}
                </div>
              </div>
            )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="border-t border-gray-200 p-4">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentDocument ? "Ask anything about your document..." : "Select a document to start chatting..."}
            className="min-h-[80px] pr-24 resize-none"
            disabled={!currentDocument}
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={!isGenerating}
            >
              {isGenerating ? (
                <Square className="h-4 w-4" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClearChat}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Chat
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={onSettingsClick}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button onClick={handleSend} disabled={!input.trim() || !currentDocument} size="sm">
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
