/**
 * Store Desacoplado de Perfis de Audiência
 * Módulo: Audience Intelligence V0
 *
 * Separação estrita de domínios:
 * SIGNAL STORE ≠ AUDIENCE PROFILE STORE ≠ INTENT STORE ≠ LEAD STORE
 */

import { AudienceProfile } from './audience.types';

export interface IAudienceProfileStore {
  saveProfile(profile: AudienceProfile): Promise<void>;
  getProfile(subjectId: string): Promise<AudienceProfile | null>;
  getProfilesBySegment(segmentId: string, limit?: number): Promise<AudienceProfile[]>;
  purge(subjectId: string): Promise<boolean>;
}

export class MemoryAudienceProfileStore implements IAudienceProfileStore {
  private readonly profiles = new Map<string, AudienceProfile>();

  async saveProfile(profile: AudienceProfile): Promise<void> {
    this.profiles.set(profile.subjectId, JSON.parse(JSON.stringify(profile)));
  }

  async getProfile(subjectId: string): Promise<AudienceProfile | null> {
    const p = this.profiles.get(subjectId);
    return p ? JSON.parse(JSON.stringify(p)) : null;
  }

  async getProfilesBySegment(segmentId: string, limit = 100): Promise<AudienceProfile[]> {
    const list: AudienceProfile[] = [];
    for (const p of this.profiles.values()) {
      if (p.segments.some(s => s.segmentId === segmentId)) {
        list.push(JSON.parse(JSON.stringify(p)));
        if (list.length >= limit) break;
      }
    }
    return list;
  }

  async purge(subjectId: string): Promise<boolean> {
    return this.profiles.delete(subjectId);
  }
}
