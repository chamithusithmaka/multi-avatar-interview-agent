import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen = ({ onFinish }: SplashScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setFadeOut(true);
          setTimeout(onFinish, 700);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(timer);
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 bg-gradient-to-br from-[#A84448] via-[#8B3639] to-[#7A2E31] flex items-center justify-center overflow-hidden transition-opacity duration-700 ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-48 h-48 md:w-72 md:h-72 bg-red-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-64 h-64 md:w-96 md:h-96 bg-rose-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-700"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-56 h-56 md:w-80 md:h-80 bg-red-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 text-center px-4 md:px-6 max-w-4xl w-full">
        <div className="mb-8 md:mb-12 animate-fade-in">
          <div className="flex items-center justify-center mb-4 md:mb-6">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl flex items-center justify-center shadow-2xl transform rotate-6">
              <span className="text-3xl md:text-4xl font-bold text-[#A84448] transform -rotate-6">AI</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 md:mb-4 tracking-tight px-4">
            AI Interview Panel
          </h1>
          <p className="text-lg md:text-xl text-red-100 font-light px-4">
            Experience the Future of Interviews
          </p>
        </div>

        <div className="flex flex-col md:flex-row justify-center items-center md:items-end gap-6 md:gap-8 mb-8 md:mb-12 px-4">
          <div className="flex flex-col items-center animate-slide-up">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full flex items-center justify-center shadow-2xl mb-3 md:mb-4 transform hover:scale-110 transition-transform duration-300">
              <svg className="w-12 h-12 md:w-16 md:h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="bg-white/20 backdrop-blur-sm px-3 md:px-4 py-1.5 md:py-2 rounded-full">
              <p className="text-white font-semibold text-xs md:text-sm">HR Expert</p>
            </div>
          </div>

          <div className="flex flex-col items-center animate-slide-up delay-200">
            <div className="w-28 h-28 md:w-40 md:h-40 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center shadow-2xl mb-3 md:mb-4 transform hover:scale-110 transition-transform duration-300">
              <svg className="w-14 h-14 md:w-20 md:h-20 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
              </svg>
            </div>
            <div className="bg-white/20 backdrop-blur-sm px-3 md:px-4 py-1.5 md:py-2 rounded-full">
              <p className="text-white font-semibold text-xs md:text-sm">Academic Specialist</p>
            </div>
          </div>

          <div className="flex flex-col items-center animate-slide-up delay-300">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-2xl mb-3 md:mb-4 transform hover:scale-110 transition-transform duration-300">
              <svg className="w-12 h-12 md:w-16 md:h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
              </svg>
            </div>
            <div className="bg-white/20 backdrop-blur-sm px-3 md:px-4 py-1.5 md:py-2 rounded-full">
              <p className="text-white font-semibold text-xs md:text-sm">Business Analyst</p>
            </div>
          </div>
        </div>

        <div className="max-w-sm md:max-w-md mx-auto px-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-full h-1.5 md:h-2 overflow-hidden">
            <div 
              className="bg-white h-full transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-red-100 text-xs md:text-sm mt-3 md:mt-4 font-light">Loading your interview experience...</p>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(50px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.8s ease-out;
        }
        .delay-200 {
          animation-delay: 0.2s;
          opacity: 0;
          animation-fill-mode: forwards;
        }
        .delay-300 {
          animation-delay: 0.3s;
          opacity: 0;
          animation-fill-mode: forwards;
        }
        .delay-700 {
          animation-delay: 0.7s;
        }
        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;