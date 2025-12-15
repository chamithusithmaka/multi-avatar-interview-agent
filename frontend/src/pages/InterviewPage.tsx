import { useState, useEffect, useRef } from "react";
import HRAvatar from "../components/HRAvatar";
import AcademicAvatar from "../components/AcademicAvatar";
import BusinessAvatar from "../components/BusinessAvatar";
import AvatarHeader from "../components/AvatarHeader";
import ChatMessage from "../components/ChatMessage";
import LoadingIndicator from "../components/LoadingIndicator";
import RecordingIndicator from "../components/RecordingIndicator";
import InputBar from "../components/InputBar";
import LargeAvatarView from "../components/LargeAvatarView";
import { generateAudio } from "../utils/audioService";
import { generateQuestions } from "../utils/questionService";
import { readFileContent } from "../utils/fileService";
import { chatHistory } from "../utils/chatHistoryService";

type Message = {
  id: number;
  type: "question" | "answer";
  text: string;
  avatar: string;
  audioUrl?: string;
};

const InterviewPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [messageIdCounter, setMessageIdCounter] = useState(0);
  const [speakingAvatar, setSpeakingAvatar] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [introducedAvatars, setIntroducedAvatars] = useState<Set<string>>(new Set());
  const [chatVisible, setChatVisible] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<number | null>(null);

  const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVEN_API_KEY;
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  const SILENCE_DURATION = 4000; // 4 seconds

  const avatarDetails: Record<string, { 
    name: string; 
    role: string; 
    voiceId: string;
    component: typeof HRAvatar;
    firstMessage: string; // Add first message for each avatar
  }> = {
    hr: {
      name: "HR Interviewer",
      role: "Human Resources",
      voiceId: "agent_0801kbwz7tg0efgrta5hb968dd4x",
      component: HRAvatar,
      firstMessage: "Hi, I'm the HR interviewer. Let's start your interview.",
    },
    academic: {
      name: "Academic Interviewer",
      role: "Academic Specialist",
      voiceId: "agent_2101kbwzc7qhemmtcjmmrndah27q",
      component: AcademicAvatar,
      firstMessage: "Hi, I'm the Academic interviewer. Let's begin your interview.",
    },
    business: {
      name: "Business Interviewer",
      role: "Business Strategy",
      voiceId: "agent_9301kbwzafa4f0htwzcssc0r49dk",
      component: BusinessAvatar,
      firstMessage: "Hi, I'm the Business interviewer. Let's get started.",
    },
  };

  const allAvatars = Object.keys(avatarDetails);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interim = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interim += transcript;
          }
        }

        if (finalTranscript) {
          setUserInput(prev => prev + finalTranscript);
          setInterimTranscript('');
          
          // Reset silence timer when user speaks
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          
          // Start new silence timer for auto-submit during interview
          if (interviewStarted) {
            silenceTimerRef.current = setTimeout(() => {
              if (isRecording) {
                handleAutoSubmit();
              }
            }, SILENCE_DURATION);
          }
        } else {
          setInterimTranscript(interim);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        setInterimTranscript('');
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsRecording(false);
        setInterimTranscript('');
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [interviewStarted]);

  const handleAutoSubmit = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
    
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    
    setIsRecording(false);
    setInterimTranscript('');
    
    // Submit the answer after a brief delay
    setTimeout(() => {
      if (interviewStarted) {
        handleSubmitAnswer();
      } else {
        handleStartInterview();
      }
    }, 500);
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setInterimTranscript('');
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    } else {
      try {
        setUserInput(''); // Clear previous input when starting new recording
        setInterimTranscript('');
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setIsRecording(false);
      }
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
        alert("Error reading file. Please try a text file (.txt) for now.");
      }
      
      e.target.value = "";
    }
  };

  const askNextQuestion = async () => {
    // Prevent multiple calls
    if (isSpeaking || isLoading) {
      console.log('Skipping askNextQuestion - already speaking or loading');
      return;
    }
    
    console.log('askNextQuestion called - currentIndex:', currentQuestionIndex, 'total questions:', questions.length);
    
    // Check if we've run out of questions
    if (currentQuestionIndex >= questions.length) {
      console.log('No more questions - interview complete');
      
      // Only show completion if we've actually asked all questions
      if (messages.filter(m => m.type === "question").length > 1) {
        const randomAvatar = selectedAvatar || allAvatars[Math.floor(Math.random() * allAvatars.length)];
        const voiceId = avatarDetails[randomAvatar].voiceId;
        
        const completeMessage: Message = {
          id: getNextMessageId(),
          type: "question",
          text: "Thank you for completing the interview! We'll review your responses and get back to you soon.",
          avatar: randomAvatar,
        };
        setMessages((prev) => [...prev, completeMessage]);
        setIsSpeaking(true);
        setSpeakingAvatar(randomAvatar);
        
        const audioUrl = await generateAudio(completeMessage.text, voiceId, ELEVENLABS_API_KEY);
        if (audioRef.current && audioUrl) {
          audioRef.current.src = audioUrl;
          
          audioRef.current.onloadeddata = () => {
            audioRef.current?.play().catch(err => {
              console.error("Error playing audio:", err);
              setIsSpeaking(false);
              setSpeakingAvatar(null);
            });
          };

          audioRef.current.onended = () => {
            setIsSpeaking(false);
            setSpeakingAvatar(null);
          };

          audioRef.current.onerror = () => {
            setIsSpeaking(false);
            setSpeakingAvatar(null);
          };
        } else {
          setIsSpeaking(false);
          setSpeakingAvatar(null);
        }
      }
      return;
    }

    // Select avatar for this question
    const questionAvatar = selectedAvatar || allAvatars[Math.floor(Math.random() * allAvatars.length)];
    const voiceId = avatarDetails[questionAvatar].voiceId;
    const needsIntroduction = !introducedAvatars.has(questionAvatar);

    // If this avatar hasn't introduced themselves, do it first
    if (needsIntroduction) {
      console.log(`${questionAvatar} introducing themselves for the first time`);
      
      const introMessage: Message = {
        id: getNextMessageId(),
        type: "question",
        text: avatarDetails[questionAvatar].firstMessage,
        avatar: questionAvatar,
      };
      
      setMessages((prev) => [...prev, introMessage]);
      setIsSpeaking(true);
      setSpeakingAvatar(questionAvatar);
      setIntroducedAvatars(prev => new Set([...prev, questionAvatar]));

      const introAudioUrl = await generateAudio(introMessage.text, voiceId, ELEVENLABS_API_KEY);
      
      if (audioRef.current && introAudioUrl) {
        audioRef.current.src = introAudioUrl;
        
        audioRef.current.onloadeddata = () => {
          audioRef.current?.play().catch(err => {
            console.error("Error playing audio:", err);
            setIsSpeaking(false);
            setSpeakingAvatar(null);
          });
        };

        audioRef.current.onended = () => {
          setIsSpeaking(false);
          setSpeakingAvatar(null);
          // Auto-start recording for user to respond to introduction
          setTimeout(() => {
            if (!isRecording && recognitionRef.current) {
              try {
                setUserInput('');
                setInterimTranscript('');
                recognitionRef.current.start();
                setIsRecording(true);
              } catch (error) {
                console.error('Error auto-starting recording:', error);
              }
            }
          }, 800);
        };

        audioRef.current.onerror = () => {
          setIsSpeaking(false);
          setSpeakingAvatar(null);
        };
      } else {
        setIsSpeaking(false);
        setSpeakingAvatar(null);
      }
    } else {
      // Avatar already introduced, just ask the question
      await askActualQuestion(questionAvatar);
    }
  };

  const askActualQuestion = async (questionAvatar: string) => {
    if (currentQuestionIndex >= questions.length) return;

    const questionText = questions[currentQuestionIndex];
    console.log('Asking question #', currentQuestionIndex + 1, ':', questionText);
    
    // Add question to chat history
    chatHistory.addQuestion(questionAvatar, questionText);
    
    const voiceId = avatarDetails[questionAvatar].voiceId;

    const newMessage: Message = {
      id: getNextMessageId(),
      type: "question",
      text: questionText,
      avatar: questionAvatar,
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsSpeaking(true);
    setSpeakingAvatar(questionAvatar);
    
    // Increment immediately after adding the question to messages
    setCurrentQuestionIndex((prev) => prev + 1);

    const audioUrl = await generateAudio(questionText, voiceId, ELEVENLABS_API_KEY);
    if (audioRef.current && audioUrl) {
      audioRef.current.src = audioUrl;
      
      audioRef.current.onloadeddata = () => {
        audioRef.current?.play().catch(err => {
          console.error("Error playing audio:", err);
          setIsSpeaking(false);
          setSpeakingAvatar(null);
        });
      };

      audioRef.current.onended = () => {
        setIsSpeaking(false);
        setSpeakingAvatar(null);
        // Auto-start recording after question ends
        setTimeout(() => {
          if (!isRecording && recognitionRef.current) {
            try {
              setUserInput('');
              setInterimTranscript('');
              recognitionRef.current.start();
              setIsRecording(true);
            } catch (error) {
              console.error('Error auto-starting recording:', error);
            }
          }
        }, 800);
      };

      audioRef.current.onerror = () => {
        setIsSpeaking(false);
        setSpeakingAvatar(null);
      };
    } else {
      setIsSpeaking(false);
      setSpeakingAvatar(null);
    }
  };

  const handleStartInterview = async () => {
    if (!userInput.trim()) return;

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    setIsLoading(true);
    setInterviewStarted(true);

    // Reset chat history for new interview
    chatHistory.reset();

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

    // Generate questions first
    const generatedQuestions = await generateQuestions(inputCopy, GEMINI_API_KEY, fileContent || undefined);
    
    if (generatedQuestions.length === 0) {
      alert("Failed to generate questions. Please try again.");
      setInterviewStarted(false);
      setIsLoading(false);
      return;
    }

    // Set questions and reset index BEFORE any other operations
    setQuestions(generatedQuestions);
    setCurrentQuestionIndex(0);
    setIsLoading(false);

    // Now send greeting automatically
    const greetingAvatar = selectedAvatar || allAvatars[Math.floor(Math.random() * allAvatars.length)];
    const greetingText = avatarDetails[greetingAvatar].firstMessage;
    
    const greetingMessage: Message = {
      id: getNextMessageId(),
      type: "question",
      text: greetingText,
      avatar: greetingAvatar,
    };
    
    setMessages((prev) => [...prev, greetingMessage]);
    setIsSpeaking(true);
    setSpeakingAvatar(greetingAvatar);
    
    // Mark this avatar as introduced since they're giving the greeting
    setIntroducedAvatars(new Set([greetingAvatar]));

    const voiceId = avatarDetails[greetingAvatar].voiceId;
    
    try {
      const audioUrl = await generateAudio(greetingText, voiceId, ELEVENLABS_API_KEY);
      
      if (audioRef.current && audioUrl) {
        audioRef.current.src = audioUrl;
        
        audioRef.current.onloadeddata = () => {
          audioRef.current?.play().catch(err => {
            console.error("Error playing audio:", err);
            setIsSpeaking(false);
            setSpeakingAvatar(null);
          });
        };

        audioRef.current.onended = () => {
          setIsSpeaking(false);
          setSpeakingAvatar(null);
          // Auto-start recording for user to respond to greeting
          setTimeout(() => {
            if (!isRecording && recognitionRef.current) {
              try {
                setUserInput('');
                setInterimTranscript('');
                recognitionRef.current.start();
                setIsRecording(true);
              } catch (error) {
                console.error('Error auto-starting recording:', error);
              }
            }
          }, 800);
        };

        audioRef.current.onerror = () => {
          console.error("Audio error");
          setIsSpeaking(false);
          setSpeakingAvatar(null);
        };
      } else {
        console.error("No audio URL generated");
        setIsSpeaking(false);
        setSpeakingAvatar(null);
      }
    } catch (error) {
      console.error("Error in audio generation:", error);
      setIsSpeaking(false);
      setSpeakingAvatar(null);
    }
  };

  const handleSubmitAnswer = () => {
    if (!userInput.trim() || isSpeaking) return;

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    // Add answer to chat history
    chatHistory.addAnswer(userInput);

    const answerMessage: Message = {
      id: getNextMessageId(),
      type: "answer",
      text: userInput,
      avatar: "user",
    };

    setMessages((prev) => [...prev, answerMessage]);
    setUserInput("");
    setInterimTranscript('');

    setTimeout(() => {
      askNextQuestion();
    }, 1500);
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
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isRecording ? "Listening... (auto-submits after 4s silence)" : ""}
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
      {chatVisible ? (
        // Small avatars view with chat
        <>
      <AvatarHeader
        allAvatars={allAvatars}
        avatarDetails={avatarDetails}
        selectedAvatar={selectedAvatar}
        speakingAvatar={speakingAvatar}
        isSpeaking={isSpeaking}
        onSelectAvatar={setSelectedAvatar}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-3 md:px-4 py-4 md:py-8">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} avatarDetails={avatarDetails} />
          ))}

          {(isSpeaking || isLoading) && (
            <LoadingIndicator isProcessingFollowUp={false} isLoading={isLoading} />
          )}

          {isRecording && (
            <RecordingIndicator userInput={userInput} interimTranscript={interimTranscript} />
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

      <InputBar
        userInput={userInput}
        interimTranscript={interimTranscript}
        isRecording={isRecording}
        isSpeaking={isSpeaking}
        isLoading={isLoading}
        chatVisible={chatVisible}
        onInputChange={setUserInput}
        onKeyPress={handleKeyPress}
        onToggleRecording={toggleRecording}
        onSubmit={handleSubmitAnswer}
        onToggleChat={() => setChatVisible(false)}
      />
        </>
      ) : (
        // Large avatars view without chat
        <>
          <LargeAvatarView
            allAvatars={allAvatars}
            avatarDetails={avatarDetails}
            selectedAvatar={selectedAvatar}
            speakingAvatar={speakingAvatar}
          />

          <InputBar
            userInput={userInput}
            interimTranscript={interimTranscript}
            isRecording={isRecording}
            isSpeaking={isSpeaking}
            isLoading={isLoading}
            chatVisible={chatVisible}
            onInputChange={setUserInput}
            onKeyPress={handleKeyPress}
            onToggleRecording={toggleRecording}
            onSubmit={handleSubmitAnswer}
            onToggleChat={() => setChatVisible(true)}
          />
        </>
      )}
      
      {/* Audio element outside conditional rendering so it persists across view changes */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
};

export default InterviewPage;