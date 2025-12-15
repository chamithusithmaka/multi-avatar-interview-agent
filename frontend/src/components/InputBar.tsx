import type { FC, KeyboardEvent } from "react";

interface InputBarProps {
  userInput: string;
  interimTranscript: string;
  isRecording: boolean;
  isSpeaking: boolean;
  isLoading: boolean;
  chatVisible: boolean;
  onInputChange: (value: string) => void;
  onKeyPress: (e: KeyboardEvent) => void;
  onToggleRecording: () => void;
  onSubmit: () => void;
  onToggleChat: () => void;
}

const InputBar: FC<InputBarProps> = ({
  userInput,
  interimTranscript,
  isRecording,
  isSpeaking,
  isLoading,
  chatVisible,
  onInputChange,
  onKeyPress,
  onToggleRecording,
  onSubmit,
  onToggleChat,
}) => {
  return (
    <div className="border-t border-gray-200 bg-white shadow-lg sticky bottom-0 safe-area-bottom">
      <div className="max-w-4xl mx-auto px-3 md:px-4 py-3 md:py-4">
        <div className="flex gap-2 md:gap-3 items-end">
          <button
            onClick={onToggleRecording}
            disabled={isSpeaking}
            className={`p-3 md:p-4 rounded-xl transition-all flex-shrink-0 relative ${
              isRecording
                ? "bg-red-500 text-white animate-pulse shadow-2xl ring-4 ring-red-300 scale-110"
                : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 active:bg-gray-300 shadow-md"
            } ${!isRecording && !isSpeaking ? "ring-2 ring-[#A84448]/50 animate-pulse" : ""}`}
            title={isRecording ? "Click to stop recording" : "Start voice recording (Recommended)"}
          >
            <svg className="w-6 h-6 md:w-7 md:h-7" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                clipRule="evenodd"
              />
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
              onChange={(e) => !isRecording && onInputChange(e.target.value)}
              onKeyPress={onKeyPress}
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
            onClick={onSubmit}
            disabled={!userInput.trim() || isSpeaking || isLoading}
            className="p-3 md:p-4 bg-gradient-to-r from-[#A84448] to-[#8B3639] text-white rounded-xl hover:shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex-shrink-0"
            title="Submit answer (or press Enter)"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>

          <button
            onClick={onToggleChat}
            className={`px-4 md:px-5 py-3 md:py-4 rounded-xl transition-all text-sm md:text-base font-medium shadow-md flex-shrink-0 ${
              chatVisible
                ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                : "bg-gradient-to-r from-[#A84448] to-[#8B3639] hover:shadow-xl text-white shadow-lg"
            }`}
            title={chatVisible ? "Hide chat (interview continues)" : "Show chat"}
          >
            {chatVisible ? "Hide Chat" : "Show Chat"}
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
  );
};

export default InputBar;
