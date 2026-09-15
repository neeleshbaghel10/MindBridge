// MINDBRIDGE - AI Psychological First-Aid & Supportive Conversation Engine
import { config } from '../config';

export interface StructuredAiResponse {
  supportiveMessage: string;
  groundingExercise?: {
    type: 'BREATHING_4_7_8' | 'BOX_BREATHING' | 'GROUNDING_5_4_3_2_1' | 'COGNITIVE_REFRAME';
    title: string;
    instructions: string[];
  };
  suggestedAction?: string;
  counsellorReferralPrompt?: boolean;
}

const GROUNDING_EXERCISES = {
  BREATHING_4_7_8: {
    type: 'BREATHING_4_7_8' as const,
    title: '4-7-8 Vagus Nerve Breathing',
    instructions: [
      'Breathe out completely through your mouth.',
      'Inhale softly through your nose for 4 seconds.',
      'Hold your breath comfortably for 7 seconds.',
      'Exhale slowly and completely through your mouth for 8 seconds.',
      'Repeat this cycle 4 times to stimulate calm parasympathetic relaxation.',
    ],
  },
  GROUNDING_5_4_3_2_1: {
    type: 'GROUNDING_5_4_3_2_1' as const,
    title: '5-4-3-2-1 Sensory Grounding Technique',
    instructions: [
      'Acknowledge 5 things you can see around you right now.',
      'Acknowledge 4 things you can physically feel (e.g. your feet on the floor, your shirt on your shoulders).',
      'Acknowledge 3 things you can hear in your environment.',
      'Acknowledge 2 things you can smell or like the smell of.',
      'Acknowledge 1 good or comforting thing about yourself.',
    ],
  },
  BOX_BREATHING: {
    type: 'BOX_BREATHING' as const,
    title: 'Box Breathing (4x4 Reset)',
    instructions: [
      'Inhale for 4 seconds.',
      'Hold your breath for 4 seconds.',
      'Exhale gently for 4 seconds.',
      'Pause and rest for 4 seconds before the next breath.',
    ],
  },
};

export const generateSupportiveAiResponse = async (
  userMessage: string,
  recentHistory: { sender: string; content: string }[] = [],
  riskLevel: string = 'NONE'
): Promise<StructuredAiResponse> => {
  const normalized = userMessage.toLowerCase();

  // If Gemini API key is configured and not in forced mock mode, call Gemini
  if (config.geminiApiKey && !config.aiMockMode) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `System Prompt: You are MINDBRIDGE, an empathetic AI Psychological First-Aid Assistant for university students.
IMPORTANT CLINICAL SAFETY BOUNDARIES:
- You are NOT a doctor or psychiatrist. NEVER diagnose mental illnesses or prescribe drugs.
- Provide warm, non-judgmental, active-listening support.
- Encourage self-compassion and evidence-based grounding techniques.
- Suggest speaking with a university counsellor if distress is noticeable.

Student message: "${userMessage}".
Provide a supportive response in 2-3 short, comforting paragraphs.`,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (response.ok) {
        const result = (await response.json()) as any;
        const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (generatedText) {
          return {
            supportiveMessage: generatedText,
            groundingExercise: riskLevel === 'MODERATE' ? GROUNDING_EXERCISES.BREATHING_4_7_8 : undefined,
            suggestedAction: 'Take a gentle 5-minute break and hydrate with a glass of water.',
            counsellorReferralPrompt: riskLevel === 'MODERATE',
          };
        }
      }
    } catch (apiErr) {
      console.warn('Gemini API call failed, falling back to psychological first-aid knowledge base:', apiErr);
    }
  }

  // Psychological First-Aid Knowledge Base (High Quality, Reliable, Zero-Latency)
  if (normalized.includes('panic') || normalized.includes('anxiety') || normalized.includes('anxious') || normalized.includes('racing')) {
    return {
      supportiveMessage:
        "I hear how intense and overwhelming that feels right now. When anxiety peaks, your body is simply trying to protect you, but your nervous system is in overdrive. Let's take a moment together to slow things down. You are safe in this moment, and this surge will pass.",
      groundingExercise: GROUNDING_EXERCISES.BREATHING_4_7_8,
      suggestedAction: 'Place both feet flat on the floor, uncross your arms, and try the 4-7-8 breathing sequence above.',
      counsellorReferralPrompt: true,
    };
  }

  if (normalized.includes('exam') || normalized.includes('study') || normalized.includes('assignment') || normalized.includes('fail') || normalized.includes('grade')) {
    return {
      supportiveMessage:
        "Academic pressure can feel suffocating, especially when deadlines stack up and expectations feel immense. Remember that your worth as a human being is not defined by an exam score or a single semester. Breaking your tasks into tiny, manageable steps can help clear the mental fog.",
      groundingExercise: GROUNDING_EXERCISES.BOX_BREATHING,
      suggestedAction: 'Pick just ONE tiny task to focus on for 15 minutes, then give yourself full permission to pause.',
      counsellorReferralPrompt: false,
    };
  }

  if (normalized.includes('sleep') || normalized.includes('tired') || normalized.includes('insomnia') || normalized.includes('exhausted')) {
    return {
      supportiveMessage:
        "Sleep deprivation takes an enormous toll on emotional resilience and memory. When you are exhausted, every problem feels magnified. Let's prioritize giving your mind a true resting space tonight without harsh self-criticism.",
      groundingExercise: GROUNDING_EXERCISES.GROUNDING_5_4_3_2_1,
      suggestedAction: 'Dim your room lights, switch your devices to night mode or set them aside, and sip some warm water.',
      counsellorReferralPrompt: false,
    };
  }

  if (normalized.includes('lonely') || normalized.includes('alone') || normalized.includes('friend') || normalized.includes('isolated')) {
    return {
      supportiveMessage:
        "Feeling disconnected or isolated while surrounded by hundreds of peers on campus is a painful and surprisingly common experience. You are not alone in feeling this way, even when it feels invisible. Reaching out here is a brave first step.",
      suggestedAction: 'Consider joining our peer-support forum to see what fellow students are sharing anonymously, or talk to a campus counsellor.',
      counsellorReferralPrompt: true,
    };
  }

  // General Empathetic Default
  return {
    supportiveMessage:
      "Thank you for sharing that with me. It takes real courage to put what you are feeling into words. Whatever you are navigating today, please know that your feelings are valid. What would feel most supportive for you right now—talking through what is on your mind, trying a quick relaxation exercise, or exploring resources?",
    groundingExercise: GROUNDING_EXERCISES.BOX_BREATHING,
    suggestedAction: 'Take three slow, deep breaths and allow your shoulders to drop away from your ears.',
    counsellorReferralPrompt: false,
  };
};
