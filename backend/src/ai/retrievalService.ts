// MINDBRIDGE - Retrieval Service (RAG Knowledge Base)
// Curates approved psychoeducational resources with strict clinical metadata

import { RetrievalService, ResourceMetadata, UserIntent, GroundingExercise } from './types';

export const APPROVED_KNOWLEDGE_BASE: ResourceMetadata[] = [
  {
    id: 'res-rag-001',
    title: '4-7-8 Vagus Nerve Breathing for Acute Anxiety',
    category: 'ANXIETY',
    language: 'en',
    source: 'National Institute of Mental Health and Neurosciences (NIMHANS) Clinical Protocol',
    evidenceLevel: 'Level 1 (RCT Supported)',
    reviewDate: '2025-01-10',
    approvedStatus: 'APPROVED',
    summary: 'A physiological vagus nerve activation technique that slows heart rate and counters hyperventilation during acute anxiety peaks.',
    slug: '4-7-8-breathing-technique',
    actionableSteps: [
      'Exhale completely through your mouth with a soft whoosh sound.',
      'Inhale quietly through your nose to a mental count of 4.',
      'Hold your breath comfortably for a count of 7.',
      'Exhale slowly and completely through your mouth for a count of 8.',
      'Repeat for 4 breath cycles.'
    ],
    groundingExercise: {
      type: 'BREATHING_4_7_8',
      title: '4-7-8 Vagus Nerve Breathing',
      instructions: [
        'Breathe out completely through your mouth.',
        'Inhale softly through your nose for 4 seconds.',
        'Hold your breath comfortably for 7 seconds.',
        'Exhale slowly and completely through your mouth for 8 seconds.',
        'Repeat this cycle 4 times to stimulate calm parasympathetic relaxation.'
      ]
    }
  },
  {
    id: 'res-rag-002',
    title: 'Box Breathing (4x4 Protocol) for Exam Pressure',
    category: 'ACADEMIC',
    language: 'en',
    source: 'Autonomic Neuroscience Consortium / Student Wellness Guidelines',
    evidenceLevel: 'Level 1 (RCT Supported)',
    reviewDate: '2025-01-15',
    approvedStatus: 'APPROVED',
    summary: 'Equal-duration tactical breathing technique that stabilizes cognitive overload and test anxiety prior to exams.',
    slug: 'box-breathing-for-academic-stress',
    actionableSteps: [
      'Inhale slowly for 4 seconds.',
      'Hold breath with lungs full for 4 seconds.',
      'Exhale smoothly for 4 seconds.',
      'Hold breath with lungs empty for 4 seconds.',
      'Repeat 3-5 times.'
    ],
    groundingExercise: {
      type: 'BOX_BREATHING',
      title: 'Box Breathing (4x4 Reset)',
      instructions: [
        'Inhale for 4 seconds.',
        'Hold your breath for 4 seconds.',
        'Exhale gently for 4 seconds.',
        'Pause and rest for 4 seconds before the next breath.'
      ]
    }
  },
  {
    id: 'res-rag-003',
    title: '5-4-3-2-1 Sensory Grounding for Overwhelm & Panic',
    category: 'MINDFULNESS',
    language: 'en',
    source: 'Substance Abuse and Mental Health Services Administration (SAMHSA) Trauma-Informed Grounding',
    evidenceLevel: 'Level 2 (Clinical Guidelines)',
    reviewDate: '2025-01-20',
    approvedStatus: 'APPROVED',
    summary: 'Engages external sensory processing to disrupt intrusive racing thoughts and anchor the nervous system to the present room.',
    slug: '5-4-3-2-1-sensory-grounding',
    actionableSteps: [
      'Notice 5 things you can see around you.',
      'Notice 4 things you can physically touch right now.',
      'Notice 3 distinct sounds you can hear.',
      'Notice 2 things you can smell or enjoy the scent of.',
      'Notice 1 comforting quality you appreciate in yourself.'
    ],
    groundingExercise: {
      type: 'GROUNDING_5_4_3_2_1',
      title: '5-4-3-2-1 Sensory Grounding Technique',
      instructions: [
        'Acknowledge 5 things you can see around you right now.',
        'Acknowledge 4 things you can physically feel (e.g. feet on floor).',
        'Acknowledge 3 sounds you can hear in your room.',
        'Acknowledge 2 things you can smell.',
        'Acknowledge 1 comforting thing about yourself.'
      ]
    }
  },
  {
    id: 'res-rag-004',
    title: 'Sleep Hygiene Protocols for University Students',
    category: 'SLEEP',
    language: 'en',
    source: 'American Academy of Sleep Medicine / Indian Sleep Research Society',
    evidenceLevel: 'Level 1 (RCT Supported)',
    reviewDate: '2025-01-22',
    approvedStatus: 'APPROVED',
    summary: 'Evidence-based behavioural modifications to improve restorative sleep architecture without pharmacological interventions.',
    slug: 'sleep-hygiene-essentials',
    actionableSteps: [
      'Establish a fixed wake-up time regardless of weekend schedules.',
      'Cease screen exposure or activate warm blue-light filters 45 minutes before sleep.',
      'Limit caffeine intake after 2:00 PM.',
      'Reserve the bed strictly for sleeping rather than studying or coursework.'
    ]
  },
  {
    id: 'res-rag-005',
    title: 'Navigating Campus Loneliness & Social Reconnection',
    category: 'LONELINESS',
    language: 'en',
    source: 'Higher Education Student Mental Health Charter',
    evidenceLevel: 'Level 3 (Evidence-Informed Practice)',
    reviewDate: '2025-02-01',
    approvedStatus: 'APPROVED',
    summary: 'Coping strategies for college transition, imposter syndrome, and finding low-pressure micro-connections on campus.',
    slug: 'navigating-campus-loneliness',
    actionableSteps: [
      'Acknowledge that loneliness during higher education is statistically common and not a personal defect.',
      'Engage in shared-activity spaces (e.g., campus clubs, library study circles) where interaction is low pressure.',
      'Participate in anonymous peer support communities to share mutual challenges.',
      'Consider a confidential consultation with a campus counsellor.'
    ]
  }
];

