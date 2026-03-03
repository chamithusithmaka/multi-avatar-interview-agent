/**
 * Agent Switching Service
 * Handles automatic agent switching logic for multi-avatar interviews
 */

export interface AgentSwitchConfig {
  questionsPerAgent: number;
  agentOrder: string[];
}

export class AgentSwitchingService {
  private questionCount: number = 0;
  private currentAgentIndex: number = 0;
  private config: AgentSwitchConfig;

  constructor(config: AgentSwitchConfig) {
    this.config = config;
  }

  /**
   * Get the initial agent to start with
   */
  getInitialAgent(): string {
    return this.config.agentOrder[0];
  }

  /**
   * Record that a question was asked by the current agent
   */
  recordQuestion(): void {
    // Just track that a question was asked, don't switch yet
    // Switching happens after the user answers
  }

  /**
   * Record that a user answered a question
   * Returns the next agent ID if it's time to switch, otherwise null
   */
  recordAnswer(): string | null {
    this.questionCount++;

    // Check if we need to switch to the next agent
    if (this.questionCount >= this.config.questionsPerAgent) {
      const nextAgentIndex = this.currentAgentIndex + 1;
      
      // If there's a next agent in the order, switch to it
      if (nextAgentIndex < this.config.agentOrder.length) {
        this.currentAgentIndex = nextAgentIndex;
        this.questionCount = 0; // Reset count for new agent
        return this.config.agentOrder[nextAgentIndex];
      }
      
      // If we've gone through all agents, stay on the last one
      return null;
    }

    return null; // No switch needed yet
  }

  /**
   * Get the current agent
   */
  getCurrentAgent(): string {
    return this.config.agentOrder[this.currentAgentIndex];
  }

  /**
   * Get the number of answers given to current agent
   */
  getCurrentQuestionCount(): number {
    return this.questionCount;
  }

  /**
   * Reset the service to initial state
   */
  reset(): void {
    this.questionCount = 0;
    this.currentAgentIndex = 0;
  }

  /**
   * Check if we're on the last agent
   */
  isLastAgent(): boolean {
    return this.currentAgentIndex === this.config.agentOrder.length - 1;
  }

  /**
   * Force switch to a specific agent (for manual switching)
   */
  switchToAgent(agentId: string): boolean {
    const index = this.config.agentOrder.indexOf(agentId);
    if (index !== -1) {
      this.currentAgentIndex = index;
      this.questionCount = 0;
      return true;
    }
    return false;
  }
}
