export const slopDimensions = [
  'Complexity',
  'Maintainability',
  'Correctness',
  'Architecture',
  'Security',
  'Performance',
  'Repository Fit',
  'AI Fingerprints',
] as const;

export type SlopDimension = (typeof slopDimensions)[number];

export const dimensionDescriptions: Record<SlopDimension, string> = {
  Complexity:
    'Code introduces more structure, indirection, or flexibility than its value requires.',
  Maintainability:
    'Code is difficult to understand, change safely, test, or keep consistent over time.',
  Correctness:
    'Plausible-looking code hides incomplete behavior, false assumptions, or unreliable control flow.',
  Architecture:
    'Responsibilities, contracts, and infrastructure sit in the wrong boundaries or disagree across layers.',
  Security:
    'Trust boundaries, input handling, authorization, secrets, or defaults expose avoidable risk.',
  Performance: 'Work, queries, memory, or polling grow unnecessarily with the size of the system.',
  'Repository Fit':
    'Code should align with the repository’s conventions, structure, and existing patterns. Misalignment increases the cost of understanding and changing the code.',
  'AI Fingerprints':
    'Generated-looking verbosity, breadth, or polish adds noise without improving the requested change.',
};

type PatternSeed = {
  id: string;
  title: string;
  dimension: SlopDimension;
  examples: readonly string[];
};

