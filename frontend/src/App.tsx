import { useState } from "react";
import SplashScreen from "./components/SplashScreen";
import HomePage from "./pages/HomePage";
import InterviewPage from "./pages/InterviewPage";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [page, setPage] = useState<"home" | "interview">("interview");

  const handleSplashFinish = () => setShowSplash(false);

  const handleGetStarted = () => setPage("interview");

  if (showSplash) return <SplashScreen onFinish={handleSplashFinish} />;

  if (page === "home")
    return <HomePage onGetStarted={handleGetStarted} />;

  if (page === "interview") 
    return <InterviewPage />;

  return null;
}

export default App;
