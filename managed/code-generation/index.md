---
title: Code Generation
type: index
category: code-generation
status: active
canonical: true
---

# [[Code Generation]]

> Documentation and code generation utilities for TSDoc Edge

## Overview

The code generation system transforms analyzed code and metadata into active context and structured output formats for AI-assisted workflows and machine-readable reports.

## Context Generators

### [[LLMsTextGenerator]]

**Source**: `src/generator/LLMsTextGenerator.ts`

Formats unified file, symbol, contract, and impact context into compact `llms.txt`-compatible prompts for AI agents.

### [[XMLContextGenerator]]

**Source**: `src/generator/XMLContextGenerator.ts`

Produces structured XML context for downstream tooling and model consumption.

## Structured Output

Structured output builders in `src/output/index.ts` expose JSON and XML builders plus schema-backed serialization for command results.

## Usage

```typescript
import { LLMsTextGenerator } from './generator/LLMsTextGenerator';
import { XMLContextGenerator } from './generator/XMLContextGenerator';
import { createBuilder } from './output';
```

## Related

- [[Analyzers & Extractors]] - Analysis that feeds generation
- [[Parser System]] - Parsing that provides input data
- [[Document Symbol System]] - Symbol linking in generated context

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → managed/README.md:196
- [[EnhancedSymbolDoc]] → managed/primary-types/EnhancedSymbolDoc.md:331

### Implemented By

- Code Generation → src/generator/LLMsTextGenerator.ts:1
- XMLContextGenerator → src/generator/XMLContextGenerator.ts:23
- JsonBuilder → src/output/JsonBuilder.ts:36
- XmlBuilder → src/output/XmlBuilder.ts:81
- XmlParseError → src/output/XmlParser.ts:25
- SchemaValidationError → src/output/XmlParser.ts:43
- ParsedData → src/output/XmlParser.ts:61
- XmlParser → src/output/XmlParser.ts:209
- createBuilder → src/output/index.ts:32
- getOutputFormat → src/output/index.ts:49
- isHumanFormat → src/output/index.ts:62
- DepsSchema → src/output/schemas.ts:19
- WhoUsesSchema → src/output/schemas.ts:50
- EndpointsSchema → src/output/schemas.ts:75
- HubsSchema → src/output/schemas.ts:94
- LayersSchema → src/output/schemas.ts:112
- CommonSchema → src/output/schemas.ts:129
- RoutesSchema → src/output/schemas.ts:150
- BuildResultSchema → src/output/schemas.ts:168
- FieldType → src/output/types.ts:16
- FieldDef → src/output/types.ts:24
- ObjectSchema → src/output/types.ts:35
- ArraySchema → src/output/types.ts:45
- GroupedArraySchema → src/output/types.ts:58
- OutputSchema → src/output/types.ts:72
- arrayOf → src/output/types.ts:85
- groupedArrayOf → src/output/types.ts:105
- SectionData → src/output/types.ts:126
- GroupedSectionData → src/output/types.ts:135
- OutputData → src/output/types.ts:143
- OutputFormat → src/output/types.ts:153
- OutputBuilder → src/output/types.ts:161

