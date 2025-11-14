# [[Doc Reference]]

Documentation cross-reference relationship tracking.

**Type**: `doc-reference` | **Category**: Semantic | **Status**: Planned

## Purpose

Track references between documentation files using `[[Symbol]]` notation, enabling documentation graph analysis and validation.

## Examples

```markdown
See [[UserService]] for authentication details.
Related: [[OrderProcessor]], [[PaymentGateway]]
```

## Detection

- Parse markdown files for `[[...]]` patterns
- Extract symbol names
- Validate references exist
- Build documentation dependency graph

## Use Cases

1. **Broken Link Detection**: Find invalid `[[Symbol]]` references
2. **Documentation Coverage**: Ensure all referenced symbols have docs
3. **Impact Analysis**: When updating docs, find all referencing docs
4. **Graph Visualization**: Show documentation relationship network

## Implementation

**Analyzer**: `DocumentSymbolParser`
**Storage**: `unified_relationships` table with `type='doc-reference'`

**Metadata**:
```json
{
  "sourceFile": "managed/concepts/user-management.md",
  "targetSymbol": "UserService",
  "context": "authentication details",
  "lineNumber": 42
}
```

## Related

- [[Document Symbol System]]: Overall documentation symbol tracking
- [[ValidateSymbolRefsCommand]]: Validation of doc references
- [[UpdateBacklinksCommand]]: Backlink generation from references

---

**Status**: Active (already implemented in DocumentSymbolParser)
**Priority**: High (critical for SSOT documentation)

---

## Backlinks

### Referenced By

- [[UpdateBacklinksCommand]] → /home/user/tsdoc-edge/managed/commands/UpdateBacklinksCommand.md:48
- [[UpdateBacklinksCommand]] → /home/user/tsdoc-edge/managed/commands/UpdateBacklinksCommand.md:49
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:98
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:99
- [[Document Symbol System]] → /home/user/tsdoc-edge/managed/concepts/document-symbol-system.md:228
- [[Document Symbol System]] → /home/user/tsdoc-edge/managed/concepts/document-symbol-system.md:229
- [[Conceptual Relation]] → /home/user/tsdoc-edge/managed/relationships/conceptual-relation.md:133
- [[Conceptual Relation]] → /home/user/tsdoc-edge/managed/relationships/conceptual-relation.md:156

