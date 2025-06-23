import { Agent, AgentValidationResult } from '../types';

/**
 * Gets the first enabled agent from a list of agents
 */
export function getFirstEnabledAgent(agents: Agent[]): Agent | null {
  return agents.find(agent => agent.enabled) || null;
}

/**
 * Validates agent selection and returns validation result
 */
export function validateAgentSelection(
  agentId: string | null,
  agents: Agent[]
): AgentValidationResult {
  if (!agentId) {
    return { isValid: false, error: 'No agent selected' };
  }
  
  const agent = agents.find(a => a.id === agentId);
  if (!agent) {
    return { isValid: false, error: `Agent not found: ${agentId}` };
  }
  
  if (!agent.enabled) {
    return { isValid: false, error: `Agent is disabled: ${agent.name}` };
  }
  
  return { isValid: true, agent };
}

/**
 * Gets all enabled agents from a list
 */
export function getEnabledAgents(agents: Agent[]): Agent[] {
  return agents.filter(agent => agent.enabled);
}

/**
 * Finds an agent by ID
 */
export function findAgentById(agentId: string, agents: Agent[]): Agent | undefined {
  return agents.find(agent => agent.id === agentId);
}

/**
 * Auto-selects the first enabled agent if no agent is currently selected
 */
export function autoSelectFirstAgent(
  currentSelectedAgent: string | null,
  agents: Agent[],
  selectFn: (agentId: string) => void
): boolean {
  if (!currentSelectedAgent && agents.length > 0) {
    const firstEnabled = getFirstEnabledAgent(agents);
    if (firstEnabled) {
      selectFn(firstEnabled.id);
      return true;
    }
  }
  return false;
}