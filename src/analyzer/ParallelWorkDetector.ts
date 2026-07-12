/**
 * Parallel Work Detector - 의존성 기반 병렬 개발 가능 영역 탐지
 * @packageDocumentation
 */

import type { SymbolGraph } from '../types/graph/graph';

/**
 * 충돌 유형
 * @doc [[ParallelWorkDetector]]
 * @public
 */
export type ConflictType = 'direct' | 'transitive' | 'shared-mutable';

/**
 * 충돌 리포트
 * @public
 */
export interface ConflictReport {
  module1: string;
  module2: string;
  conflictType: ConflictType;
  path: string[];
  reason: string;
}

/**
 * 병렬 작업 영역
 * @public
 */
export interface ParallelZone {
  id: string;
  modules: string[];
  isolationBarrier: string[];
  canWorkInParallel: boolean;
}

/**
 * 병렬 작업 탐지 결과
 * @public
 */
export interface ParallelWorkResult {
  availableModules: string[];
  conflicts: ConflictReport[];
  parallelZones: ParallelZone[];
  isolationBarriers: string[];
}

/**
 * Parallel Work Detector
 *
 * @public
 * @responsibility 의존성 그래프 기반 병렬 개발 가능 영역 탐지
 * @contract 작업 중인 모듈과 frozen 모듈을 입력받아 충돌 없이 작업 가능한 모듈 반환
 *
 * @problem 여러 개발자가 동시 작업 시 의존성 충돌로 인한 merge conflict
 * @solves 의존성 그래프 분석으로 병렬 작업 가능 영역 자동 탐지
 * @context Multi-developer workflow, feature branch strategy
 *
 * @functionality
 * - Conflict detection: Direct, transitive, shared-mutable dependency 충돌 감지
 * - Parallel zone detection: Isolation barrier 기반 병렬 작업 영역 클러스터링
 * - Barrier suggestion: 모듈 격리를 위한 최적 barrier 제안
 *
 * @decision Use graph traversal (BFS) for path detection
 * @rationale BFS는 최단 경로 보장, 충돌 원인 명확히 제시 가능
 * @consequences O(V+E) 복잡도, 대규모 그래프에서도 효율적
 *
 * @depends SymbolGraph, SymbolGraphBuilder
 * @depType internal
 * @depReason 의존성 그래프 데이터 필요
 */
export class ParallelWorkDetector {
  private graph: SymbolGraph;

  constructor(graph: SymbolGraph) {
    this.graph = graph;
  }

  /**
   * 병렬 작업 가능 영역 탐지
   *
   * @param workingModules - 현재 작업 중인 모듈들
   * @param frozenModules - 변경하지 않을 모듈들 (stable interface)
   * @returns 병렬 작업 탐지 결과
   *
   * @public
   */
  detectParallelWork(workingModules: string[], frozenModules: string[]): ParallelWorkResult {
    const workingSet = new Set(workingModules);
    const frozenSet = new Set(frozenModules);

    // Step 1: 작업 가능한 모듈 찾기
    const availableModules = this.findAvailableModules(workingSet, frozenSet);

    // Step 2: 충돌 감지
    const conflicts = this.detectConflicts(workingSet, frozenSet);

    // Step 3: 병렬 영역 탐지
    const parallelZones = this.findParallelZones(availableModules, frozenSet);

    // Step 4: Isolation barrier 식별
    const isolationBarriers = this.findIsolationBarriers(workingSet, frozenSet);

    return {
      availableModules,
      conflicts,
      parallelZones,
      isolationBarriers,
    };
  }

  /**
   * 작업 가능한 모듈 찾기
   *
   * @param workingSet - 작업 중인 모듈들
   * @param frozenSet - Frozen 모듈들
   * @returns 작업 가능한 모듈 목록
   *
   * @private
   */
  private findAvailableModules(workingSet: Set<string>, frozenSet: Set<string>): string[] {
    const available: string[] = [];

    for (const [symbolId] of this.graph.symbols) {
      // 이미 작업 중이거나 frozen이면 제외
      if (workingSet.has(symbolId) || frozenSet.has(symbolId)) {
        continue;
      }

      // 작업 중인 모듈과 충돌 체크
      let hasConflict = false;
      for (const working of workingSet) {
        if (this.checkConflict(symbolId, working, frozenSet)) {
          hasConflict = true;
          break;
        }
      }

      if (!hasConflict) {
        available.push(symbolId);
      }
    }

    return available;
  }

  /**
   * 두 모듈 간 충돌 여부 확인
   *
   * @param module1 - 첫 번째 모듈
   * @param module2 - 두 번째 모듈
   * @param frozenSet - Frozen 모듈들
   * @returns 충돌 여부
   *
   * @private
   */
  private checkConflict(module1: string, module2: string, frozenSet: Set<string>): boolean {
    // Rule 1: Direct dependency
    if (this.hasDirectDependency(module1, module2)) {
      return true;
    }

    // Rule 2: Transitive dependency
    if (this.hasTransitiveDependency(module1, module2)) {
      return true;
    }

    // Rule 3: Shared mutable dependency
    if (this.hasSharedMutableDependency(module1, module2, frozenSet)) {
      return true;
    }

    return false;
  }

