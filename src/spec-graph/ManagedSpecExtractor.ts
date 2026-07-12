/** Compile explicit managed-spec declarations from Markdown into a SpecGraph revision. */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  SpecBindingDeclaration,
  SpecEdge,
  SpecGraphRevision,
  SpecNode,
  SpecProvenance,
  SpecSourceAnchor,
} from './contracts';
import {
  type CreateSpecGraphRevisionInput,
  createSpecEdge,
  createSpecGraphRevision,
} from './identity';

export const MANAGED_SPEC_EXTRACTOR_ID = 'tsdoc-edge/managed-spec-extractor' as const;
export const MANAGED_SPEC_EXTRACTOR_VERSION = '1.0.0' as const;

export interface ExtractManagedSpecOptions {
  readonly workspaceRoot: string;
  readonly workspaceId: string;
  readonly authoredSpecDirs: readonly string[];
}

interface ManagedSpecDeclaration {
  readonly requirements?: readonly {
    readonly id: string;
    readonly title: string;
    readonly tags?: readonly string[];
  }[];
  readonly edges?: readonly {
    readonly kind: 'contains' | 'refines' | 'requires' | 'establishes' | 'supersedes';
    readonly from: string;
    readonly to: string;
    readonly semanticQualifier?: string;
  }[];
  readonly bindings?: readonly Omit<SpecBindingDeclaration, 'source' | 'provenance'>[];
}

/**
 * The P4.4 authoring grammar intentionally has one explicit JSON declaration
 * block per `type: project-spec` document. Prose is never inferred as a binding.
 */
export function extractManagedSpecGraph(options: ExtractManagedSpecOptions): SpecGraphRevision {
  const root = realDirectory(options.workspaceRoot, 'Managed spec workspace root');
  const files = managedSpecFiles(root, options.authoredSpecDirs);
  const nodes: SpecNode[] = [];
  const edges: SpecEdge[] = [];
  const bindings: SpecBindingDeclaration[] = [];
  const documents: Array<{ file: string; contentDigest: string }> = [];

  for (const file of files) {
    const absolute = path.join(root, file);
    const bytes = fs.readFileSync(absolute);
    const content = bytes.toString('utf8');
    const contentDigest = sha256(bytes);
    const header = projectSpecHeader(content, file);
    if (!header) continue;
    const declaration = declarationBlock(content, file);
    const provenance: SpecProvenance = Object.freeze({
      source: 'managed-document',
      extractorId: MANAGED_SPEC_EXTRACTOR_ID,
      extractorVersion: MANAGED_SPEC_EXTRACTOR_VERSION,
    });
    const anchor = sourceAnchor(file, contentDigest, header.line, header.title);
    nodes.push({
      id: header.id,
      kind: 'spec',
      title: header.title,
      lifecycle: { mode: 'independent', status: header.status },
      source: anchor,
      tags: header.tags,
    });
    for (const requirement of declaration.requirements ?? []) {
      nodes.push({
        id: requiredText(requirement.id, `${file} requirement id`),
        kind: 'requirement',
        title: requiredText(requirement.title, `${file} requirement title`),
        lifecycle: { mode: 'inherited', aggregateSpecId: header.id },
        source: sourceAnchor(file, contentDigest, declaration.line, header.title),
        tags: [...(requirement.tags ?? [])],
      });
    }
    for (const edge of declaration.edges ?? []) {
      edges.push(
        createSpecEdge({
          kind: edge.kind,
          from: requiredText(edge.from, `${file} edge from`),
          to: requiredText(edge.to, `${file} edge to`),
          ...(edge.semanticQualifier ? { semanticQualifier: edge.semanticQualifier } : {}),
          evidence: [{ source: sourceAnchor(file, contentDigest, declaration.line, header.title) }],
          provenance,
        })
      );
    }
    for (const binding of declaration.bindings ?? []) {
      bindings.push({
        ...binding,
        source: sourceAnchor(file, contentDigest, declaration.line, header.title),
        provenance,
      } as SpecBindingDeclaration);
    }
    documents.push({ file, contentDigest });
  }

  const authoredSourceFingerprint = sha256(JSON.stringify(documents.sort(compareDocument)));
  const input: CreateSpecGraphRevisionInput = {
    workspaceId: requiredText(options.workspaceId, 'Managed spec workspaceId'),
    nodes,
    edges,
    bindings,
    provenance: {
      source: 'managed-document',
      extractorId: MANAGED_SPEC_EXTRACTOR_ID,
      extractorVersion: MANAGED_SPEC_EXTRACTOR_VERSION,
      authoredSourceFingerprint,
    },
  };
  return createSpecGraphRevision(input);
}

