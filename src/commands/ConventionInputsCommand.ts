/** Inspect exact, pointer-free convention analysis input revisions. */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  type AnalysisInputRevisionPin,
  AnalysisInputRevisionRepository,
  type AnalysisInputRevisionSummary,
  type StoredAnalysisInputPlane,
} from '../storage/AnalysisInputRevisionRepository';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/** Read-only operator access to evidence, enrichment, and policy revisions. */
export class ConventionInputsCommand extends BaseCommand {
  getName(): string {
    return 'convention-inputs';
  }

  getDescription(): string {
    return 'List or read exact convention analysis input revisions';
  }

  protected getUsage(): string {
    return `tsdoc-edge convention inputs <list|read> [options]

  Required:
    --input-revisions-db <file>  Analysis input revision database

  List options:
    --workspace <id>             Restrict results to one workspace
    --plane <name>               evidence|enrichment|policy

  Read options:
    --workspace <id>             Complete pin workspace
    --plane <name>               Complete pin plane
    --revision-id <id>           Complete pin revision ID

  Common options:
    --json                       Print machine-readable output`;
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (this.hasHelpFlag(args)) return this.displayHelp();
      const operation = args[0];
      if (operation !== 'list' && operation !== 'read') {
        return this.failure('Use convention inputs list or read', 2);
      }
      const invalid = validateArguments(args.slice(1));
      if (invalid) return this.failure(invalid, 2);

      const databaseInput = option(args, '--input-revisions-db');
      if (!databaseInput) return this.failure('--input-revisions-db is required', 2);
      const databasePath = path.resolve(process.cwd(), databaseInput);
      if (!fs.existsSync(databasePath)) {
        return this.operatorFailure(
          `Analysis input revision database not found: ${databasePath}`,
          2
        );
      }

      const planeInput = option(args, '--plane');
      const plane = planeInput ? parsePlane(planeInput) : undefined;
      if (planeInput && !plane) {
        return this.failure('--plane must be evidence, enrichment, or policy', 2);
      }
      const workspaceId = option(args, '--workspace');
      const repository = new AnalysisInputRevisionRepository(databasePath, { readOnly: true });
      try {
        if (operation === 'list') {
          const summaries = repository.listRevisionPins({
            ...(plane ? { plane } : {}),
            ...(workspaceId ? { workspaceId } : {}),
          });
          this.printInputsOutput(
            {
              operation,
              databasePath: relativeDatabasePath(databasePath),
              summaries,
            },
            args
          );
          return this.success(`Analysis input revisions listed: ${summaries.length}`);
        }

        const revisionId = option(args, '--revision-id');
        if (!plane) return this.failure('--plane is required for read', 2);
        if (!workspaceId) return this.failure('--workspace is required for read', 2);
        if (!revisionId) return this.failure('--revision-id is required for read', 2);
        const pin: AnalysisInputRevisionPin = { plane, workspaceId, revisionId };
        const revision = repository.readRevision(pin);
        if (!revision)
          return this.failure(`Analysis input revision not found: ${formatPin(pin)}`, 2);
        this.printInputsOutput(
          {
            operation,
            databasePath: relativeDatabasePath(databasePath),
            pin,
            revision,
          },
          args
        );
        return this.success(`Analysis input revision read: ${formatPin(pin)}`);
      } finally {
        repository.close();
      }
    });
  }

  private printInputsOutput(
    value: {
      readonly operation: string;
      readonly databasePath: string;
      readonly summaries?: readonly AnalysisInputRevisionSummary[];
      readonly pin?: AnalysisInputRevisionPin;
      readonly revision?: unknown;
    },
    args: readonly string[]
  ): void {
    if (this.hasFlag([...args], '--json')) {
      console.log(JSON.stringify(value, null, 2));
      return;
    }
    this.printHeader('Convention Analysis Inputs');
    console.log(`${colors.bold}Operation:${colors.reset} ${value.operation}`);
    console.log(`${colors.bold}Database:${colors.reset} ${value.databasePath}`);
    if (value.summaries) {
      console.log(`${colors.bold}Records:${colors.reset} ${value.summaries.length}`);
      for (const summary of value.summaries) {
        console.log(`  ${summary.plane}/${summary.workspaceId}/${summary.revisionId}`);
      }
    }
    if (value.pin) console.log(`${colors.bold}Revision:${colors.reset} ${formatPin(value.pin)}`);
  }
}

const VALUE_OPTIONS = new Set(['--input-revisions-db', '--workspace', '--plane', '--revision-id']);
const BOOLEAN_OPTIONS = new Set(['--json', '--help', '-h']);

function validateArguments(args: readonly string[]): string | undefined {
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const name = argument === '-h' ? '--help' : argument;
    if (BOOLEAN_OPTIONS.has(argument)) {
      if (seen.has(name)) return `Duplicate convention-inputs option: ${name}`;
      seen.add(name);
      continue;
    }
    const [optionName, inlineValue] = argument.split('=', 2);
    if (!VALUE_OPTIONS.has(optionName)) return `Unknown convention-inputs option: ${optionName}`;
    if (seen.has(optionName)) return `Duplicate convention-inputs option: ${optionName}`;
    const value = inlineValue ?? args[index + 1];
    if (!value || (!inlineValue && value.startsWith('-')))
      return `Convention-inputs option requires a value: ${optionName}`;
    seen.add(optionName);
    if (inlineValue === undefined) index += 1;
  }
  return undefined;
}

function option(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index !== -1) return args[index + 1];
  const inline = args.find((argument) => argument.startsWith(`${name}=`));
  return inline?.slice(name.length + 1);
}

function parsePlane(value: string): StoredAnalysisInputPlane | undefined {
  return value === 'evidence' || value === 'enrichment' || value === 'policy' ? value : undefined;
}

function relativeDatabasePath(databasePath: string): string {
  return path.relative(process.cwd(), databasePath).split(path.sep).join('/') || '.';
}

function formatPin(pin: AnalysisInputRevisionPin): string {
  return `${pin.plane}/${pin.workspaceId}/${pin.revisionId}`;
}