  /**
   * 직접 의존성 체크
   *
   * @param m1 - 모듈 1
   * @param m2 - 모듈 2
   * @returns 직접 의존 여부
   *
   * @private
   */
  private hasDirectDependency(m1: string, m2: string): boolean {
    const deps1 = this.graph.adjacencyList.get(m1) || [];
    const deps2 = this.graph.adjacencyList.get(m2) || [];

    return deps1.includes(m2) || deps2.includes(m1);
  }

  /**
   * 전이적 의존성 체크 (BFS)
   *
   * @param start - 시작 모듈
   * @param target - 목표 모듈
   * @returns 경로 존재 여부
   *
   * @private
   */
  private hasTransitiveDependency(start: string, target: string): boolean {
    return this.hasPath(start, target) || this.hasPath(target, start);
  }

  /**
   * BFS로 경로 탐지
   *
   * @param start - 시작 노드
   * @param target - 목표 노드
   * @returns 경로 존재 여부
   *
   * @private
   */
  private hasPath(start: string, target: string): boolean {
    if (start === target) return true;

    const visited = new Set<string>();
    const queue: string[] = [start];
    visited.add(start);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const deps = this.graph.adjacencyList.get(current) || [];

      for (const depId of deps) {
        if (depId === target) {
          return true;
        }

        if (!visited.has(depId)) {
          visited.add(depId);
          queue.push(depId);
        }
      }
    }

