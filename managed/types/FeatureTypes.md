# [[FeatureTypes]]

**Source**: `src/types/feature/feature.ts`

## Purpose

Type system for feature documentation structure and metadata.

## Feature Document

Complete feature specification:
```typescript
interface FeatureDocument {
  id: string;                    // Unique feature ID
  title: string;                 // Feature title
  description: string;           // Feature description
  filePath: string;              // Markdown file path
  relatedSymbols: string[];      // Symbol IDs
  tags: string[];                // Categorization tags
  author?: string;               // Document author
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
  status: 'draft' | 'review' | 'approved' | 'deprecated';
}
```

## Symbol Reference

Reference to code symbol from feature doc:
```typescript
interface SymbolReference {
  symbolId: string;              // Referenced symbol ID
  line: number;                  // Line in document
  context?: string;              // Surrounding text
}
```

### Syntax

Two reference formats:
- `{symbolId}`: Inline reference
- `{@symbol symbolId}`: Explicit reference tag

### Example

```markdown
# User Authentication Feature

The authentication system uses {user-service} to validate
credentials and {@symbol session-manager} to maintain sessions.
```

## Feature Index

Collection of all feature documents:
```typescript
interface FeatureIndex {
  features: FeatureDocument[];
  byId: Map<string, FeatureDocument>;
  byTag: Map<string, string[]>;    // tag → feature IDs
  bySymbol: Map<string, string[]>; // symbol → feature IDs
}
```

## Feature Status Lifecycle

```
draft → review → approved → deprecated
```

### Status Meanings

- **draft**: Work in progress
- **review**: Ready for peer review
- **approved**: Reviewed and accepted
- **deprecated**: Replaced or obsolete

## Feature Tags

Common tags for categorization:
- Architecture: `architecture`, `design`, `patterns`
- Domains: `user`, `auth`, `payment`, `analytics`
- Phases: `phase-1`, `phase-2`, `mvp`, `future`
- Types: `workflow`, `spec`, `guide`, `reference`

## Usage Patterns

### Create Feature Document
```typescript
const feature: FeatureDocument = {
  id: 'user-authentication',
  title: 'User Authentication',
  description: 'Handles user login and session management',
  filePath: 'managed/features/user-authentication.md',
  relatedSymbols: ['user-service', 'auth-middleware', 'session-manager'],
  tags: ['auth', 'security', 'phase-1'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: 'draft'
};
```

### Index Features
```typescript
const index: FeatureIndex = {
  features: allFeatures,
  byId: new Map(features.map(f => [f.id, f])),
  byTag: groupByTag(features),
  bySymbol: groupBySymbol(features)
};
```

### Find Features by Symbol
```typescript
const features = index.bySymbol.get('user-service');
// Returns all features that reference user-service
```

### Find Features by Tag
```typescript
const authFeatures = index.byTag.get('auth');
// Returns all auth-related features
```

## Integration

### Feature Index Command
```bash
tsdoc-edge index-features managed/features
# Indexes all feature documents
```

### Find Feature
```bash
tsdoc-edge find-doc user-service
# Finds features referencing user-service
```

## Symbol Count

3 interfaces

## Related

- [[DocumentSymbol]]: Document symbol system
- [[IndexDocsCommand]]: Document indexing
- [[FindDocCommand]]: Feature search
