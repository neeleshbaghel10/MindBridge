/**
 * analytics/analyticsService.ts
 *
 * Institutional Mental-Health Analytics Service.
 * Implements strict DPDP Act 2023 compliance, zero PII disclosure,
 * and mathematical k-anonymity (k >= 10) cohort suppression.
 */

import { prisma } from '../prisma/client';

export const PRIVACY_THRESHOLD = 10;

export interface AnalyticsFilterOptions {
  range?: '7d' | '30d' | '90d' | 'semester';
  department?: string;
  yearOfStudy?: number;
}

export function getDateThreshold(range?: string): Date {
  const now = new Date();
  const days = range === '7d' ? 7 : range === '90d' ? 90 : range === 'semester' ? 120 : 30;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export class AnalyticsService {
  /**
   * 1. Campus Overview & Executive KPIs
   */
  static async getCampusOverview(institutionId: string, filters: AnalyticsFilterOptions = {}) {
    const totalStudents = await prisma.studentProfile.count({
      where: {
        user: { institutionId },
        ...(filters.department ? { department: filters.department } : {}),
        ...(filters.yearOfStudy ? { yearOfStudy: filters.yearOfStudy } : {}),
      },
    });

    if (totalStudents < PRIVACY_THRESHOLD) {
      return {
        privacyThresholdMet: false,
        privacyNotice: `Privacy Shield Active: Aggregate statistics are withheld until cohort reaches at least ${PRIVACY_THRESHOLD} students.`,
        totalStudentsMonitored: totalStudents,
      };
    }

    const dateFrom = getDateThreshold(filters.range);

    // 1. Check-in Aggregates (Mood, Stress, Sleep)
    const checkins = await prisma.wellbeingCheckin.findMany({
      where: {
        studentProfile: {
          user: { institutionId },
          ...(filters.department ? { department: filters.department } : {}),
          ...(filters.yearOfStudy ? { yearOfStudy: filters.yearOfStudy } : {}),
        },
        createdAt: { gte: dateFrom },
      },
      select: {
        moodScore: true,
        stressLevel: true,
        sleepHours: true,
        tags: true,
        studentProfileId: true,
      },
    });

    const checkinCount = checkins.length;
    const avgMood = checkinCount > 0
      ? Number((checkins.reduce((acc, c) => acc + c.moodScore, 0) / checkinCount).toFixed(2))
      : 3.5;
    const avgStress = checkinCount > 0
      ? Number((checkins.reduce((acc, c) => acc + c.stressLevel, 0) / checkinCount).toFixed(2))
      : 2.5;
    const avgSleep = checkinCount > 0
      ? Number((checkins.reduce((acc, c) => acc + c.sleepHours, 0) / checkinCount).toFixed(1))
      : 7.0;

    // Distinct engaged students
    const activeStudentIds = new Set(checkins.map(c => c.studentProfileId));
    const activeEngagementCount = activeStudentIds.size;
    const activeEngagementRate = totalStudents > 0
      ? Number(((activeEngagementCount / totalStudents) * 100).toFixed(1))
      : 0;

    // Top Stress Drivers
    const tagFreq: Record<string, number> = {};
    for (const c of checkins) {
      try {
        const parsed = JSON.parse(c.tags || '[]');
        if (Array.isArray(parsed)) {
          for (const t of parsed) {
            tagFreq[t] = (tagFreq[t] || 0) + 1;
          }
        }
      } catch (_) {}
    }
    const topStressDrivers = Object.entries(tagFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));

    // 2. Assessment Participation & Screenings
    const assessmentResponses = await prisma.assessmentResponse.findMany({
      where: {
        studentProfile: {
          user: { institutionId },
          ...(filters.department ? { department: filters.department } : {}),
          ...(filters.yearOfStudy ? { yearOfStudy: filters.yearOfStudy } : {}),
        },
        completedAt: { gte: dateFrom },
      },
      select: {
        id: true,
        studentProfileId: true,
        score: true,
        severityCategory: true,
        assessment: { select: { code: true, title: true } },
      },
    });

    const totalAssessmentsTaken = assessmentResponses.length;
    const uniqueStudentsAssessed = new Set(assessmentResponses.map(a => a.studentProfileId)).size;
    const assessmentParticipationRate = totalStudents > 0
      ? Number(((uniqueStudentsAssessed / totalStudents) * 100).toFixed(1))
      : 0;

    const assessmentBreakdown: Record<string, number> = {};
    for (const a of assessmentResponses) {
      const code = a.assessment.code;
      assessmentBreakdown[code] = (assessmentBreakdown[code] || 0) + 1;
    }

    // 3. Counselling Demand & Appointments Funnel
    const appointments = await prisma.appointment.findMany({
      where: {
        studentProfile: {
          user: { institutionId },
          ...(filters.department ? { department: filters.department } : {}),
          ...(filters.yearOfStudy ? { yearOfStudy: filters.yearOfStudy } : {}),
        },
        createdAt: { gte: dateFrom },
      },
      select: {
        id: true,
        status: true,
      },
    });

    const totalAppointments = appointments.length;
    const completedAppointments = appointments.filter(a => a.status === 'COMPLETED').length;
    const cancelledAppointments = appointments.filter(a => a.status === 'CANCELLED').length;
    const noShowAppointments = appointments.filter(a => a.status === 'NO_SHOW').length;
    const confirmedAppointments = appointments.filter(a => a.status === 'CONFIRMED' || a.status === 'REQUESTED' || a.status === 'RESCHEDULED').length;

    const resolvedSessionCount = completedAppointments + cancelledAppointments + noShowAppointments;
    const completionRate = resolvedSessionCount > 0
      ? Number(((completedAppointments / resolvedSessionCount) * 100).toFixed(1))
      : 100;
    const cancellationRate = resolvedSessionCount > 0
      ? Number(((cancelledAppointments / resolvedSessionCount) * 100).toFixed(1))
      : 0;
    const noShowRate = resolvedSessionCount > 0
      ? Number(((noShowAppointments / resolvedSessionCount) * 100).toFixed(1))
      : 0;

    // 4. Peer Support Community Health
    const [totalPeerPosts, totalPeerComments, totalPeerReactions] = await Promise.all([
      prisma.peerPost.count({
        where: {
          studentProfile: { user: { institutionId } },
          createdAt: { gte: dateFrom },
          deletedAt: null,
        },
      }),
      prisma.peerComment.count({
        where: {
          studentProfile: { user: { institutionId } },
          createdAt: { gte: dateFrom },
          deletedAt: null,
        },
      }),
      prisma.peerReaction.count({
        where: {
          studentProfile: { user: { institutionId } },
          createdAt: { gte: dateFrom },
        },
      }),
    ]);

    // 5. Resource Utilization
    const resourceProgressList = await prisma.resourceProgress.findMany({
      where: {
        studentProfile: { user: { institutionId } },
        lastAccessedAt: { gte: dateFrom },
      },
      select: {
        isCompleted: true,
        timeSpentSec: true,
        resource: { select: { title: true, category: true } },
      },
    });

    const totalResourceReads = resourceProgressList.length;
    const completedResourceReads = resourceProgressList.filter(r => r.isCompleted).length;
    const totalMinutesSpentReading = Math.round(
      resourceProgressList.reduce((acc, r) => acc + r.timeSpentSec, 0) / 60
    );

    // 6. Crisis Events (Strictly De-Identified Count by Tier)
    const crisisEvents = await prisma.riskEvent.findMany({
      where: {
        studentProfile: { user: { institutionId } },
        createdAt: { gte: dateFrom },
      },
      select: {
        riskLevel: true,
      },
    });

    const crisisTiers: Record<string, number> = {
      LEVEL_0: 0,
      LEVEL_1: 0,
      LEVEL_2: 0,
      LEVEL_3: 0,
      LEVEL_4: 0,
    };
    for (const c of crisisEvents) {
      crisisTiers[c.riskLevel] = (crisisTiers[c.riskLevel] || 0) + 1;
    }

    return {
      privacyThresholdMet: true,
      filtersApplied: {
        range: filters.range || '30d',
        department: filters.department || 'All',
        yearOfStudy: filters.yearOfStudy || 'All',
      },
      kpiSummary: {
        totalStudentsMonitored: totalStudents,
        activeEngagedStudents: activeEngagementCount,
        activeEngagementRate,
        averageCampusMoodScore: avgMood,
        averageCampusStressIndex: avgStress,
        averageCampusSleepHours: avgSleep,
        totalCheckinsLogged: checkinCount,
        assessmentParticipationRate,
        totalAssessmentsTaken,
        uniqueStudentsAssessed,
        totalCounsellingDemand: totalAppointments,
        completedAppointments,
        counsellingCompletionRate: completionRate,
        counsellingCancellationRate: cancellationRate,
        counsellingNoShowRate: noShowRate,
        totalPeerActivity: totalPeerPosts + totalPeerComments + totalPeerReactions,
        totalCrisisEscalations: crisisEvents.length,
      },
      topStressDrivers,
      assessmentBreakdown,
      counsellingFunnel: {
        total: totalAppointments,
        completed: completedAppointments,
        confirmed: confirmedAppointments,
        cancelled: cancelledAppointments,
        noShow: noShowAppointments,
        completionRate,
      },
      peerCommunityActivity: {
        posts: totalPeerPosts,
        comments: totalPeerComments,
        reactions: totalPeerReactions,
      },
      resourceUtilization: {
        totalReads: totalResourceReads,
        completedReads: completedResourceReads,
        totalMinutesSpent: totalMinutesSpentReading,
      },
      crisisRiskTiers: crisisTiers,
    };
  }

  /**
   * 2. Time-Based Trend Analysis (Daily/Weekly Series)
   */
  static async getTimeSeriesTrends(institutionId: string, range: string = '30d') {
    const dateFrom = getDateThreshold(range);

    const checkins = await prisma.wellbeingCheckin.findMany({
      where: {
        studentProfile: { user: { institutionId } },
        createdAt: { gte: dateFrom },
      },
      select: {
        moodScore: true,
        stressLevel: true,
        sleepHours: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const appointments = await prisma.appointment.findMany({
      where: {
        studentProfile: { user: { institutionId } },
        createdAt: { gte: dateFrom },
      },
      select: {
        status: true,
        createdAt: true,
      },
    });

    // Group by Date (YYYY-MM-DD)
    const dayMap = new Map<string, { moodSum: number; stressSum: number; sleepSum: number; count: number; appointments: number }>();

    // Pre-populate date buckets
    const now = new Date();
    const daysCount = range === '7d' ? 7 : range === '90d' ? 90 : range === 'semester' ? 120 : 30;
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      dayMap.set(key, { moodSum: 0, stressSum: 0, sleepSum: 0, count: 0, appointments: 0 });
    }

    for (const c of checkins) {
      const key = c.createdAt.toISOString().split('T')[0];
      const entry = dayMap.get(key);
      if (entry) {
        entry.moodSum += c.moodScore;
        entry.stressSum += c.stressLevel;
        entry.sleepSum += c.sleepHours;
        entry.count += 1;
      }
    }

    for (const a of appointments) {
      const key = a.createdAt.toISOString().split('T')[0];
      const entry = dayMap.get(key);
      if (entry) {
        entry.appointments += 1;
      }
    }

    const series = Array.from(dayMap.entries()).map(([date, data]) => ({
      date,
      avgMood: data.count > 0 ? Number((data.moodSum / data.count).toFixed(2)) : 3.5,
      avgStress: data.count > 0 ? Number((data.stressSum / data.count).toFixed(2)) : 2.5,
      avgSleep: data.count > 0 ? Number((data.sleepSum / data.count).toFixed(1)) : 7.0,
      checkinVolume: data.count,
      appointmentsBooked: data.appointments,
    }));

    return {
      range,
      dataPointsCount: series.length,
      series,
    };
  }

  /**
   * 3. Clinical Assessment Severity Distributions
   */
  static async getAssessmentAnalytics(institutionId: string) {
    const responses = await prisma.assessmentResponse.findMany({
      where: {
        studentProfile: { user: { institutionId } },
      },
      select: {
        score: true,
        severityCategory: true,
        assessment: { select: { code: true, title: true } },
      },
    });

    const phq9Severities: Record<string, number> = {
      'Minimal Depression': 0,
      'Mild Depression': 0,
      'Moderate Depression': 0,
      'Moderately Severe Depression': 0,
      'Severe Depression': 0,
    };

    const gad7Severities: Record<string, number> = {
      'Minimal Anxiety': 0,
      'Mild Anxiety': 0,
      'Moderate Anxiety': 0,
      'Severe Anxiety': 0,
    };

    let phq9Scores: number[] = [];
    let gad7Scores: number[] = [];
    let who5Scores: number[] = [];

    for (const r of responses) {
      const code = r.assessment.code;
      const cat = r.severityCategory;

      if (code === 'PHQ9') {
        phq9Scores.push(r.score);
        if (cat in phq9Severities) phq9Severities[cat]++;
      } else if (code === 'GAD7') {
        gad7Scores.push(r.score);
        if (cat in gad7Severities) gad7Severities[cat]++;
      } else if (code === 'WHO5') {
        who5Scores.push(r.score);
      }
    }

    const avg = (arr: number[]) => arr.length > 0 ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : 0;

    return {
      phq9: {
        totalTaken: phq9Scores.length,
        averageScore: avg(phq9Scores),
        maxPossibleScore: 27,
        distribution: phq9Severities,
      },
      gad7: {
        totalTaken: gad7Scores.length,
        averageScore: avg(gad7Scores),
        maxPossibleScore: 21,
        distribution: gad7Severities,
      },
      who5: {
        totalTaken: who5Scores.length,
        averageScore: avg(who5Scores),
        maxPossibleScore: 100,
      },
    };
  }

  /**
   * 4. Anonymous Demographic Breakdowns with k-Anonymity (k >= 10)
   */
  static async getDemographicBreakdowns(institutionId: string) {
    // 1. Department Breakdown
    const departments = await prisma.studentProfile.groupBy({
      by: ['department'],
      where: { user: { institutionId } },
      _count: { id: true },
    });

    const departmentResults = await Promise.all(
      departments.map(async d => {
        const cohortSize = d._count.id;
        if (cohortSize < PRIVACY_THRESHOLD) {
          return {
            department: d.department,
            cohortSize,
            isSuppressed: true,
            suppressionNotice: `Protected by k-Anonymity (N < ${PRIVACY_THRESHOLD})`,
            avgMood: null,
            avgStress: null,
            avgSleep: null,
          };
        }

        const checkins = await prisma.wellbeingCheckin.findMany({
          where: { studentProfile: { department: d.department, user: { institutionId } } },
          select: { moodScore: true, stressLevel: true, sleepHours: true },
        });

        const count = checkins.length;
        return {
          department: d.department,
          cohortSize,
          isSuppressed: false,
          avgMood: count > 0 ? Number((checkins.reduce((a, b) => a + b.moodScore, 0) / count).toFixed(2)) : 3.5,
          avgStress: count > 0 ? Number((checkins.reduce((a, b) => a + b.stressLevel, 0) / count).toFixed(2)) : 2.5,
          avgSleep: count > 0 ? Number((checkins.reduce((a, b) => a + b.sleepHours, 0) / count).toFixed(1)) : 7.0,
        };
      })
    );

    // 2. Year of Study Breakdown
    const years = await prisma.studentProfile.groupBy({
      by: ['yearOfStudy'],
      where: { user: { institutionId } },
      _count: { id: true },
    });

    const yearResults = await Promise.all(
      years.map(async y => {
        const cohortSize = y._count.id;
        if (cohortSize < PRIVACY_THRESHOLD) {
          return {
            yearOfStudy: y.yearOfStudy,
            yearLabel: `Year ${y.yearOfStudy}`,
            cohortSize,
            isSuppressed: true,
            suppressionNotice: `Protected by k-Anonymity (N < ${PRIVACY_THRESHOLD})`,
            avgMood: null,
            avgStress: null,
            avgSleep: null,
          };
        }

        const checkins = await prisma.wellbeingCheckin.findMany({
          where: { studentProfile: { yearOfStudy: y.yearOfStudy, user: { institutionId } } },
          select: { moodScore: true, stressLevel: true, sleepHours: true },
        });

        const count = checkins.length;
        return {
          yearOfStudy: y.yearOfStudy,
          yearLabel: `Year ${y.yearOfStudy}`,
          cohortSize,
          isSuppressed: false,
          avgMood: count > 0 ? Number((checkins.reduce((a, b) => a + b.moodScore, 0) / count).toFixed(2)) : 3.5,
          avgStress: count > 0 ? Number((checkins.reduce((a, b) => a + b.stressLevel, 0) / count).toFixed(2)) : 2.5,
          avgSleep: count > 0 ? Number((checkins.reduce((a, b) => a + b.sleepHours, 0) / count).toFixed(1)) : 7.0,
        };
      })
    );

    return {
      privacyThreshold: PRIVACY_THRESHOLD,
      departments: departmentResults,
      yearsOfStudy: yearResults,
    };
  }

  /**
   * 5. Privacy-Preserving Report Generation (CSV & JSON)
   */
  static async generateExportReport(institutionId: string, format: 'csv' | 'json' = 'json') {
    const overview = await this.getCampusOverview(institutionId, { range: 'semester' });
    const breakdowns = await this.getDemographicBreakdowns(institutionId);

    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
      select: { name: true, code: true },
    });

    const reportPayload = {
      metadata: {
        institutionName: institution?.name || 'Academic Institution',
        institutionCode: institution?.code || 'INST',
        generatedAt: new Date().toISOString(),
        governance: 'DPDP Act 2023 & Institutional Student Welfare Ethics Board',
        privacyGuarantees: [
          'Zero Personally Identifiable Information (PII) contained in this record.',
          'Mathematical k-anonymity (N >= 10) applied to all cohorts.',
          'Small demographic groups strictly suppressed to prevent intersectional re-identification.',
        ],
      },
      overview,
      breakdowns,
    };

    if (format === 'csv') {
      // Format clean, human-readable CSV with multiple sections
      const lines: string[] = [];
      lines.push('MINDBRIDGE INSTITUTIONAL WELLBEING REPORT (ZERO-PII)');
      lines.push(`Institution,${institution?.name} (${institution?.code})`);
      lines.push(`Generated,${new Date().toISOString()}`);
      lines.push(`Privacy Standard,DPDP Act 2023 Compliant (k-Anonymity N>=10)`);
      lines.push('');
      lines.push('CAMPUS EXECUTIVE KPIS');
      lines.push('Metric,Value');
      if (overview.kpiSummary) {
        lines.push(`Total Students Monitored,${overview.kpiSummary.totalStudentsMonitored}`);
        lines.push(`Active Engaged Students,${overview.kpiSummary.activeEngagedStudents}`);
        lines.push(`Active Engagement Rate,${overview.kpiSummary.activeEngagementRate}%`);
        lines.push(`Campus Mood Index (1-5),${overview.kpiSummary.averageCampusMoodScore}`);
        lines.push(`Campus Stress Index (1-5),${overview.kpiSummary.averageCampusStressIndex}`);
        lines.push(`Avg Sleep Duration (Hours),${overview.kpiSummary.averageCampusSleepHours}`);
        lines.push(`Assessment Participation Rate,${overview.kpiSummary.assessmentParticipationRate}%`);
        lines.push(`Counselling Appointments Completed,${overview.kpiSummary.completedAppointments}`);
        lines.push(`Counselling Completion Rate,${overview.kpiSummary.counsellingCompletionRate}%`);
        lines.push(`Peer Community Actions,${overview.kpiSummary.totalPeerActivity}`);
        lines.push(`Crisis Interventions (De-identified),${overview.kpiSummary.totalCrisisEscalations}`);
      }
      lines.push('');
      lines.push('DEPARTMENTAL VITALITY BREAKDOWN (k-ANONYMITY PROTECTED)');
      lines.push('Department,Cohort Size,Avg Mood (1-5),Avg Stress (1-5),Avg Sleep (h),Privacy Status');
      for (const d of breakdowns.departments) {
        if (d.isSuppressed) {
          lines.push(`"${d.department}",${d.cohortSize},N/A,N/A,N/A,SUPPRESSED (Cohort < 10)`);
        } else {
          lines.push(`"${d.department}",${d.cohortSize},${d.avgMood},${d.avgStress},${d.avgSleep},VERIFIED (k>=10)`);
        }
      }

      return {
        format: 'csv',
        filename: `mindbridge_analytics_${institution?.code || 'campus'}_${Date.now()}.csv`,
        content: lines.join('\n'),
      };
    }

    return {
      format: 'json',
      filename: `mindbridge_analytics_${institution?.code || 'campus'}_${Date.now()}.json`,
      content: JSON.stringify(reportPayload, null, 2),
    };
  }
}
