// MINDBRIDGE - Crisis Response Builder
// Constructs empathetic, shame-free, and transparent crisis de-escalation responses

import { RiskLevelTier, VerifiedCrisisResource } from './types';
import { config } from '../config';

export const OFFICIAL_CRISIS_RESOURCES: VerifiedCrisisResource[] = [
  {
    name: 'National Tele-MANAS',
    number: '14416',
    availableHours: '24 Hours / 7 Days (Toll-Free)',
    description: 'Government of India national tele-mental health programme providing free, confidential psychological first-aid in 20+ languages.',
    tollFree: true,
    verifiedOfficial: true,
    type: 'NATIONAL_HELPLINE',
  },
  {
    name: 'KIRAN Mental Health Rehabilitation',
    number: '1800-599-0019',
    availableHours: '24x7 Multi-lingual Assistance (Toll-Free)',
    description: 'Ministry of Social Justice and Empowerment 24/7 national helpline for crisis intervention, psychological support, and distress management.',
    tollFree: true,
    verifiedOfficial: true,
    type: 'NATIONAL_HELPLINE',
  },
  {
    name: 'National Emergency Response Support System',
    number: '112',
    availableHours: '24 Hours Daily',
    description: 'Pan-India single emergency contact number for immediate medical, police, or rescue dispatch.',
    tollFree: true,
    verifiedOfficial: true,
    type: 'CAMPUS_EMERGENCY',
  },
];

export interface BuiltCrisisResponse {
  supportiveMessage: string;
  transparencyDisclosure: string;
  verifiedResources: VerifiedCrisisResource[];
  groundingSteps: string[];
  suggestedAction: string;
  escalationNotice: string;
}

export class CrisisResponseBuilder {
  /**
   * Generates a compassionate, non-coercive, shame-free crisis response
   */
  static buildResponse(riskLevel: RiskLevelTier, campusHotline?: string): BuiltCrisisResponse {
    const resources = [...OFFICIAL_CRISIS_RESOURCES];
    if (campusHotline && campusHotline !== '112') {
      resources.push({
        name: 'Campus Wellness Clinic & Security',
        number: campusHotline,
        availableHours: '24/7 On-Campus First Response',
        description: 'Direct institutional medical and safety first response team.',
        tollFree: false,
        verifiedOfficial: true,
        type: 'CAMPUS_EMERGENCY',
      });
    }

    if (riskLevel === 'LEVEL_4') {
      return {
        supportiveMessage:
          "I hear how much pain you are in right now, and I want you to know that you are not alone in this moment. " +
          "Your life has real and lasting value, and there are people who care and want to support you through this right now. " +
          "Please stay with me, take a gentle breath, and reach out to someone who can help keep you safe immediately.",
        transparencyDisclosure:
          "Because your immediate safety is the highest priority, our emergency lifesaving protocol has been activated. " +
          "While routine discussions are private, acute imminent safety concerns cannot remain strictly confidential when immediate intervention is needed to protect your life.",
        verifiedResources: resources,
        groundingSteps: [
          'Step away from any immediate physical hazards and sit down in a safe, grounded spot.',
          'Take a slow breath in for 4 seconds, and exhale slowly for 6 seconds.',
          'Pick up your phone and call Tele-MANAS (14416) or 112 right now—a trained, caring person is ready to speak with you.',
        ],
        suggestedAction: 'Call 14416 (Tele-MANAS, Toll-Free) or 112 right now. Both are free and available 24/7.',
        escalationNotice: 'IMMINENT_SAFETY_PROTOCOL_ACTIVE',
      };
    }

    // LEVEL_3 (Severe Distress / Self-Harm / Crisis)
    return {
      supportiveMessage:
        "I hear how heavy and overwhelming things feel right now. It takes courage to put these feelings into words, " +
        "and you do not have to carry this intense burden by yourself. " +
        "There is no shame in feeling this way, and support is ready for you whenever you reach out.",
      transparencyDisclosure:
        "Under our campus wellbeing charter, severe crisis signals initiate supportive outreach from our campus counselling team to offer you direct care. Your safety and wellbeing are our central commitment.",
      verifiedResources: resources,
      groundingSteps: [
        'Place both feet flat on the floor and feel the solid ground underneath you.',
        'Inhale slowly for 4 seconds, hold for 4 seconds, and exhale gently for 6 seconds.',
        'Connect with a trusted friend, family member, or call Tele-MANAS at 14416.',
      ],
      suggestedAction: 'Speak with a Tele-MANAS counsellor at 14416 or book an urgent same-day appointment with our campus psychologists.',
      escalationNotice: 'CRISIS_SUPPORT_INITIATED',
    };
  }
}
