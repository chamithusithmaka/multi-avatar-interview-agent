import { useState, useEffect, useRef } from "react";
import HRAvatar from "../components/HRAvatar";
import AcademicAvatar from "../components/AcademicAvatar";
import BusinessAvatar from "../components/BusinessAvatar";

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
  // const [interviewTopic, setInterviewTopic] = useState("");
  const [messageIdCounter, setMessageIdCounter] = useState(0);
  const [speakingAvatar, setSpeakingAvatar] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [introducedAvatars, setIntroducedAvatars] = useState<Set<string>>(new Set()); // Track which avatars have introduced themselves
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
      voiceId: "EXAVITQu4vr4xnSDxMaL",
      component: HRAvatar,
      firstMessage: "Hello. I am the HR Interviewer for your internship evaluation. I'll be asking questions to understand the real-world impact of your work, your business awareness, and the value you contributed to the organization. Let's proceed whenever you're ready.",
    },
    academic: {
      name: "Academic Interviewer",
      role: "Academic Specialist",
      voiceId: "TX3LPaxmHKxFdv7VOQHJ",
      component: AcademicAvatar,
      firstMessage: "Hello. I am the Academic Interviewer for your internship evaluation. I'll be asking questions to understand the real-world impact of your work, your business awareness, and the value you contributed to the organization. Let's proceed whenever you're ready.",
    },
    business: {
      name: "Business Interviewer",
      role: "Business Strategy",
      voiceId: "pNInz6obpgDQGcFmaJgB",
      component: BusinessAvatar,
      firstMessage: "Hello. I am the Business Reviewer for your internship evaluation. I'll be asking questions to understand the real-world impact of your work, your business awareness, and the value you contributed to the organization. Let's proceed whenever you're ready.",
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
      
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        reader.readAsText(file);
      } else {
        reader.readAsText(file);
      }
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
        alert("Error reading file. Please try a text file (.txt) for now.");
      }
      
      e.target.value = "";
    }
  };

  const generateQuestions = async (interviewTopic: string, reportContent?: string) => {
    try {
      const promptText = reportContent 
        ? `You are an interview panel conducting an internship viva. Based on the following internship report and the position "${interviewTopic}", generate 5 challenging and relevant interview questions. Focus on the technical details, achievements, business impact, and learning outcomes mentioned in the report.

Internship Report Summary:
${reportContent.substring(0, 3000)}

Generate exactly 5 questions, numbered 1-5, one per line. Make them specific to the student's actual work.`
        : `You are an interview panel. Generate 5 professional interview questions for a ${interviewTopic} internship position. Return only the questions, one per line, numbered 1-5. Make them relevant and challenging.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: promptText,
                  },
                ],
              },
            ],
          }),
        }
      );

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0]) {
        console.error("Invalid API response:", data);
        return [];
      }

      const questionsText = data.candidates[0].content.parts[0].text;
      const questionsArray = questionsText
        .split("\n")
        .filter((q: string) => q.trim() && /^\d+\./.test(q))
        .map((q: string) => q.replace(/^\d+\.\s*/, "").trim());

      return questionsArray;
    } catch (error) {
      console.error("Error generating questions:", error);
      return [];
    }
  };

  const generateAudio = async (text: string, voiceId: string): Promise<string> => {
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("ElevenLabs API Error:", response.status, errorText);
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      return audioUrl;
    } catch (error) {
      console.error("Error generating audio:", error);
      return "";
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
        
        const audioUrl = await generateAudio(completeMessage.text, voiceId);
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

      const introAudioUrl = await generateAudio(introMessage.text, voiceId);
      
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
          // After introduction, ask the actual question
          setTimeout(() => {
            askActualQuestion(questionAvatar);
          }, 1000);
        };

        audioRef.current.onerror = () => {
          setIsSpeaking(false);
          setSpeakingAvatar(null);
          setTimeout(() => {
            askActualQuestion(questionAvatar);
          }, 1000);
        };
      } else {
        setIsSpeaking(false);
        setSpeakingAvatar(null);
        setTimeout(() => {
          askActualQuestion(questionAvatar);
        }, 1000);
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

    const audioUrl = await generateAudio(questionText, voiceId);
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

    // setInterviewTopic(userInput);
    setIsLoading(true);
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

    // Generate questions first
    const generatedQuestions = await generateQuestions(inputCopy, fileContent || undefined);
    
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
      const audioUrl = await generateAudio(greetingText, voiceId);
      
      if (audioRef.current && audioUrl) {
        audioRef.current.src = audioUrl;
        
        audioRef.current.onloadeddata = () => {
          audioRef.current?.play().catch(err => {
            console.error("Error playing audio:", err);
            setIsSpeaking(false);
            setSpeakingAvatar(null);
            // Still proceed to questions even if audio fails
            setTimeout(() => {
              askNextQuestion();
            }, 1500);
          });
        };

        audioRef.current.onended = () => {
          setIsSpeaking(false);
          setSpeakingAvatar(null);
          // Ask first question after greeting
          setTimeout(() => {
            askNextQuestion();
          }, 1500);
        };

        audioRef.current.onerror = () => {
          console.error("Audio error");
          setIsSpeaking(false);
          setSpeakingAvatar(null);
          setTimeout(() => {
            askNextQuestion();
          }, 1500);
        };
      } else {
        console.error("No audio URL generated");
        setIsSpeaking(false);
        setSpeakingAvatar(null);
        // Proceed anyway
        setTimeout(() => {
          askNextQuestion();
        }, 1500);
      }
    } catch (error) {
      console.error("Error in audio generation:", error);
      setIsSpeaking(false);
      setSpeakingAvatar(null);
      // Proceed to questions even if greeting fails
      setTimeout(() => {
        askNextQuestion();
      }, 1500);
    }
  };

  const handleSubmitAnswer = () => {
    if (!userInput.trim() || isSpeaking) return;

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

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

          {(isSpeaking || isLoading) && (
            <div className="flex gap-2 md:gap-4 mb-4 md:mb-8">
              <div className="flex items-center gap-2 text-gray-500 text-xs md:text-sm">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-[#A84448] rounded-full animate-pulse"></div>
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-[#A84448] rounded-full animate-pulse delay-75"></div>
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-[#A84448] rounded-full animate-pulse delay-150"></div>
                </div>
                <span className="font-medium">{isLoading ? "Analyzing your report and generating questions..." : "Speaking..."}</span>
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
              {!isRecording && !isSpeaking && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </button>

            <div className="flex-1 bg-gray-100 rounded-2xl px-3 md:px-4 py-2.5 md:py-3 flex items-center gap-2 md:gap-3">
              <input
                type="text"
                value={userInput + interimTranscript}
                onChange={(e) => !isRecording && setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  isRecording 
                    ? "🎤 Listening... (auto-submits after 4s silence)" 
                    : isSpeaking 
                    ? "Wait for question to finish..." 
                    : "Use voice (recommended) or type here..."
                }
                disabled={isSpeaking || isLoading}
                className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-500 text-sm md:text-base"
              />
              {isRecording && (
                <div className="flex items-center gap-1">
                  <div className="w-1 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <div className="w-1 h-4 bg-red-500 rounded-full animate-pulse delay-75"></div>
                  <div className="w-1 h-2 bg-red-500 rounded-full animate-pulse delay-150"></div>
                </div>
              )}
            </div>

            <button
              onClick={handleSubmitAnswer}
              disabled={!userInput.trim() || isSpeaking || isLoading}
              className="p-3 md:p-4 bg-gradient-to-r from-[#A84448] to-[#8B3639] text-white rounded-xl hover:shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex-shrink-0"
              title="Submit answer (or press Enter)"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          
          {isRecording && (
            <div className="mt-2 text-center">
              <p className="text-xs text-gray-500">
                💡 Keep speaking naturally. Answer will auto-submit after 4 seconds of silence.
              </p>
            </div>
          )}
        </div>
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
};

export default InterviewPage;