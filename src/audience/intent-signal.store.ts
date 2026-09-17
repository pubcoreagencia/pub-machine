/**
 * Store Desacoplado para Sinais de Intenção Derivados
 * Módulo: Audience Intelligence V0
 */

import { BridgeIntentSignal } from './audience.types';

export interface IIntentSignalStore {
  saveIntentSignal(signal: BridgeIntentSignal): Promise<void>;
  getSignalsBySubject(subjectId: string): Promise<BridgeIntentSignal[]>;
  purge(subjectId: string): Promise<number>;
}

export class MemoryIntentSignalStore implements IIntentSignalStore {
  private readonly signals = new Map<string, BridgeIntentSignal[]>();

  async saveIntentSignal(signal: BridgeIntentSignal): Promise<void> {
    const list = this.signals.get(signal.subjectId) ?? [];
    list.push({ ...signal });
    this.signals.set(signal.subjectId, list);
  }

  async getSignalsBySubject(subjectId: string): Promise<BridgeIntentSignal[]> {
    const list = this.signals.get(subjectId) ?? [];
    return list.map(s => ({ ...s }));
  }

  async purge(subjectId: string): Promise<number> {
    const list = this.signals.get(subjectId);
    if (!list) return 0;
    const count = list.length;
    this.signals.delete(subjectId);
    return count;
  }
}
