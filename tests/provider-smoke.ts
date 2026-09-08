import assert from 'node:assert/strict';
import { diagnose } from '../server/providers.js';
import { profiles } from '../server/seed.js';

const supported = new Set(['codex', 'claude']);
const requested = process.argv.slice(2);
const providers = requested.length ? requested : ['codex', 'claude'];

for (const provider of providers) {
  if (!supported.has(provider)) {
    throw new Error(`Unsupported smoke-test provider: ${provider}`);
  }

  const started = Date.now();
  const result = await diagnose(
    [
      {
        path: 'src/parser.ts',
        content: [
          'export function parseUserInput(input: string) {',
          '  try {',
          '    return eval(input);',
          '  } catch {}',
          '}',
        ].join('\n'),
        lines: 5,
      },
    ],
    `smoke-${provider}`,
    profiles[0],
    [],
    {
      harness: provider,
      model: '',
      effort: 'low',
      signal: new AbortController().signal,
    },
    'quick',
    (phase) => console.log(`[${provider}] ${phase}`),
  );

  assert.ok(result.findings.length > 0, `${provider} returned no findings for the unsafe fixture`);
  assert.ok(
    result.findings.some((finding) =>
      finding.evidence.some(
        (evidence) => evidence.file === 'src/parser.ts' && evidence.line >= 1 && evidence.line <= 5,
      ),
    ),
    `${provider} returned no verifiable fixture evidence`,
  );
  console.log(
    `[${provider}] PASS · ${result.findings.length} root cause(s) · ${Math.round((Date.now() - started) / 1000)}s`,
  );
}
