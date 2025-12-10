/**
 * Module Specification Markdown Formatter
 *
 * @packageDocumentation
 * @responsibility Format ModuleSpecTemplate into markdown documents
 */

import type {
  ModuleSpecTemplate,
  ParamSpec,
  FailureCase,
  DependencySpec,
  ImportSpec,
  SideEffectSpec,
} from '../types/spec/module-spec';

/**
 * Formatter options
 */
export interface FormatterOptions {
  /** Include metadata header */
  includeMetadata?: boolean;
  /** Include confidence scores */
  includeConfidence?: boolean;
  /** Include TODO markers */
  includeTodos?: boolean;
  /** Include table of contents */
  includeToc?: boolean;
}

/**
 * Module specification markdown formatter
 *
 * @public
 * @responsibility Convert ModuleSpecTemplate to formatted markdown
 */
export class ModuleSpecMarkdownFormatter {
  private options: Required<FormatterOptions>;

  constructor(options: FormatterOptions = {}) {
    this.options = {
      includeMetadata: options.includeMetadata ?? true,
      includeConfidence: options.includeConfidence ?? true,
      includeTodos: options.includeTodos ?? true,
      includeToc: options.includeToc ?? true,
    };
  }

  /**
   * Format specification as markdown
   *
   * @param spec - Module specification
   * @returns Formatted markdown
   * @public
   */
  format(spec: ModuleSpecTemplate): string {
    const sections: string[] = [];

    // Header
    sections.push(this.formatHeader(spec));

    // Metadata
    if (this.options.includeMetadata) {
      sections.push(this.formatMetadata(spec));
    }

    // Table of Contents
    if (this.options.includeToc) {
      sections.push(this.formatTableOfContents());
    }

    // 7-Part Framework
    sections.push(this.formatPurpose(spec));
    sections.push(this.formatInput(spec));
    sections.push(this.formatOutput(spec));
    sections.push(this.formatContext(spec));
    sections.push(this.formatLogic(spec));
    sections.push(this.formatEffect(spec));
    sections.push(this.formatScope(spec));

    // Footer
    if (this.options.includeConfidence) {
      sections.push(this.formatFooter(spec));
    }

    return sections.join('\n\n');
  }

  /**
   * Format header
   */
  private formatHeader(spec: ModuleSpecTemplate): string {
    return `# Module Specification: ${spec.symbolName}

**Kind:** ${spec.symbolKind}
**File:** \`${spec.filePath}\`
**Symbol ID:** \`${spec.symbolId}\``;
  }

  /**
   * Format metadata section
   */
  private formatMetadata(spec: ModuleSpecTemplate): string {
    const lines: string[] = ['---'];

    lines.push(`**Generated:** ${new Date(spec.generatedAt).toLocaleString()}`);

    if (this.options.includeConfidence) {
      lines.push(`**Completion Confidence:** ${spec.completionConfidence}%`);

      if (spec.manualReviewNeeded.length > 0) {
        lines.push(`**Manual Review Needed:** ${spec.manualReviewNeeded.join(', ')}`);
      }
    }

    lines.push('---');
    return lines.join('  \n');
  }

  /**
   * Format table of contents
   */
  private formatTableOfContents(): string {
    return `## Table of Contents

1. [Purpose](#1-purpose)
2. [Input](#2-input)
3. [Output](#3-output)
4. [Context](#4-context)
5. [Logic](#5-logic)
6. [Effect](#6-effect)
7. [Scope](#7-scope)`;
  }

  /**
   * Format Purpose section (1/7)
   */
  private formatPurpose(spec: ModuleSpecTemplate): string {
    const { purpose } = spec;
    const lines: string[] = ['## 1. Purpose'];

    lines.push('*이 모듈이 해결하는 문제와 존재 이유*');
    lines.push('');

    if (purpose.problem) {
      lines.push(`**Problem:**  \n${purpose.problem}`);
      lines.push('');
    } else if (this.options.includeTodos) {
      lines.push('**Problem:**  \n> Add @problem tag to describe the problem this module solves');
      lines.push('');
    }

    if (purpose.responsibility) {
      lines.push(`**Responsibility:**  \n${purpose.responsibility}`);
      lines.push('');
    } else if (this.options.includeTodos) {
      lines.push('**Responsibility:**  \n> Add @responsibility tag to describe the main responsibility');
      lines.push('');
    }

    if (purpose.solution) {
      lines.push(`**Solution:**  \n${purpose.solution}`);
      lines.push('');
    }

    if (purpose.context) {
      lines.push(`**Context:**  \n${purpose.context}`);
    }

    return lines.join('\n');
  }

