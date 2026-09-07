import { Injectable, Logger } from '@nestjs/common';
import { LeadRepository } from '../../repositories/lead.repository';
import { Lead } from '../../types/lead.types';

@Injectable()
export class LeadScoringService {
  private readonly logger = new Logger(LeadScoringService.name);

  constructor(private readonly leadRepo: LeadRepository) {}

  /**
   * Calculates a numeric score for a lead based on its interaction history.
   * The scoring model is configurable via SCORE_THRESHOLDS.
   */
  async calculateScore(leadId: string): Promise<number> {
    const lead = await this.leadRepo.findById(leadId);
    if (!lead) {
      this.logger.warn(`Lead ${leadId} not found for scoring`);
      return 0;
    }

    const interactions = await this.leadRepo.getInteractions(leadId);
    let score = 0;

    interactions.forEach(interaction => {
      const points = LeadScoringService.SCORE_THRESHOLDS[interaction.type] ?? 0;
      score += points;
    });

    // Cap the score at 100
    const finalScore = Math.min(score, 100);
    this.logger.debug(`Calculated score ${finalScore} for lead ${leadId}`);
    return finalScore;
  }

  /**
   * Persists the calculated score back to the lead record.
   */
  async assignScore(leadId: string): Promise<void> {
    const currentScore = await this.calculateScore(leadId);
    await this.leadRepo.updateScore(leadId, currentScore);
    this.logger.log(`Assigned score ${currentScore} to lead ${leadId}`);
  }

  private static readonly SCORE_THRESHOLDS = {
    emailOpen: 10,
    emailClick: 15,
    websiteVisit: 20,
    formSubmit: 30,
    purchase: 50,
  };
}