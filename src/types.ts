import type { SlopDimension, SlopPatternId } from './slopTaxonomy.js';
export interface Evidence {
  file: string;
  line: number;
  snippet: string;
  explanation: string;
}
export interface Finding {
  id: string;
  repoId: string;
  title: string;
  dimension: SlopDimension;
  patternId: SlopPatternId;
  legacyCategory?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  impact: number;
  risk: number;
  blastRadius: number;
  effort: number;
  confidence: number;
  findings: number;
  patterns: number;
  why: string;
  deferReason?: string;
  steps: string[];
  dependencies: string[];
  unlocks: number;
  evidence: Evidence[];
  sources: string[];
  status: 'open' | 'in-progress' | 'resolved' | 'deferred';
  score: number;
}
export interface Repo {
  id: string;
  name: string;
  owner: string;
  source: 'github' | 'local';
  location: string;
  stack: string;
  health: number | null;
  files: number;
  lastScan: string | null;
  demo?: boolean;
  analysis?: { harness: string; coverage: string };
  findings: Finding[];
  trend: { date: string; value: number }[];
}
export interface Scan {
  id: string;
  repoId: string;
  repoName: string;
  startedAt: string;
  updatedAt?: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  phase: string;
  progress: number;
  harness: string;
  model: string;
  effort: string;
  depth: string;
  health?: number;
  findingCount?: number;
  error?: string;
  coverage?: string;
  profileId: string;
  profileSnapshot?: Profile;
  knowledgeIds?: string[];
  commit?: string;
  findings?: Finding[];
  usage?: ScanUsage;
  demo?: boolean;
}
export interface ScanUsage {
  uncachedInputTokens: number;
  cachedInputTokens: number;
  cacheWriteInputTokens: number;
  outputTokens: number;
  estimatedCostUsd?: number;
  pricing?: {
    version: string;
    model: string;
    inputPerMillion: number;
    cachedInputPerMillion: number;
    cacheWriteInputPerMillion: number;
    outputPerMillion: number;
    longContextThreshold?: number;
    longContextInputMultiplier?: number;
    longContextOutputMultiplier?: number;
  };
}
export interface Profile {
  id: string;
  name: string;
  description: string;
  weights: Record<SlopDimension, number>;
  instructions: string;
  rules: string;
  active: boolean;
}
export interface Knowledge {
  id: string;
  title: string;
  url: string;
  category: string;
  context: string;
  fetchedAt?: string;
  hash?: string;
  content?: string;
  error?: string;
}
export interface Workspace {
  schemaVersion?: number;
  repos: Repo[];
  scans: Scan[];
  profiles: Profile[];
  knowledge: Knowledge[];
  settings: { workspaceName: string; defaultHarness: string; defaultModel: string };
  runtime?: { hosted: boolean; localRepositories: boolean; persistent: boolean };
}
export interface Harness {
  id: string;
  name: string;
  available: boolean;
  detail: string;
  configured?: boolean;
  supportsByok?: boolean;
  requiresKey?: boolean;
}
