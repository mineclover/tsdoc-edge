/**
 * Reliability Checker - work-context 정보 신뢰도 검증
 *
 * @remarks
 * work-context가 제공하는 각 섹션의 정보 신뢰도를 검증 체인을 통해 측정합니다.
 * - 관련 문서: 존재 여부, 완성도, 링크 유효성
 * - 의존 타입: 타입 존재, 순환 참조 감지
 * - 테스트: 테스트 존재, 커버리지
 * - 영향 범위: 빌드 최신성, 파일 존재
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DatabaseManager } from '../storage/DatabaseManager';

/**
 * 신뢰도 점수 (0-100)
 */
export type ReliabilityScore = number;

/**
 * 신뢰도 등급
 */
export type ReliabilityGrade = 'excellent' | 'good' | 'fair' | 'poor';

/**
 * 섹션별 신뢰도 정보
 */
export interface SectionReliability {
  score: ReliabilityScore;
  issues: string[];
  suggestions: string[];
}

/**
 * 전체 신뢰도 리포트
 */
export interface ReliabilityReport {
  overall: {
    score: ReliabilityScore;
    grade: ReliabilityGrade;
  };
  sections: {
    docs: SectionReliability;
    dependencies: SectionReliability;
    tests: SectionReliability;
    impact: SectionReliability;
  };
  timestamp: string;
}

/**
 * Reliability Checker - 신뢰도 검증기
 *
 * @public
 */
export class ReliabilityChecker {
  /**
   * 관련 문서 신뢰도 검증
   *
   * @param relatedDocs - 관련 문서 목록
   * @returns 신뢰도 정보
   * @public
   */
  checkDocsReliability(
    relatedDocs: Array<{ title: string; path: string; symbolRef: string }>
  ): SectionReliability {
    if (relatedDocs.length === 0) {
      return {
        score: 0,
        issues: ['No @doc tags found in file'],
        suggestions: ['Add @doc [[Symbol]] tags to link documentation'],
      };
    }

    let existingDocs = 0;
    const issues: string[] = [];
    const suggestions: string[] = [];

    for (const doc of relatedDocs) {
      if (doc.path === '(not found)') {
        issues.push(`Document not found: [[${doc.symbolRef}]]`);
        suggestions.push(`Create document for [[${doc.symbolRef}]] or remove @doc tag`);
      } else if (fs.existsSync(doc.path)) {
        existingDocs++;
        // TODO: validate-spec로 완성도 확인
        // TODO: check-links로 링크 유효성 확인
      } else {
        issues.push(`Document file missing: ${doc.path}`);
        suggestions.push(`Run 'tsdoc-edge index-docs managed' to rebuild index`);
      }
    }

    const score = (existingDocs / relatedDocs.length) * 100;

    return {
      score,
      issues,
      suggestions,
    };
  }

  /**
   * 의존 타입 신뢰도 검증
   *
   * @param dependencies - 의존 타입 목록
   * @param dbManager - 데이터베이스 매니저
   * @returns 신뢰도 정보
   * @public
   */
  checkDependenciesReliability(
    dependencies: Array<{ name: string; type: string; filePath: string }>,
    dbManager?: DatabaseManager
  ): SectionReliability {
    if (!dbManager) {
      return {
        score: 0,
        issues: ['Database not available'],
        suggestions: ['Run: tsdoc-edge build src'],
      };
    }

    if (dependencies.length === 0) {
      return {
        score: 100,
        issues: [],
        suggestions: [],
      };
    }

    let existingFiles = 0;
    const issues: string[] = [];
    const suggestions: string[] = [];

    for (const dep of dependencies) {
      const absolutePath = path.resolve(process.cwd(), dep.filePath);
      if (fs.existsSync(absolutePath)) {
        existingFiles++;
      } else {
        issues.push(`Dependency file missing: ${dep.filePath}`);
        suggestions.push(`Check if ${dep.name} has been moved or deleted`);
      }
    }

    const score = (existingFiles / dependencies.length) * 100;

    // TODO: detect-cycles로 순환 참조 확인
    // TODO: type-chain으로 타입 체인 검증

    return {
      score,
      issues,
      suggestions,
    };
  }

