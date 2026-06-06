import { DecisionInput, DecisionAnalysis, FollowUpAdvice } from "../types";

type ApiAction = 'generateAlternatives' | 'analyzeDecision' | 'chatAboutAlternative' | 'generateFollowUp';

const callAiApi = async <T>(action: ApiAction, payload: Record<string, unknown>): Promise<T> => {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...payload }),
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // Keep a generic error below if the API did not return JSON.
  }

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data && typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : 'AI request failed';
    throw new Error(message);
  }

  if (!data || typeof data !== 'object' || !('result' in data)) {
    throw new Error('Invalid AI response');
  }

  return (data as { result: T }).result;
};

export const generateAlternatives = async (problemContext: string): Promise<string[]> => {
  if (!problemContext.trim()) return [];
  return callAiApi<string[]>('generateAlternatives', { problemContext });
};

export const analyzeDecision = async (input: DecisionInput): Promise<DecisionAnalysis> => {
  return callAiApi<DecisionAnalysis>('analyzeDecision', { input });
};

export const chatAboutAlternative = async (
  problem: string,
  alternative: string,
  framework: string,
  message: string,
  history: { role: 'user' | 'model'; text: string }[]
): Promise<string> => {
  return callAiApi<string>('chatAboutAlternative', {
    problem,
    alternative,
    framework,
    message,
    history,
  });
};

export const generateFollowUp = async (problem: string, alternative: string, framework: string): Promise<FollowUpAdvice> => {
  return callAiApi<FollowUpAdvice>('generateFollowUp', { problem, alternative, framework });
};
