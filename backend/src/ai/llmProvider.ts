// MINDBRIDGE - Pluggable LLM Provider Layer
// Decoupled architecture supporting Google Gemini, OpenAI, and Deterministic Fallback

import { LLMProvider, ConversationTurn, ResourceMetadata } from './types';
import { config } from '../config';

export class GeminiLlmProvider implements LLMProvider {
  name = 'GoogleGemini';

  async generateResponse(
    prompt: string,
    history: ConversationTurn[],
    retrievedResources: ResourceMetadata[]
  ): Promise<string> {
    if (!config.geminiApiKey || config.aiMockMode) {
      throw new Error('Gemini API key not configured or mock mode enabled.');
    }

    const contextSnippets = retrievedResources
      .map((r) => `Resource: ${r.title} (${r.category})\nSummary: ${r.summary}\nSteps: ${r.actionableSteps.join('; ')}`)
      .join('\n\n');

    const historyPrompt = history
      .slice(-4)
      .map((h) => `${h.sender === 'STUDENT' ? 'Student' : 'Assistant'}: ${h.content}`)
      .join('\n');

    const systemInstruction = `You are MINDBRIDGE, an empathetic AI Psychological First-Aid Assistant for university students.
STRICT CLINICAL & ETHICAL BOUNDARIES:
- You are strictly an AI assistant, NOT a doctor, psychiatrist, or licensed human therapist.
- NEVER claim or imply you are a human professional.
- NEVER diagnose any mental or physical illness.
- NEVER prescribe, name, or recommend any psychiatric or medical drugs or dosages.
- Always be warm, compassionate, non-judgmental, and validating.
- Ask 1 gentle, relevant clarifying question to help the student explore what they are feeling.
- Offer low-risk, evidence-based coping strategies (like breathing or grounding).
- Recommend speaking to a campus counsellor if distress is noticeable.

APPROVED CONTEXT:
${contextSnippets}`;

    const fullPrompt = `${systemInstruction}\n\nRecent Conversation:\n${historyPrompt}\nStudent: ${prompt}\nAssistant:`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: fullPrompt }],
              },
            ],
            generationConfig: {
              temperature: 0.6,
              maxOutputTokens: 350,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const result = (await response.json()) as any;
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty response received from Gemini.');
      return text.trim();
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export class RuleBasedFallbackLlmProvider implements LLMProvider {
  name = 'RuleBasedFallback';

  async generateResponse(
    prompt: string,
    history: ConversationTurn[],
    retrievedResources: ResourceMetadata[]
  ): Promise<string> {
    const norm = prompt.toLowerCase();
    const primaryResource = retrievedResources[0];

    // 1. Anxiety / Panic Response
    if (norm.includes('anxi') || norm.includes('panic') || norm.includes('breath') || norm.includes('racing') || norm.includes('trembl')) {
      return (
        "I hear how overwhelming and uncomfortable that sensation feels right now. When anxiety peaks, your body's alarm system is firing, but you are safe in this physical moment. " +
        "Let's focus on gently slowing down your breathing together.\n\n" +
        (primaryResource ? `A proven technique is the ${primaryResource.title}: ${primaryResource.actionableSteps[0] || 'Take a slow breath in and a longer exhale.'}\n\n` : '') +
        "How does your body feel right now—are your shoulders or jaw holding tension? Would it help to try a short 4-7-8 breathing cycle together, or would you prefer talking through what triggered this?"
      );
    }

    // 2. Academic Pressure Response
    if (norm.includes('exam') || norm.includes('study') || norm.includes('grade') || norm.includes('fail') || norm.includes('cgpa') || norm.includes('deadline')) {
      return (
        "Academic deadlines and exam pressure can feel completely suffocating, especially when you are holding high standards for yourself. Please remember that your worth as a human being is never defined by a semester GPA or a single exam. " +
        "When everything feels like too much at once, picking just ONE tiny 10-minute task can help break the mental paralysis.\n\n" +
        "What is the single most urgent task on your plate today? Would you like to break it down together, or take a quick 5-minute mental reset first?"
      );
    }

    // 3. Loneliness & Campus Disconnection
    if (norm.includes('lone') || norm.includes('alone') || norm.includes('isolate') || norm.includes('friend') || norm.includes('nobody')) {
      return (
        "Feeling lonely or disconnected on campus is a painful experience, and it is far more common than most students let on. It can feel like everyone else has things figured out, but many are carrying that same quiet isolation. " +
        "Reaching out here is a courageous first step.\n\n" +
        "You might also find comfort in our anonymous Peer Support community, where students share openly without judgment. Have you been feeling this way for a while, or did something specific happen recently?"
      );
    }

    // 4. Sleep Issues
    if (norm.includes('sleep') || norm.includes('tired') || norm.includes('insomnia') || norm.includes('exhaust') || norm.includes('awake')) {
      return (
        "Struggling with sleep makes every other challenge feel twice as heavy. When your mind is racing in the dark, trying to force sleep often creates more frustration. " +
        "Giving yourself permission to simply rest your eyes without the pressure of having to fall asleep immediately can take the edge off.\n\n" +
        "Have you been having trouble falling asleep initially, or are you waking up during the night? Would you like to review some evidence-based sleep hygiene steps?"
      );
    }

    // 5. Default Empathetic Active Listening
    return (
      "Thank you for sharing that with me. It takes real honesty to put what you are navigating into words. " +
      "Whatever you are experiencing today, please know that your feelings are valid and you don't have to carry them entirely alone.\n\n" +
      "What would feel most supportive right now—talking through what's on your mind, trying a brief grounding exercise, or exploring campus counselling options?"
    );
  }
}

export class MultiProviderManager implements LLMProvider {
  name = 'MultiProviderManager';
  private primary: LLMProvider;
  private fallback: LLMProvider;

  constructor(primary?: LLMProvider, fallback?: LLMProvider) {
    this.primary = primary || new GeminiLlmProvider();
    this.fallback = fallback || new RuleBasedFallbackLlmProvider();
  }

  async generateResponse(
    prompt: string,
    history: ConversationTurn[],
    retrievedResources: ResourceMetadata[]
  ): Promise<string> {
    try {
      return await this.primary.generateResponse(prompt, history, retrievedResources);
    } catch (err) {
      console.warn(`[MultiProviderManager] Primary LLM provider (${this.primary.name}) unavailable, switching to fallback (${this.fallback.name}):`, (err as Error).message);
      return await this.fallback.generateResponse(prompt, history, retrievedResources);
    }
  }
}