function managedSpecFiles(root: string, directories: readonly string[]): readonly string[] {
  if (!directories.length)
    throw new Error('Managed spec extraction requires at least one authoredSpecDir');
  const files = new Set<string>();
  for (const directory of directories) {
    if (
      !directory.trim() ||
      path.isAbsolute(directory) ||
      directory.split(/[\\/]/).includes('..')
    ) {
      throw new Error(`Managed spec directory must be workspace-relative: ${directory}`);
    }
    const absolute = path.join(root, directory);
    if (!inside(root, absolute) || !fs.existsSync(absolute)) continue;
    for (const file of walkMarkdown(absolute)) files.add(relative(root, file));
  }
  return Object.freeze([...files].sort());
}

function walkMarkdown(directory: string): readonly string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkMarkdown(candidate));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(candidate);
  }
  return files;
}

function projectSpecHeader(
  content: string,
  file: string
):
  | {
      id: string;
      title: string;
      status: 'active' | 'draft' | 'deprecated' | 'archived';
      tags: string[];
      line: number;
    }
  | undefined {
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!frontmatter || !/^type:\s*project-spec\s*$/m.test(frontmatter[1])) return undefined;
  const statusMatch = frontmatter[1].match(/^status:\s*(active|draft|deprecated|archived)\s*$/m);
  if (!statusMatch) throw new Error(`Managed spec document requires supported status: ${file}`);
  const heading = content.match(/^#\s+\[\[([^\]]+)\]\]\s*$/m);
  if (!heading) throw new Error(`Managed spec document requires one H1 checkpoint: ${file}`);
  const title = requiredText(heading[1], `${file} H1 checkpoint`);
  const tags = [...frontmatter[1].matchAll(/^\s*-\s*([^\s#][^\n]*)$/gm)].map((match) =>
    match[1].trim()
  );
  return {
    id: `spec:${title}`,
    title,
    status: statusMatch[1] as 'active' | 'draft' | 'deprecated' | 'archived',
    tags,
    line: content.slice(0, heading.index).split('\n').length,
  };
}

function declarationBlock(
  content: string,
  file: string
): ManagedSpecDeclaration & { line: number } {
  const match = content.match(/```tsdoc-spec\n([\s\S]*?)\n```/g);
  if (!match || match.length !== 1) {
    throw new Error(
      `Managed spec document requires exactly one tsdoc-spec declaration block: ${file}`
    );
  }
  const block = match[0];
  const json = block.replace(/^```tsdoc-spec\n/, '').replace(/\n```$/, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new Error(`Invalid tsdoc-spec JSON in ${file}: ${String(error)}`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`tsdoc-spec declaration must be an object: ${file}`);
  }
  const record = parsed as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!['requirements', 'edges', 'bindings'].includes(key)) {
      throw new Error(`Unsupported tsdoc-spec declaration field ${key}: ${file}`);
    }
  }
  for (const key of ['requirements', 'edges', 'bindings'] as const) {
    if (record[key] !== undefined && !Array.isArray(record[key])) {
      throw new Error(`tsdoc-spec ${key} must be an array: ${file}`);
    }
  }
  return Object.assign(record as ManagedSpecDeclaration, {
    line: content.slice(0, content.indexOf(block)).split('\n').length + 1,
  });
}

function sourceAnchor(
  file: string,
  contentDigest: string,
  startLine: number,
  symbol: string
): SpecSourceAnchor {
  return { documentId: `managed-spec:${file}`, file, symbol, range: { startLine }, contentDigest };
}

function realDirectory(value: string, label: string): string {
  const resolved = path.resolve(value);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory())
    throw new Error(`${label} not found: ${resolved}`);
  return fs.realpathSync(resolved);
}

function inside(root: string, candidate: string): boolean {
  const value = path.relative(root, candidate);
  return value === '' || (value !== '..' && !value.startsWith(`..${path.sep}`));
}

function relative(root: string, value: string): string {
  return path.relative(root, value).split(path.sep).join('/');
}

function requiredText(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim())
    throw new Error(`${label} must be a non-empty string`);
  return value;
}

function sha256(value: string | Buffer): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function compareDocument(left: { file: string }, right: { file: string }): number {
  return left.file.localeCompare(right.file);
}
