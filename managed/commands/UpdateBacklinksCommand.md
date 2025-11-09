# [[UpdateBacklinksCommand]]

**Source**: `src/commands/UpdateBacklinksCommand.ts`

## Purpose

문서 심볼의 역방향 링크 자동 업데이트.

## Process

1. Parse all `[[Symbol]]` references
2. Build reverse index
3. Append "Referenced by" sections
4. Update markdown files

## Related

- [[Document Symbol System]]: 문서 심볼
- [[Backlinks]]: 역방향 링크 개념
