# Output Builder Specification

## Overview

Output Builder는 tsdoc-edge CLI 출력을 위한 스키마 기반 직렬화/역직렬화 시스템입니다.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      OutputSchema                           │
│  (스키마 정의: 필드, 타입, 구조)                              │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
     ┌──────────┐    ┌──────────┐    ┌──────────┐
     │XmlBuilder│    │JsonBuilder│   │XmlParser │
     │ (직렬화) │    │ (직렬화)  │   │(역직렬화) │
     └──────────┘    └──────────┘    └──────────┘
            │               │               │
            ▼               ▼               ▼
        XML String     JSON String    Structured Data
```

## Schema Types

### 1. ObjectSchema
단순 객체 구조 정의

```typescript
const SourceSchema: ObjectSchema = {
  name: 'string',
  type: 'string',
  file: 'string',
  line: 'number',
};
```

### 2. ArraySchema
배열 구조 정의 (자동 count, index 속성 추가)

```typescript
const TargetsSchema = arrayOf('target', {
  name: 'string',
  type: 'string',
  relation: 'string',
});
```

**출력:**
```xml
<targets count="2">
  <target index="1">
    <name>Foo</name>
    <type>class</type>
    <relation>code-dependency</relation>
  </target>
  <target index="2">...</target>
</targets>
```

### 3. GroupedArraySchema
그룹화된 배열 구조 (relation-type별 그룹핑 등)

```typescript
const DependentsSchema = groupedArrayOf(
  'relation-type',  // 그룹 태그
  'name',           // 그룹 키 속성명
  'dependent',      // 아이템 태그
  { name: 'string', type: 'string', file: 'string', line: 'number' }
);
```

**데이터:**
```typescript
{
  'inheritance': [{ name: 'Child', type: 'class', ... }],
  'code-dependency': [{ name: 'User', type: 'interface', ... }],
}
```

**출력:**
```xml
<dependents count="3">
  <relation-type name="inheritance" count="2">
    <dependent index="1">
      <name>Child</name>
      ...
    </dependent>
  </relation-type>
  <relation-type name="code-dependency" count="1">
    ...
  </relation-type>
</dependents>
```

---

## XmlParser Specification (To Be Implemented)

### Purpose
XML 출력을 다시 구조화된 데이터로 파싱하여 JSON 변환, 프로그래밍적 처리 등 지원

### Interface

```typescript
interface ParsedData {
  [sectionName: string]: SectionData | GroupedSectionData;
}

class XmlParser {
  constructor(schema: OutputSchema);

  /**
   * Parse XML string to structured data
   */
  parse(xml: string): ParsedData;

  /**
   * Convert to JSON string
   */
  toJson(xml: string, options?: { pretty?: boolean }): string;

  /**
   * Validate XML against schema
   */
  validate(xml: string): { valid: boolean; errors: string[] };
}
```

### Usage Example

```typescript
import { XmlParser, DepsSchema } from './output';

const xml = `
<dependencies>
  <source>
    <name>Foo</name>
    <type>class</type>
    <file>foo.ts</file>
    <line>10</line>
  </source>
  <targets count="1">
    <target index="1">
      <name>Bar</name>
      <type>interface</type>
      <relation>code-dependency</relation>
      <file>bar.ts</file>
      <line>20</line>
    </target>
  </targets>
</dependencies>
`;

const parser = new XmlParser(DepsSchema);

// Parse to structured data
const data = parser.parse(xml);
// {
//   source: { name: 'Foo', type: 'class', file: 'foo.ts', line: 10 },
//   targets: [{ name: 'Bar', type: 'interface', relation: 'code-dependency', ... }]
// }

// Convert to JSON
const json = parser.toJson(xml, { pretty: true });
// {
//   "source": { "name": "Foo", ... },
//   "targets": [{ "name": "Bar", ... }]
// }
```

### CLI Integration

```bash
# XML 출력 (기본)
tsdoc-edge deps BaseCommand

# JSON 출력
tsdoc-edge deps BaseCommand --json

# 파이프를 통한 변환
tsdoc-edge deps BaseCommand | tsdoc-edge convert --to json
```

---

## Type Coercion Rules

| Schema Type | XML Value | Parsed Value |
|-------------|-----------|--------------|
| `'string'`  | `<name>Foo</name>` | `"Foo"` |
| `'number'`  | `<line>10</line>` | `10` |
| `'boolean'` | `<exported>1</exported>` | `true` |
| `'boolean'` | `<exported>true</exported>` | `true` |
| `'boolean'` | `<exported>0</exported>` | `false` |

---

## XML Escape/Unescape

### Escape (Builder)
| Character | Escaped |
|-----------|---------|
| `&` | `&amp;` |
| `<` | `&lt;` |
| `>` | `&gt;` |
| `"` | `&quot;` |
| `'` | `&apos;` |

### Unescape (Parser)
역변환 적용

---

## Error Handling

```typescript
class XmlParseError extends Error {
  constructor(
    message: string,
    public line?: number,
    public column?: number,
    public context?: string
  ) {
    super(message);
  }
}

class SchemaValidationError extends Error {
  constructor(
    message: string,
    public path: string,      // e.g., "source.name"
    public expected: string,  // e.g., "string"
    public actual: string     // e.g., "undefined"
  ) {
    super(message);
  }
}
```

---

## Implementation Notes

### Parser Strategy Options

1. **DOM-based (simple-xml-to-json 등)**
   - 장점: 간단, 작은 의존성
   - 단점: 대용량 처리 느림

2. **SAX/Streaming (sax-js)**
   - 장점: 메모리 효율적
   - 단점: 구현 복잡

3. **Native (fast-xml-parser)**
   - 장점: 빠름, 타입 지원 양호
   - 단점: 번들 크기

### Recommended: fast-xml-parser
- 타입스크립트 지원
- 속성/요소 구분 처리 용이
- 활발한 유지보수

---

## Future Extensions

1. **YAML 출력**: `YamlBuilder` 추가
2. **CSV 출력**: 평면 배열용 `CsvBuilder`
3. **Streaming Parser**: 대용량 파일 처리
4. **Schema Inference**: XML에서 스키마 자동 생성
5. **GraphQL 통합**: 스키마 기반 쿼리 지원
