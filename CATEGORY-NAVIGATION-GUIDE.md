# TSDoc Edge - Category Navigation Guide

**Created**: 2025-11-25
**Status**: Active
**Purpose**: Help users discover and navigate documentation across 15 streamlined categories

## Overview

TSDoc Edge documentation is organized into **15 core categories**, optimized for clarity and discoverability. This guide helps you find what you need quickly.

## Quick Navigation

```bash
# Find all document symbols
tsdoc-edge doc-symbols

# Search for specific topics
tsdoc-edge doc-symbols --search "mermaid"

# Filter by category
tsdoc-edge doc-symbols --category workflows

# Get LLM-friendly output
tsdoc-edge doc-symbols --llm
```

## Category Structure

### 1. 📊 **analyzers/** (31 docs)
**Purpose**: Core analyzers that detect relationships and extract symbols

**Key Documents**:
- [[Analyzers & Extractors]] - Master index
- [[ASTSymbolExtractor]] - Symbol extraction from AST
- [[IODependencyAnalyzer]] - Type-based I/O dependencies
- [[CallGraphAnalyzer]] - Function call detection
- [[TestCoverageAnalyzer]] - Test-to-code mapping

**When to use**: Building new analyzers, understanding relationship detection

### 2. 🏛️ **architecture/** (diagrams only)
**Purpose**: System architecture diagrams

**Key Documents**:
- `dependency-meta-structure.mmd` - Relationship taxonomy
- System architecture diagrams

**When to use**: Understanding system design, creating presentations

### 3. 🔧 **code-generation/** (9 docs)
**Purpose**: Code and documentation generation utilities

**Key Documents**:
- [[MarkdownGenerator]] - Generate markdown docs
- [[ModuleSpecGenerator]] - Generate module specifications
- [[CommentExporter]] - Export TSDoc comments
- [[CommentImporter]] - Import comments from external sources

**When to use**: Automating documentation generation, code scaffolding

### 4. ⌨️ **commands/** (52 docs)
**Purpose**: All CLI command implementations

**Key Documents**:
- [[BuildCommand]] - Extract symbols
- [[WorkContextCommand]] - Get file context
- [[ExploreEntrypointCommand]] - Explore from docs
- [[AnalyzeCallsCommand]] - Analyze function calls
- [[ParseMermaidCommand]] - Parse .mmd diagrams

**When to use**: Implementing new commands, understanding command behavior

### 5. 💡 **concepts/** (13 docs)
**Purpose**: Core architectural concepts and design principles

**Key Documents**:
- [[Concepts Index]] - Master index
- [[Module Specification Framework]] - 7-aspect documentation framework
- [[Symbol Reference System]] - `[[Symbol]]` reference rules
- [[Work Context Reliability]] - Context quality scoring
- [[Relationship Ontology]] - Relationship type definitions
- [[Architecture Overview]] - System design overview

**When to use**: Understanding design decisions, architectural patterns

### 6. 🔧 **core-components/** (5 docs)
**Purpose**: Essential infrastructure components

**Key Documents**:
- [[DatabaseManager]] - SQLite + JSONL hybrid storage
- [[SymbolRegistryManager]] - Symbol registry operations
- [[ConfigManager]] - Configuration management
- [[DepthTraverser]] - Graph traversal utilities
- [[CLI Runner]] - CLI entry point

**When to use**: Understanding system internals, core infrastructure

### 7. 📖 **examples/** (3 docs)
**Purpose**: Practical usage examples

**Key Documents**:
- [[Database Architecture]] - Hybrid storage example
- [[Relationship Usage Examples]] - Relationship type examples

**When to use**: Learning by example, onboarding

### 8. ⚙️ **features/** (26 docs)
**Purpose**: Feature specifications and implementations

**Key Documents**:
- [[Features Index]] - Master feature catalog
- [[DocumentSymbolSystem]] - `[[Symbol]]` system
- [[SymbolGraphFeatures]] - Graph operations
- [[ValidationFeatures]] - Validation features
- [[AnalysisFeatures]] - Analysis features
- [[Gephi Export]] - Graph visualization export

**When to use**: Understanding feature specifications, feature development

### 9. 📚 **guides/** (6 docs)
**Purpose**: Step-by-step learning guides

**Key Documents**:
- [[Guides & Tutorials]] - Complete learning path
- [[Build Pipeline Guide]] - Build workflow (15 min)
- [[Relationship Analysis Guide]] - Analyze relationships (20 min)
- [[Analyzer Development Guide]] - Build analyzers
- [[CLI Command Development Guide]] - Create commands

**When to use**: Learning workflows, developing new components

### 10. 📝 **parser/** (7 docs)
**Purpose**: Parsing utilities for code and documentation

**Key Documents**:
- [[EnhancedDocExtractor]] - Extract TSDoc + custom tags
- [[TSDocParser]] - Parse TSDoc comments
- [[Document Symbol Parser]] - Parse `[[Symbol]]` refs
- [[Mermaid Symbol Extractor]] - Extract from .mmd diagrams
- [[ModuleSpecTagParser]] - Parse module spec tags

**When to use**: Parsing custom formats, extending parser

