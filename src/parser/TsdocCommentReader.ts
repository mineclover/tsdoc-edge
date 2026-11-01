/**
 * Canonical `@microsoft/tsdoc` `DocComment` AST reader and TypeScript JSDoc helper utilities.
 *
 * Centralizes all `@microsoft/tsdoc` `DocNode` rendering, block/modifier/inline tag extraction,
 * and AST-safe `@doc [[Symbol#Section]]` checkpoint discovery so downstream parsers, generators,
 * validators, and commands rely on the upstream TSDoc standard AST instead of ad-hoc regexes.
 *
 * @doc [[TSDocStandardSpecification]]
 * @doc [[CrossSpecIntegrationContract]]
 * @packageDocumentation
 */

import {
  type DocBlock,
  type DocBlockTag,
  type DocCodeSpan,
  type DocComment,
  type DocDeclarationReference,
  type DocErrorText,
  type DocEscapedText,
  type DocFencedCode,
  type DocLinkTag,
  type DocNode,
  DocNodeKind,
  type DocParagraph,
  type DocPlainText,
} from '@microsoft/tsdoc';
import * as ts from 'typescript';
import { TSDocParser } from './TSDocParser';

/**
 * Rendering options for converting `@microsoft/tsdoc` `DocNode` trees into text.
 *
 * @doc [[TSDocStandardSpecification]]
 * @public
 */
export interface TsdocRenderOptions {
  /** Preserve Markdown code spans, fenced blocks, paragraph breaks, and link formatting */
  readonly preserveMarkdown?: boolean;
}

/**
 * Structured `@param` block entry extracted from a `DocComment`.
 *
 * @public
 */
export interface TsdocParameterEntry {
  /** Parameter identifier */
  readonly name: string;
  /** Rendered parameter description */
  readonly description: string;
}

/**
 * Structured `@typeParam` block entry extracted from a `DocComment`.
 *
 * @public
 */
export interface TsdocTypeParameterEntry {
  /** Generic type parameter identifier */
  readonly name: string;
  /** Rendered type parameter description */
  readonly description: string;
}

/**
 * Structured `@doc [[Symbol#Section]]` checkpoint reference extracted from a `DocComment`.
 *
 * @public
 */
export interface TsdocDocCheckpointEntry {
  /** Target document checkpoint symbol (without `[[` / `]]` or `#Section`) */
  readonly docSymbol: string;
  /** Optional target section anchor after `#` */
  readonly section?: string;
  /** Normalized reference string (`Symbol` or `Symbol#Section`) */
  readonly rawReference: string;
}

/**
 * Standard `@microsoft/tsdoc` release visibility stage.
 *
 * @public
 */
export type TsdocReleaseVisibility = 'public' | 'beta' | 'alpha' | 'internal';

/**
 * Structured projection of a parsed `@microsoft/tsdoc` `DocComment` AST.
 *
 * @doc [[TSDocStandardSpecification]]
 * @public
 */
