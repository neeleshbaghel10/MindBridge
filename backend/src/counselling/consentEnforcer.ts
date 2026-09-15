// MINDBRIDGE - STUDENT PRIVACY & CLINICAL CONSENT ENFORCER
// Implements DPDP Act 2023 & HIPAA compliance: guarantees only consented psychological data is shared

import { prisma } from '../prisma/client';
import { ConsentedStudentContext } from './types';

export class ConsentEnforcer {
  /**
   * Retrieves student context for attending counsellors, strictly adhering to the student's active consent.
   * If COUNSELLOR_DATA_SHARING is not explicitly GRANTED, psychological scores are redacted.
   * Real student PII (full name, phone, email) is NEVER included.
   */
  public static async getStudentContextForCounsellor(
    studentProfileId: string
  ): Promise<ConsentedStudentContext | null> {
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: {
        user: {
          select: {
            id: true,
            consents: {
              where: { type: 'COUNSELLOR_DATA_SHARING' },
              orderBy: { grantedAt: 'desc' },
              take: 1,
            },
          },
        },
        checkins: {
          orderBy: { date: 'desc' },
          take: 14,
        },
        assessments: {
          orderBy: { completedAt: 'desc' },
          take: 3,
          include: {
            assessment: {
              select: { code: true, title: true },
            },
          },
        },
      },
    });

    if (!student) {
      return null;
    }

    // Check if COUNSELLOR_DATA_SHARING consent is actively GRANTED
    const dataSharingConsent = student.user.consents[0];
    const hasConsented = dataSharingConsent?.status === 'GRANTED';

    if (!hasConsented) {
      // Privacy boundary enforced: psychological data withheld
      return {
        studentProfileId: student.id,
        anonymousAlias: student.anonymousAlias,
        department: student.department,
        yearOfStudy: student.yearOfStudy,
        preferredLanguage: student.preferredLanguage,
        dataSharingConsented: false,
        recentStressAvg: null,
        recentMoodAvg: null,
        recentAssessments: [],
      };
    }

    // Student consented: provide aggregated stress and clinical screening scores
    const avgStress =
      student.checkins.length > 0
        ? parseFloat(
            (
              student.checkins.reduce((acc, c) => acc + c.stressLevel, 0) /
              student.checkins.length
            ).toFixed(1)
          )
        : null;

    const avgMood =
      student.checkins.length > 0
        ? parseFloat(
            (
              student.checkins.reduce((acc, c) => acc + c.moodScore, 0) /
              student.checkins.length
            ).toFixed(1)
          )
        : null;

    const recentAssessments = student.assessments.map((a) => ({
      code: a.assessment.code,
      title: a.assessment.title,
      score: a.score,
      severity: a.severityCategory,
      completedAt: a.completedAt,
    }));

    return {
      studentProfileId: student.id,
      anonymousAlias: student.anonymousAlias,
      department: student.department,
      yearOfStudy: student.yearOfStudy,
      preferredLanguage: student.preferredLanguage,
      dataSharingConsented: true,
      recentStressAvg: avgStress,
      recentMoodAvg: avgMood,
      recentAssessments,
    };
  }
}
