import { Lead } from './types';

interface VelocitySignal {
  weight: number;
  detector: (lead: Lead) => boolean;
  reason: string;
}

interface VelocityReport {
  leadId: string;
  score: number;
  tier: 'ice_cold' | 'warm' | 'hot' | 'on_fire';
  signals: string[];
  estimatedTimeToCloseHours: number;
  priorityRank: number;
  computedAt: string;
}

export class LeadConversionVelocityService {
  private static readonly ICE_COLD_THRESHOLD = 25;
  private static readonly WARM_THRESHOLD = 50;
  private static readonly HOT_THRESHOLD = 75;

  private readonly signals: VelocitySignal[] = [
    {
      weight: 20,
      detector: (l) => l.recentDemoRequest === true,
      reason: 'recent_demo_requested',
    },
    {
      weight: 18,
      detector: (l) => l.visitedPricingPageLast24h === true,
      reason: 'pricing_page_visit_24h',
    },
    {
      weight: 15,
      detector: (l) => typeof l.emailOpenRate === 'number' && l.emailOpenRate >= 0.6,
      reason: 'high_email_engagement',
    },
    {
      weight: 12,
      detector: (l) => l.repliedToOutreach === true,
      reason: 'positive_reply_received',
    },
    {
      weight: 10,
      detector: (l) => typeof l.employeeCount === 'number' && l.employeeCount >= 50 && l.employeeCount <= 500,
      reason: 'sweet_spot_company_size',
    },
    {
      weight: 10,
      detector: (l) => typeof l.budgetConfirmed === 'boolean' && l.budgetConfirmed === true,
      reason: 'budget_already_confirmed',
    },
    {
      weight: 8,
      detector: (l) => typeof l.decisionMakerRole === 'string' && /c[eo]o|founder|director|head|vp/i.test(l.decisionMakerRole),
      reason: 'decision_maker_identified',
    },
    {
      weight: 7,
      detector: (l) => typeof l.competitorMentions === 'number' && l.competitorMentions >= 2,
      reason: 'evaluating_competitors',
    },
    {
      weight: 5,
      detector: (l) => l.referralPartner != null && l.referralPartner !== '',
      reason: 'referred_lead',
    },
    {
      weight: -15,
      detector: (l) => l.unsubscribed === true,
      reason: 'unsubscribed_penalty',
    },
    {
      weight: -10,
      detector: (l) => typeof l.lastContactDaysAgo === 'number' && l.lastContactDaysAgo > 60,
      reason: 'cold_recency_penalty',
    },
  ];

  public analyze(lead: Lead): VelocityReport {
    if (!lead || !lead.id) {
      throw new Error('LeadConversionVelocityService: invalid lead payload');
    }

    const matchedSignals: string[] = [];
    let rawScore = 0;

    for (const signal of this.signals) {
      try {
        if (signal.detector(lead)) {
          rawScore += signal.weight;
          matchedSignals.push(signal.reason);
        }
      } catch {
        continue;
      }
    }

    const score = Math.max(0, Math.min(100, rawScore));
    const tier = this.classifyTier(score);
    const estimatedTimeToCloseHours = this.estimateTimeToClose(score, matchedSignals.length);

    return {
      leadId: lead.id,
      score,
      tier,
      signals: matchedSignals,
      estimatedTimeToCloseHours,
      priorityRank: this.computePriorityRank(score, estimatedTimeToCloseHours),
      computedAt: new Date().toISOString(),
    };
  }

  public analyzeBatch(leads: Lead[]): VelocityReport[] {
    const reports = leads.map((lead) => this.analyze(lead));
    return reports.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.estimatedTimeToCloseHours - b.estimatedTimeToCloseHours;
    });
  }

  private classifyTier(score: number): VelocityReport['tier'] {
    if (score >= LeadConversionVelocityService.HOT_THRESHOLD) return 'on_fire';
    if (score >= LeadConversionVelocityService.WARM_THRESHOLD) return 'hot';
    if (score >= LeadConversionVelocityService.ICE_COLD_THRESHOLD) return 'warm';
    return 'ice_cold';
  }

  private estimateTimeToClose(score: number, signalCount: number): number {
    const baseHours = 720 - score * 6;
    const signalBoost = Math.min(signalCount, 5) * 24;
    return Math.max(24, baseHours - signalBoost);
  }

  private computePriorityRank(score: number, etaHours: number): number {
    const normalizedEta = Math.min(etaHours / 720, 1);
    return Number((score * 0.7 + (1 - normalizedEta) * 100 * 0.3).toFixed(2));
  }
}

export default LeadConversionVelocityService;
