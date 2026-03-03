/**
 * Interview Page using ElevenLabs Conversational AI Agents
 * 
 * This version uses the ElevenLabs agent platform for the full conversation:
 * - LLM responses from the agent's configured LLM (Gemini 2.0 Flash Lite)
 * - Text-to-speech (TTS) with the agent's voice (ENABLED)
 * - System prompts and first messages are configured in ElevenLabs dashboard
 * 
 * MIC MUTED MODE to prevent agent timeout and voice conflicts:
 * - ElevenLabs mic is permanently muted (agent can't hear, but CAN speak)
 * - User records locally using browser's Web Speech API
 * - User clicks Send to submit their text answer via sendUserMessage
 * - This prevents: agent timeout, recording agent's voice, auto-submit issues
 */

import { useState, useEffect, useRef, useCallback } from "react";

// Web Speech API type declarations
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}
import { useConversation } from "@elevenlabs/react";
import HRAvatar from "../components/HRAvatar";
import AcademicAvatar from "../components/AcademicAvatar";
import BusinessAvatar from "../components/BusinessAvatar";
import RealisticHRAvatar from "../components/RealisticHRAvatar";
import RealisticAcademicAvatar from "../components/RealisticAcademicAvatar";
import RealisticBusinessAvatar from "../components/RealisticBusinessAvatar";
import AvatarHeader from "../components/AvatarHeader";
import ChatMessage from "../components/ChatMessage";
import LoadingIndicator from "../components/LoadingIndicator";
import RecordingIndicator from "../components/RecordingIndicator";
import InputBar from "../components/InputBar";
import LargeAvatarView from "../components/LargeAvatarView";
import { readFileContent } from "../utils/fileService";

type Message = {
  id: number;
  type: "question" | "answer";
  text: string;
  avatar: string;
  audioUrl?: string;
};

interface InterviewBotProps {
  onNavigate?: () => void;
}