    return false;
  }

  /**
   * 공유 가변 의존성 체크
   *
   * @param m1 - 모듈 1
   * @param m2 - 모듈 2
   * @param frozenSet - Frozen 모듈들
   * @returns 공유 가변 의존성 존재 여부
   *
   * @private
   */
  private hasSharedMutableDependency(m1: string, m2: string, frozenSet: Set<string>): boolean {
    const deps1 = this.getDependencies(m1);
    const deps2 = this.getDependencies(m2);

    const sharedDeps = deps1.filter((dep) => deps2.includes(dep));

    // 공유 의존성 중 frozen이 아닌 것이 있으면 충돌
    return sharedDeps.some((dep) => !frozenSet.has(dep));
  }

  /**
   * 모듈의 모든 의존성 가져오기
   *
   * @param moduleId - 모듈 ID
   * @returns 의존성 목록
   *
   * @private
   */
  private getDependencies(moduleId: string): string[] {
    return this.graph.adjacencyList.get(moduleId) || [];
  }

  /**
   * 충돌 감지
   *
   * @param workingSet - 작업 중인 모듈들
   * @param frozenSet - Frozen 모듈들
   * @returns 충돌 리포트 목록
   *
   * @private
   */
  private detectConflicts(workingSet: Set<string>, frozenSet: Set<string>): ConflictReport[] {
    const conflicts: ConflictReport[] = [];
    const workingArray = Array.from(workingSet);

    // 작업 중인 모듈들 간 충돌 체크
    for (let i = 0; i < workingArray.length; i++) {
      for (let j = i + 1; j < workingArray.length; j++) {
        const conflict = this.analyzeConflict(workingArray[i], workingArray[j], frozenSet);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }

    return conflicts;
  }

  /**
   * 두 모듈 간 충돌 분석
   *
   * @param m1 - 모듈 1
   * @param m2 - 모듈 2
   * @param frozenSet - Frozen 모듈들
   * @returns 충돌 리포트 또는 null
   *
   * @private
   */
  private analyzeConflict(m1: string, m2: string, frozenSet: Set<string>): ConflictReport | null {
    // Direct dependency
    if (this.hasDirectDependency(m1, m2)) {
      return {
        module1: m1,
        module2: m2,
        conflictType: 'direct',
        path: [m1, m2],
        reason: `${m1} directly depends on ${m2}`,
      };
    }

    // Transitive dependency
    const path = this.findPath(m1, m2);
    if (path.length > 0) {
      return {
        module1: m1,
        module2: m2,
        conflictType: 'transitive',
        path,
        reason: `${m1} transitively depends on ${m2} via path: ${path.join(' → ')}`,
      };
    }

    // Reverse transitive
    const reversePath = this.findPath(m2, m1);
    if (reversePath.length > 0) {
      return {
        module1: m1,
        module2: m2,
        conflictType: 'transitive',
        path: reversePath,
        reason: `${m2} transitively depends on ${m1} via path: ${reversePath.join(' → ')}`,
      };
    }

    // Shared mutable dependency
    const deps1 = this.getDependencies(m1);
    const deps2 = this.getDependencies(m2);
    const sharedMutable = deps1.filter((dep) => deps2.includes(dep) && !frozenSet.has(dep));

    if (sharedMutable.length > 0) {
      return {
        module1: m1,
        module2: m2,
        conflictType: 'shared-mutable',
        path: [m1, sharedMutable[0], m2],
        reason: `Both depend on mutable module: ${sharedMutable.join(', ')}`,
      };
    }

    return null;
  }

  /**
   * BFS로 최단 경로 찾기
   *
   * @param start - 시작 노드
   * @param target - 목표 노드
   * @returns 경로 배열
   *
   * @private
   */
  private findPath(start: string, target: string): string[] {
    if (start === target) return [start];

    const visited = new Set<string>();
    const queue: Array<{ node: string; path: string[] }> = [{ node: start, path: [start] }];
    visited.add(start);

    while (queue.length > 0) {
      const { node: current, path } = queue.shift()!;
      const deps = this.graph.adjacencyList.get(current) || [];

      for (const depId of deps) {
        if (depId === target) {
          return [...path, target];
        }

        if (!visited.has(depId)) {
          visited.add(depId);
          queue.push({
            node: depId,
            path: [...path, depId],
          });
        }
      }
    }

    return [];
  }

  /**
   * 병렬 작업 영역 찾기
   *
   * @param availableModules - 작업 가능한 모듈들
   * @param frozenSet - Frozen 모듈들
   * @returns 병렬 영역 목록
   *
   * @private
   */
  private findParallelZones(availableModules: string[], frozenSet: Set<string>): ParallelZone[] {
    const zones: ParallelZone[] = [];
    const processed = new Set<string>();

    for (const module of availableModules) {
      if (processed.has(module)) continue;

      // 이 모듈과 병렬 가능한 모듈들 찾기
      const parallelGroup = [module];
      processed.add(module);

      for (const other of availableModules) {
        if (
          other !== module &&
          !processed.has(other) &&
          !this.checkConflict(module, other, frozenSet)
        ) {
          parallelGroup.push(other);
          processed.add(other);
        }
      }

      // Isolation barrier 찾기
      const barriers = this.findBarriersForGroup(parallelGroup);

      zones.push({
        id: `zone-${zones.length + 1}`,
        modules: parallelGroup,
        isolationBarrier: barriers,
        canWorkInParallel: parallelGroup.length > 1,
      });
    }

    return zones;
  }

  /**
   * 그룹의 isolation barrier 찾기
   *
   * @param modules - 모듈 그룹
   * @returns Barrier 목록
   *
   * @private
   */
  private findBarriersForGroup(modules: string[]): string[] {
    if (modules.length === 0) return [];

    // 모든 모듈이 공통으로 의존하는 모듈 찾기
    const allDeps = modules.map((m) => new Set(this.getDependencies(m)));
    const commonDeps = Array.from(allDeps[0]).filter((dep) =>
      allDeps.every((depSet) => depSet.has(dep))
    );

    return commonDeps;
  }

  /**
   * Isolation barrier 식별
   *
   * @param workingSet - 작업 중인 모듈들
   * @param frozenSet - Frozen 모듈들
   * @returns Barrier 목록
   *
   * @private
   */
  private findIsolationBarriers(workingSet: Set<string>, frozenSet: Set<string>): string[] {
    const barriers: string[] = [];

    for (const frozen of frozenSet) {
      // 이 frozen 모듈이 여러 작업 중인 모듈의 공통 의존성인지 확인
      let dependentCount = 0;
      for (const working of workingSet) {
        if (this.hasPath(working, frozen)) {
          dependentCount++;
        }
      }

      // 2개 이상의 작업 중인 모듈이 의존하면 barrier
      if (dependentCount >= 2) {
        barriers.push(frozen);
      }
    }

    return barriers;
  }

  /**
   * Barrier 후보 제안
   *
   * @param modules - 격리하고 싶은 모듈들
   * @returns Barrier 후보 목록 (dependency count 내림차순)
   *
   * @public
   */
  suggestIsolationBarriers(modules: string[]): Array<{
    barrier: string;
    isolatedModules: string[];
    score: number;
  }> {
    const candidates = new Map<string, Set<string>>();

    // 모든 모듈의 의존성 수집
    for (const module of modules) {
      const deps = this.getDependencies(module);
      for (const dep of deps) {
        if (!candidates.has(dep)) {
          candidates.set(dep, new Set());
        }
        candidates.get(dep)?.add(module);
      }
    }

    // 2개 이상 모듈이 의존하는 것만 barrier 후보
    const barriers = Array.from(candidates.entries())
      .filter(([_, dependents]) => dependents.size >= 2)
      .map(([barrier, dependents]) => ({
        barrier,
        isolatedModules: Array.from(dependents),
        score: dependents.size,
      }))
      .sort((a, b) => b.score - a.score);

    return barriers;
  }
}
