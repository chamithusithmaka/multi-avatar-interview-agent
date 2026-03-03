/**
 * Welcome Prompt Service
 * Auto-plays a welcome voice prompt using the browser's Speech Synthesis API.
 * Speech Synthesis is NOT blocked by browser autoplay policy,
 * so it works on page load without any user interaction.
 */

const DEFAULT_MESSAGE =
  "Welcome to your viva session! Please submit your report to begin.";

export interface WelcomePromptOptions {
  message?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

/**
 * Play the welcome prompt using the browser's Speech Synthesis API.
 * Returns a cancel function to stop playback early.
 */
export function playWelcomePrompt(options: WelcomePromptOptions = {}): () => void {
  const {
    message = DEFAULT_MESSAGE,
    onStart,
    onEnd,
    onError,
  } = options;

  if (!("speechSynthesis" in window)) {
    console.warn("⚠️ Speech Synthesis not supported");
    onError?.("Speech synthesis not supported in this browser.");
    return () => {};
  }

  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.lang = "en-US";

  // Pick a good English voice
  const pickVoice = () => {
    const voices = synth.getVoices();
    if (!voices.length) return;

    const preferred = voices.find((v) =>
      v.name.toLowerCase().includes("google uk english female")
    );
    if (preferred) { utterance.voice = preferred; return; }

    const female = voices.find(
      (v) => v.lang.startsWith("en") &&
        (v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("samantha"))
    );
    if (female) { utterance.voice = female; return; }

    const english = voices.find((v) => v.lang.startsWith("en"));
    if (english) utterance.voice = english;
  };

  if (synth.getVoices().length) {
    pickVoice();
  } else {
    synth.addEventListener("voiceschanged", pickVoice, { once: true });
  }

  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = (e) => onError?.(e.error);

  // Small delay so the page renders first
  const timer = setTimeout(() => synth.speak(utterance), 600);

  return () => {
    clearTimeout(timer);
    synth.cancel();
  };
}