const InterviewBot = ({ onNavigate }: InterviewBotProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [interviewStarted, setInterviewStarted] = useState(false);
  // messageIdCounter removed - using ref instead for stable ID generation
  const [speakingAvatar, setSpeakingAvatar] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [chatVisible, setChatVisible] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isRecordingLocally, setIsRecordingLocally] = useState(false); // Local speech recognition state
  
  // Keep ElevenLabs mic permanently muted - we use local recording instead
  // This prevents agent timeout and auto-submit issues
  const micMuted = true;
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedAvatarRef = useRef<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null); // For local speech recognition
  const userActivityIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null); // For sending user activity pings
  
  // Keep ref in sync with state
  useEffect(() => {
    selectedAvatarRef.current = selectedAvatar;
  }, [selectedAvatar]);

  // ElevenLabs Agent IDs - these are your configured agents
  const avatarDetails: Record<string, { 
    name: string; 
    role: string; 
    agentId: string;
    voiceId: string;
    firstMessage: string;
    component: typeof HRAvatar;
  }> = {
    hr: {
      name: "HR Interviewer",
      role: "Human Resources",
      agentId: "agent_5801kcxy1rfnf6h9e9d0y8g9mp1t",
      voiceId: "",
      firstMessage: "",
      component: RealisticHRAvatar,
    },
    academic: {
      name: "Academic Interviewer",
      role: "Academic Specialist",
      agentId: "agent_3801kcxy8npmedbbas2vxz1mn0wb",
      voiceId: "",
      firstMessage: "",
      component: RealisticAcademicAvatar,
    },
    business: {
      name: "Business Interviewer",
      role: "Business Strategy",
      agentId: "agent_8401kcxybk9xfrg9cdn1afx4371a",
      voiceId: "",
      firstMessage: "",
      component: RealisticBusinessAvatar,
    },
  };

  const allAvatars = Object.keys(avatarDetails);

  // Use ref for message ID to avoid stale closure issues
  const messageIdRef = useRef(0);
  const getNextMessageId = useCallback(() => {
    messageIdRef.current += 1;
    return messageIdRef.current;
  }, []);

  // ElevenLabs Conversation Hook
  // Keep mic permanently muted so ElevenLabs doesn't listen for voice
  // User records locally and submits via sendUserMessage (text)
  // Agent still speaks (TTS works), but doesn't listen (no STT/auto-submit)
  const conversation = useConversation({
    micMuted, // Keep mic muted - prevents agent timeout and auto-submit
    onConnect: () => {
      console.log("✅ Connected to ElevenLabs agent (mic muted)");
      setConnectionError(null);
      setIsLoading(false);
    },
    onDisconnect: (details) => {
      console.log("🔌 Disconnected from ElevenLabs agent", details);
      // Show disconnect reason if available
      if (details) {
        console.log("Disconnect details:", JSON.stringify(details));
      }
    },
    onMessage: (message) => {
      console.log("📨 Message received:", message);
      
      // MessagePayload has: { message: string, role: "user" | "agent", source: "user" | "ai" }
      const { message: text, role } = message;
      
      if (role === "agent") {
        // Agent is speaking - add as question
        const currentAvatar = selectedAvatarRef.current;
        if (currentAvatar && text) {
          setMessages(prev => [...prev, {
            id: getNextMessageId(),
            type: "question",
            text: text,
            avatar: currentAvatar,
          }]);
        }
      } else if (role === "user") {
        // User transcript - add as answer
        if (text) {
          setMessages(prev => [...prev, {
            id: getNextMessageId(),
            type: "answer",
            text: text,
            avatar: "user",
          }]);
          setInterimTranscript("");
        }
      }
    },
    onError: (error) => {
      console.error("❌ ElevenLabs error:", error);
      setConnectionError(typeof error === "string" ? error : "Connection error");
      setIsLoading(false);
    },
    onModeChange: (mode) => {
      console.log("🎤 Mode changed:", mode);
      // mode.mode can be "speaking" or "listening"
      if (mode.mode === "speaking") {
        setSpeakingAvatar(selectedAvatarRef.current);
        // IMPORTANT: Stop local recording when agent starts speaking
        // This prevents recording the agent's voice
        if (recognitionRef.current) {
          console.log("🛑 Stopping local recording - agent is speaking");
          recognitionRef.current.stop();
          recognitionRef.current = null;
        }
        // Stop user activity pings while agent is speaking
        if (userActivityIntervalRef.current) {
          clearInterval(userActivityIntervalRef.current);
          userActivityIntervalRef.current = null;
        }
      } else {
        // Agent finished speaking, now waiting for user
        setSpeakingAvatar(null);
        // START sending user activity pings to prevent agent timeout
        // This tells the agent "user is still here, thinking"
        if (!userActivityIntervalRef.current) {
          console.log("📤 Starting user activity pings to prevent timeout");
          userActivityIntervalRef.current = setInterval(() => {
            if (conversation.sendUserActivity) {
              conversation.sendUserActivity();
              console.log("📤 Ping: user is thinking...");
            }
          }, 1500); // Every 1.5 seconds
        }
      }
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (conversation.status === "connected") {
        conversation.endSession();
      }
      // Cleanup speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      // Cleanup user activity interval
      if (userActivityIntervalRef.current) {
        clearInterval(userActivityIntervalRef.current);
      }
    };
  }, []);

  // Setup local speech recognition for recording user's answer
  const startLocalRecording = useCallback(() => {
    // Don't start recording if agent is speaking
    if (conversation.isSpeaking) {
      console.log("⚠️ Cannot start recording while agent is speaking");
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setConnectionError("Speech recognition not supported in this browser. Please type your answer.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log("🎤 Local recording started");
      setIsRecordingLocally(true);
      // Activity pings are already running from onModeChange
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
        }
      }
      
      if (final) {
        setUserInput(prev => (prev + ' ' + final).trim());
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== 'no-speech') {
        setConnectionError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      console.log("🎤 Local recording ended");
      setIsRecordingLocally(false);
      setInterimTranscript('');
      // Don't stop activity pings here - they should keep running until user submits
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [conversation]);

  const stopLocalRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  // Send user activity when typing to prevent agent timeout
  const handleInputChange = useCallback((value: string) => {
    setUserInput(value);
    // Notify agent that user is active (typing)
    if (conversation.sendUserActivity && interviewStarted) {
      conversation.sendUserActivity();
    }
  }, [conversation, interviewStarted]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      
      try {
        console.log("📎 Reading file:", file.name, "Type:", file.type, "Size:", file.size);
        const content = await readFileContent(file);
        setFileContent(content);
        console.log("📎 File content extracted, length:", content.length);
        console.log("📎 Content preview:", content.substring(0, 300));
        
        // Check if PDF extraction worked
        if (content.startsWith('[') && content.includes('Error')) {
          alert("Warning: Could not extract text from PDF. The file might be scanned or protected.");
        }
      } catch (error) {
        console.error("Error reading file:", error);
        alert("Error reading file. Please try a different PDF or text file.");
      }
      
      e.target.value = "";
    }
  };

  const handleStartInterview = async () => {
    if (!selectedAvatar) {
      setConnectionError("Please select an interviewer first!");
      return;
    }

    setIsLoading(true);
    setInterviewStarted(true);
    setConnectionError(null);

    // Add topic message to chat if user provided input
    if (userInput.trim()) {
      const topicMessage: Message = {
        id: getNextMessageId(),
        type: "answer",
        text: userInput + (attachedFile ? ` (with ${attachedFile.name})` : ""),
        avatar: "user",
      };
      setMessages([topicMessage]);
    }
    
    const inputCopy = userInput;
    setUserInput("");

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const agentId = avatarDetails[selectedAvatar].agentId;
      
      // Build dynamic variables to pass context to the agent
      const dynamicVariables: Record<string, string> = {};
      
      if (inputCopy.trim()) {
        dynamicVariables.interview_topic = inputCopy;
      }
      
      if (fileContent) {
        // Pass the report content to the agent (truncated if too long)
        // ElevenLabs has limits on dynamic variable size - keep it reasonable
        const truncatedContent = fileContent.substring(0, 4000);
        dynamicVariables.internship_report = truncatedContent;
        console.log("📄 PDF content length:", fileContent.length, "chars, truncated to:", truncatedContent.length);
        console.log("📄 PDF content preview:", truncatedContent.substring(0, 200) + "...");
      }

      console.log("🚀 Starting conversation with agent:", agentId);
      console.log("📝 Dynamic variables keys:", Object.keys(dynamicVariables));
      console.log("📝 Dynamic variables:", JSON.stringify(dynamicVariables).substring(0, 500) + "...");

      // Start the conversation session
      // Pass dynamic variables so the agent receives the file content and topic
      const conversationId = await conversation.startSession({
        agentId,
        connectionType: "websocket",
        dynamicVariables: Object.keys(dynamicVariables).length > 0 ? dynamicVariables : undefined,
      });

      console.log("✅ Conversation started:", conversationId);
    } catch (err) {
      console.error("Failed to start conversation:", err);
      setConnectionError(err instanceof Error ? err.message : "Failed to start interview");
      setInterviewStarted(false);
      setIsLoading(false);
    }
  };

  const handleEndInterview = async () => {
    try {
      // Stop all activity
      stopLocalRecording();
      if (userActivityIntervalRef.current) {
        clearInterval(userActivityIntervalRef.current);
        userActivityIntervalRef.current = null;
      }
      await conversation.endSession();
      setInterviewStarted(false);
      setMessages([]);
      setSpeakingAvatar(null);
    } catch (err) {
      console.error("Error ending interview:", err);
    }
  };

  // Handle switching to a different avatar/agent during interview
  const handleSwitchAvatar = async (newAvatarId: string) => {
    if (newAvatarId === selectedAvatar) return;
    if (conversation.isSpeaking) return; // Don't switch while speaking
    
    // Stop all activity before switching
    stopLocalRecording();
    if (userActivityIntervalRef.current) {
      clearInterval(userActivityIntervalRef.current);
      userActivityIntervalRef.current = null;
    }
    setIsLoading(true);
    
    try {
      // End current session
      await conversation.endSession();
      
      // Update selected avatar
      setSelectedAvatar(newAvatarId);
      
      // Add a system message about switching
      setMessages(prev => [...prev, {
        id: getNextMessageId(),
        type: "question",
        text: `[Switching to ${avatarDetails[newAvatarId].name}...]`,
        avatar: newAvatarId,
      }]);
      
      // Start new session with the new agent
      const agentId = avatarDetails[newAvatarId].agentId;
      console.log("🔄 Switching to agent:", agentId);
      
      await conversation.startSession({
        agentId,
        connectionType: "websocket",
      });
      
      console.log("✅ Switched to new agent");
    } catch (err) {
      console.error("Error switching avatar:", err);
      setConnectionError(err instanceof Error ? err.message : "Failed to switch interviewer");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTextMessage = () => {
    if (!userInput.trim() || conversation.isSpeaking) return;

    // Stop activity pings - we're submitting the answer now
    if (userActivityIntervalRef.current) {
      clearInterval(userActivityIntervalRef.current);
      userActivityIntervalRef.current = null;
    }

    // Stop local recording if active
    stopLocalRecording();

    // Add user message to chat
    setMessages(prev => [...prev, {
      id: getNextMessageId(),
      type: "answer",
      text: userInput,
      avatar: "user",
    }]);

    // Send text message to the agent
    if (conversation.sendUserMessage) {
      conversation.sendUserMessage(userInput);
    }
    
    setUserInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!interviewStarted) {
        handleStartInterview();
      } else {
        handleSendTextMessage();
      }
    }
  };

  // Toggle local recording - records speech locally and adds to userInput
  // User must click Send to submit their answer (prevents agent timeout)
  const handleToggleRecording = () => {
    // Don't allow recording while agent is speaking
    if (conversation.isSpeaking) {
      console.log("⚠️ Cannot toggle recording while agent is speaking");
      return;
    }
    
    if (isRecordingLocally) {
      stopLocalRecording();
    } else {
      startLocalRecording();
    }
  };

  if (!interviewStarted) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-red-50 via-white to-rose-50">
        <div className="pt-8 md:pt-16 pb-4 md:pb-8 px-4">
          {onNavigate && (
            <div className="flex justify-end mb-4">
              <button
                onClick={onNavigate}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                </svg>
                <span>Switch to Viva Bot</span>
              </button>
            </div>
          )}
          <div className="text-center">
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-2 md:mb-4">
              Welcome to Your Internship Mock Interview
            </h1>
            <p className="text-base md:text-xl text-gray-600">
              Enter your internship topic and start the mock interview
            </p>
            
          </div>
        </div>

        {connectionError && (
          <div className="mx-4 mb-4 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700 text-center">
            ⚠️ {connectionError}
          </div>
        )}

        <div 
          className="flex-1 flex items-center justify-center relative px-4 py-8" 
          onClick={() => setSelectedAvatar(null)}
        >
          <div 
            className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-20 z-10 w-full max-w-6xl" 
            onClick={e => e.stopPropagation()}
          >
            {allAvatars.map((avatarId) => {
              const avatar = avatarDetails[avatarId];
              const isActive = selectedAvatar === avatarId;
              const AvatarComponent = avatar.component;
              
              return (
                <div
                  key={avatarId}
                  onClick={() => setSelectedAvatar(avatarId)}
                  className="flex flex-col items-center cursor-pointer group"
                  style={{ width: '280px', maxWidth: '90vw' }}
                >
                  <div 
                    className={`transition-all duration-300 ${isActive ? "scale-110" : "opacity-70 group-hover:opacity-90 group-hover:scale-105"}`}
                    style={{ width: '220px', height: '220px' }}
                  >
                    <AvatarComponent isActive={isActive} isSpeaking={false} />
                  </div>
                  <div className="mt-4 md:mt-6 text-center">
                    <span className="text-lg md:text-2xl font-bold text-gray-900 block mb-1">
                      {avatar.name}
                    </span>
                    <span className="text-sm md:text-lg text-gray-600">
                      {avatar.role}
                    </span>
                  </div>
                  {isActive && (
                    <div className="mt-2 md:mt-3 bg-red-100 text-red-700 px-4 md:px-5 py-1.5 md:py-2 rounded-full text-sm md:text-base font-semibold">
                      ✓ Selected
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="pb-6 md:pb-12 px-4 safe-area-bottom">
          <div className="max-w-4xl mx-auto">
            {attachedFile && (
              <div className="mb-3 flex items-center justify-center gap-2 text-sm text-gray-600 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Attached: {attachedFile.name}</span>
                <button
                  onClick={() => {
                    setAttachedFile(null);
                    setFileContent("");
                  }}
                  className="ml-2 text-red-600 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex gap-2 md:gap-3 items-end">
              <div className="flex-1 bg-white border-2 border-gray-300 rounded-2xl px-4 md:px-6 py-3 md:py-4 flex items-center gap-2 md:gap-3 shadow-lg focus-within:border-[#A84448] transition-colors">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Describe your internship topic or attach internship related document ..."
                  className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400 text-sm md:text-lg"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileChange}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`transition-colors flex-shrink-0 ${
                    attachedFile 
                      ? "text-green-600 hover:text-green-700" 
                      : "text-gray-400 hover:text-[#A84448] active:text-[#8B3639]"
                  }`}
                  title="Attach internship report"
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
              </div>

              <button
                onClick={handleStartInterview}
                disabled={!selectedAvatar || isLoading}
                className="p-3 md:p-4 bg-gradient-to-r from-[#A84448] to-[#8B3639] text-white rounded-2xl hover:shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex-shrink-0"
                title="Start interview"
              >
                {isLoading ? (
                  <svg className="w-5 h-5 md:w-6 md:h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
            
            {/* {!selectedAvatar && (
              <p className="text-center text-amber-600 mt-3 text-sm">
                Please select an interviewer above to start
              </p>
            )} */}
          </div>
        </div>
      </div>
    );
  }

  // Interview in progress
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-red-50 via-white to-rose-50">
      {onNavigate && (
        <div className="absolute top-4 left-4 z-50">
          <button
            onClick={onNavigate}
            className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            <span>Viva Bot</span>
          </button>
        </div>
      )}
      {chatVisible ? (
        <>
          <AvatarHeader
            allAvatars={allAvatars}
            avatarDetails={avatarDetails}
            selectedAvatar={selectedAvatar}
            speakingAvatar={speakingAvatar}
            isSpeaking={conversation.isSpeaking}
            onSelectAvatar={handleSwitchAvatar}
          />

          

          {/* Connection status indicator with end button */}
          <div className="px-4 py-2 flex items-center justify-center gap-4">
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              conversation.status === "connected" 
                ? "bg-green-100 text-green-700" 
                : "bg-yellow-100 text-yellow-700"
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                conversation.status === "connected" ? "bg-green-500" : "bg-yellow-500 animate-pulse"
              }`}></span>
              {conversation.status === "connected" ? "Connected" : "Connecting..."}
              {isRecordingLocally && " • Recording..."}
              {conversation.isSpeaking && " • Speaking..."}
            </span>
            <button
              onClick={handleEndInterview}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded-full hover:bg-red-600 transition-colors"
              title="End interview"
            >
              End Interview
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-3 md:px-4 py-4 md:py-8">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} avatarDetails={avatarDetails} />
              ))}

              {(conversation.isSpeaking || isLoading) && (
                <LoadingIndicator isProcessingFollowUp={false} isLoading={isLoading} />
              )}

              {isRecordingLocally && (userInput || interimTranscript) && (
                <RecordingIndicator userInput={userInput} interimTranscript={interimTranscript} />
              )}

              {/* Show recording indicator when locally recording */}
              {isRecordingLocally && !userInput && !interimTranscript && !conversation.isSpeaking && (
                <div className="flex justify-center my-6">
                  <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-full shadow-lg animate-pulse">
                    <div className="flex items-center gap-3">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                      </svg>
                      <span className="font-semibold">🎤 Recording... Speak now!</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Show prompt to record/type when not recording and last message was a question */}
              {!conversation.isSpeaking && !isRecordingLocally && messages.length > 0 && messages[messages.length - 1].type === "question" && (
                <div className="flex justify-center my-6">
                  <div className="bg-gradient-to-r from-[#A84448] to-[#8B3639] text-white px-6 py-3 rounded-full shadow-lg">
                    <div className="flex items-center gap-3">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                      </svg>
                      <span className="font-semibold">Click 🎤 to record or type your answer, then click Send</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <InputBar
            userInput={userInput}
            interimTranscript={interimTranscript}
            isRecording={isRecordingLocally}
            isSpeaking={conversation.isSpeaking}
            isLoading={isLoading}
            chatVisible={chatVisible}
            onInputChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onToggleRecording={handleToggleRecording}
            onSubmit={handleSendTextMessage}
            onToggleChat={() => setChatVisible(false)}
          />
        </>
      ) : (
        <>
          <LargeAvatarView
            allAvatars={allAvatars}
            avatarDetails={avatarDetails}
            selectedAvatar={selectedAvatar}
            speakingAvatar={speakingAvatar}
            isSpeaking={conversation.isSpeaking}
            onSelectAvatar={handleSwitchAvatar}
          />

          <InputBar
            userInput={userInput}
            interimTranscript={interimTranscript}
            isRecording={isRecordingLocally}
            isSpeaking={conversation.isSpeaking}
            isLoading={isLoading}
            chatVisible={chatVisible}
            onInputChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onToggleRecording={handleToggleRecording}
            onSubmit={handleSendTextMessage}
            onToggleChat={() => setChatVisible(true)}
          />
        </>
      )}
    </div>
  );
};

export default InterviewBot;