### 11. 🎯 **primary-types/** (20 docs)
**Purpose**: Domain model types and business logic types

**Key Documents**:
- [[Primary Types Index]] - Master index
- [[EnhancedSymbolDoc]] - 6-category documentation type
- [[MermaidSymbol]] - Mermaid diagram symbols
- [[DecisionRecord]] - ADR type
- [[TsdocEdgeConfig]] - Configuration type

**When to use**: Understanding domain model, business types

### 12. 🔗 **relationships/** (28 docs)
**Purpose**: All relationship type specifications

**Key Documents**:
- [[Relationship Types]] - SSOT master index (26 types)
- [[Code Dependency]] - Import/export relationships
- [[IO Dependency]] - Type-based I/O matching
- [[Call Relationships]] - Function invocations
- [[Test Coverage]] - Test-to-code mapping
- [[Pipeline]] - Data transformation chains

**When to use**: Understanding relationships, implementing analyzers

### 13. 🏗️ **types/** (20 docs)
**Purpose**: Internal system types and technical infrastructure

**Key Documents**:
- [[Symbol]] - Core symbol type
- [[UnifiedRelationships]] - Relationship system types
- [[ParseTypes]] - Parser internal types
- [[LinkingTypes]] - Symbol linking types

**When to use**: Internal development, refactoring

### 14. 🛠️ **utilities/** (21 docs)
**Purpose**: Utility functions and helpers

**Key Documents**:
- [[SymbolGraphBuilder]] - Build symbol graphs
- [[DocumentationFixer]] - Fix documentation issues
- [[RecursiveImprover]] - Recursive code improvement
- [[ModuleSpecValidator]] - Validate module specs

**When to use**: Utilities, helper functions

### 15. 🔄 **workflows/** (9 docs)
**Purpose**: End-to-end workflow guides

**Key Documents**:
- [[Workflows Index]] - Master workflow index
- [[Work Context Workflow]] - Primary workflow (most important)
- [[Mermaid Entrypoint Workflow]] - Diagram-driven documentation
- [[Example - Mermaid Workflow]] - Real-world example
- [[Relationship System Roadmap]] - Implementation roadmap

**When to use**: Understanding complete workflows, best practices

## Finding Documents

### By Feature

**Want to**: Generate documentation from Mermaid diagrams
**Go to**: workflows/mermaid-entrypoint-workflow.md

**Want to**: Understand symbol relationships
**Go to**: relationships/index.md

**Want to**: Get context before modifying code
**Go to**: workflows/work-context-workflow.md

**Want to**: Build a new analyzer
**Go to**: guides/analyzer-development-guide.md

### By Role

**I'm a new contributor**:
1. Start: guides/index.md (Guides & Tutorials)
2. Then: quick-start.md
3. Practice: workflows/work-context-workflow.md

**I'm building features**:
1. Check: features/index.md (Features Index)
2. Review: concepts/module-specification-framework.md
3. Reference: commands/ for command examples

**I'm analyzing code**:
1. Start: guides/relationship-analysis-guide.md
2. Reference: relationships/index.md
3. Use: commands/AnalyzeCallsCommand.md, AnalyzeIOCommand.md

**I'm writing documentation**:
1. Follow: concepts/symbol-reference-system.md
2. Use: workflows/mermaid-entrypoint-workflow.md
3. Validate: commands/ValidateSymbolRefsCommand.md

## Category Changes (Nov 2025)

**Consolidation**: 25 → 15 categories (40% reduction)

**Removed Categories** (merged into logical parents):
- `storage/` → `core-components/`
- `graph/` → `core-components/`
- `config/` → `core-components/`
- `analysis/` → `concepts/`
- `conventions/` → `concepts/`
- `fixer/` → `utilities/`
- `parsers/` → `parser/`
- `fold/` → `code-generation/`
- `generator/` → `code-generation/`
- `doc-symbols/` → `features/`

**New Categories**:
- `code-generation/` - Unified code/doc generation (9 docs)

**Benefits**:
- ✅ Clearer boundaries
- ✅ Eliminated micro-categories (1-2 files)
- ✅ Easier navigation
- ✅ Reduced cognitive load

## Index Documents

Each category has an `index.md` master index:

- `analyzers/index.md` - [[Analyzers & Extractors]]
- `concepts/index.md` - [[Concepts Index]]
- `features/index.md` - [[Features Index]]
- `guides/index.md` - [[Guides & Tutorials]]
- `primary-types/index.md` - [[Primary Types Index]]
- `relationships/index.md` - [[Relationship Types]]
- `workflows/index.md` - [[Workflows Index]]
- `COMMANDS.md` - [[Commands Index]]

## Related Documentation

- [[TSDoc Edge Documentation]] (`README.md`) - Main documentation index
- [[Commands Index]] (`COMMANDS.md`) - All 61 CLI commands
- [[Quick Start Guide]] (`quick-start.md`) - Get started in 5 minutes
- `CATEGORY-CONSOLIDATION-PLAN.md` - Category consolidation strategy
- `CATEGORY-MIGRATION-MAP.md` - Detailed migration map

---

**Last Updated**: 2025-11-25
**Maintained By**: TSDoc Edge Core Team
