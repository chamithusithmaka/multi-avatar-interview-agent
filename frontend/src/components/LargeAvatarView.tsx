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
  disableSelection?: boolean;
}

const LargeAvatarView: FC<LargeAvatarViewProps> = ({
  allAvatars,
  avatarDetails,
  selectedAvatar,
  speakingAvatar,
  isSpeaking = false,
  onSelectAvatar,
  disableSelection = false,
}) => {
  return (
    <>
      <div className="pt-4 md:pt-6 pb-2 md:pb-4 px-4">
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">
            {disableSelection ? "Viva in Progress" : "Interview in Progress"}
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            {disableSelection ? "Interviewers will switch automatically" : "Click an interviewer to switch"}
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative px-4 py-4 overflow-hidden">
        <div className="flex flex-row items-center justify-center gap-6 md:gap-12 z-10 w-full max-w-4xl">
          {allAvatars.map((avatarId) => {
            const avatar = avatarDetails[avatarId];
            const isActive = selectedAvatar === avatarId;
            const isCurrentlySpeaking = speakingAvatar === avatarId;
            const AvatarComponent = avatar.component;

            return (
              <div 
                key={avatarId} 
                className={`flex flex-col items-center transition-all ${
                  disableSelection ? "cursor-default" : "cursor-pointer"
                } ${
                  isSpeaking && !isCurrentlySpeaking ? "opacity-50 pointer-events-none" : disableSelection ? "" : "hover:scale-105"
                }`}
                onClick={() => !disableSelection && onSelectAvatar?.(avatarId)}
                title={disableSelection ? avatar.name : (isSpeaking ? "Wait for speaker to finish" : `Switch to ${avatar.name}`)}
              >
                {/* Fixed size avatar container */}
                <div
                  className={`relative transition-all duration-300 ${
                    isActive ? "scale-105" : "opacity-70 hover:opacity-90"
                  }`}
                >
                  {/* Explicit width/height for avatar */}
                  <div className="w-36 h-36 md:w-52 md:h-52 lg:w-60 lg:h-60">
                    <AvatarComponent isActive={isActive} isSpeaking={isCurrentlySpeaking} />
                  </div>
                </div>
                <div className="mt-3 md:mt-4 text-center">
                  <span className="text-base md:text-xl font-bold text-gray-900 block mb-1">
                    {avatar.name}
                  </span>
                  <span className="text-xs md:text-sm text-gray-600">{avatar.role}</span>
                </div>
                {isActive && (
                  <div className="mt-2 bg-red-100 text-red-700 px-3 md:px-4 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-semibold">
                    ✓ Selected
                  </div>
                )}
                {isCurrentlySpeaking && (
                  <div className="mt-2 flex gap-1">
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
    </>
  );
};

export default LargeAvatarView;
