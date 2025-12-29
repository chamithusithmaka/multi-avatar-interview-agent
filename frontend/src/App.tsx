import { useState } from "react";
import SplashScreen from "./components/SplashScreen";
import HomePage from "./pages/HomePage";
// Old version using separate Gemini API + browser STT + ElevenLabs TTS
// import InterviewPage from "./pages/InterviewPage";
// New version using ElevenLabs Conversational AI (agent handles LLM + STT + TTS)
import InterviewPageV2 from "./pages/InterviewPageV2";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [page, setPage] = useState<"home" | "interview">("interview");

  const handleSplashFinish = () => setShowSplash(false);

  const handleGetStarted = () => setPage("interview");

  if (showSplash) return <SplashScreen onFinish={handleSplashFinish} />;

  if (page === "home")
    return <HomePage onGetStarted={handleGetStarted} />;

  if (page === "interview") 
    return <InterviewPageV2 />;

  return null;
}

export default App;