export class DefaultRetrievalService implements RetrievalService {
  private knowledgeBase: ResourceMetadata[];

  constructor(customResources?: ResourceMetadata[]) {
    this.knowledgeBase = customResources || APPROVED_KNOWLEDGE_BASE;
  }

  async retrieve(intent: UserIntent, content: string, language: string = 'en'): Promise<ResourceMetadata[]> {
    const normalized = content.toLowerCase();

    // Map intent to primary category
    let targetCategory: string | null = null;
    switch (intent) {
      case 'ANXIETY':
        targetCategory = 'ANXIETY';
        break;
      case 'ACADEMIC_STRESS':
        targetCategory = 'ACADEMIC';
        break;
      case 'SLEEP_ISSUES':
        targetCategory = 'SLEEP';
        break;
      case 'LONELINESS':
        targetCategory = 'LONELINESS';
        break;
      default:
        targetCategory = null;
    }

    const matched = this.knowledgeBase.filter((r) => {
      if (r.approvedStatus !== 'APPROVED') return false;

      // Category exact match
      if (targetCategory && r.category === targetCategory) return true;

      // Keyword semantic overlap
      const inTitle = r.title.toLowerCase().includes(normalized);
      const inSummary = r.summary.toLowerCase().includes(normalized);
      const inSteps = r.actionableSteps.some((step) => normalized.includes(step.toLowerCase()));

      return inTitle || inSummary || inSteps;
    });

    if (matched.length > 0) {
      return matched.slice(0, 2);
    }

    // Default fallback resource: grounding exercise
    const fallback = this.knowledgeBase.find((r) => r.id === 'res-rag-003');
    return fallback ? [fallback] : [this.knowledgeBase[0]];
  }

  getAllApprovedResources(): ResourceMetadata[] {
    return this.knowledgeBase.filter((r) => r.approvedStatus === 'APPROVED');
  }
}
