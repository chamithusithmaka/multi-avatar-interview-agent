import type { FC } from "react";
import type HRAvatar from "./HRAvatar";

type Message = {
  id: number;
  type: "question" | "answer";
  text: string;
  avatar: string;
  audioUrl?: string;
};

type AvatarDetails = {
  name: string;
  role: string;
  voiceId: string;
  component: typeof HRAvatar;
  firstMessage: string;
};

interface ChatMessageProps {
  message: Message;
  avatarDetails: Record<string, AvatarDetails>;
}

const ChatMessage: FC<ChatMessageProps> = ({ message, avatarDetails }) => {
  const messageAvatar = message.type === "question" ? avatarDetails[message.avatar] : null;
  const AvatarComponent = messageAvatar?.component;

  return (
    <div
      className={`flex gap-2 md:gap-4 mb-4 md:mb-8 ${message.type === "answer" ? "justify-end" : ""}`}
    >
      {message.type === "question" && AvatarComponent && (
        <div className="w-8 h-8 md:w-12 md:h-12 flex items-center justify-center flex-shrink-0">
          <div className="scale-[0.2] md:scale-[0.3] origin-center">
            <AvatarComponent isActive={false} isSpeaking={false} />
          </div>
        </div>
      )}

      <div
        className={`max-w-[85%] md:max-w-2xl rounded-2xl px-4 md:px-6 py-3 md:py-4 shadow-md ${
          message.type === "question"
            ? "bg-gray-100 text-gray-900"
            : "bg-gradient-to-r from-[#A84448] to-[#8B3639] text-white ml-auto"
        }`}
      >
        {message.type === "question" && messageAvatar && (
          <div className="font-semibold text-xs md:text-sm text-[#A84448] mb-1">
            {messageAvatar.name}
          </div>
        )}
        <p className="text-sm md:text-base leading-relaxed break-words">{message.text}</p>
      </div>

      {message.type === "answer" && (
        <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-[#A84448] to-[#8B3639] flex items-center justify-center flex-shrink-0 shadow-lg">
          <span className="text-white font-bold text-xs md:text-sm">You</span>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
