import type { FC } from "react";

interface RecordingIndicatorProps {
  userInput: string;
  interimTranscript: string;
}

const RecordingIndicator: FC<RecordingIndicatorProps> = ({ userInput, interimTranscript }) => {
  return (
    <div className="flex gap-2 md:gap-4 mb-4 md:mb-8 justify-end animate-in fade-in slide-in-from-right duration-300">
      <div className="max-w-[85%] md:max-w-2xl rounded-2xl px-4 md:px-6 py-3 md:py-4 shadow-lg bg-gradient-to-r from-[#A84448] to-[#8B3639] text-white border-2 border-white/30">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex gap-1">
            <div className="w-2 h-4 bg-white rounded-full animate-pulse"></div>
            <div className="w-2 h-5 bg-white rounded-full animate-pulse delay-75"></div>
            <div className="w-2 h-3 bg-white rounded-full animate-pulse delay-150"></div>
          </div>
          <span className="text-sm font-bold">🎤 Recording...</span>
          <span className="text-xs opacity-80">(click Send when ready)</span>
        </div>
        <p className="text-base md:text-lg leading-relaxed break-words min-h-[2rem]">
          {userInput ? (
            <>
              {userInput}
              {interimTranscript && (
                <span className="opacity-60 italic"> {interimTranscript}</span>
              )}
            </>
          ) : (
            <span className="opacity-70 italic">
              {interimTranscript || "Start speaking..."}
            </span>
          )}
        </p>
        <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between">
          <span className="text-xs opacity-70">Click 🎤 to stop, then Send to submit</span>
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
  );
};

export default RecordingIndicator;
