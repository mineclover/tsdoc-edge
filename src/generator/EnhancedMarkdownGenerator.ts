/**
 * Enhanced markdown generator for strict mode documentation
 * @packageDocumentation
 * @responsibility Generate comprehensive markdown documentation from enhanced docs
 * @architecture Document Generation Layer
 */

import type { Symbol } from '../types/graph';
import type { EnhancedSymbolDoc } from '../types/tags';

/**
 * Generator for enhanced markdown documentation
 *
 * @id 007
 * @doc [[EnhancedMarkdownGenerator]]
 * @public
 * @responsibility Transform enhanced docs into readable markdown format
 * @contract Generate structured markdown with all 6 categories
 */
export class EnhancedMarkdownGenerator {
  /**
   * Generate complete markdown documentation for a symbol
   * @param symbol - Symbol information
   * @param enhancedDoc - Enhanced documentation
   * @returns Markdown string
   * @contract Include all 6 required sections
   */
  generateDocument(symbol: Symbol, enhancedDoc: EnhancedSymbolDoc): string {
    let md = '';

    // Header
    md += `# ${symbol.name}\n\n`;
    md += `**Type**: \`${symbol.type}\`  \n`;
    md += `**Location**: \`${symbol.filePath}:${symbol.line}\`  \n`;
    md += `**Visibility**: ${symbol.isPublic ? 'Public API' : 'Internal'}  \n`;
    md += `**Exported**: ${symbol.isExported ? 'Yes' : 'No'}  \n\n`;

    if (symbol.summary) {
      md += `> ${symbol.summary}\n\n`;
    }

    md += `---\n\n`;

    // 1. Problem Solving
    if (enhancedDoc.problemSolving) {
      md += this.generateProblemSolving(enhancedDoc);
    }

    // 2. Functionality
    if (enhancedDoc.functionality) {
      md += this.generateFunctionality(enhancedDoc);
    }

    // 3. Error Experiences
    if (enhancedDoc.errorExperiences && enhancedDoc.errorExperiences.length > 0) {
      md += this.generateErrorExperiences(enhancedDoc);
    }

    // 4. Decisions
    if (enhancedDoc.decisions && enhancedDoc.decisions.length > 0) {
      md += this.generateDecisions(enhancedDoc);
    }

    // 5. Dependencies
    if (enhancedDoc.dependencies) {
      md += this.generateDependencies(enhancedDoc);
    }

    // 6. Future Plans
    if (enhancedDoc.futurePlans && enhancedDoc.futurePlans.length > 0) {
      md += this.generateFuturePlans(enhancedDoc);
    }

    // Metadata
    md += `---\n\n`;
    md += `## 📊 Metadata\n\n`;
    md += `- **Created**: ${enhancedDoc.createdAt}\n`;
    md += `- **Updated**: ${enhancedDoc.updatedAt}\n`;
    md += `- **Version**: ${enhancedDoc.version}\n`;

    return md;
  }

  /**
   * Generate Problem Solving section
   * @param doc - Enhanced documentation
   * @returns Markdown string
   */
  private generateProblemSolving(doc: EnhancedSymbolDoc): string {
    // Called only when problemSolving is defined
    const ps = doc.problemSolving!;

    let md = `## 1. 🎯 Problem Solving\n\n`;
    md += `### What Problem Does This Solve?\n\n`;
    md += `${ps.description}\n\n`;

    md += `### Context\n\n`;
    md += `${ps.context}\n\n`;

    if (ps.targetUseCase) {
      md += `### Target Use Case\n\n`;
      md += `${ps.targetUseCase}\n\n`;
    }

    if (ps.relatedProblem) {
      md += `### Related Problem\n\n`;
      md += `${ps.relatedProblem}\n\n`;
    }

    return md;
  }

