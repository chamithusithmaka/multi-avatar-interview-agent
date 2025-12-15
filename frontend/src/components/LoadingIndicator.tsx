import type { FC } from "react";

interface LoadingIndicatorProps {
  isProcessingFollowUp: boolean;
  isLoading: boolean;
}

const LoadingIndicator: FC<LoadingIndicatorProps> = ({ isProcessingFollowUp, isLoading }) => {
  return (
    <div className="flex gap-2 md:gap-4 mb-4 md:mb-8">
      <div className="flex items-center gap-2 text-gray-500 text-xs md:text-sm">
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-[#A84448] rounded-full animate-pulse"></div>
          <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-[#A84448] rounded-full animate-pulse delay-75"></div>
          <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-[#A84448] rounded-full animate-pulse delay-150"></div>
        </div>
        <span className="font-medium">
          {isProcessingFollowUp ? "Thinking..." : isLoading ? "Analyzing your report and generating questions..." : "Speaking..."}
        </span>
      </div>
    </div>
  );
};

export default LoadingIndicator;
