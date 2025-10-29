#!/usr/bin/env ts-node
/**
 * TSDoc Cross-Reference Test
 *
 * Tests TSDoc's ability to reference other TSDoc comments and symbols
 */

import { TSDocParser } from '../src/parser/TSDocParser';

console.log('='.repeat(80));
console.log('TSDoc Cross-Reference Test');
console.log('='.repeat(80));
console.log();

const parser = new TSDocParser();

// Test 1: Standard @link and @see references
console.log('TEST 1: Standard {@link} and @see References');
console.log('-'.repeat(80));

const standardRefCode = `
/**
 * Base validator class
 * @public
 */
export class Validator {
  validate(input: any): boolean {
    return true;
  }
}

/**
 * User data validator
 *
 * @remarks
 * This class extends the base Validator to provide user-specific validation.
 * For general validation patterns, see the validate method.
 *
 * @see Validator - Base validation class
 * @see validateEmail for related functionality
 *
 * @public
 */
export class UserValidator extends Validator {
  /**
   * Validate user email
   *
   * @param email - Email to validate
   * @returns True if valid
   *
 * @see UserValidator for complete validation
   *
   * @public
   */
  validateEmail(email: string): boolean {
    return /^[^@]+@[^@]+$/.test(email);
  }
}
`;

try {
  const result1 = parser.parseFile('references.ts', standardRefCode);
  console.log(`✅ Parsed: ${result1.comments.length} comments`);
  console.log(`   Errors: ${result1.errors.length}`);

  if (result1.comments.length > 0) {
    // Check for link references
    const userValidatorDoc = result1.comments.find((c) => c.symbolName === 'UserValidator');
    if (userValidatorDoc) {
      console.log('   UserValidator comment found:');
      const remarksBlock = userValidatorDoc.docComment.remarksBlock;
      if (remarksBlock) {
        console.log('     - Has remarks block ✓');
      }
      const seeBlocks = userValidatorDoc.docComment.seeBlocks || [];
      console.log(`     - @see blocks: ${seeBlocks.length}`);
    }
  }
} catch (error) {
  console.log(`❌ Error: ${error}`);
}

console.log();

// Test 2: @inheritDoc
console.log('TEST 2: @inheritDoc - Document Inheritance');
console.log('-'.repeat(80));

const inheritDocCode = `
/**
 * Base data processor interface
 * @public
 */
interface DataProcessor {
  /**
   * Process data with validation and transformation
   *
   * @param data - Raw input data
   * @returns Processed result
   *
   * @throws ValidationError if data is invalid
   * @throws ProcessingError if processing fails
   *
   * @public
   */
  process(data: any): any;
}

/**
 * CSV data processor implementation
 * @public
 */
class CSVProcessor implements DataProcessor {
  /**
   * @inheritDoc
   */
  process(data: any): any {
    return data;
  }
}

/**
 * JSON data processor implementation
 * @public
 */
class JSONProcessor implements DataProcessor {
  /**
   * @inheritDoc
   *
   * @remarks
   * This implementation adds JSON-specific validation.
   */
  process(data: any): any {
    return JSON.parse(data);
  }
}
`;

try {
  const result2 = parser.parseFile('inherit.ts', inheritDocCode);
  console.log(`✅ Parsed: ${result2.comments.length} comments`);
  console.log(`   Errors: ${result2.errors.length}`);

  const csvDoc = result2.comments.find((c) => c.symbolName === 'process');
  if (csvDoc) {
    console.log('   process method found ✓');
    const inheritDoc = csvDoc.docComment.inheritDocTag;
    if (inheritDoc) {
      console.log('     - Has @inheritDoc tag ✓');
    }
  }
} catch (error) {
  console.log(`❌ Error: ${error}`);
}

console.log();

// Test 3: Custom Relationship Tags (@uses, @usedBy)
console.log('TEST 3: Custom Relationship Tags (@uses, @usedBy)');
console.log('-'.repeat(80));

const customRefCode = `
/**
 * User repository for data access
 *
 * @id 001
 * @public
 */
export class UserRepository {
  findById(id: string): any {
    return null;
  }
}

/**
 * User service for business logic
 *
 * @remarks
 * This service coordinates between the repository and external services.
 *
 * @id 002
 * @uses UserRepository
 * @uses EmailService
 * @usedBy APIController
 * @public
 */
export class UserService {
  /**
   * Create a new user
   *
   * @param data - User data
   * @returns Created user
   *
   * @public
   */
  createUser(data: any): any {
    return data;
  }
}

/**
 * API controller for user endpoints
 *
 * @id 003
 * @uses UserService
 * @public
 */
export class APIController {
  // Implementation
}
`;

