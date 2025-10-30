# TSDoc Edge 통계 명령어 정의

## 명령어
```bash
tsdoc-edge stats
```

## 출력할 통계 (5개 섹션)

### 1. 📊 기본 정보
- 파일 수 (소스/테스트)
- 심볼 수 (전체/공개)
- 타입별 분포 (function, class, interface 등)

### 2. 📝 문서화
- 문서화율 (전체 / Public API)
- 평균 품질 점수
- 완전 문서화 심볼 수
- 커스텀 태그 사용률 (@responsibility, @contract, @testedBy)

### 3. 🔗 관계
- 총 관계 수
- 고립된 심볼 수
- 깨진 링크 수
- 순환 의존성 수

### 4. 🔌 연결성
- 연결성 점수 (0-100)
- Contract 정의율
- Responsibility 정의율
- 테스트 매핑율

### 5. 💚 종합 건강도
- 전체 건강도 점수 (0-100, A-F 등급)
- 이슈 개수 (우선순위별)
- 개선 필요 상위 5개 파일

## 간단한 타입 정의

```typescript
export interface CodebaseStats {
  timestamp: string;

  // 기본
  files: number;
  symbols: number;
  publicSymbols: number;

  // 문서화
  documentationRate: number;
  avgQualityScore: number;
  publicApiDocRate: number;

  // 관계
  totalRelationships: number;
  orphanedSymbols: number;
  brokenLinks: number;

  // 연결성
  connectivityScore: number;
  contractRate: number;
  testMappingRate: number;

  // 건강도
  healthScore: number;
  healthGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  criticalIssues: number;
  highIssues: number;
}
```

## 출력 예시

```
TSDoc Edge - Codebase Statistics
═══════════════════════════════════════════

📊 Overview
   Files: 42 (35 source, 7 test)
   Symbols: 156 (89 public)

📝 Documentation       57.1% ⭐⭐⭐
   Quality Score: 64/100
   Public API: 95.5% ⭐⭐⭐⭐⭐
   Custom Tags: @responsibility 50%, @contract 29%

🔗 Relationships       234 total
   ⚠️  12 orphaned, 5 broken links, 3 circular deps

🔌 Connectivity        72/100 ⭐⭐⭐⭐
   Contracts: 28.8%
   Tests: 35.9%

💚 Health Score        64/100 (C)
   🔴 5 critical  🟡 12 high  🟢 23 medium

Top Issues:
  1. src/parser/TSDocParser.ts (23 issues)
  2. src/graph/SymbolGraphBuilder.ts (18 issues)
```