  /**
   * Generate Functionality section
   * @param doc - Enhanced documentation
   * @returns Markdown string
   */
  private generateFunctionality(doc: EnhancedSymbolDoc): string {
    // Called only when functionality is defined
    const func = doc.functionality!;

    let md = `## 2. ⚙️ Functionality\n\n`;

    md += `### Main Features\n\n`;
    func.mainFeatures.forEach((feature) => {
      md += `- ${feature}\n`;
    });
    md += '\n';

    md += `### Components\n\n`;
    func.components.forEach((comp) => {
      md += `#### \`${comp.name}\`\n\n`;
      md += `${comp.description}\n\n`;
      if (comp.signature) {
        md += `**Signature**: \`${comp.signature}\`\n\n`;
      }
    });

    if (func.io) {
      md += `### Input/Output\n\n`;

      if (func.io.inputs.length > 0) {
        md += `**Inputs**:\n\n`;
        func.io.inputs.forEach((input) => {
          md += `- **${input.name}** (\`${input.type}\`): ${input.description}\n`;
        });
        md += '\n';
      }

      if (func.io.outputs.length > 0) {
        md += `**Outputs**:\n\n`;
        func.io.outputs.forEach((output) => {
          md += `- **${output.name}** (\`${output.type}\`): ${output.description}\n`;
        });
        md += '\n';
      }
    }

    if (func.examples && func.examples.length > 0) {
      md += `### Usage Examples\n\n`;
      func.examples.forEach((example, index) => {
        md += `#### Example ${index + 1}\n\n`;
        md += '```typescript\n';
        md += example;
        md += '\n```\n\n';
      });
    }

    return md;
  }

  /**
   * Generate Error Experiences section
   * @param doc - Enhanced documentation
   * @returns Markdown string
   */
  private generateErrorExperiences(doc: EnhancedSymbolDoc): string {
    // Called only when errorExperiences is defined
    const errors = doc.errorExperiences!;

    let md = `## 3. 🐛 Error Experiences\n\n`;

    errors.forEach((err) => {
      md += `### ${err.errorType}: ${err.message}\n\n`;
      md += `**Context**: ${err.context}\n\n`;
      md += `**Solution**:\n\n`;
      md += `> ${err.solution}\n\n`;

      if (err.prevention) {
        md += `**Prevention**:\n\n`;
        md += `${err.prevention}\n\n`;
      }

      if (err.occurredAt) {
        md += `*Occurred: ${err.occurredAt}*\n\n`;
      }
    });

    return md;
  }

  /**
   * Generate Decisions section
   * @param doc - Enhanced documentation
   * @returns Markdown string
   */
  private generateDecisions(doc: EnhancedSymbolDoc): string {
    // Called only when decisions is defined
    const decisions = doc.decisions!;

    let md = `## 4. 🔍 Design Decisions\n\n`;

    decisions.forEach((decision) => {
      md += `### ${decision.id}: ${decision.title}\n\n`;
      md += `**Status**: ${this.getStatusBadge(decision.status)}\n\n`;
      md += `**Date**: ${decision.date}\n\n`;

      md += `#### Decision\n\n`;
      md += `${decision.decision}\n\n`;

      md += `#### Rationale\n\n`;
      md += `${decision.rationale}\n\n`;

      if (decision.alternatives.length > 0) {
        md += `#### Alternatives Considered\n\n`;
        decision.alternatives.forEach((alt) => {
          md += `- **${alt.option}**: ${alt.reason}\n`;
        });
        md += '\n';
      }

      if (decision.consequences.length > 0) {
        md += `#### Consequences\n\n`;
        decision.consequences.forEach((cons) => {
          md += `- ${cons}\n`;
        });
        md += '\n';
      }

      if (decision.supersededBy) {
        md += `*Superseded by: ${decision.supersededBy}*\n\n`;
      }
    });

    return md;
  }

