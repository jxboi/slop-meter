import type { Finding, Workspace, Repo, Profile } from '../src/types';
const ago = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
const base: Omit<Finding, 'id' | 'repoId' | 'title' | 'why'> = {
  category: 'Architecture',
  severity: 'high',
  impact: 8,
  risk: 7,
  blastRadius: 8,
  effort: 10,
  confidence: 93,
  findings: 142,
  patterns: 6,
  steps: [],
  dependencies: [],
  unlocks: 4,
  evidence: [],
  sources: [],
  status: 'open',
  score: 92,
};
const findings: Finding[] = [
  {
    ...base,
    id: 'service-boundary',
    repoId: 'platform',
    title: 'Untangle the shared service layer',
    why: 'One tightly coupled module is behind 142 findings. Create clear boundaries before touching individual services.',
    steps: [
      'Map callers of SharedService and capture current behavior with characterization tests.',
      'Extract billing and account interfaces at the module boundary.',
      'Move one consumer at a time behind the new interfaces.',
      'Rescan to confirm coupling has fallen before removing the old service.',
    ],
    evidence: [
      {
        file: 'src/services/shared-service.ts',
        line: 24,
        snippet:
          'export class SharedService {\n  constructor(\n    private db: Database,\n    private billing: BillingClient,\n    private mailer: MailService,\n    private auth: AuthService,\n  ) {}\n}',
        explanation:
          'The same service coordinates persistence, billing, notifications, and authentication. A change in any one domain propagates to 23 consumers.',
      },
      {
        file: 'src/features/billing/handler.ts',
        line: 18,
        snippet:
          'const service = new SharedService(db, billing, mailer, auth);\nawait service.updateAccountAndInvoice(account);',
        explanation:
          'Billing consumers inherit account and notification dependencies they do not own.',
      },
    ],
    sources: ['https://martinfowler.com/bliki/BoundedContext.html'],
  },
  {
    ...base,
    id: 'auth-boundary',
    repoId: 'api',
    title: 'Centralize authentication checks',
    category: 'Security',
    severity: 'critical',
    impact: 10,
    risk: 10,
    blastRadius: 6,
    effort: 5,
    findings: 38,
    patterns: 3,
    unlocks: 2,
    score: 89,
    why: 'Authentication is reimplemented across 16 routes. A shared guard closes the gaps and makes every endpoint safer.',
    steps: [
      'Add regression tests for missing, expired, and cross-tenant credentials.',
      'Introduce a deny-by-default authentication middleware.',
      'Migrate routes and remove inline token parsing.',
    ],
    evidence: [
      {
        file: 'src/routes/accounts.ts',
        line: 42,
        snippet:
          'router.get("/:id", async (req, res) => {\n  const account = await db.accounts.find(req.params.id);\n  res.json(account);\n});',
        explanation:
          'The handler looks up an account using a request parameter without a visible ownership check. Confirm upstream middleware before treating this as exploitable.',
      },
    ],
    sources: ['https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html'],
  },
  {
    ...base,
    id: 'data-fetching',
    repoId: 'platform',
    title: 'Consolidate duplicate data fetching',
    category: 'Duplication',
    severity: 'medium',
    impact: 6,
    risk: 4,
    effort: 6,
    findings: 67,
    patterns: 4,
    unlocks: 2,
    score: 72,
    dependencies: ['service-boundary'],
    why: 'Seven variations of the same fetch logic create inconsistent loading and error states. Share the pattern once the service boundary is stable.',
    deferReason:
      'Wait for the shared service boundary. Extracting a common fetch layer now would bake the existing coupling into a new abstraction.',
    steps: [
      'Finish the service boundary change.',
      'Compare the seven data-fetching implementations.',
      'Extract one typed hook with explicit loading and error states.',
    ],
    evidence: [
      {
        file: 'src/hooks/use-account.ts',
        line: 12,
        snippet:
          'useEffect(() => {\n  fetch(`/api/accounts/${id}`)\n    .then(res => res.json())\n    .then(setAccount);\n}, [id]);',
        explanation:
          'Repeated fetch logic omits response status handling and request cancellation.',
      },
    ],
    sources: ['https://react.dev/learn/you-might-not-need-an-effect'],
  },
  {
    ...base,
    id: 'error-contract',
    repoId: 'api',
    title: 'Give errors a consistent contract',
    category: 'Reliability',
    severity: 'medium',
    impact: 6,
    risk: 5,
    effort: 5,
    findings: 54,
    patterns: 3,
    unlocks: 1,
    score: 68,
    dependencies: ['auth-boundary'],
    why: 'Error responses have four different shapes. Standardize them after authentication so clients can recover predictably.',
    steps: [
      'Complete authentication middleware.',
      'Define a typed error response.',
      'Add boundary tests for each response class.',
    ],
    evidence: [
      {
        file: 'src/middleware/errors.ts',
        line: 8,
        snippet: 'res.status(500).send(error.message);',
        explanation:
          'Raw internal errors may disclose implementation details and do not provide a stable response shape.',
      },
    ],
    sources: ['https://expressjs.com/en/guide/error-handling.html'],
  },
  {
    ...base,
    id: 'token-cleanup',
    repoId: 'design-system',
    title: 'Retire the legacy token adapters',
    category: 'Simplicity',
    severity: 'low',
    impact: 3,
    risk: 2,
    effort: 4,
    findings: 19,
    patterns: 2,
    unlocks: 0,
    score: 35,
    status: 'deferred',
    why: 'The adapter layer adds indirection, but it is stable and covered by tests. Higher-risk boundaries deserve your time first.',
    deferReason:
      'This is unnecessary abstraction, but not an immediate source of regressions. Schedule it after the platform boundaries are stable.',
    steps: [
      'Inventory remaining adapter consumers.',
      'Migrate to semantic tokens.',
      'Remove the adapters after one release cycle.',
    ],
    evidence: [
      {
        file: 'src/tokens/legacy-adapter.ts',
        line: 1,
        snippet: 'export const legacySpace = (token: string) =>\n  tokens.spacing[token];',
        explanation: 'A pass-through wrapper duplicates the existing token API.',
      },
    ],
    sources: [],
  },
];
const trends = (end: number) =>
  [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30].map((d, i) => ({
    date: ago(30 - d),
    value: end - [24, 23, 26, 17, 18, 15, 16, 7, 9, 3, 0][i],
  }));
