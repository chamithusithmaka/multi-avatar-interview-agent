import type { FC } from "react";
import type HRAvatar from "./HRAvatar";

type AvatarDetails = {
  name: string;
  role: string;
  voiceId?: string;  // Optional for backward compatibility
  agentId?: string;  // Used by V2 with ElevenLabs Conversational AI
  component: typeof HRAvatar;
  firstMessage?: string;  // Optional - configured in ElevenLabs for V2
};

interface LargeAvatarViewProps {
  allAvatars: string[];
  avatarDetails: Record<string, AvatarDetails>;
  selectedAvatar: string | null;
  speakingAvatar: string | null;
  isSpeaking?: boolean;
  onSelectAvatar?: (avatarId: string) => void;
}

const LargeAvatarView: FC<LargeAvatarViewProps> = ({
  allAvatars,
  avatarDetails,
  selectedAvatar,
  speakingAvatar,
  isSpeaking = false,
  onSelectAvatar,
}) => {
  return (
    <>
      <div className="pt-8 md:pt-16 pb-4 md:pb-8 px-4">
        <div className="text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-2 md:mb-4">
            Interview in Progress
          </h1>
          <p className="text-base md:text-xl text-gray-600">Click an interviewer to switch</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-20 z-10 w-full max-w-6xl">
          {allAvatars.map((avatarId) => {
            const avatar = avatarDetails[avatarId];
            const isActive = selectedAvatar === avatarId;
            const isCurrentlySpeaking = speakingAvatar === avatarId;
            const AvatarComponent = avatar.component;

            return (
              <div 
                key={avatarId} 
                className={`flex flex-col items-center w-full md:w-auto cursor-pointer transition-all ${
                  isSpeaking && !isCurrentlySpeaking ? "opacity-50 pointer-events-none" : "hover:scale-105"
                }`}
                onClick={() => onSelectAvatar?.(avatarId)}
                title={isSpeaking ? "Wait for speaker to finish" : `Switch to ${avatar.name}`}
              >
                <div
                  className={`transition-all duration-300 ${isActive ? "scale-110" : "opacity-70 hover:opacity-90"}`}
                >
                  <AvatarComponent isActive={isActive} isSpeaking={isCurrentlySpeaking} />
                </div>
                <div className="mt-4 md:mt-6 text-center">
                  <span className="text-lg md:text-2xl font-bold text-gray-900 block mb-1">
                    {avatar.name}
                  </span>
                  <span className="text-sm md:text-lg text-gray-600">{avatar.role}</span>
                </div>
                {isActive && (
                  <div className="mt-2 md:mt-3 bg-red-100 text-red-700 px-4 md:px-5 py-1.5 md:py-2 rounded-full text-sm md:text-base font-semibold">
                    ✓ Selected
                  </div>
                )}
                {isCurrentlySpeaking && (
                  <div className="mt-3 flex gap-1">
                    <div className="w-2 h-4 bg-[#A84448] rounded-full animate-pulse"></div>
                    <div className="w-2 h-4 bg-[#A84448] rounded-full animate-pulse delay-75"></div>
                    <div className="w-2 h-4 bg-[#A84448] rounded-full animate-pulse delay-150"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default LargeAvatarView;
