import { useState } from "react";
import SplashScreen from "./components/SplashScreen";
import HomePage from "./pages/HomePage";
// Old version using separate Gemini API + browser STT + ElevenLabs TTS
// import InterviewPage from "./pages/InterviewPage";
// New version using ElevenLabs Conversational AI (agent handles LLM + STT + TTS)
import VivaBot from "./pages/vivaBot";
import InterviewBot from "./pages/InterviewBot";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [page, setPage] = useState<"home" | "vivabot" | "interviewbot">("vivabot");

  const handleSplashFinish = () => setShowSplash(false);

  const handleGetStarted = () => setPage("vivabot");

  if (showSplash) return <SplashScreen onFinish={handleSplashFinish} />;

  if (page === "home")
    return <HomePage onGetStarted={handleGetStarted} />;

  if (page === "vivabot") 
    return <VivaBot onNavigate={() => setPage("interviewbot")} />;

  if (page === "interviewbot")
    return <InterviewBot onNavigate={() => setPage("vivabot")} />;

  return null;
}

export default App;
