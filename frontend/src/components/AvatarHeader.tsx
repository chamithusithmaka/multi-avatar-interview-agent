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

interface AvatarHeaderProps {
  allAvatars: string[];
  avatarDetails: Record<string, AvatarDetails>;
  selectedAvatar: string | null;
  speakingAvatar: string | null;
  isSpeaking: boolean;
  onSelectAvatar: (avatarId: string) => void;
  disableSelection?: boolean;
}

const AvatarHeader: FC<AvatarHeaderProps> = ({
  allAvatars,
  avatarDetails,
  selectedAvatar,
  speakingAvatar,
  isSpeaking,
  onSelectAvatar,
  disableSelection = false,
}) => {
  return (
    <div className="border-b border-gray-200 bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-2 md:px-4 py-6 md:py-10">
        <div className="flex items-center justify-center gap-6 md:gap-16 overflow-visible pb-4">
          {allAvatars.map((avatarId) => {
            const avatar = avatarDetails[avatarId];
            const AvatarComponent = avatar.component;
            const isCurrentlySpeaking = speakingAvatar === avatarId;
            const isSelected = selectedAvatar === avatarId;

            return (
              <div
                key={avatarId}
                className={`flex flex-col items-center flex-shrink-0 transition-all ${
                  disableSelection ? "cursor-default" : "cursor-pointer"
                } ${
                  isSpeaking && !isCurrentlySpeaking ? "opacity-50" : disableSelection ? "" : "hover:scale-105"
                }`}
                onClick={() => {
                  if (!isSpeaking && !disableSelection) {
                    onSelectAvatar(avatarId);
                  }
                }}
                title={disableSelection ? avatar.name : (isSpeaking ? "Wait for current speaker to finish" : `Select ${avatar.name}`)}
              >
                <div className="relative flex items-center justify-center pt-3 pb-1">
                  {/* Selection ring - positioned absolutely behind */}
                  {isSelected && (
                    <div
                      className="absolute inset-0 rounded-full ring-4 ring-[#A84448] scale-110 animate-pulse"
                      style={{ top: "0", left: "0", right: "0", bottom: "0" }}
                    />
                  )}

                  {/* Avatar container */}
                  <div className="w-16 h-16 md:w-28 md:h-28 flex items-center justify-center relative z-10">
                    <div className="scale-[0.45] md:scale-[0.75] origin-center">
                      <AvatarComponent isActive={isSelected} isSpeaking={isCurrentlySpeaking} />
                    </div>
                  </div>

                  {/* Checkmark badge - positioned on top */}
                  {isSelected && (
                    <div className="absolute -top-0 -right-0 w-7 h-7 bg-[#A84448] rounded-full flex items-center justify-center shadow-lg z-20 border-2 border-white">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                <span
                  className={`text-xs md:text-sm font-semibold mt-2 md:mt-3 text-center whitespace-nowrap ${
                    isSelected ? "text-[#A84448]" : "text-gray-700"
                  }`}
                >
                  {avatar.name}
                </span>

                {isCurrentlySpeaking && (
                  <div className="flex gap-1 mt-1">
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
    </div>
  );
};

export default AvatarHeader;