  /**
   * Format Input section (2/7)
   */
  private formatInput(spec: ModuleSpecTemplate): string {
    const { input } = spec;
    const lines: string[] = ['## 2. Input'];

    lines.push('*모듈 실행을 위한 매개변수*');
    lines.push('');

    // Parameters
    if (input.parameters.length > 0) {
      lines.push('### Parameters');
      lines.push('');
      lines.push('| Name | Type | Optional | Default | Description |');
      lines.push('|------|------|----------|---------|-------------|');

      for (const param of input.parameters) {
        const optional = param.optional ? 'Yes' : 'No';
        const defaultVal = param.defaultValue || '-';
        const desc = param.description || '-';
        lines.push(`| \`${param.name}\` | \`${param.type}\` | ${optional} | \`${defaultVal}\` | ${desc} |`);
      }
      lines.push('');
    } else {
      lines.push('### Parameters');
      lines.push('');
      lines.push('*No parameters*');
      lines.push('');
    }

    // Type Signature
    if (input.typeSignature) {
      lines.push('### Type Signature');
      lines.push('');
      lines.push('```typescript');
      lines.push(input.typeSignature);
      lines.push('```');
      lines.push('');
    }

    // Preconditions
    if (input.preconditions.length > 0) {
      lines.push('### Preconditions');
      lines.push('');
      for (const pre of input.preconditions) {
        lines.push(`- ${pre}`);
      }
      lines.push('');
    }

    // Constraints
    if (input.constraints.length > 0) {
      lines.push('### Constraints');
      lines.push('');
      for (const constraint of input.constraints) {
        lines.push(`- ${constraint}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Format Output section (3/7)
   */
  private formatOutput(spec: ModuleSpecTemplate): string {
    const { output } = spec;
    const lines: string[] = ['## 3. Output'];

    lines.push('*모듈 실행의 결과*');
    lines.push('');

    // Return Value
    lines.push('### Return Value');
    lines.push('');
    lines.push(`**Type:** \`${output.returnType.type}\``);
    if (output.returnType.description) {
      lines.push('');
      lines.push(`**Description:** ${output.returnType.description}`);
    }
    lines.push('');

    // Success Cases
    if (output.successCases.length > 0) {
      lines.push('### Success Cases');
      lines.push('');
      for (const success of output.successCases) {
        lines.push(`- ${success}`);
      }
      lines.push('');
    }

    // Failure Cases
    if (output.failureCases.length > 0) {
      lines.push('### Failure Cases');
      lines.push('');
      lines.push('| Condition | Error Type | Description |');
      lines.push('|-----------|------------|-------------|');

      for (const failure of output.failureCases) {
        const errorType = failure.errorType || '-';
        lines.push(`| ${failure.condition} | \`${errorType}\` | ${failure.description} |`);
      }
      lines.push('');
    }

    // Postconditions
    if (output.postconditions.length > 0) {
      lines.push('### Postconditions');
      lines.push('');
      for (const post of output.postconditions) {
        lines.push(`- ${post}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Format Context section (4/7)
   */
  private formatContext(spec: ModuleSpecTemplate): string {
    const { context } = spec;
    const lines: string[] = ['## 4. Context'];

    lines.push('*모듈이 참조하는 외부 환경*');
    lines.push('');

    // Dependencies
    if (context.dependencies.length > 0) {
      lines.push('### Dependencies');
      lines.push('');
      lines.push('| Name | Type | Purpose | Critical |');
      lines.push('|------|------|---------|----------|');

      for (const dep of context.dependencies) {
        const critical = dep.critical ? 'Yes' : 'No';
        lines.push(`| \`${dep.name}\` | ${dep.type} | ${dep.purpose} | ${critical} |`);
      }
      lines.push('');
    }

    // Imports
    if (context.imports.length > 0) {
      lines.push('### Imports');
      lines.push('');
      for (const imp of context.imports) {
        const external = imp.isExternal ? ' (external)' : '';
        lines.push(`- **From** \`${imp.source}\`${external}`);
        lines.push(`  - ${imp.symbols.join(', ')}`);
      }
      lines.push('');
    }

    // Environment
    if (context.environment.length > 0) {
      lines.push('### Environment Requirements');
      lines.push('');
      for (const env of context.environment) {
        lines.push(`- ${env}`);
      }
      lines.push('');
    }

    // Requirements
    if (context.requirements.length > 0) {
      lines.push('### Additional Requirements');
      lines.push('');
      for (const req of context.requirements) {
        lines.push(`- ${req}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Format Logic section (5/7)
   */
  private formatLogic(spec: ModuleSpecTemplate): string {
    const { logic } = spec;
    const lines: string[] = ['## 5. Logic'];

    lines.push('*모듈의 핵심 처리 과정*');
    lines.push('');

    // Features
    if (logic.features.length > 0) {
      lines.push('### Main Features');
      lines.push('');
      for (const feature of logic.features) {
        lines.push(`- ${feature}`);
      }
      lines.push('');
    }

    // Algorithm
    if (logic.algorithm) {
      lines.push('### Algorithm');
      lines.push('');
      if (logic.algorithm.startsWith('TODO:')) {
        lines.push(`> ${logic.algorithm}`);
      } else {
        lines.push(logic.algorithm);
      }
      lines.push('');
    } else if (this.options.includeTodos) {
      lines.push('### Algorithm');
      lines.push('');
      lines.push('> Add @algorithm tag to describe the processing steps');
      lines.push('');
    }

    // Complexity
    if (logic.complexity) {
      lines.push(`**Complexity:** ${logic.complexity}`);
      lines.push('');
    }

    // Operations
    if (logic.operations && logic.operations.length > 0) {
      lines.push('### Internal Operations');
      lines.push('');
      for (const op of logic.operations) {
        lines.push(`- ${op}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Format Effect section (6/7)
   */
  private formatEffect(spec: ModuleSpecTemplate): string {
    const { effect } = spec;
    const lines: string[] = ['## 6. Effect'];

    lines.push('*Logic이 Context에 미치는 영향*');
    lines.push('');

    // Side Effects
    if (effect.sideEffects.length > 0) {
      lines.push('### Side Effects');
      lines.push('');
      lines.push('| Type | Description | Operation |');
      lines.push('|------|-------------|-----------|');

      for (const eff of effect.sideEffects) {
        const op = eff.operation || '-';
        lines.push(`| ${eff.type} | ${eff.description} | ${op} |`);
      }
      lines.push('');
    } else {
      lines.push('### Side Effects');
      lines.push('');
      lines.push('*No side effects detected*');
      lines.push('');
    }

    // Mutations
    if (effect.mutations.length > 0) {
      lines.push('### Context Mutations');
      lines.push('');
      for (const mut of effect.mutations) {
        lines.push(`- ${mut}`);
      }
      lines.push('');
    }

    // I/O
    if (effect.io.length > 0) {
      lines.push('### External I/O');
      lines.push('');
      for (const io of effect.io) {
        lines.push(`- ${io}`);
      }
      lines.push('');
    }

    // Observable Effects
    if (effect.observable && effect.observable.length > 0) {
      lines.push('### Observable Effects');
      lines.push('');
      for (const obs of effect.observable) {
        lines.push(`- ${obs}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Format Scope section (7/7)
   */
  private formatScope(spec: ModuleSpecTemplate): string {
    const { scope } = spec;
    const lines: string[] = ['## 7. Scope'];

    lines.push('*모듈이 외부에 노출하는 인터페이스*');
    lines.push('');

    // Visibility
    lines.push(`**Visibility:** ${scope.visibility}`);
    lines.push(`**Access Level:** ${scope.accessLevel}`);
    lines.push(`**Public API:** ${scope.isPublicAPI ? 'Yes' : 'No'}`);
    lines.push('');

    // Exposed API
    if (scope.exposedAPI.length > 0) {
      lines.push('### Public Interface');
      lines.push('');
      for (const api of scope.exposedAPI) {
        lines.push(`- \`${api}\``);
      }
      lines.push('');
    }

    // Exposed State
    if (scope.exposedState && scope.exposedState.length > 0) {
      lines.push('### Exposed State');
      lines.push('');
      for (const state of scope.exposedState) {
        lines.push(`- \`${state}\``);
      }
    }

    return lines.join('\n');
  }

  /**
   * Format footer with metadata
   */
  private formatFooter(spec: ModuleSpecTemplate): string {
    const lines: string[] = ['---'];

    lines.push('## Metadata');
    lines.push('');
    lines.push(`**Completion Confidence:** ${spec.completionConfidence}%`);

    if (spec.manualReviewNeeded.length > 0) {
      lines.push('');
      lines.push('**Manual Review Needed:**');
      for (const section of spec.manualReviewNeeded) {
        lines.push(`- ${section}`);
      }
    }

    lines.push('');
    lines.push(`**Generated:** ${new Date(spec.generatedAt).toLocaleString()}`);
    lines.push('');
    lines.push('*Auto-generated by TSDoc Edge Module Specification Generator*');

    return lines.join('\n');
  }
}
