/**
 * Question Generation Service using Google Gemini API
 */

import { chatHistory } from './chatHistoryService';

/**
 * Generates interview questions using Gemini API
 * @param interviewTopic - Topic of the interview
 * @param geminiApiKey - Gemini API key
 * @param reportContent - Optional internship report content
 * @returns Promise with array of questions
 */
export const generateQuestions = async (
  interviewTopic: string,
  geminiApiKey: string,
  reportContent?: string
): Promise<string[]> => {
  try {
    // Get previously asked questions to avoid duplicates
    const previousQuestions = chatHistory.getAllQuestions();
    const historyContext = chatHistory.getHistoryContext();
    
    const previousQuestionsText = previousQuestions.length > 0
      ? `\n\nPreviously Asked Questions (DO NOT repeat or ask similar questions):\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : '';

    const conversationContext = historyContext
      ? `\n\nConversation History:\n${historyContext}`
      : '';

    // Check if this is the first question (no conversation history)
    const isFirstQuestion = previousQuestions.length === 0;
    
    const promptText = reportContent
      ? `You are an interview panel conducting an internship viva. Based on the following internship report and the position "${interviewTopic}", generate ${isFirstQuestion ? '6' : '5'} challenging and relevant interview questions. Focus on the technical details, achievements, business impact, and learning outcomes mentioned in the report.

Internship Report Summary:
${reportContent.substring(0, 3000)}
${conversationContext}
${previousQuestionsText}

${isFirstQuestion ? 'IMPORTANT: Your FIRST question MUST be a simple greeting like "How are you today?" or "How are you feeling about this interview?"\n\n' : ''}Generate exactly ${isFirstQuestion ? '6' : '5'} NEW and DIFFERENT questions that have NOT been asked before, numbered 1-${isFirstQuestion ? '6' : '5'}, one per line. Make them specific to the student's actual work and ensure they explore NEW aspects not covered in previous questions.`
      : `You are an interview panel. Generate ${isFirstQuestion ? '6' : '5'} professional interview questions for a ${interviewTopic} internship position.
${conversationContext}
${previousQuestionsText}

${isFirstQuestion ? 'IMPORTANT: Your FIRST question MUST be a simple greeting like "How are you today?" or "How are you feeling about this interview?"\n\n' : ''}Return only NEW and DIFFERENT questions that have NOT been asked before, one per line, numbered 1-${isFirstQuestion ? '6' : '5'}. Make them relevant and challenging, exploring different aspects from any previous questions.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: promptText,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]) {
      console.error("Invalid API response:", data);
      return [];
    }

    const questionsText = data.candidates[0].content.parts[0].text;
    const questionsArray = questionsText
      .split("\n")
      .filter((q: string) => q.trim() && /^\d+\./.test(q))
      .map((q: string) => q.replace(/^\d+\.\s*/, "").trim());

    // Filter out any questions that are too similar to previously asked ones
    const uniqueQuestions = chatHistory.filterDuplicateQuestions(questionsArray);

    return uniqueQuestions;
  } catch (error) {
    console.error("Error generating questions:", error);
    return [];
  }
};