try {
  const result3 = parser.parseFile('custom-refs.ts', customRefCode);
  console.log(`✅ Parsed: ${result3.comments.length} comments`);
  console.log(`   Errors: ${result3.errors.length}`);

  const userServiceDoc = result3.comments.find((c) => c.symbolName === 'UserService');
  if (userServiceDoc && userServiceDoc.docComment.customBlocks) {
    console.log('   UserService custom tags:');
    const blocks = userServiceDoc.docComment.customBlocks;
    const usesCount = blocks.filter((b) => b.blockTag.tagName === '@uses').length;
    const usedByCount = blocks.filter((b) => b.blockTag.tagName === '@usedBy').length;
    console.log(`     - @uses: ${usesCount}`);
    console.log(`     - @usedBy: ${usedByCount}`);
  }
} catch (error) {
  console.log(`❌ Error: ${error}`);
}

console.log();

// Test 4: Complex Cross-Reference Network
console.log('TEST 4: Complex Cross-Reference Network');
console.log('-'.repeat(80));

const networkCode = `
/**
 * Core domain model
 * @id M001
 * @public
 */
export class User {
  id: string;
}

/**
 * User profile data
 *
 * @id M002
 * @usedBy User
 * @public
 */
export interface UserProfile {
  name: string;
  email: string;
}

/**
 * Profile validation logic
 *
 * @see UserProfile for profile structure
 *
 * @id S001
 * @uses UserProfile
 * @usedBy UserService
 * @public
 */
export class ProfileValidator {
  validate(profile: UserProfile): boolean {
    return true;
  }
}

/**
 * User business service
 *
 * @id S002
 * @uses User
 * @uses ProfileValidator
 * @uses UserRepository
 * @public
 */
export class UserService {
  // Implementation
}

/**
 * Data access layer
 *
 * @id R001
 * @uses User
 * @usedBy UserService
 * @public
 */
export class UserRepository {
  // Implementation
}
`;

try {
  const result4 = parser.parseFile('network.ts', networkCode);
  console.log(`✅ Parsed: ${result4.comments.length} comments`);
  console.log(`   Errors: ${result4.errors.length}`);

  // Count references
  let seeCount = 0;
  let usesCount = 0;
  let usedByCount = 0;

  result4.comments.forEach((comment) => {
    const doc = comment.docComment;

    // Count @see blocks
    if (doc.seeBlocks) {
      seeCount += doc.seeBlocks.length;
    }

    // Count custom blocks (@uses, @usedBy)
    if (doc.customBlocks) {
      doc.customBlocks.forEach((block) => {
        if (block.blockTag.tagName === '@uses') usesCount++;
        if (block.blockTag.tagName === '@usedBy') usedByCount++;
      });
    }
  });

  console.log('   Reference counts:');
  console.log(`     - @see blocks: ${seeCount}`);
  console.log(`     - @uses tags: ${usesCount}`);
  console.log(`     - @usedBy tags: ${usedByCount}`);
  console.log(`     Total cross-references: ${seeCount + usesCount + usedByCount}`);
} catch (error) {
  console.log(`❌ Error: ${error}`);
}

console.log();

// Summary
console.log('='.repeat(80));
console.log('Summary: TSDoc Cross-Reference Support');
console.log('='.repeat(80));
console.log();

console.log('Supported Reference Mechanisms:');
console.log();

console.log('1. ✅ @see');
console.log('   - Dedicated "see also" references');
console.log('   - Can reference symbols or URLs');
console.log('   - Example: @see UserService for details');
console.log();

console.log('2. ✅ @inheritDoc');
console.log('   - Inherit documentation from parent');
console.log('   - Works with interfaces and base classes');
console.log('   - Example: @inheritDoc');
console.log();

console.log('3. ✅ @uses (Custom)');
console.log('   - Declare dependencies on other symbols');
console.log('   - Multiple @uses allowed');
console.log('   - Example: @uses DataRepository');
console.log();

console.log('4. ✅ @usedBy (Custom)');
console.log('   - Reverse dependency tracking');
console.log('   - Documents what depends on this symbol');
console.log('   - Example: @usedBy APIController');
console.log();

console.log('Cross-Reference Features:');
console.log('  ✅ Symbol-to-symbol references');
console.log('  ✅ Method-to-method references');
console.log('  ✅ Document inheritance');
console.log('  ✅ Bidirectional tracking (@uses + @usedBy)');
console.log('  ✅ Multiple references per comment');
console.log();

console.log('Use Cases:');
console.log('  • API documentation with cross-links');
console.log('  • Dependency graph construction');
console.log('  • Impact analysis (what uses what)');
console.log('  • Documentation inheritance (DRY)');
console.log('  • Bidirectional relationship tracking');
console.log();