  /**
   * 테스트 신뢰도 검증
   *
   * @param tests - 테스트 파일 목록
   * @returns 신뢰도 정보
   * @public
   */
  checkTestsReliability(
    tests: Array<{ path: string; coverage?: number; type: 'unit' | 'integration' }>
  ): SectionReliability {
    if (tests.length === 0) {
      return {
        score: 0,
        issues: ['No tests found for this file'],
        suggestions: [
          'Create test file in src/__tests__/',
          'Run: tsdoc-edge untested to see all untested symbols',
        ],
      };
    }

    let existingTests = 0;
    let totalCoverage = 0;
    let testsWithCoverage = 0;
    const issues: string[] = [];
    const suggestions: string[] = [];

    for (const test of tests) {
      const absolutePath = path.resolve(process.cwd(), test.path);
      if (fs.existsSync(absolutePath)) {
        existingTests++;
        if (test.coverage !== undefined) {
          totalCoverage += test.coverage;
          testsWithCoverage++;
        }
      } else {
        issues.push(`Test file missing: ${test.path}`);
        suggestions.push('Run: tsdoc-edge build src to rebuild test mappings');
      }
    }

    // 점수 계산: 테스트 존재 (50%) + 커버리지 (50%)
    const existenceScore = (existingTests / tests.length) * 50;
    let coverageScore = 50; // 기본값 (커버리지 정보 없을 때)

    if (testsWithCoverage > 0) {
      const avgCoverage = totalCoverage / testsWithCoverage;
      coverageScore = (avgCoverage / 100) * 50;

      if (avgCoverage < 50) {
        issues.push(`Low test coverage: ${avgCoverage.toFixed(1)}%`);
        suggestions.push('Increase test coverage to at least 50%');
      } else if (avgCoverage < 80) {
        suggestions.push(`Consider increasing coverage from ${avgCoverage.toFixed(1)}% to 80%+`);
      }
    } else {
      suggestions.push('Run: tsdoc-edge sync-coverage to sync test coverage data');
    }

    const score = existenceScore + coverageScore;

    return {
      score,
      issues,
      suggestions,
    };
  }

  /**
   * 영향 범위 신뢰도 검증
   *
   * @param usedBy - 사용처 목록
   * @param dbManager - 데이터베이스 매니저
   * @returns 신뢰도 정보
   * @public
   */
  checkImpactReliability(
    usedBy: Array<{ name: string; filePath: string; type: string }>,
    dbManager?: DatabaseManager
  ): SectionReliability {
    if (!dbManager) {
      return {
        score: 0,
        issues: ['Database not available'],
        suggestions: ['Run: tsdoc-edge build src'],
      };
    }

    if (usedBy.length === 0) {
      return {
        score: 100,
        issues: [],
        suggestions: [],
      };
    }

    let existingFiles = 0;
    const issues: string[] = [];
    const suggestions: string[] = [];

    for (const usage of usedBy) {
      const absolutePath = path.resolve(process.cwd(), usage.filePath);
      if (fs.existsSync(absolutePath)) {
        existingFiles++;
      } else {
        issues.push(`Impact file missing: ${usage.filePath}`);
        suggestions.push('Run: tsdoc-edge build src to update dependency graph');
      }
    }

    const score = (existingFiles / usedBy.length) * 100;

    if (score < 100) {
      issues.push('Some dependent files are missing (stale build)');
      suggestions.push('Database may be outdated, consider rebuilding');
    }

    return {
      score,
      issues,
      suggestions,
    };
  }

  /**
   * 전체 신뢰도 리포트 생성
   *
   * @param sections - 섹션별 신뢰도 정보
   * @returns 전체 리포트
   * @public
   */
  generateReport(sections: {
    docs: SectionReliability;
    dependencies: SectionReliability;
    tests: SectionReliability;
    impact: SectionReliability;
  }): ReliabilityReport {
    // 가중 평균 계산
    const overallScore =
      sections.docs.score * 0.3 +
      sections.dependencies.score * 0.3 +
      sections.tests.score * 0.2 +
      sections.impact.score * 0.2;

    const grade = this.scoreToGrade(overallScore);

    return {
      overall: {
        score: Math.round(overallScore),
        grade,
      },
      sections,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 점수를 등급으로 변환
   *
   * @param score - 신뢰도 점수
   * @returns 등급
   * @private
   */
  private scoreToGrade(score: number): ReliabilityGrade {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  /**
   * 등급을 이모지로 변환
   *
   * @param grade - 신뢰도 등급
   * @returns 이모지
   * @public
   */
  gradeToEmoji(grade: ReliabilityGrade): string {
    switch (grade) {
      case 'excellent':
        return '✅';
      case 'good':
        return '🟢';
      case 'fair':
        return '🟡';
      case 'poor':
        return '🔴';
    }
  }

  /**
   * 점수를 이모지로 변환
   *
   * @param score - 신뢰도 점수
   * @returns 이모지
   * @public
   */
  scoreToEmoji(score: number): string {
    if (score >= 90) return '✅';
    if (score >= 70) return '🟢';
    if (score >= 50) return '🟡';
    if (score === 0) return '❌';
    return '⚠️';
  }
}