export const slopPatterns = [
  {
    id: 'unnecessary-abstractions',
    title: 'Unnecessary Abstractions',
    dimension: 'Complexity',
    examples: [
      'Interfaces with only one implementation',
      'Factory → service → manager → repository chains for trivial logic',
      'Wrapper classes that add no behavior',
      'Generic `BaseService<T>` created prematurely',
      'Excessive dependency injection for simple helpers',
    ],
  },
  {
    id: 'over-engineering',
    title: 'Over-Engineering',
    dimension: 'Complexity',
    examples: [
      'Design patterns added without need',
      'CQRS for basic CRUD',
      'Event buses for local method calls',
      'Complex configuration systems for two settings',
      'Plugin architectures where nothing is pluggable',
      '“Future-proofing” speculative requirements',
    ],
  },
  {
    id: 'excessive-comments',
    title: 'Excessive Comments',
    dimension: 'AI Fingerprints',
    examples: [
      'Comments explaining obvious code',
      '`// increment counter`',
      'Huge docstrings restating method names',
      'AI-generated essay-like comments',
      'Comments describing implementation instead of intent',
    ],
  },
  {
    id: 'meaningless-naming',
    title: 'Meaningless Naming',
    dimension: 'Maintainability',
    examples: [
      '`data`, `result`, `item`, `temp`, `obj`',
      '`processData()`',
      '`handleRequest()`',
      '`Manager`, `Helper`, `Util`, `Processor` everywhere',
      'Different names for the same domain concept',
    ],
  },
  {
    id: 'copy-paste-duplication',
    title: 'Copy-Paste Duplication',
    dimension: 'Maintainability',
    examples: [
      'Nearly identical functions',
      'Same validation logic repeated',
      'Repeated API wrappers',
      'Duplicate DTO mappings',
      'Slightly modified blocks produced instead of reusing existing code',
    ],
  },
  {
    id: 'ignoring-existing-codebase-patterns',
    title: 'Ignoring Existing Codebase Patterns',
    dimension: 'Repository Fit',
    examples: [
      'Inventing a new logging approach',
      'Introducing another HTTP client library',
      'Creating new folder structures',
      'Adding another state-management pattern',
      'Ignoring existing utility functions',
      'Reimplementing functionality already present',
    ],
  },
  {
    id: 'dependency-slop',
    title: 'Dependency Slop',
    dimension: 'Repository Fit',
    examples: [
      'Installing libraries for trivial operations',
      'Duplicate libraries doing the same thing',
      'Large dependencies for one function',
      'Abandoned packages',
      'Unnecessary version upgrades',
      'Mixing competing frameworks',
    ],
  },
  {
    id: 'error-handling-slop',
    title: 'Error-Handling Slop',
    dimension: 'Correctness',
    examples: [
      '`catch (Exception) { }`',
      'Catching and rethrowing unchanged',
      'Returning `null` for every failure',
      'Swallowing errors',
      'Generic `"Something went wrong"`',
      'Excessive try/catch around every function',
      'Retrying non-retryable failures',
    ],
  },
  {
    id: 'fake-robustness',
    title: 'Fake Robustness',
    dimension: 'Complexity',
    examples: [
      'Null checks on values that cannot be null',
      'Defensive code against impossible states',
      'Arbitrary fallback values',
      'Silent fallback masking real bugs',
      'Huge validation layers for internal trusted objects',
    ],
  },
  {
    id: 'fake-completeness',
    title: 'Fake Completeness',
    dimension: 'Correctness',
    examples: [
      'TODOs hidden behind apparently working APIs',
      'Stub implementations returning empty arrays',
      'Placeholder values in production paths',
      'Mock implementations accidentally wired into real code',
      'Functions returning success without actually doing anything',
    ],
  },
  {
    id: 'hallucinated-apis',
    title: 'Hallucinated APIs',
    dimension: 'Correctness',
    examples: [
      "Calling methods that don't exist",
      'Using outdated library APIs',
      'Incorrect configuration properties',
      'Invented command-line options',
      "Assuming framework behavior that isn't real",
    ],
  },
  {
    id: 'dead-code',
    title: 'Dead Code',
    dimension: 'Maintainability',
    examples: [
      'Unused helpers',
      'Unreachable branches',
      'Unused imports',
      'Old implementations left behind',
      'Feature flags that no longer do anything',
      'Generated methods that are never called',
    ],
  },
  {
    id: 'boilerplate-explosion',
    title: 'Boilerplate Explosion',
    dimension: 'AI Fingerprints',
    examples: [
      '200 lines for something requiring 20',
      'Unnecessary DTO → model → entity → response transformations',
      'Giant configuration classes',
      'Excessive getters/setters',
      'Repetitive builder patterns',
    ],
  },
  {
    id: 'premature-generalization',
    title: 'Premature Generalization',
    dimension: 'Complexity',
    examples: [
      'Making everything generic',
      'Supporting hypothetical future databases/providers/formats',
      'Generic strategy systems with one strategy',
      'Configurable behavior nobody needs',
    ],
  },
  {
    id: 'poor-architecture-boundaries',
    title: 'Poor Architecture Boundaries',
    dimension: 'Architecture',
    examples: [
      'UI directly querying the database',
      'Controllers containing business logic',
      'Domain logic inside repositories',
      'Infrastructure leaking everywhere',
      'Circular dependencies',
      'Modules knowing too much about each other',
    ],
  },
  {
    id: 'god-objects-god-functions',
    title: 'God Objects / God Functions',
    dimension: 'Maintainability',
    examples: [
      'Massive service classes',
      'Functions doing validation + DB + networking + formatting',
      'Files thousands of lines long',
      'Classes accumulating unrelated responsibilities',
    ],
  },
  {
    id: 'tiny-function-slop',
    title: 'Tiny-Function Slop',
    dimension: 'Complexity',
    examples: [
      'Breaking simple code into dozens of 1–2 line functions',
      'Functions that merely rename another function call',
      'Excessive indirection making code hard to follow',
    ],
  },
  {
    id: 'async-slop',
    title: 'Async Slop',
    dimension: 'Correctness',
    examples: [
      '`async` functions with no asynchronous work',
      'Blocking inside async code',
      'Fire-and-forget tasks without handling failures',
      'Excessive parallelism',
      'Race conditions introduced by unnecessary concurrency',
    ],
  },
  {
    id: 'performance-slop',
    title: 'Performance Slop',
    dimension: 'Performance',
    examples: [
      'N+1 database queries',
      'Loading entire tables into memory',
      'Repeated API calls',
      'Repeated parsing/serialization',
      'Unbounded loops',
      'Unnecessary polling',
      'Missing pagination',
    ],
  },
  {
    id: 'database-slop',
    title: 'Database Slop',
    dimension: 'Performance',
    examples: [
      '`SELECT *`',
      'Missing indexes on obvious access paths',
      'Queries inside loops',
      'Business logic embedded in random SQL',
      'No transactions where atomicity matters',
      "Overusing transactions where they don't",
      'Duplicate schema representations',
    ],
  },
  {
    id: 'security-slop',
    title: 'Security Slop',
    dimension: 'Security',
    examples: [
      'Secrets committed to source',
      'SQL injection',
      'String-built queries',
      'Missing authorization checks',
      'Trusting user input',
      'Logging tokens/passwords',
      'Insecure defaults',
      'Overly permissive CORS',
      'Disabling TLS/security checks “temporarily”',
    ],
  },
  {
    id: 'frontend-slop',
    title: 'Frontend Slop',
    dimension: 'Architecture',
    examples: [
      'Giant components',
      'Business logic inside UI components',
      'Prop drilling everywhere',
      'State duplicated across multiple locations',
      'Effects used for derived state',
      'Excessive rerenders',
      'Hardcoded styling',
      'Inconsistent spacing/components',
    ],
  },
  {
    id: 'api-slop',
    title: 'API Slop',
    dimension: 'Architecture',
    examples: [
      'Inconsistent endpoint naming',
      'Different response structures everywhere',
      'Always returning `200`',
      'Incorrect HTTP verbs',
      'Missing pagination',
      'Breaking API contracts unnecessarily',
      'Leaking internal exceptions',
    ],
  },
  {
    id: 'configuration-slop',
    title: 'Configuration Slop',
    dimension: 'Architecture',
    examples: [
      'Hardcoded URLs',
      'Hardcoded environment assumptions',
      'Config values duplicated in code',
      'Environment variables read throughout the app',
      'Giant `.env` files with undocumented variables',
    ],
  },
  {
    id: 'testing-slop',
    title: 'Testing Slop',
    dimension: 'Maintainability',
    examples: [
      'Tests that assert nothing useful',
      'Tests that only verify mocks',
      'One test per getter/setter',
      'Huge snapshot tests',
      'Tests coupled tightly to implementation',
      'AI creating hundreds of shallow tests to inflate coverage',
    ],
  },
  {
    id: 'mock-slop',
    title: 'Mock Slop',
    dimension: 'AI Fingerprints',
    examples: [
      'Mocking everything',
      'Mocking your own domain logic',
      'Mocks behaving differently from real systems',
      'Huge setup sections',
      'Tests passing despite broken integration',
    ],
  },
  {
    id: 'exception-driven-control-flow',
    title: 'Exception-Driven Control Flow',
    dimension: 'Correctness',
    examples: [
      'Throwing exceptions for expected states',
      'Using exceptions instead of normal branching',
      'Catching exceptions to determine whether something exists',
    ],
  },
  {
    id: 'magic-value-slop',
    title: 'Magic-Value Slop',
    dimension: 'Maintainability',
    examples: [
      'Random numbers',
      'String constants scattered everywhere',
      '`"active"`, `"pending"`, `"completed"` repeated manually',
      'Undocumented timeout/retry values',
    ],
  },
  {
    id: 'logging-slop',
    title: 'Logging Slop',
    dimension: 'Maintainability',
    examples: [
      'Logging every method entry/exit',
      'Logging huge objects',
      'Sensitive information in logs',
      'No correlation IDs where needed',
      'Everything logged as `Information`',
      'Duplicate logging of the same failure',
    ],
  },
  {
    id: 'ai-style-verbosity',
    title: 'AI-Style Verbosity',
    dimension: 'AI Fingerprints',
    examples: [
      '`UserDataProcessingServiceManager`',
      '`IUserDataProcessingServiceManager`',
      '`UserDataProcessingServiceManagerImpl`',
      'Long explanatory comments',
      'Excessive headings in docs',
      'Excessive helper functions',
      '“Enterprise-looking” code with little substance',
    ],
  },
  {
    id: 'inconsistent-code-style',
    title: 'Inconsistent Code Style',
    dimension: 'Repository Fit',
    examples: [
      'Different naming conventions in adjacent files',
      'Mixed error-handling styles',
      'Mixed async patterns',
      'Different DTO conventions',
      'Different dependency injection styles',
    ],
  },
  {
    id: 'unnecessary-rewrites',
    title: 'Unnecessary Rewrites',
    dimension: 'AI Fingerprints',
    examples: [
      'AI replaces working code instead of modifying it',
      'Rewrites entire files for a 3-line change',
      'Changes formatting unrelated to the task',
      'Renames unrelated variables',
      'Causes huge noisy diffs',
    ],
  },
  {
    id: 'scope-creep',
    title: 'Scope Creep',
    dimension: 'AI Fingerprints',
    examples: [
      'User asks to fix one bug; AI also refactors architecture',
      'Adds tests, docs, abstractions, config, libraries unnecessarily',
      "“While we're here…” changes",
    ],
  },
  {
    id: 'broken-edge-cases',
    title: 'Broken Edge Cases',
    dimension: 'Correctness',
    examples: [
      'Empty inputs',
      'Pagination boundaries',
      'Concurrency',
      'Time zones',
      'Unicode',
      'Large files',
      'Network failures',
      'Partial DB failures',
    ],
  },
  {
    id: 'false-assumptions',
    title: 'False Assumptions',
    dimension: 'Correctness',
    examples: [
      'Assuming IDs are sequential',
      'Assuming lists are non-empty',
      'Assuming APIs always succeed',
      'Assuming local timezone',
      'Assuming file paths/platform behavior',
      'Assuming ordering without explicitly requesting it',
    ],
  },
  {
    id: 'documentation-slop',
    title: 'Documentation Slop',
    dimension: 'AI Fingerprints',
    examples: [
      "README claims features that don't exist",
      "Generated architecture docs that don't match code",
      'Massive documentation for trivial modules',
      'Copy-pasted generic setup instructions',
    ],
  },
  {
    id: 'version-control-slop',
    title: 'Version-Control Slop',
    dimension: 'AI Fingerprints',
    examples: [
      'Generated files committed unnecessarily',
      'Huge unrelated diffs',
      'Build artifacts checked in',
      'Debug files left behind',
      'Environment-specific configuration committed',
    ],
  },
  {
    id: 'inconsistent-domain-modelling',
    title: 'Inconsistent Domain Modelling',
    dimension: 'Architecture',
    examples: [
      'Same concept represented differently across modules',
      '`UserId` string here, integer elsewhere',
      'Status represented by enum/string/int in different places',
      'Duplicate domain entities',
    ],
  },
  {
    id: 'violation-of-local-conventions',
    title: 'Violation of Local Conventions',
    dimension: 'Repository Fit',
    examples: [
      'Introducing a new pattern when an established one already exists',
      'Naming things differently from surrounding code',
      'Ignoring existing helpers or infrastructure',
      'Putting logic in a layer where the codebase normally does not',
      'Using a different error-handling strategy from nearby code',
    ],
  },
  {
    id: 'complexity-without-value',
    title: 'Complexity Without Value',
    dimension: 'Complexity',
    examples: [],
  },
] as const satisfies readonly PatternSeed[];

export type SlopPatternId = (typeof slopPatterns)[number]['id'];
export type SlopPattern = (typeof slopPatterns)[number];
export const slopPatternIds = slopPatterns.map((pattern) => pattern.id) as [
  SlopPatternId,
  ...SlopPatternId[],
];

export const patternsByDimension = Object.fromEntries(
  slopDimensions.map((dimension) => [
    dimension,
    slopPatterns.filter((pattern) => pattern.dimension === dimension),
  ]),
) as unknown as Record<SlopDimension, readonly SlopPattern[]>;

export const patternById = new Map<SlopPatternId, SlopPattern>(
  slopPatterns.map((pattern) => [pattern.id, pattern]),
);

export function isSlopDimension(value: unknown): value is SlopDimension {
  return typeof value === 'string' && (slopDimensions as readonly string[]).includes(value);
}

export function isSlopPatternId(value: unknown): value is SlopPatternId {
  return typeof value === 'string' && patternById.has(value as SlopPatternId);
}
