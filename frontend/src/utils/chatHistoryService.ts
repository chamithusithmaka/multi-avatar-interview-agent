/**
 * Chat History Service
 * Maintains a global history of all questions asked during the interview
 * to prevent different avatars from asking duplicate questions.
 */

type ChatHistoryEntry = {
  timestamp: number;
  avatar: string;
  question: string;
  answer?: string;
};

class ChatHistoryService {
  private history: ChatHistoryEntry[] = [];

  /**
   * Add a question to the history
   */
  addQuestion(avatar: string, question: string): void {
    this.history.push({
      timestamp: Date.now(),
      avatar,
      question,
    });
  }

  /**
   * Add an answer to the most recent question
   */
  addAnswer(answer: string): void {
    if (this.history.length > 0) {
      const lastEntry = this.history[this.history.length - 1];
      lastEntry.answer = answer;
    }
  }

  /**
   * Get all questions asked so far
   */
  getAllQuestions(): string[] {
    return this.history.map(entry => entry.question);
  }

  /**
   * Get the full conversation history
   */
  getFullHistory(): ChatHistoryEntry[] {
    return [...this.history];
  }

  /**
   * Format history for API context (for question generation)
   */
  getHistoryContext(): string {
    if (this.history.length === 0) {
      return "";
    }

    return this.history
      .map((entry, index) => {
        const q = `Q${index + 1} (${entry.avatar}): ${entry.question}`;
        const a = entry.answer ? `A${index + 1}: ${entry.answer}` : "";
        return a ? `${q}\n${a}` : q;
      })
      .join("\n\n");
  }

  /**
   * Check if a question is too similar to already asked questions
   */
  isQuestionSimilar(newQuestion: string, threshold: number = 0.7): boolean {
    const normalizedNew = this.normalizeQuestion(newQuestion);
    
    return this.history.some(entry => {
      const normalizedExisting = this.normalizeQuestion(entry.question);
      const similarity = this.calculateSimilarity(normalizedNew, normalizedExisting);
      return similarity >= threshold;
    });
  }

  /**
   * Filter out questions that are too similar to already asked ones
   */
  filterDuplicateQuestions(questions: string[]): string[] {
    return questions.filter(q => !this.isQuestionSimilar(q));
  }

  /**
   * Reset the history (for new interview session)
   */
  reset(): void {
    this.history = [];
  }

  /**
   * Get questions count
   */
  getQuestionCount(): number {
    return this.history.length;
  }

  /**
   * Get questions by specific avatar
   */
  getQuestionsByAvatar(avatar: string): string[] {
    return this.history
      .filter(entry => entry.avatar === avatar)
      .map(entry => entry.question);
  }

  /**
   * Normalize question for comparison (remove punctuation, lowercase, trim)
   */
  private normalizeQuestion(question: string): string {
    return question
      .toLowerCase()
      .replace(/[?.!,]/g, '')
      .trim();
  }

  /**
   * Calculate similarity between two strings using simple word overlap
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
}

// Export singleton instance
export const chatHistory = new ChatHistoryService();
