/** Load canonical-node-addressed TSDoc into one immutable enrichment revision. */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import type { CanonicalGraphNode, CanonicalProjectGraph } from '../indexer';
import { parseCanonicalId } from '../indexer/canonical-id';
import {
  createEnrichmentRevision,
  type EnrichmentRevision,
  type TsdocEnrichmentItem,
} from '../semantic-graph/analysis-input-revisions';

export const TSDOC_ENRICHMENT_LOADER_ID = 'tsdoc-edge/tsdoc-enrichment-loader' as const;
export const TSDOC_ENRICHMENT_LOADER_VERSION = '1.0.0' as const;

export interface LoadTsdocEnrichmentOptions {
  readonly workspaceRoot: string;
  readonly workspaceId: string;
  readonly graph: CanonicalProjectGraph;
}

interface NodeWithJsDoc extends ts.Node {
  readonly jsDoc?: readonly ts.JSDoc[];
}

/**
 * Parse source files selected by canonical graph nodes. The result never mutates
 * the graph: source bytes and node IDs are only projected into enrichment items.
 */
export function loadTsdocEnrichment(options: LoadTsdocEnrichmentOptions): EnrichmentRevision {
  const workspaceRoot = realDirectory(options.workspaceRoot, 'TSDoc enrichment workspace root');
  const nodesByFile = indexNodes(options.graph.nodes);
  const items: TsdocEnrichmentItem[] = [];

  for (const [file, nodes] of [...nodesByFile.entries()].sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    const candidate = path.resolve(workspaceRoot, file);
    if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) continue;
    const sourcePath = realSourceFile(workspaceRoot, file);
    const bytes = fs.readFileSync(sourcePath);
    const source = bytes.toString('utf8');
    const contentDigest = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
    const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const matched = new Set<string>();
    visit(sourceFile, (node) => {
      const name = declarationName(node);
      if (!name) return;
      const candidates = nodes.filter((candidate) => nodeName(candidate) === name);
      const docs = (node as NodeWithJsDoc).jsDoc;
      if (!docs?.length) return;
      const doc = docs[docs.length - 1];
      if (!doc) return;
      for (const candidate of candidates) {
        if (matched.has(candidate.id)) continue;
        items.push(createItem(candidate.id, file, contentDigest, sourceFile, doc));
        matched.add(candidate.id);
      }
    });
  }

  const sourceFingerprint = digestValue({
    loader: { id: TSDOC_ENRICHMENT_LOADER_ID, version: TSDOC_ENRICHMENT_LOADER_VERSION },
    graphFingerprint: options.graph.fingerprint,
    items: [...items].sort((left, right) => left.id.localeCompare(right.id)),
  });
  return createEnrichmentRevision({
    workspaceId: requireText(options.workspaceId, 'TSDoc enrichment workspaceId'),
    items,
    provenance: {
      source: 'collected',
      producerId: TSDOC_ENRICHMENT_LOADER_ID,
      producerVersion: TSDOC_ENRICHMENT_LOADER_VERSION,
      sourceFingerprint,
    },
  });
}

function indexNodes(
  nodes: readonly CanonicalGraphNode[]
): ReadonlyMap<string, readonly CanonicalGraphNode[]> {
  const byFile = new Map<string, CanonicalGraphNode[]>();
  for (const node of nodes) {
    const file = nodeFile(node);
    if (!file || !/\.tsx?$/.test(file)) continue;
    const values = byFile.get(file) ?? [];
    values.push(node);
    byFile.set(file, values);
  }
  return byFile;
}

function nodeFile(node: CanonicalGraphNode): string | undefined {
  const value = typeof node.file === 'string' ? node.file : parseCanonicalId(node.id)?.filePath;
  if (!value || path.isAbsolute(value) || value.includes('\\') || value.split('/').includes('..')) {
    return undefined;
  }
  return value.replace(/^\.\//, '');
}

function nodeName(node: CanonicalGraphNode): string | undefined {
  if (typeof node.name === 'string' && node.name) return node.name;
  const qualifiedName =
    typeof node.qualifiedName === 'string'
      ? node.qualifiedName
      : parseCanonicalId(node.id)?.qualifiedName;
  return qualifiedName?.split('.').at(-1);
}

function visit(node: ts.Node, consume: (node: ts.Node) => void): void {
  consume(node);
  ts.forEachChild(node, (child) => visit(child, consume));
}

function declarationName(node: ts.Node): string | undefined {
  if (
    (ts.isClassDeclaration(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node)) &&
    node.name
  ) {
    return node.name.text;
  }
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) return node.name.text;
  return undefined;
}

function createItem(
  symbolId: string,
  file: string,
  contentDigest: string,
  sourceFile: ts.SourceFile,
  doc: ts.JSDoc
): TsdocEnrichmentItem {
  const start = sourceFile.getLineAndCharacterOfPosition(doc.getStart(sourceFile));
  const end = sourceFile.getLineAndCharacterOfPosition(doc.getEnd());
  const tags = (doc.tags ?? []).map((tag) => ({
    name: tag.tagName.text.replace(/^@/, ''),
    ...(tag.comment ? { text: String(tag.comment).trim() } : {}),
  }));
  const summary = typeof doc.comment === 'string' ? doc.comment.trim() : undefined;
  const payload = { symbolId, file, contentDigest, startLine: start.line + 1, tags };
  return {
    kind: 'tsdoc',
    id: `tsdoc:${digestValue(payload)}`,
    symbolId,
    source: {
      file,
      contentDigest,
      startLine: start.line + 1,
      startColumn: start.character + 1,
      endLine: end.line + 1,
      endColumn: end.character + 1,
    },
    ...(summary ? { summary } : {}),
    tags,
    provenance: {
      source: 'tsdoc-parser',
      producerId: TSDOC_ENRICHMENT_LOADER_ID,
      producerVersion: TSDOC_ENRICHMENT_LOADER_VERSION,
      sourceFingerprint: contentDigest,
    },
  };
}

function realDirectory(value: string, label: string): string {
  const resolved = path.resolve(value);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error(`${label} not found: ${resolved}`);
  }
  return fs.realpathSync(resolved);
}

function realSourceFile(root: string, file: string): string {
  const resolved = path.resolve(root, file);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    throw new Error(`TSDoc enrichment source file not found: ${file}`);
  }
  const real = fs.realpathSync(resolved);
  const relative = path.relative(root, real);
  if (relative === '' || relative === '..' || relative.startsWith(`..${path.sep}`)) {
    throw new Error(`TSDoc enrichment source file escapes workspace root: ${file}`);
  }
  return real;
}

function requireText(value: string, label: string): string {
  if (!value.trim()) throw new Error(`${label} must be a non-empty string`);
  return value;
}

function digestValue(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
