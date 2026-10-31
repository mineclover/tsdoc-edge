/**
 * Tests for the @ttsc/lint ratchet parser.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { parseTtscLintOutput, compareToBaseline } =
  require('../../../scripts/verify-ttsc-lint-baseline.cjs') as {
    parseTtscLintOutput(output: string): { rules: Record<string, number>; typeErrors: string[] };
    compareToBaseline(
      current: Record<string, number>,
      baseline: Record<string, number>
    ): Array<{ rule: string; allowed: number; count: number }>;
  };

describe('verify-ttsc-lint-baseline', () => {
  const output = [
    '\u001b[96msrc/a.ts\u001b[0m:\u001b[93m3\u001b[0m:\u001b[93m4\u001b[0m - \u001b[93mwarning\u001b[0m\u001b[90m TS15223: \u001b[0m[jsdoc/tsdoc-syntax] Malformed TSDoc block tag.',
    'src/b.ts:10:2 - warning TS11058: [typescript/no-floating-promises] Promises must be awaited.',
    'src/b.ts:12:2 - warning TS11058: [typescript/no-floating-promises] Promises must be awaited.',
    'src/c.ts:1:7 - error TS2322: Type number is not assignable to type string.',
    '',
    '10   query = query.where(x);',
  ].join('\n');

  it('counts lint findings per rule and strips ANSI colors', () => {
    const { rules } = parseTtscLintOutput(output);
    expect(rules).toEqual({ 'jsdoc/tsdoc-syntax': 1, 'typescript/no-floating-promises': 2 });
  });

  it('separates TypeScript errors (no rule prefix) from lint findings', () => {
    const { typeErrors } = parseTtscLintOutput(output);
    expect(typeErrors).toHaveLength(1);
    expect(typeErrors[0]).toContain('TS2322');
  });

  it('reports only rules whose count rose; new rules start from zero', () => {
    expect(compareToBaseline({ a: 3, b: 1, c: 2 }, { a: 3, b: 4 })).toEqual([
      { rule: 'c', allowed: 0, count: 2 },
    ]);
  });
});