export interface StructuredTsdocComment {
  /** Rendered leading summary section */
  readonly summary: string;
  /** Rendered `@remarks` block, if present */
  readonly remarks?: string;
  /** Rendered `@privateRemarks` block, if present */
  readonly privateRemarks?: string;
  /** Rendered `@deprecated` block, if present */
  readonly deprecated?: string;
  /** Rendered `@returns` block, if present */
  readonly returns?: string;
  /** Rendered `@defaultValue` block, if present */
  readonly defaultValue?: string;
  /** Ordered `@param` entries */
  readonly params: readonly TsdocParameterEntry[];
  /** Ordered `@typeParam` entries */
  readonly typeParams: readonly TsdocTypeParameterEntry[];
  /** Rendered `@throws` block payloads */
  readonly throws: readonly string[];
  /** Rendered `@example` block payloads (preserving Markdown fences) */
  readonly examples: readonly string[];
  /** Rendered `@see` block payloads */
  readonly see: readonly string[];
  /** All inline `{@link}` targets referenced anywhere in the `DocComment` */
  readonly links: readonly string[];
  /** Normalized lowercase modifier tag names (e.g., `@public`, `@packagedocumentation`) */
  readonly modifiers: ReadonlySet<string>;
  /** Exact modifier tag names in source order */
  readonly modifierTags: readonly string[];
  /** Canonical release visibility stage derived from standard TSDoc modifiers */
  readonly releaseVisibility?: TsdocReleaseVisibility;
  /** Custom and standard `customBlocks` values keyed by lowercase `@tagname` */
  readonly customBlocks: ReadonlyMap<string, readonly string[]>;
  /** Parsed `@doc [[Symbol#Section]]` checkpoint references */
  readonly docReferences: readonly TsdocDocCheckpointEntry[];
  /** Check whether a modifier tag (with or without `@`) is present */
  hasModifier(tagName: string): boolean;
  /** Check whether a block tag (with or without `@`) is present */
  hasBlockTag(tagName: string): boolean;
  /** Retrieve all rendered block values for a tag (case-insensitive, with or without `@`) */
  getTagValues(tagName: string): readonly string[];
  /** Retrieve the first rendered block value for a tag, if present */
  getFirstTagValue(tagName: string): string | undefined;
}

/**
 * Source-anchored `@doc [[Symbol#Section]]` checkpoint reference extracted from TypeScript AST JSDoc.
 *
 * @doc [[CrossSpecIntegrationContract]]
 * @public
 */
export interface SourceDocCheckpointReference {
  /** Source file path */
  readonly filePath: string;
  /** Target document checkpoint symbol */
  readonly docSymbol: string;
  /** Optional target section anchor */
  readonly section?: string;
  /** Normalized `Symbol` or `Symbol#Section` reference */
  readonly rawReference: string;
  /** 1-based line number of the `@doc` tag in the source file */
  readonly commentLine: number;
  /** Unqualified declaration symbol name when attached to a declaration */
  readonly codeSymbol?: string;
  /** Parent-qualified declaration symbol name (e.g., `ClassName.methodName`) when attached */
  readonly qualifiedSymbol?: string;
  /** 1-based line number of the attached declaration start */
  readonly declarationLine?: number;
  /** True when the JSDoc block carries `@packageDocumentation` or is unattached file-level JSDoc */
  readonly isPackageDocumentation: boolean;
}

/**
 * Options for AST-safe `@doc` checkpoint extraction from TypeScript source code.
 *
 * @public
 */
export interface ExtractDocCheckpointsOptions {
  /** Only emit checkpoints attached to named TypeScript symbol declarations (default: `false`) */
  readonly requireDeclaration?: boolean;
  /** Optional shared `TSDocParser` instance */
  readonly parser?: TSDocParser;
}

interface DeclarationIdentity {
  readonly codeSymbol: string;
  readonly qualifiedSymbol: string;
  readonly declarationLine: number;
}

/**
 * Retrieve direct TypeScript `ts.JSDoc` AST nodes attached to a `ts.Node` without unsafe type assertions.
 *
 * @param node - TypeScript AST node
 * @returns Array of attached `ts.JSDoc` nodes
 * @public
 */
export function getDirectJsDocs(node: ts.Node): readonly ts.JSDoc[] {
  if ('jsDoc' in node && Array.isArray(node.jsDoc)) {
    return node.jsDoc.filter(ts.isJSDoc);
  }
  return [];
}

