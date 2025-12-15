/**
 * Audio Service for ElevenLabs Text-to-Speech
 */

/**
 * Generates audio URL from text using ElevenLabs Voice ID or Agent ID
 * @param text - Text to convert to speech
 * @param voiceIdOrAgentId - ElevenLabs voice ID or agent ID
 * @param apiKey - ElevenLabs API key
 * @returns Promise with audio URL or empty string on error
 */
export const generateAudio = async (
  text: string,
  voiceIdOrAgentId: string,
  apiKey: string
): Promise<string> => {
  try {
    const isAgent = voiceIdOrAgentId.startsWith("agent_");
    
    if (isAgent) {
      // For agents, first get the agent config to extract the voice ID
      const agentResponse = await fetch(
        `https://api.elevenlabs.io/v1/convai/agents/${voiceIdOrAgentId}`,
        {
          method: "GET",
          headers: {
            "xi-api-key": apiKey,
          },
        }
      );

      if (!agentResponse.ok) {
        const errorText = await agentResponse.text();
        console.error("Failed to fetch agent config:", agentResponse.status, errorText);
        throw new Error(`Agent config fetch error: ${agentResponse.status}`);
      }

      const agentData = await agentResponse.json();
      
      // Try multiple possible paths for voice ID in agent config
      const voiceId = 
        agentData.conversation_config?.tts?.voice_id ||
        agentData.conversation_config?.agent?.voice?.voice_id ||
        agentData.conversation_config?.voice_id;
      
      if (!voiceId) {
        console.error("No voice ID found in agent config. Full config:", agentData);
        console.log("TTS config:", agentData.conversation_config?.tts);
        throw new Error("Agent does not have a voice configured");
      }

      console.log("Extracted voice ID from agent:", voiceId);
      // Now use the extracted voice ID for TTS
      return await generateTTS(text, voiceId, apiKey);
    } else {
      // Direct voice ID
      return await generateTTS(text, voiceIdOrAgentId, apiKey);
    }
  } catch (error) {
    console.error("Error generating audio:", error);
    return "";
  }
};

/**
 * Internal function to generate TTS audio
 */
async function generateTTS(text: string, voiceId: string, apiKey: string): Promise<string> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("ElevenLabs TTS Error:", response.status, errorText);
    throw new Error(`ElevenLabs TTS error: ${response.status}`);
  }

  const audioBlob = await response.blob();
  return URL.createObjectURL(audioBlob);
}