  /**
   * Generate Dependencies section
   * @param doc - Enhanced documentation
   * @returns Markdown string
   */
  private generateDependencies(doc: EnhancedSymbolDoc): string {
    // Called only when dependencies is defined
    const deps = doc.dependencies!;

    let md = `## 5. 🔗 Dependencies\n\n`;

    if (deps.length === 0) {
      md += `*No dependencies*\n\n`;
      return md;
    }

    // Group by type
    const grouped: Record<string, typeof deps> = {};

    deps.forEach((dep) => {
      if (!grouped[dep.type]) {
        grouped[dep.type] = [];
      }
      grouped[dep.type].push(dep);
    });

    Object.keys(grouped).forEach((type) => {
      md += `### ${this.capitalizeFirst(type)} Dependencies\n\n`;

      grouped[type].forEach((dep) => {
        md += `#### \`${dep.target}\`\n\n`;
        md += `${dep.reason}\n\n`;

        if (dep.version) {
          md += `**Version**: ${dep.version}\n\n`;
        }

        if (dep.importPath) {
          md += `**Import**: \`${dep.importPath}\`\n\n`;
        }

        if (dep.isOptional) {
          md += `*Optional dependency*\n\n`;
        }
      });
    });

    return md;
  }

  /**
   * Generate Future Plans section
   * @param doc - Enhanced documentation
   * @returns Markdown string
   */
  private generateFuturePlans(doc: EnhancedSymbolDoc): string {
    // Called only when futurePlans is defined
    const plans = doc.futurePlans!;

    let md = `## 6. 🚀 Future Plans\n\n`;

    // Group by status
    const grouped: Record<string, typeof plans> = {};

    plans.forEach((plan) => {
      if (!grouped[plan.status]) {
        grouped[plan.status] = [];
      }
      grouped[plan.status].push(plan);
    });

    const statusOrder = ['in-progress', 'planned', 'completed', 'cancelled'] as const;

    statusOrder.forEach((status) => {
      if (grouped[status] && grouped[status].length > 0) {
        md += `### ${this.getStatusEmoji(status)} ${this.capitalizeFirst(status)}\n\n`;

        grouped[status].forEach((plan) => {
          md += `#### ${plan.id}: ${plan.title}\n\n`;
          if (plan.priority) {
            md += `**Priority**: ${this.getPriorityBadge(plan.priority)}\n\n`;
          }
          md += `${plan.description}\n\n`;

          if (plan.targetMilestone) {
            md += `**Target**: ${plan.targetMilestone}\n\n`;
          }

          if (plan.estimatedEffort) {
            md += `**Effort**: ${plan.estimatedEffort}\n\n`;
          }

          if (plan.blockedBy && plan.blockedBy.length > 0) {
            md += `**Blocked by**: ${plan.blockedBy.join(', ')}\n\n`;
          }

          if (plan.relatedIssues && plan.relatedIssues.length > 0) {
            md += `**Related**: ${plan.relatedIssues.join(', ')}\n\n`;
          }

          if (plan.completedAt) {
            md += `*Completed: ${plan.completedAt}*\n\n`;
          }
        });
      }
    });

    return md;
  }

  /**
   * Get status badge
   * @param status - Status value
   * @returns Badge text
   */
  private getStatusBadge(status: string): string {
    const badges: Record<string, string> = {
      proposed: '🟡 Proposed',
      accepted: '🟢 Accepted',
      deprecated: '🟠 Deprecated',
      superseded: '🔴 Superseded',
    };

    return badges[status] || status;
  }

  /**
   * Get priority badge
   * @param priority - Priority value
   * @returns Badge text
   */
  private getPriorityBadge(priority: string): string {
    const badges: Record<string, string> = {
      high: '🔴 High',
      medium: '🟡 Medium',
      low: '🟢 Low',
    };

    return badges[priority] || priority;
  }

  /**
   * Get status emoji
   * @param status - Status value
   * @returns Emoji
   */
  private getStatusEmoji(status: 'planned' | 'in-progress' | 'completed' | 'cancelled'): string {
    const emojis: Record<string, string> = {
      planned: '📋',
      'in-progress': '🏗️',
      completed: '✅',
      cancelled: '❌',
    };

    return emojis[status] || '📝';
  }

  /**
   * Capitalize first letter
   * @param str - Input string
   * @returns Capitalized string
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