const DOC_CHECKPOINT_PATTERN = /\[\[([^\]#]+)(?:#([^\]]+))?\]\]/g;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDocNodeArray(value: unknown): value is readonly DocNode[] {
  return Array.isArray(value);
}

function normalizeTagKey(tagName: string): string {
  const trimmed = tagName.trim();
  if (!trimmed) {
    return '';
  }
  const withAt = trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
  return withAt.toLowerCase();
}

function formatLinkDestination(node: DocNode, preserveMarkdown: boolean): string {
  const link = node as DocLinkTag;
  let destination = '';

  if (link.urlDestination) {
    destination = link.urlDestination.trim();
  } else if (link.codeDestination) {
    const codeDest: DocDeclarationReference = link.codeDestination;
    if (typeof codeDest.emitAsTsdoc === 'function') {
      destination = codeDest.emitAsTsdoc().trim();
    }
  }

  const label = link.linkText?.trim();
  if (preserveMarkdown) {
    if (label && destination) {
      return link.urlDestination ? `[${label}](${destination})` : `\`${destination}\` (${label})`;
    }
    if (destination) {
      return link.urlDestination ? destination : `\`${destination}\``;
    }
    return label ?? '';
  }

  return label || destination;
}

function renderNodeInternal(node: DocNode, preserveMarkdown: boolean): string {
  switch (node.kind) {
    case DocNodeKind.PlainText: {
      const text = (node as DocPlainText).text;
      return typeof text === 'string' ? text : '';
    }
    case DocNodeKind.EscapedText: {
      const decoded = (node as DocEscapedText).decodedText;
      return typeof decoded === 'string' ? decoded : '';
    }
    case DocNodeKind.ErrorText: {
      const errorText = (node as DocErrorText).text;
      return typeof errorText === 'string' ? errorText : '';
    }
    case DocNodeKind.SoftBreak:
      return preserveMarkdown ? ' ' : ' ';
    case DocNodeKind.CodeSpan: {
      const code = (node as DocCodeSpan).code;
      if (typeof code !== 'string') {
        return '';
      }
      return preserveMarkdown ? `\`${code}\`` : code;
    }
    case DocNodeKind.FencedCode: {
      const fenced = node as DocFencedCode;
      const code = typeof fenced.code === 'string' ? fenced.code : '';
      const language = typeof fenced.language === 'string' ? fenced.language : '';
      if (!preserveMarkdown) {
        return code.trim();
      }
      return `\n\`\`\`${language}\n${code.replace(/\n$/, '')}\n\`\`\`\n`;
    }
    case DocNodeKind.LinkTag:
      return formatLinkDestination(node, preserveMarkdown);
    case DocNodeKind.Paragraph: {
      const paragraphNodes = (node as DocParagraph).nodes;
      if (!isDocNodeArray(paragraphNodes)) {
        return '';
      }
      const rendered = renderNodesInternal(paragraphNodes, preserveMarkdown).trim();
      if (!rendered) {
        return '';
      }
      return preserveMarkdown ? `${rendered}\n\n` : `${rendered}\n`;
    }
    case DocNodeKind.Section: {
      if (isObjectRecord(node) && isDocNodeArray(node.nodes)) {
        return renderNodesInternal(node.nodes, preserveMarkdown);
      }
      return '';
    }
    case DocNodeKind.Excerpt:
    case DocNodeKind.BlockTag:
      return '';
    default: {
      if (isObjectRecord(node) && isDocNodeArray(node.nodes)) {
        return renderNodesInternal(node.nodes, preserveMarkdown);
      }
      if (isObjectRecord(node) && typeof node.text === 'string') {
        return node.text;
      }
      if (typeof node.toString === 'function' && node.toString !== Object.prototype.toString) {
        const customText = node.toString();
        return customText === '[object Object]' ? '' : customText;
      }
      return '';
    }
  }
}

function renderNodesInternal(nodes: readonly DocNode[], preserveMarkdown: boolean): string {
  let output = '';
  for (const child of nodes) {
    output += renderNodeInternal(child, preserveMarkdown);
  }
  return output;
}

/**
 * Render an array of `@microsoft/tsdoc` `DocNode` items into clean text or Markdown
 * without leaking raw `DocExcerpt` delimiter tokens or `[object Object]`.
 *
 * @param nodes - Sequence of TSDoc AST nodes
 * @param options - Rendering options (`preserveMarkdown`)
 * @returns Trimmed rendered text
 * @public
 */
export function renderDocNodesText(
  nodes: readonly DocNode[] | undefined,
  options: TsdocRenderOptions = {}
): string {
  if (!nodes || nodes.length === 0) {
    return '';
  }
  const preserveMarkdown = options.preserveMarkdown ?? false;
  const raw = renderNodesInternal(nodes, preserveMarkdown);
  if (preserveMarkdown) {
    return raw.replace(/\n{3,}/g, '\n\n').trim();
  }
  return raw
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n')
    .trim();
}

/**
 * Render a single `@microsoft/tsdoc` `DocNode` (such as `DocSection` or `DocParagraph`)
 * into clean text or Markdown.
 *
 * @param node - TSDoc AST node to render
 * @param options - Rendering options (`preserveMarkdown`)
 * @returns Trimmed rendered text
 * @public
 */
export function renderDocNodeText(
  node: DocNode | undefined,
  options: TsdocRenderOptions = {}
): string {
  if (!node) {
    return '';
  }
  return renderDocNodesText([node], options);
}

function collectSiblingLinks(children: readonly DocNode[], out: Set<string>): void {
  for (let index = 0; index < children.length; index++) {
    const child = children[index];
    if (
      child.kind === DocNodeKind.BlockTag &&
      (child as DocBlockTag).tagName.toLowerCase() === '@link'
    ) {
      if (index + 1 < children.length && children[index + 1].kind === DocNodeKind.PlainText) {
        const next = children[index + 1] as DocPlainText;
        const firstToken = next.text.trim().split(/\s+/)[0].trim();
        if (firstToken) {
          out.add(firstToken);
        }
      }
      continue;
    }
    if (child.kind !== DocNodeKind.Excerpt) {
      collectInlineLinks(child, out);
    }
  }
}

function collectInlineLinks(node: DocNode | undefined, out: Set<string>): void {
  if (!node) {
    return;
  }

  if (node.kind === DocNodeKind.LinkTag) {
    const link = node as DocLinkTag;
    if (link.urlDestination?.trim()) {
      out.add(link.urlDestination.trim());
    } else if (link.codeDestination && typeof link.codeDestination.emitAsTsdoc === 'function') {
      const target = link.codeDestination.emitAsTsdoc().trim();
      if (target) {
        out.add(target);
      }
    }
    return;
  }

  if (isObjectRecord(node) && isDocNodeArray(node.nodes)) {
    collectSiblingLinks(node.nodes, out);
    return;
  }

  if (typeof node.getChildNodes === 'function') {
    collectSiblingLinks(node.getChildNodes(), out);
  }
}

function extractDocCheckpointsFromText(text: string): TsdocDocCheckpointEntry[] {
  const entries: TsdocDocCheckpointEntry[] = [];
  for (const match of text.matchAll(DOC_CHECKPOINT_PATTERN)) {
    const docSymbol = match[1]?.trim() ?? '';
    if (!docSymbol) {
      continue;
    }
    const section = match[2]?.trim() || undefined;
    const rawReference = section ? `${docSymbol}#${section}` : docSymbol;
    entries.push({
      docSymbol,
      ...(section ? { section } : {}),
      rawReference,
    });
  }
  return entries;
}

function renderBlock(block: DocBlock | undefined, preserveMarkdown = false): string | undefined {
  if (!block) {
    return undefined;
  }
  const rendered = renderDocNodeText(block.content, { preserveMarkdown });
  return rendered || undefined;
}

function resolveReleaseVisibility(
  modifiers: ReadonlySet<string>
): TsdocReleaseVisibility | undefined {
  if (modifiers.has('@internal')) {
    return 'internal';
  }
  if (modifiers.has('@alpha')) {
    return 'alpha';
  }
  if (modifiers.has('@beta')) {
    return 'beta';
  }
  if (modifiers.has('@public')) {
    return 'public';
  }
  return undefined;
}

/**
 * Project a `@microsoft/tsdoc` `DocComment` AST into a normalized `StructuredTsdocComment`.
 *
 * @param docComment - Parsed `@microsoft/tsdoc` `DocComment` root node
 * @returns Normalized read-only TSDoc projection
 * @public
 */
export function readTsdocComment(docComment: DocComment): StructuredTsdocComment {
  const summary = renderDocNodeText(docComment.summarySection);
  const remarks = renderBlock(docComment.remarksBlock);
  const privateRemarks = renderBlock(docComment.privateRemarks);
  const deprecated = renderBlock(docComment.deprecatedBlock);
  const returns = renderBlock(docComment.returnsBlock);

  const params: TsdocParameterEntry[] = (docComment.params?.blocks ?? []).map((block) => ({
    name: block.parameterName,
    description: renderDocNodeText(block.content),
  }));

  const typeParams: TsdocTypeParameterEntry[] = (docComment.typeParams?.blocks ?? []).map(
    (block) => ({
      name: block.parameterName,
      description: renderDocNodeText(block.content),
    })
  );

  const modifierTags: string[] = [];
  const modifiers = new Set<string>();
  for (const modNode of docComment.modifierTagSet?.nodes ?? []) {
    modifierTags.push(modNode.tagName);
    modifiers.add(modNode.tagName.toLowerCase());
  }

  const customMap = new Map<string, string[]>();
  const throwsList: string[] = [];
  const examplesList: string[] = [];
  const seeList: string[] = [];
  const docReferences: TsdocDocCheckpointEntry[] = [];
  let defaultValue: string | undefined;

  for (const seeBlock of docComment.seeBlocks ?? []) {
    const text = renderDocNodeText(seeBlock.content);
    if (text) {
      seeList.push(text);
    }
  }

  for (const block of docComment.customBlocks ?? []) {
    const key = block.blockTag.tagName.toLowerCase();
    const preserveMarkdown = key === '@example';
    const text = renderDocNodeText(block.content, { preserveMarkdown });
    const existing = customMap.get(key);
    if (existing) {
      existing.push(text);
    } else {
      customMap.set(key, [text]);
    }

    if (key === '@throws' && text) {
      throwsList.push(text);
    } else if (key === '@example' && text) {
      examplesList.push(text);
    } else if (key === '@defaultvalue' && text && defaultValue === undefined) {
      defaultValue = text;
    } else if (key === '@see' && text) {
      seeList.push(text);
    } else if (key === '@doc' && text) {
      docReferences.push(...extractDocCheckpointsFromText(text));
    }
  }

  if (seeList.length > 0 && !customMap.has('@see')) {
    customMap.set('@see', [...seeList]);
  }

  const linkSet = new Set<string>();
  collectInlineLinks(docComment, linkSet);

  const releaseVisibility = resolveReleaseVisibility(modifiers);

  return {
    summary,
    ...(remarks !== undefined ? { remarks } : {}),
    ...(privateRemarks !== undefined ? { privateRemarks } : {}),
    ...(deprecated !== undefined ? { deprecated } : {}),
    ...(returns !== undefined ? { returns } : {}),
    ...(defaultValue !== undefined ? { defaultValue } : {}),
    params,
    typeParams,
    throws: throwsList,
    examples: examplesList,
    see: seeList,
    links: [...linkSet],
    modifiers,
    modifierTags,
    ...(releaseVisibility !== undefined ? { releaseVisibility } : {}),
    customBlocks: customMap,
    docReferences,
    hasModifier(tagName: string): boolean {
      const normalized = normalizeTagKey(tagName);
      return normalized.length > 0 && modifiers.has(normalized);
    },
    hasBlockTag(tagName: string): boolean {
      const normalized = normalizeTagKey(tagName);
      if (!normalized) {
        return false;
      }
      if (normalized === '@remarks') return remarks !== undefined;
      if (normalized === '@privateremarks') return privateRemarks !== undefined;
      if (normalized === '@deprecated') return deprecated !== undefined;
      if (normalized === '@returns') return returns !== undefined;
      if (normalized === '@param') return params.length > 0;
      if (normalized === '@typeparam') return typeParams.length > 0;
      if (normalized === '@see') return seeList.length > 0;
      return customMap.has(normalized);
    },
    getTagValues(tagName: string): readonly string[] {
      const normalized = normalizeTagKey(tagName);
      if (!normalized) {
        return [];
      }
      if (normalized === '@remarks') return remarks !== undefined ? [remarks] : [];
      if (normalized === '@privateremarks') {
        return privateRemarks !== undefined ? [privateRemarks] : [];
      }
      if (normalized === '@deprecated') return deprecated !== undefined ? [deprecated] : [];
      if (normalized === '@returns') return returns !== undefined ? [returns] : [];
      if (normalized === '@see') return seeList;
      return customMap.get(normalized) ?? [];
    },
    getFirstTagValue(tagName: string): string | undefined {
      const values = this.getTagValues(tagName).filter((v) => v.length > 0);
      return values[0];
    },
  };
}

function hasPackageDocTag(jsDoc: ts.JSDoc): boolean {
  return (jsDoc.tags ?? []).some(
    (tag) => tag.tagName.text.toLowerCase() === 'packagedocumentation'
  );
}

/**
 * Extract the nearest declaration-attached `/** ... *\/` JSDoc block text for a TypeScript AST node.
 *
 * Ignores `//` line comments, non-JSDoc `/* ... *\/` block comments, and file-level
 * `@packageDocumentation` headers that precede the declaration's own JSDoc block.
 *
 * @param node - TypeScript declaration AST node
 * @param sourceFile - Owning TypeScript `SourceFile`
 * @returns Raw `/** ... *\/` comment text, or `null` when no declaration JSDoc is attached
 * @public
 */
export function extractLeadingJsDocText(node: ts.Node, sourceFile: ts.SourceFile): string | null {
  const jsDocs = getDirectJsDocs(node);
  if (jsDocs.length > 0) {
    for (let index = jsDocs.length - 1; index >= 0; index--) {
      const candidate = jsDocs[index];
      if (!hasPackageDocTag(candidate)) {
        return candidate.getText(sourceFile);
      }
    }
    return null;
  }

  const fullText = sourceFile.getFullText();
  const commentRanges = ts.getLeadingCommentRanges(fullText, node.getFullStart());
  if (!commentRanges || commentRanges.length === 0) {
    return null;
  }

  for (let index = commentRanges.length - 1; index >= 0; index--) {
    const range = commentRanges[index];
    const text = fullText.slice(range.pos, range.end);
    if (
      text.startsWith('/**') &&
      !text.startsWith('/***') &&
      !text.includes('@packageDocumentation')
    ) {
      return text;
    }
  }

  return null;
}

function getPropertyOrMemberName(nameNode: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(nameNode) || ts.isStringLiteral(nameNode) || ts.isNumericLiteral(nameNode)) {
    return nameNode.text;
  }
  return undefined;
}

function getDeclarationIdentity(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  parentSymbol?: string
): DeclarationIdentity | undefined {
  let codeSymbol: string | undefined;

  if (
    (ts.isClassDeclaration(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node)) &&
    node.name
  ) {
    codeSymbol = node.name.text;
  } else if (
    ts.isMethodDeclaration(node) ||
    ts.isMethodSignature(node) ||
    ts.isPropertyDeclaration(node) ||
    ts.isPropertySignature(node)
  ) {
    codeSymbol = getPropertyOrMemberName(node.name);
  } else if (ts.isVariableStatement(node)) {
    if (
      node.declarationList.declarations.length > 0 &&
      ts.isIdentifier(node.declarationList.declarations[0].name)
    ) {
      codeSymbol = node.declarationList.declarations[0].name.text;
    }
  }

  if (!codeSymbol) {
    return undefined;
  }

  const declarationLine =
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  const qualifiedSymbol = parentSymbol ? `${parentSymbol}.${codeSymbol}` : codeSymbol;

  return {
    codeSymbol,
    qualifiedSymbol,
    declarationLine,
  };
}

/**
 * Extract `@doc [[Symbol#Section]]` checkpoint references from TypeScript source code
 * using the TypeScript AST and `@microsoft/tsdoc` `DocComment` parser.
 *
 * Unlike raw regex scanning over file text, this never matches `@doc [[...]]` occurrences
 * inside string literals, template literals, regular expressions, or fenced code.
 *
 * @param filePath - Source file path recorded on returned entries
 * @param sourceCode - TypeScript source text
 * @param options - Extraction options (`requireDeclaration`, `parser`)
 * @returns Ordered checkpoint references discovered in real JSDoc comments
 * @public
 */
export function extractDocCheckpointsFromSource(
  filePath: string,
  sourceCode: string,
  options: ExtractDocCheckpointsOptions = {}
): readonly SourceDocCheckpointReference[] {
  if (!sourceCode.trim()) {
    return [];
  }

  const requireDeclaration = options.requireDeclaration ?? false;
  const parser = options.parser ?? new TSDocParser();
  const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true);
  const visitedJsDocPositions = new Set<number>();
  const results: SourceDocCheckpointReference[] = [];

  const processJsDoc = (jsDoc: ts.JSDoc, declaration?: DeclarationIdentity): void => {
    const startPos = jsDoc.getStart(sourceFile);
    if (visitedJsDocPositions.has(startPos)) {
      return;
    }
    visitedJsDocPositions.add(startPos);

    const isPackageDoc = hasPackageDocTag(jsDoc) || declaration === undefined;
    if (requireDeclaration && (!declaration || hasPackageDocTag(jsDoc))) {
      return;
    }

    const docTags = (jsDoc.tags ?? []).filter((tag) => tag.tagName.text === 'doc');
    const tagLines = docTags.map(
      (tag) => sourceFile.getLineAndCharacterOfPosition(tag.getStart(sourceFile)).line + 1
    );
    const fallbackLine = sourceFile.getLineAndCharacterOfPosition(startPos).line + 1;

    const parsed = readTsdocComment(parser.parseString(jsDoc.getText(sourceFile)).docComment);
    parsed.docReferences.forEach((entry, index) => {
      const effectiveDeclaration = hasPackageDocTag(jsDoc) ? undefined : declaration;
      results.push({
        filePath,
        docSymbol: entry.docSymbol,
        ...(entry.section ? { section: entry.section } : {}),
        rawReference: entry.rawReference,
        commentLine: tagLines[index] ?? tagLines[tagLines.length - 1] ?? fallbackLine,
        ...(effectiveDeclaration
          ? {
              codeSymbol: effectiveDeclaration.codeSymbol,
              qualifiedSymbol: effectiveDeclaration.qualifiedSymbol,
              declarationLine: effectiveDeclaration.declarationLine,
            }
          : {}),
        isPackageDocumentation: isPackageDoc,
      });
    });
  };

  const visit = (node: ts.Node, parentSymbol?: string): void => {
    const declaration = getDeclarationIdentity(node, sourceFile, parentSymbol);
    const jsDocs = getDirectJsDocs(node);
    if (jsDocs.length > 0) {
      for (const jsDoc of jsDocs) {
        processJsDoc(jsDoc, declaration);
      }
    }

    const nextParent =
      (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) && node.name
        ? node.name.text
        : parentSymbol;

    ts.forEachChild(node, (child) => visit(child, nextParent));
  };

  visit(sourceFile);

  const eofJsDocs = getDirectJsDocs(sourceFile.endOfFileToken);
  if (eofJsDocs.length > 0) {
    for (const jsDoc of eofJsDocs) {
      processJsDoc(jsDoc, undefined);
    }
  }

  return results;
}
