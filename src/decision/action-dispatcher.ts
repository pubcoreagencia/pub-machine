/**
 * Action Dispatcher Desacoplado com Idempotência e Cooldown
 * Módulo: Decision & Dispatch V0
 *
 * Garante que:
 * 1. Nenhuma ação real seja disparada (Zero Fake Work / Testes em memória).
 * 2. Idempotência estrita: a mesma ação na mesma janela de cooldown é ignorada.
 * 3. Decisões expiradas são bloqueadas.
 * 4. Human Handoff: respeita executionMode marcando PENDING_APPROVAL quando exigido.
 */

import {
  DispatchResult,
  IActionDispatcher,
  LeadActionDecision,
} from './decision.types';

export class MemoryActionDispatcher implements IActionDispatcher {
  private readonly dispatchedRecords: LeadActionDecision[] = [];
  private readonly idempotencyIndex = new Map<string, number>(); // deduplicationKey -> dispatchedAt

  async dispatch(decision: LeadActionDecision): Promise<DispatchResult> {
    const now = Date.now();

    // 1. Checar Expiração
    if (decision.expiresAt && decision.expiresAt < now) {
      return {
        dispatched: false,
        decisionId: decision.decisionId,
        deduplicationKey: decision.deduplicationKey,
        timestamp: now,
        handler: 'MemoryActionDispatcher',
        status: 'EXPIRED',
        details: { reason: 'Decisão expirada com base na validade do sinal' },
      };
    }

    // 2. Checar Idempotência e Cooldown
    const lastDispatchedAt = this.idempotencyIndex.get(decision.deduplicationKey);
    if (lastDispatchedAt && now < decision.cooldownUntil) {
      return {
        dispatched: false,
        decisionId: decision.decisionId,
        deduplicationKey: decision.deduplicationKey,
        timestamp: now,
        handler: 'MemoryActionDispatcher',
        status: 'IGNORED_DUPLICATE',
        details: {
          lastDispatchedAt,
          cooldownUntil: decision.cooldownUntil,
        },
      };
    }

    // 3. Checar Human Handoff (Aprovação obrigatória)
    if (decision.executionMode === 'HUMAN_APPROVAL' || decision.executionMode === 'HUMAN_ONLY') {
      this.idempotencyIndex.set(decision.deduplicationKey, now);
      this.dispatchedRecords.push({ ...decision });

      return {
        dispatched: true,
        decisionId: decision.decisionId,
        deduplicationKey: decision.deduplicationKey,
        timestamp: now,
        handler: 'MemoryActionDispatcher',
        status: 'PENDING_APPROVAL',
        details: {
          executionMode: decision.executionMode,
          recommendedChannel: decision.recommendedChannel,
          slaHours: decision.slaHours,
        },
      };
    }

    // 4. Modo Autônomo Enfileirado
    this.idempotencyIndex.set(decision.deduplicationKey, now);
    this.dispatchedRecords.push({ ...decision });

    return {
      dispatched: true,
      decisionId: decision.decisionId,
      deduplicationKey: decision.deduplicationKey,
      timestamp: now,
      handler: 'MemoryActionDispatcher',
      status: 'QUEUED',
      details: {
        channel: decision.recommendedChannel,
        priority: decision.priority,
      },
    };
  }

  getDispatchedHistory(): LeadActionDecision[] {
    return [...this.dispatchedRecords];
  }

  clear(): void {
    this.dispatchedRecords.length = 0;
    this.idempotencyIndex.clear();
  }
}
