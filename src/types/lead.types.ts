export interface Lead {
  id: string;
  name?: string;
  email?: string;
  score?: number;
  [key: string]: unknown;
}
