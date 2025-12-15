type HomePageProps = {
  onGetStarted: () => void;
};

const HomePage = ({ onGetStarted }: HomePageProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-[#A84448] to-[#8B3639] rounded-xl flex items-center justify-center">
                <span className="text-xl md:text-2xl font-bold text-white">AI</span>
              </div>
              <h1 className="text-lg md:text-2xl font-bold text-gray-900">AI Interview Panel</h1>
            </div>
            <button
              className="bg-gradient-to-r from-[#A84448] to-[#8B3639] text-white px-4 md:px-6 py-2 rounded-lg font-semibold hover:shadow-lg active:scale-95 transition-all text-sm md:text-base"
              onClick={onGetStarted}
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 md:mb-6 px-4">
            Welcome to the Future of <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A84448] to-[#8B3639]">AI Interviews</span>
          </h2>
          <p className="text-base md:text-xl text-gray-600 max-w-3xl mx-auto px-4">
            Experience comprehensive interview preparation with our AI-powered panel featuring HR, Academic, and Business experts.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-12 md:mb-16">
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-pink-400 to-rose-500 rounded-xl flex items-center justify-center mb-4 md:mb-6">
              <svg className="w-7 h-7 md:w-8 md:h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">HR Expert</h3>
            <p className="text-sm md:text-base text-gray-600">
              Master behavioral questions, cultural fit assessments, and professional communication skills.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center mb-4 md:mb-6">
              <svg className="w-7 h-7 md:w-8 md:h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
              </svg>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">Academic Specialist</h3>
            <p className="text-sm md:text-base text-gray-600">
              Enhance your technical knowledge, problem-solving abilities, and academic excellence.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center mb-4 md:mb-6">
              <svg className="w-7 h-7 md:w-8 md:h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
              </svg>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">Business Analyst</h3>
            <p className="text-sm md:text-base text-gray-600">
              Develop strategic thinking, business acumen, and leadership capabilities.
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-[#A84448] to-[#8B3639] rounded-2xl md:rounded-3xl p-8 md:p-12 text-center text-white">
          <h3 className="text-3xl md:text-4xl font-bold mb-3 md:mb-4">Ready to Ace Your Interview?</h3>
          <p className="text-base md:text-xl mb-6 md:mb-8 text-red-100">
            Start practicing with our AI-powered interview panel today
          </p>
          <button 
            onClick={onGetStarted}
            className="bg-white text-[#A84448] px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold text-base md:text-lg hover:shadow-2xl active:scale-95 transition-all"
          >
            Start Interview Preparation
          </button>
        </div>
      </main>
    </div>
  );
};

export default HomePage;