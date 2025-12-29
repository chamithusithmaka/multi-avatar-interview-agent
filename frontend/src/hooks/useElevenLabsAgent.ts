/**
 * Custom hook for managing ElevenLabs Conversational AI agents
 * This replaces the need for separate Gemini API calls and browser speech recognition
 */

import { useConversation } from '@elevenlabs/react';
import { useCallback, useState } from 'react';

export interface AgentConfig {
  agentId: string;
  name: string;
  role: string;
}

export interface ConversationMessage {
  id: number;
  type: 'agent' | 'user';
  text: string;
  agentId?: string;
}

export function useElevenLabsAgent() {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [messageIdCounter, setMessageIdCounter] = useState(0);
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getNextMessageId = useCallback(() => {
    setMessageIdCounter(prev => prev + 1);
    return messageIdCounter;
  }, [messageIdCounter]);

  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to ElevenLabs agent');
      setIsConnected(true);
      setError(null);
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs agent');
      setIsConnected(false);
    },
    onMessage: (message) => {
      console.log('Message received:', message);
      
      // Cast to the correct type structure from ElevenLabs
      const msg = message as { 
        type?: string; 
        agent_response_event?: { agent_response: string };
        user_transcription_event?: { user_transcript: string };
      };
      
      // Handle agent responses (when agent speaks)
      if (msg.type === 'agent_response' && msg.agent_response_event?.agent_response) {
        setMessages(prev => [...prev, {
          id: getNextMessageId(),
          type: 'agent',
          text: msg.agent_response_event!.agent_response,
          agentId: currentAgentId || undefined,
        }]);
      }
      
      // Handle user transcripts (when user speaks)
      if (msg.type === 'user_transcript' && msg.user_transcription_event?.user_transcript) {
        setMessages(prev => [...prev, {
          id: getNextMessageId(),
          type: 'user',
          text: msg.user_transcription_event!.user_transcript,
        }]);
      }
    },
    onError: (error) => {
      console.error('ElevenLabs conversation error:', error);
      setError(typeof error === 'string' ? error : 'Connection error');
    },
  });

  const startConversation = useCallback(async (agentId: string, _dynamicVariables?: Record<string, string>) => {
    try {
      setCurrentAgentId(agentId);
      setError(null);
      
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Start the conversation session with the agent
      // Keep it simple for public agents
      const conversationId = await conversation.startSession({
        agentId,
        connectionType: 'websocket',
      });
      
      console.log('Conversation started with ID:', conversationId);
      return conversationId;
    } catch (err) {
      console.error('Failed to start conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to start conversation');
      throw err;
    }
  }, [conversation]);

  const endConversation = useCallback(async () => {
    try {
      await conversation.endSession();
      setCurrentAgentId(null);
      setIsConnected(false);
    } catch (err) {
      console.error('Failed to end conversation:', err);
    }
  }, [conversation]);

  const sendTextMessage = useCallback((text: string) => {
    if (conversation.sendUserMessage) {
      conversation.sendUserMessage(text);
      // Add user message to local state
      setMessages(prev => [...prev, {
        id: getNextMessageId(),
        type: 'user',
        text,
      }]);
    }
  }, [conversation, getNextMessageId]);

  const sendContextualUpdate = useCallback((context: string) => {
    if (conversation.sendContextualUpdate) {
      conversation.sendContextualUpdate(context);
    }
  }, [conversation]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setMessageIdCounter(0);
  }, []);

  return {
    // State
    messages,
    isConnected,
    isSpeaking: conversation.isSpeaking,
    status: conversation.status,
    currentAgentId,
    error,
    
    // Actions
    startConversation,
    endConversation,
    sendTextMessage,
    sendContextualUpdate,
    clearMessages,
    
    // Audio controls
    setVolume: conversation.setVolume,
    getInputVolume: conversation.getInputVolume,
    getOutputVolume: conversation.getOutputVolume,
  };
}