const repos: Repo[] = [
  {
    id: 'platform',
    name: 'platform',
    owner: 'acme',
    source: 'github',
    location: 'https://github.com/acme/platform',
    stack: 'TypeScript · Next.js',
    health: 62,
    files: 1248,
    lastScan: ago(0),
    demo: true,
    findings: findings.filter((f) => f.repoId === 'platform'),
    trend: trends(62),
  },
  {
    id: 'api',
    name: 'api',
    owner: 'acme',
    source: 'github',
    location: 'https://github.com/acme/api',
    stack: 'TypeScript · Express',
    health: 71,
    files: 486,
    lastScan: ago(0),
    demo: true,
    findings: findings.filter((f) => f.repoId === 'api'),
    trend: trends(71),
  },
  {
    id: 'design-system',
    name: 'design-system',
    owner: 'local',
    source: 'local',
    location: '~/projects/design-system',
    stack: 'TypeScript · React',
    health: 86,
    files: 216,
    lastScan: ago(1),
    demo: true,
    findings: findings.filter((f) => f.repoId === 'design-system'),
    trend: trends(86),
  },
];
const weights = {
  Architecture: 5,
  Security: 5,
  Simplicity: 4,
  Testing: 4,
  Duplication: 3,
  Performance: 3,
  Naming: 2,
  Reliability: 4,
};
export const profiles: Profile[] = [
  {
    id: 'balanced',
    name: 'Balanced engineering',
    description: 'A practical balance of risk, architecture, and maintainability.',
    weights,
    instructions:
      'Prefer root causes over symptoms. Prioritize changes that unlock other improvements. Explain when to defer a problem.',
    rules: 'Preserve public API compatibility. Prefer incremental changes over rewrites.',
    active: true,
  },
  {
    id: 'security',
    name: 'Security first',
    description: 'Close trust-boundary gaps and reduce exposure.',
    weights: { ...weights, Security: 5, Architecture: 3, Simplicity: 2, Testing: 5 },
    instructions:
      'Prioritize reachable vulnerabilities and missing authorization. Distinguish confirmed evidence from potential exposure.',
    rules: 'Every security change must include a regression test.',
    active: false,
  },
  {
    id: 'legacy',
    name: 'Legacy rescue',
    description: 'Find a safe starting point in an unfamiliar codebase.',
    weights: { ...weights, Architecture: 5, Testing: 5, Simplicity: 5, Naming: 1 },
    instructions:
      'Recommend small safe steps. Capture existing behavior before changing it. Avoid broad rewrites.',
    rules: 'Use characterization tests before changing shared modules.',
    active: false,
  },
];
export function seed(): Workspace {
  return {
    repos,
    profiles,
    scans: repos.flatMap((r) =>
      [0, 7, 14].map((d, i) => ({
        id: `sample-${r.id}-${i}`,
        repoId: r.id,
        repoName: `${r.owner}/${r.name}`,
        startedAt: ago(d),
        completedAt: ago(d),
        status: 'completed' as const,
        phase: 'Complete',
        progress: 100,
        harness: 'Sample',
        model: 'Illustrative analysis',
        effort: 'high',
        depth: 'deep',
        health: r.health! - i * 4,
        findingCount: r.findings.reduce((s, f) => s + f.findings, 0),
        profileId: 'balanced',
        demo: true,
        coverage: 'Illustrative sample data',
        findings: r.findings,
      })),
    ),
    knowledge: [
      {
        id: 'owasp',
        title: 'Authorization best practices',
        url: 'https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html',
        category: 'Security',
        context: 'OWASP · Framework independent',
      },
      {
        id: 'react',
        title: 'Rethinking effects in React',
        url: 'https://react.dev/learn/you-might-not-need-an-effect',
        category: 'React',
        context: 'React · Match guidance against installed version',
      },
      {
        id: 'next',
        title: 'Server and client component boundaries',
        url: 'https://nextjs.org/docs/app/getting-started/server-and-client-components',
        category: 'Next.js',
        context: 'Next.js · App Router',
      },
      {
        id: 'express',
        title: 'Error handling at the boundary',
        url: 'https://expressjs.com/en/guide/error-handling.html',
        category: 'Express',
        context: 'Express · Verify major-version behavior',
      },
      {
        id: 'typescript',
        title: 'Strictness and type safety',
        url: 'https://www.typescriptlang.org/tsconfig/strict.html',
        category: 'TypeScript',
        context: 'TypeScript · strict compiler option',
      },
    ],
    settings: { workspaceName: 'Acme workspace', defaultHarness: 'static', defaultModel: '' },
  };
}
