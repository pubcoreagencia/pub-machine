import { Lead } from '../types/lead.types';
export interface LeadInteraction {
    type: 'emailOpen' | 'emailClick' | 'websiteVisit' | 'formSubmit' | 'purchase' | string;
    timestamp?: Date;
    metadata?: Record<string, unknown>;
}
export interface LeadRepository {
    findById(leadId: string): Promise<Lead | null>;
    getInteractions(leadId: string): Promise<LeadInteraction[]>;
    updateScore(leadId: string, score: number): Promise<void>;
}
