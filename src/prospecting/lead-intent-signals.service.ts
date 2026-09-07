import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

/**
 * Sinais de intenção capturados a partir de múltiplos canais.
 * Permite normalização e enriquecimento antes do scoring do lead.
 */
export type IntentChannel =
  | 'email_open'
  | 'email_click'
  | 'website_visit'
  | 'pricing_page_view'
  | 'demo_request'
  | 'content_download'
  | 'webinar_attendance'
  | 'linkedin_engagement'
  | 'competitor_mention'
  | 'funding_announcement'
  | 'hiring_signal';

export interface IntentSignal {
  leadId: string;
  channel: IntentChannel;
  weight: number; // 0..1 peso bruto do sinal
  occurredAt: Date;
  metadata?: Record<string, unknown>;
}

export interface IntentProfile {
  leadId: string;
  score: number; // 0..100
  lastSignalAt: Date | null;
  topChannels: IntentChannel[];
  signalCount: number;
  decayFactor: number; // 0..1 (1 = sinais frescos)
  computedAt: Date;
}

/**
 * Pesos canônicos por canal. Centraliza o tuning do produto.
 */
const CHANNEL_WEIGHTS: Record<IntentChannel, number> = {
  demo_request: 1.0,
  pricing_page_view: 0.9,
  competitor_mention: 0.85,
  funding_announcement: 0.8,
  email_click: 0.6,
  website_visit: 0.45,
  content_download: 0.55,
  webinar_attendance: 0.5,
  linkedin_engagement: 0.35,
  hiring_signal: 0.5,
  email_open: 0.2,
};

/**
 * Half-life em horas: quanto maior, mais lento o decay.
 * Sinais de funil baixo decaem mais rápido.
 */
const CHANNEL_HALF_LIFE_HOURS: Partial<Record<IntentChannel, number>> = {
  demo_request: 168, // 7 dias
  pricing_page_view: 96,
  competitor_mention: 240, // 10 dias
  funding_announcement: 720, // 30 dias
  email_click: 72,
  website_visit: 24,
  content_download: 120,
  webinar_attendance: 168,
  linkedin_engagement: 168,
  hiring_signal: 336,
  email_open: 48,
};

/**
 * LeadIntentSignalsService
 *
 * Agrega sinais cross-channel com decay temporal para produzir um perfil
 * de intenção consolidado por lead. Emite eventos para que outros
 * serviços (scoring, priorização, orquestração de cadências) reajam.
 */
@Injectable()
export class LeadIntentSignalsService {
  private readonly logger = new Logger(LeadIntentSignalsService.name);

  /** Buffer em memória por leadId; em produção plugar Redis/Postgres. */
  private readonly signalsByLead = new Map<string, IntentSignal[]>();
  private readonly profileCache = new Map<string, IntentProfile>();

  constructor(private readonly emitter: EventEmitter2) {}

  /**
   * Registra um sinal e re-computa o perfil do lead.
   */
  async capture(signal: IntentSignal): Promise<IntentProfile> {
    const list = this.signalsByLead.get(signal.leadId) ?? [];
    list.push(signal);
    this.signalsByLead.set(signal.leadId, list);

    const profile = this.computeProfile(signal.leadId);
    this.profileCache.set(signal.leadId, profile);

    this.emitter.emit('intent.profile.updated', profile);
    this.logger.debug(
      `intent captured lead=${signal.leadId} channel=${signal.channel} score=${profile.score.toFixed(2)}`,
    );
    return profile;
  }

  /**
   * Captura em lote, útil ao importar histórico do CRM.
   */
  async captureBatch(signals: IntentSignal[]): Promise<IntentProfile[]> {
    const profiles: IntentProfile[] = [];
    for (const s of signals) {
      profiles.push(await this.capture(s));
    }
    return profiles;
  }

  /**
   * Recupera perfil cacheado ou recomputa on-demand.
   */
  getProfile(leadId: string): IntentProfile {
    const cached = this.profileCache.get(leadId);
    if (cached) return cached;
    const profile = this.computeProfile(leadId);
    this.profileCache.set(leadId, profile);
    return profile;
  }

  /**
   * Lista top N leads por score para alimentar dashboards.
   */
  topLeads(limit = 20): IntentProfile[] {
    return Array.from(this.profileCache.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /** Limpa dados de um lead (LGPD / opt-out). */
  purge(leadId: string): void {
    this.signalsByLead.delete(leadId);
    this.profileCache.delete(leadId);
    this.emitter.emit('intent.profile.purged', { leadId });
  }

  /** Reage a enriquecimento externo invalidando o cache. */
  @OnEvent('lead.enriched')
  handleLeadEnriched(payload: { leadId: string }): void {
    const profile = this.computeProfile(payload.leadId);
    this.profileCache.set(payload.leadId, profile);
    this.emitter.emit('intent.profile.updated', profile);
  }

  // ------------------------- core math -------------------------

  private computeProfile(leadId: string): IntentProfile {
    const signals = this.signalsByLead.get(leadId) ?? [];
    const now = new Date();

    if (signals.length === 0) {
      return {
        leadId,
        score: 0,
        lastSignalAt: null,
        topChannels: [],
        signalCount: 0,
        decayFactor: 0,
        computedAt: now,
      };
    }

    const channelAgg = new Map<
      IntentChannel,
      { weighted: number; lastAt: Date; count: number }
    >();

    let totalScore = 0;
    let totalDecay = 0;
    let lastSignalAt: Date | null = null;

    for (const s of signals) {
      const baseWeight = CHANNEL_WEIGHTS[s.channel] ?? 0.3;
      const halfLife = CHANNEL_HALF_LIFE_HOURS[s.channel] ?? 72;
      const ageHours =
        (now.getTime() - s.occurredAt.getTime()) / (1000 * 60 * 60);
      const decay = Math.pow(0.5, Math.max(0, ageHours) / halfLife);
      const contribution = baseWeight * decay * (s.weight || 1);

      totalScore += contribution;
      totalDecay += decay;

      const agg = channelAgg.get(s.channel) ?? {
        weighted: 0,
        lastAt: s.occurredAt,
        count: 0,
      };
      agg.weighted += contribution;
      agg.count += 1;
      if (s.occurredAt.getTime() > agg.lastAt.getTime()) {
        agg.lastAt = s.occurredAt;
      }
      channelAgg.set(s.channel, agg);

      if (!lastSignalAt || s.occurredAt.getTime() > lastSignalAt.getTime()) {
        lastSignalAt = s.occurredAt;
      }
    }

    // Normaliza para 0..100 com saturação logística para evitar outliers.
    const normalized = (1 - Math.exp(-totalScore)) * 100;
    const decayFactor = totalDecay / signals.length;

    const topChannels = Array.from(channelAgg.entries())
      .sort((a, b) => b[1].weighted - a[1].weighted)
      .slice(0, 3)
      .map(([ch]) => ch);

    return {
      leadId,
      score: Math.round(normalized * 100) / 100,
      lastSignalAt,
      topChannels,
      signalCount: signals.length,
      decayFactor: Math.round(decayFactor * 1000) / 1000,
      computedAt: now,
    };
  }
}
