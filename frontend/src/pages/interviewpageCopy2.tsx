import { useState, useEffect, useRef } from "react";
import HRAvatar from "../components/HRAvatar";
import AcademicAvatar from "../components/AcademicAvatar";
import BusinessAvatar from "../components/BusinessAvatar";

type Message = {
  id: number;
  type: "question" | "answer";
  text: string;
  avatar: string;
};

const InterviewPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [messageIdCounter, setMessageIdCounter] = useState(0);
  const [speakingAvatar, setSpeakingAvatar] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [streamingResponse, setStreamingResponse] = useState(""); // NEW: For streaming text
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const streamingResponseRef = useRef(""); // NEW: Ref for streaming accumulation

  const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVEN_API_KEY;

  useEffect(() => {
    console.log("ElevenLabs API Key present:", !!ELEVENLABS_API_KEY);
    
    if (!ELEVENLABS_API_KEY) {
      console.error("⚠️ VITE_ELEVEN_API_KEY not found in environment variables!");
    }
  }, [ELEVENLABS_API_KEY]);

  const avatarDetails: Record<string, { 
    name: string; 
    role: string; 
    agentId: string;
    component: typeof HRAvatar;
  }> = {
    hr: {
      name: "HR Interviewer",
      role: "Human Resources",
      agentId: "agent_5301kbq93mvjfhk8tmg3q3vjj2qe",
      component: HRAvatar,
    },
    academic: {
      name: "Academic Interviewer",
      role: "Academic Specialist",
      agentId: "agent_6201kbq60714fxz8re3wnm9hg01z",
      component: AcademicAvatar,
    },
    business: {
      name: "Business Interviewer",
      role: "Business Strategy",
      agentId: "agent_3601kbq5xmrqe53apvy8g3q34w7f",
      component: BusinessAvatar,
    },
  };

  const allAvatars = Object.keys(avatarDetails);

  // Initialize audio context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000, // ElevenLabs uses 16kHz PCM
    });
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Convert PCM16 to AudioBuffer
  const pcm16ToAudioBuffer = async (pcm16Data: Int16Array): Promise<AudioBuffer | null> => {
    if (!audioContextRef.current) return null;

    try {
      // Create an AudioBuffer
      const audioBuffer = audioContextRef.current.createBuffer(
        1, // mono
        pcm16Data.length,
        16000 // 16kHz sample rate
      );

      // Get the channel data
      const channelData = audioBuffer.getChannelData(0);

      // Convert Int16 PCM to Float32 [-1, 1]
      for (let i = 0; i < pcm16Data.length; i++) {
        channelData[i] = pcm16Data[i] / 32768.0; // Convert to float [-1, 1]
      }

      return audioBuffer;
    } catch (error) {
      console.error("Error converting PCM to AudioBuffer:", error);
      return null;
    }
  };

  // Play audio from queue
  const playAudioFromQueue = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    
    isPlayingRef.current = true;
    const pcmData = audioQueueRef.current.shift();
    
    if (pcmData && audioContextRef.current) {
      try {
        const audioBuffer = await pcm16ToAudioBuffer(pcmData);
        
        if (audioBuffer) {
          const source = audioContextRef.current.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioContextRef.current.destination);
          
          source.onended = () => {
            isPlayingRef.current = false;
            if (audioQueueRef.current.length > 0) {
              playAudioFromQueue();
            } else {
              setIsSpeaking(false);
              setSpeakingAvatar(null);
            }
          };
          
          source.start(0);
        } else {
          isPlayingRef.current = false;
          setIsSpeaking(false);
          setSpeakingAvatar(null);
        }
      } catch (error) {
        console.error("Error playing audio:", error);
        isPlayingRef.current = false;
        setIsSpeaking(false);
        setSpeakingAvatar(null);
      }
    } else {
      isPlayingRef.current = false;
    }
  };

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
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
          setUserInput(prev => prev + final);
          setInterimTranscript('');
          
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          
          silenceTimerRef.current = window.setTimeout(() => {
            if (recognition) {
              recognition.stop();
              setIsRecording(false);
              if (interviewStarted) {
                handleSubmitAnswerInternal();
              } else {
                handleStartInterviewInternal();
              }
            }
          }, 4000);
        } else {
          setInterimTranscript(interim);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, [interviewStarted]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    } else {
      setUserInput('');
      setInterimTranscript('');
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const getNextMessageId = () => {
    const id = messageIdCounter;
    setMessageIdCounter(prev => prev + 1);
    return id;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      
      reader.onerror = (error) => {
        reject(error);
      };
      
      reader.readAsText(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      
      try {
        const content = await readFileContent(file);
        setFileContent(content);
        console.log("File attached:", file.name);
      } catch (error) {
        console.error("Error reading file:", error);
        alert("Error reading file. Please try again.");
      }
      
      e.target.value = "";
    }
  };

  const sendTextMessage = (text: string) => {
    if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
      console.error("WebSocket is not connected. State:", websocketRef.current?.readyState);
      return;
    }

    console.log("=== SENDING TEXT MESSAGE ===");
    console.log("Text:", text);
    console.log("WebSocket state:", websocketRef.current.readyState);

    // ElevenLabs Conversational AI - try multiple formats
    
    // Format 1: Simple text object
    // const format1 = { text: text };
    
    // Format 2: With type field
    const format2 = { type: "text", text: text };
    
    // Format 3: User message format
    // const format3 = { 
    //   type: "user_message",
    //   user_message: {
    //     text: text
    //   }
    // };

    // Format 4: Chat message format
    // const format4 = {
    //   type: "chat_message",
    //   chat_message: {
    //     role: "user",
    //     content: text
    //   }
    // };

    // Let's try format 2 first (type + text)
    const message = format2;

    console.log("Trying message format:", JSON.stringify(message, null, 2));

    try {
      websocketRef.current.send(JSON.stringify(message));
      console.log("✓ Message sent with format 2");
    } catch (error) {
      console.error("✗ Error sending message:", error);
    }
  };

  const startConversation = async (agentId: string, initialContext: string) => {
    try {
      setIsLoading(true);
      
      console.log("=== STARTING CONVERSATION ===");
      console.log("Agent ID:", agentId);
      console.log("Initial context:", initialContext);

      // First, fetch agent details to verify LLM configuration
      console.log("=== FETCHING AGENT CONFIGURATION ===");
      try {
        const agentDetailsResponse = await fetch(
          `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
          {
            method: 'GET',
            headers: {
              'xi-api-key': ELEVENLABS_API_KEY,
            },
          }
        );

        if (agentDetailsResponse.ok) {
          const agentDetails = await agentDetailsResponse.json();
          console.log("=== AGENT CONFIGURATION RETRIEVED ===");
          console.log("Full Agent Details:", JSON.stringify(agentDetails, null, 2));
          
          // Check LLM configuration - it's nested in agent.prompt.llm
          if (agentDetails.conversation_config?.agent?.prompt?.llm) {
            const llmModel = agentDetails.conversation_config.agent.prompt.llm;
            const temperature = agentDetails.conversation_config.agent.prompt.temperature;
            const maxTokens = agentDetails.conversation_config.agent.prompt.max_tokens;
            
            console.log("=== 🤖 LLM CONFIGURATION ===");
            console.log("  ✓ Model:", llmModel);
            console.log("  ✓ Temperature:", temperature);
            console.log("  ✓ Max Tokens:", maxTokens);
            
            if (llmModel.toLowerCase().includes('gemini')) {
              console.log("✅ CONFIRMED: Agent is using Gemini LLM:", llmModel);
              console.log("🎯 This agent will use Google's Gemini model for responses!");
            } else {
              console.log("⚠️ WARNING: Agent is using a different LLM:", llmModel);
            }
          } else {
            console.log("❌ LLM configuration not found in agent details");
          }

          // Check TTS configuration
          if (agentDetails.conversation_config?.tts) {
            const ttsConfig = agentDetails.conversation_config.tts;
            console.log("=== 🔊 TTS (TEXT-TO-SPEECH) CONFIGURATION ===");
            console.log("  ✓ Voice ID:", ttsConfig.voice_id);
            console.log("  ✓ Model:", ttsConfig.model_id);
            console.log("  ✓ Speed:", ttsConfig.speed || "default");
            console.log("  ✓ Stability:", ttsConfig.stability || "default");
            console.log("  ✓ Similarity Boost:", ttsConfig.similarity_boost || "default");
          }

          // Check agent metadata
          console.log("=== 📋 AGENT METADATA ===");
          console.log("  ✓ Name:", agentDetails.name);
          console.log("  ✓ Language:", agentDetails.conversation_config?.agent?.language);
          console.log("  ✓ First Message:", agentDetails.conversation_config?.agent?.first_message);
          
          // Check system prompt
          if (agentDetails.conversation_config?.agent?.prompt?.prompt) {
            const promptPreview = agentDetails.conversation_config.agent.prompt.prompt.substring(0, 100);
            console.log("  ✓ System Prompt (preview):", promptPreview + "...");
          }
        } else {
          console.warn("⚠️ Could not fetch agent details:", agentDetailsResponse.status);
        }
      } catch (agentError) {
        console.error("❌ Error fetching agent details:", agentError);
      }

      // Get signed URL for WebSocket connection
      const signedUrlResponse = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`, 
        {
          method: 'GET',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
          },
        }
      );

      if (!signedUrlResponse.ok) {
        const errorText = await signedUrlResponse.text();
        console.error("Signed URL error response:", errorText);
        throw new Error(`Failed to get signed URL: ${signedUrlResponse.status} - ${errorText}`);
      }

      const responseData = await signedUrlResponse.json();
      console.log("✓ Response data:", responseData);
      
      const signedUrl = responseData.signed_url;
      
      if (!signedUrl) {
        throw new Error("No signed_url in response");
      }

      console.log("✓ Got signed URL for WebSocket");

      // Connect to WebSocket
      const ws = new WebSocket(signedUrl);
      websocketRef.current = ws;

      let firstMessageReceived = false;
      let contextSent = false;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Skip logging ping events to reduce console noise
          if (data.type === 'ping') {
            return;
          }

          // LOG EVERYTHING
          console.log("╔════════════════════════════════════════╗");
          console.log("║ WEBSOCKET MESSAGE RECEIVED              ║");
          console.log("╠════════════════════════════════════════╣");
          console.log("║ Type:", data.type);
          console.log("╚════════════════════════════════════════╝");
          console.log("Full data:", JSON.stringify(data, null, 2));

          if (data.type === 'conversation_initiation_metadata') {
            console.log("✓ Conversation initialized");
            const convId = data.conversation_initiation_metadata_event?.conversation_id;
            console.log("Conversation ID:", convId);
          } else if (data.type === 'audio') {
            console.log("🔊 Audio chunk received");
            setIsSpeaking(true);
            setSpeakingAvatar(selectedAvatar || "business");
            
            const audioBase64 = data.audio_event?.audio_base_64 || data.audio;
            if (audioBase64) {
              console.log("Audio base64 length:", audioBase64.length);
              const binaryString = atob(audioBase64);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const pcm16 = new Int16Array(bytes.buffer);
              audioQueueRef.current.push(pcm16);
              playAudioFromQueue();
            }
          } else if (data.type === 'user_transcript') {
            const transcript = data.user_transcription_event?.user_transcript || data.transcript;
            console.log("👤 User transcript:", transcript);
          } else if (data.type === 'agent_response') {
            console.log("🤖🤖🤖 AGENT RESPONSE (COMPLETE)! 🤖🤖🤖");
            const responseText = data.agent_response_event?.agent_response || data.response || data.text;
            console.log("Response text:", responseText);
            
            // Mark first message as received
            if (!firstMessageReceived) {
              firstMessageReceived = true;
              console.log("✓ First message received from agent");
              
              // NOW send the context after the agent's first message is complete
              if (!contextSent) {
                contextSent = true;
                setTimeout(() => {
                  const contextMessage = fileContent 
                    ? `Here is my internship context: My area is ${initialContext}. My report: ${fileContent.substring(0, 3000)}. Please ask me your first interview question.`
                    : `My internship area is ${initialContext}. Please ask me your first interview question about this topic.`;
                  
                  console.log("=== SENDING CONTEXT AFTER FIRST MESSAGE ===");
                  console.log("Context:", contextMessage);
                  sendTextMessage(contextMessage);
                }, 500);
              }
            }
            
            // Clear streaming response
            streamingResponseRef.current = "";
            setStreamingResponse("");
            
            if (responseText) {
              const agentMessage: Message = {
                id: getNextMessageId(),
                type: "question",
                text: responseText,
                avatar: selectedAvatar || "business",
              };
              setMessages((prev) => [...prev, agentMessage]);
            }
          } else if (data.type === 'agent_chat_response_part') {
            // Handle streaming/partial responses
            console.log("📝 Agent chat response part (streaming):", data);
            
            const partialText = data.text_response_part?.text || 
                               data.agent_chat_response_part_event?.text ||
                               data.text || "";
            
            if (partialText) {
              console.log("Partial text chunk:", partialText);
              streamingResponseRef.current += partialText;
              setStreamingResponse(streamingResponseRef.current);
              console.log("Accumulated response:", streamingResponseRef.current);
            }
          } else if (data.type === 'agent_chat_response_end' || data.type === 'text_response_end') {
            // Text response complete
            console.log("📝 Agent chat response COMPLETE");
            console.log("Final accumulated text:", streamingResponseRef.current);
            
            if (streamingResponseRef.current.trim()) {
              const agentMessage: Message = {
                id: getNextMessageId(),
                type: "question",
                text: streamingResponseRef.current,
                avatar: selectedAvatar || "business",
              };
              setMessages((prev) => [...prev, agentMessage]);
            }
            
            // Clear streaming response
            streamingResponseRef.current = "";
            setStreamingResponse("");
          } else if (data.type === 'agent_response_correction') {
            console.log("📝 Response correction:", data);
          } else if (data.type === 'interruption') {
            console.log("⚠️ Interrupted");
            audioQueueRef.current = [];
            isPlayingRef.current = false;
            setIsSpeaking(false);
            setSpeakingAvatar(null);
            streamingResponseRef.current = "";
            setStreamingResponse("");
          } else if (data.type === 'error') {
            console.error("❌ SERVER ERROR:", JSON.stringify(data, null, 2));
          } else {
            console.log("❓ Unknown type:", data.type);
          }
        } catch (error) {
          console.error("Parse error:", error);
          console.error("Raw data:", event.data);
        }
      };

      ws.onopen = () => {
        console.log("=== WEBSOCKET CONNECTED ===");
        console.log("ReadyState:", ws.readyState);
        setIsLoading(false);
        
        // Don't send context here - wait for agent's first message
        console.log("Waiting for agent's first message before sending context...");
      };

      ws.onerror = (error) => {
        console.error("=== WEBSOCKET ERROR ===");
        console.error("Error:", error);
        setIsLoading(false);
      };

      ws.onclose = (event) => {
        console.log("=== WEBSOCKET CLOSED ===");
        console.log("Code:", event.code);
        console.log("Reason:", event.reason);
        console.log("Was clean:", event.wasClean);
        setIsSpeaking(false);
        setSpeakingAvatar(null);
      };

    } catch (error: any) {
      console.error("=== ERROR STARTING CONVERSATION ===");
      console.error(error);
      alert("Failed to start interview. Error: " + (error.message || "Unknown error") + "\n\nPlease check:\n1. Your API key is valid\n2. The agent ID is correct\n3. You have access to Conversational AI");
      setInterviewStarted(false);
      setIsLoading(false);
    }
  };

  const handleSubmitAnswerInternal = async () => {
    if (!userInput.trim() || isSpeaking || !websocketRef.current) {
      console.warn("Cannot submit answer:", {
        hasInput: !!userInput.trim(),
        isSpeaking,
        hasWebSocket: !!websocketRef.current,
        wsState: websocketRef.current?.readyState
      });
      return;
    }

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    console.log("=== SUBMITTING ANSWER ===");
    console.log("Answer:", userInput);

    const answerMessage: Message = {
      id: getNextMessageId(),
      type: "answer",
      text: userInput,
      avatar: "user",
    };

    setMessages((prev) => {
      console.log("Adding user answer. Total messages:", prev.length + 1);
      return [...prev, answerMessage];
    });
    
    const answerText = userInput;
    setUserInput("");
    setInterimTranscript("");

    try {
      console.log("Sending answer to agent...");
      // Just send the answer without extra instructions
      sendTextMessage(answerText);
    } catch (error) {
      console.error("❌ Error in handleSubmitAnswerInternal:", error);
    }
  };

  const handleStartInterviewInternal = async () => {
    if (!userInput.trim()) return;

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    setInterviewStarted(true);

    const topicMessage: Message = {
      id: getNextMessageId(),
      type: "answer",
      text: userInput + (attachedFile ? ` (with ${attachedFile.name})` : ""),
      avatar: "user",
    };
    setMessages([topicMessage]);

    const inputCopy = userInput;
    setUserInput("");
    setInterimTranscript("");

    const agentId = selectedAvatar 
      ? avatarDetails[selectedAvatar].agentId 
      : avatarDetails["business"].agentId;

    await startConversation(agentId, inputCopy);
  };

  const handleStartInterview = () => {
    handleStartInterviewInternal();
  };

  const handleSubmitAnswer = () => {
    handleSubmitAnswerInternal();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!interviewStarted) {
        handleStartInterview();
      } else {
        handleSubmitAnswer();
      }
    }
  };

  if (!interviewStarted) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-red-50 via-white to-rose-50">
        <div className="pt-8 md:pt-16 pb-4 md:pb-8 px-4">
          <div className="text-center">
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-2 md:mb-4">
              Welcome to Your Internship Viva Mock Interview
            </h1>
            <p className="text-base md:text-xl text-gray-600">
              Select an interviewer and submit your internship report
            </p>
          </div>
        </div>

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
                  className="flex flex-col items-center cursor-pointer group w-full md:w-auto"
                >
                  <div className={`transition-all duration-300 ${isActive ? "scale-110" : "opacity-70 group-hover:opacity-90 group-hover:scale-105"}`}>
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
              <button
                onClick={toggleRecording}
                className={`p-3 md:p-4 rounded-xl transition-all flex-shrink-0 ${
                  isRecording ? "bg-red-500 text-white animate-pulse shadow-lg" : "bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300"
                }`}
                title={isRecording ? "Stop recording (or auto-submits after 4s silence)" : "Start voice recording"}
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              </button>

              <div className="flex-1 bg-white border-2 border-gray-300 rounded-2xl px-4 md:px-6 py-3 md:py-4 flex items-center gap-2 md:gap-3 shadow-lg focus-within:border-[#A84448] transition-colors">
                <input
                  type="text"
                  value={userInput + interimTranscript}
                  onChange={(e) => !isRecording && setUserInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isRecording ? "Listening... (auto-submits after 4s silence)" : "Internship area (e.g., Software Development)"}
                  className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400 text-sm md:text-lg"
                  disabled={isRecording}
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
                disabled={!userInput.trim()}
                className="p-3 md:p-4 bg-gradient-to-r from-[#A84448] to-[#8B3639] text-white rounded-2xl hover:shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex-shrink-0"
                title="Start interview"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-red-50 via-white to-rose-50">
      <div className="border-b border-gray-200 bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-2 md:px-4 py-6 md:py-10">
          <div className="flex items-center justify-center gap-6 md:gap-16 overflow-visible pb-4">
            {allAvatars.map((avatarId) => {
              const avatar = avatarDetails[avatarId];
              const AvatarComponent = avatar.component;
              const isCurrentlySpeaking = speakingAvatar === avatarId;
              const isSelected = selectedAvatar === avatarId;
              
              return (
                <div 
                  key={avatarId} 
                  className={`flex flex-col items-center flex-shrink-0 cursor-pointer transition-all ${
                    isSpeaking && !isCurrentlySpeaking ? 'opacity-50' : 'hover:scale-105'
                  }`}
                  onClick={() => {
                    if (!isSpeaking) {
                      setSelectedAvatar(avatarId);
                    }
                  }}
                  title={isSpeaking ? "Wait for current speaker to finish" : `Select ${avatar.name}`}
                >
                  <div className="relative flex items-center justify-center pt-3 pb-1">
                    {/* Selection ring - positioned absolutely behind */}
                    {isSelected && (
                      <div className="absolute inset-0 rounded-full ring-4 ring-[#A84448] scale-110 animate-pulse" 
                           style={{ top: '0', left: '0', right: '0', bottom: '0' }} />
                    )}
                    
                    {/* Avatar container */}
                    <div className="w-16 h-16 md:w-28 md:h-28 flex items-center justify-center relative z-10">
                      <div className="scale-[0.45] md:scale-[0.75] origin-center">
                        <AvatarComponent isActive={isSelected} isSpeaking={isCurrentlySpeaking} />
                      </div>
                    </div>
                    
                    {/* Checkmark badge - positioned on top */}
                    {isSelected && (
                      <div className="absolute -top-0 -right-0 w-7 h-7 bg-[#A84448] rounded-full flex items-center justify-center shadow-lg z-20 border-2 border-white">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <span className={`text-xs md:text-sm font-semibold mt-2 md:mt-3 text-center whitespace-nowrap ${
                    isSelected ? 'text-[#A84448]' : 'text-gray-700'
                  }`}>
                    {avatar.name}
                  </span>
                  
                  {isCurrentlySpeaking && (
                    <div className="flex gap-1 mt-1">
                      <div className="w-1.5 h-3 bg-[#A84448] rounded-full animate-pulse"></div>
                      <div className="w-1.5 h-3 bg-[#A84448] rounded-full animate-pulse delay-75"></div>
                      <div className="w-1.5 h-3 bg-[#A84448] rounded-full animate-pulse delay-150"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-3 md:px-4 py-4 md:py-8">
          {messages.map((message) => {
            const messageAvatar = message.type === "question" ? avatarDetails[message.avatar] : null;
            const AvatarComponent = messageAvatar?.component;
            
            return (
              <div
                key={message.id}
                className={`flex gap-2 md:gap-4 mb-4 md:mb-8 ${message.type === "answer" ? "justify-end" : ""}`}
              >
                {message.type === "question" && AvatarComponent && (
                  <div className="w-8 h-8 md:w-12 md:h-12 flex items-center justify-center flex-shrink-0">
                    <div className="scale-[0.2] md:scale-[0.3] origin-center">
                      <AvatarComponent isActive={false} isSpeaking={false} />
                    </div>
                  </div>
                )}

                <div
                  className={`max-w-[85%] md:max-w-2xl rounded-2xl px-4 md:px-6 py-3 md:py-4 shadow-md ${
                    message.type === "question"
                      ? "bg-gray-100 text-gray-900"
                      : "bg-gradient-to-r from-[#A84448] to-[#8B3639] text-white ml-auto"
                  }`}
                >
                  {message.type === "question" && messageAvatar && (
                    <div className="font-semibold text-xs md:text-sm text-[#A84448] mb-1">
                      {messageAvatar.name}
                    </div>
                  )}
                  <p className="text-sm md:text-base leading-relaxed break-words">{message.text}</p>
                </div>

                {message.type === "answer" && (
                  <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-[#A84448] to-[#8B3639] flex items-center justify-center flex-shrink-0 shadow-lg">
                    <span className="text-white font-bold text-xs md:text-sm">You</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Show streaming response */}
          {streamingResponse && (
            <div className="flex gap-2 md:gap-4 mb-4 md:mb-8">
              <div className="w-8 h-8 md:w-12 md:h-12 flex items-center justify-center flex-shrink-0">
                {selectedAvatar && (() => {
                  const AvatarComp = avatarDetails[selectedAvatar].component;
                  return (
                    <div className="scale-[0.2] md:scale-[0.3] origin-center">
                      <AvatarComp isActive={false} isSpeaking={true} />
                    </div>
                  );
                })()}
              </div>
              <div className="max-w-[85%] md:max-w-2xl rounded-2xl px-4 md:px-6 py-3 md:py-4 shadow-md bg-gray-100 text-gray-900">
                <div className="font-semibold text-xs md:text-sm text-[#A84448] mb-1">
                  {selectedAvatar ? avatarDetails[selectedAvatar].name : "Interviewer"}
                </div>
                <p className="text-sm md:text-base leading-relaxed break-words">
                  {streamingResponse}
                  <span className="inline-block w-2 h-4 bg-[#A84448] ml-1 animate-pulse"></span>
                </p>
              </div>
            </div>
          )}

          {(isSpeaking || isLoading) && !streamingResponse && (
            <div className="flex gap-2 md:gap-4 mb-4 md:mb-8">
              <div className="flex items-center gap-2 text-gray-500 text-xs md:text-sm">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-[#A84448] rounded-full animate-pulse"></div>
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-[#A84448] rounded-full animate-pulse delay-75"></div>
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-[#A84448] rounded-full animate-pulse delay-150"></div>
                </div>
                <span className="font-medium">{isLoading ? "Starting conversation..." : "Speaking..."}</span>
              </div>
            </div>
          )}

          {isRecording && (
            <div className="flex gap-2 md:gap-4 mb-4 md:mb-8 justify-end animate-in fade-in slide-in-from-right duration-300">
              <div className="max-w-[85%] md:max-w-2xl rounded-2xl px-4 md:px-6 py-3 md:py-4 shadow-lg bg-gradient-to-r from-[#A84448] to-[#8B3639] text-white border-2 border-white/30">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-4 bg-white rounded-full animate-pulse"></div>
                    <div className="w-2 h-5 bg-white rounded-full animate-pulse delay-75"></div>
                    <div className="w-2 h-3 bg-white rounded-full animate-pulse delay-150"></div>
                  </div>
                  <span className="text-sm font-bold">🎤 Recording...</span>
                  <span className="text-xs opacity-80">(auto-submits after 4s silence)</span>
                </div>
                <p className="text-base md:text-lg leading-relaxed break-words min-h-[2rem]">
                  {userInput ? (
                    <>
                      {userInput}
                      {interimTranscript && (
                        <span className="opacity-60 italic">{interimTranscript}</span>
                      )}
                    </>
                  ) : (
                    <span className="opacity-70 italic">
                      {interimTranscript || "Start speaking..."}
                    </span>
                  )}
                </p>
                <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between">
                  <span className="text-xs opacity-70">Click mic to stop manually</span>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                    <span>LIVE</span>
                  </div>
                </div>
              </div>
              <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-[#A84448] to-[#8B3639] flex items-center justify-center flex-shrink-0 shadow-lg ring-4 ring-red-200 animate-pulse">
                <span className="text-white font-bold text-xs md:text-sm">You</span>
              </div>
            </div>
          )}

          {!isSpeaking && !isRecording && messages.length > 0 && messages[messages.length - 1].type === "question" && (
            <div className="flex justify-center my-6">
              <div className="bg-gradient-to-r from-[#A84448] to-[#8B3639] text-white px-6 py-3 rounded-full shadow-lg animate-bounce">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold">Tap microphone to answer</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-gray-200 bg-white shadow-lg sticky bottom-0 safe-area-bottom">
        <div className="max-w-4xl mx-auto px-3 md:px-4 py-3 md:py-4">
          <div className="flex gap-2 md:gap-3 items-end">
            <button
              onClick={toggleRecording}
              disabled={isSpeaking}
              className={`p-3 md:p-4 rounded-xl transition-all flex-shrink-0 relative ${
                isRecording 
                  ? "bg-red-500 text-white animate-pulse shadow-2xl ring-4 ring-red-300 scale-110" 
                  : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 active:bg-gray-300 shadow-md"
              } ${!isRecording && !isSpeaking ? 'ring-2 ring-[#A84448]/50 animate-pulse' : ''}`}
              title={isRecording ? "Click to stop recording" : "Start voice recording (Recommended)"}
            >
              <svg className="w-6 h-6 md:w-7 md:h-7" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
            </button>

            <div className="flex-1 bg-white border-2 border-gray-300 rounded-2xl px-4 md:px-6 py-3 md:py-4 flex items-center gap-2 md:gap-3 shadow-lg focus-within:border-[#A84448] transition-colors">
              <input
                type="text"
                value={userInput + interimTranscript}
                onChange={(e) => !isRecording && setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isRecording ? "Listening... (auto-submits after 4s silence)" : "Type your answer or use voice..."}
                className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400 text-sm md:text-lg"
                disabled={isRecording || isSpeaking}
              />
            </div>

            <button
              onClick={handleSubmitAnswer}
              disabled={!userInput.trim() || isSpeaking}
              className="p-3 md:p-4 bg-gradient-to-r from-[#A84448] to-[#8B3639] text-white rounded-2xl hover:shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex-shrink-0"
              title="Submit answer"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewPage;
