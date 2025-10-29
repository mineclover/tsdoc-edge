/**
 * Sample code demonstrating TSDoc Edge conventions
 * @packageDocumentation
 */

/**
 * User data interface
 * @public
 * @responsibility Define user data structure
 */
export interface User {
  id: string;
  name: string;
  email: string;
}

/**
 * User validation service
 * @public
 * @responsibility Validate user data according to business rules
 * @architecture Domain Layer - Validation
 * @pattern Strategy Pattern
 */
export class UserValidator {
  /**
   * Validate user email format
   * @param email - Email address to validate
   * @returns True if email is valid
   * @precondition email must not be null or undefined
   * @postcondition Returns boolean result
   * @contract Validates email format using RFC 5322 standard
   * @testedBy UserValidator.test.ts - validateEmail tests
   * @testScenario Valid email format
   * @testScenario Invalid email format
   * @testScenario Empty email
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate complete user object
   * @param user - User object to validate
   * @returns True if user is valid
   * @precondition user must not be null
   * @postcondition Returns true only if all fields are valid
   * @contract Validates all user fields according to business rules
   * @testedBy UserValidator.test.ts - validateUser tests
   * @dependsOn User interface
   * @invariant User ID must be non-empty string
   * @invariant User name must be non-empty string
   * @invariant User email must be valid format
   */
  validateUser(user: User): boolean {
    if (!user.id || user.id.trim() === '') {
      return false;
    }
    if (!user.name || user.name.trim() === '') {
      return false;
    }
    return this.validateEmail(user.email);
  }
}

/**
 * User repository for data persistence
 * @public
 * @responsibility Handle user data persistence operations
 * @architecture Data Layer - Repository Pattern
 * @pattern Repository Pattern
 * @designDecision ADR-001: Use in-memory storage for MVP
 */
export class UserRepository {
  private users: Map<string, User> = new Map();

  /**
   * Save a user to the repository
   * @param user - User to save
   * @returns Saved user
   * @precondition user must be valid
   * @postcondition user is stored in repository
   * @contract Store user with unique ID
   * @testedBy UserRepository.test.ts - save tests
   * @dependsOn User interface
   * @invariant User ID must be unique
   */
  save(user: User): User {
    this.users.set(user.id, user);
    return user;
  }

  /**
   * Find a user by ID
   * @param id - User ID to search for
   * @returns User if found, undefined otherwise
   * @precondition id must be non-empty string
   * @postcondition Returns user or undefined
   * @contract Retrieve user by exact ID match
   * @testedBy UserRepository.test.ts - findById tests
   * @testScenario User exists
   * @testScenario User does not exist
   */
  findById(id: string): User | undefined {
    return this.users.get(id);
  }

  /**
   * Get all users
   * @returns Array of all users
   * @postcondition Returns array (may be empty)
   * @contract Return all stored users
   * @testedBy UserRepository.test.ts - findAll tests
   */
  findAll(): User[] {
    return Array.from(this.users.values());
  }

  /**
   * Delete a user by ID
   * @param id - User ID to delete
   * @returns True if deleted, false if not found
   * @precondition id must be non-empty string
   * @postcondition User is removed if existed
   * @contract Remove user from storage
   * @testedBy UserRepository.test.ts - delete tests
   */
  delete(id: string): boolean {
    return this.users.delete(id);
  }
}

/**
 * User service orchestrating business logic
 * @public
 * @responsibility Orchestrate user-related business operations
 * @architecture Service Layer - Business Logic
 * @pattern Facade Pattern
 * @designDecision ADR-002: Service layer coordinates between validation and persistence
 */
export class UserService {
  private validator: UserValidator;
  private repository: UserRepository;

  /**
   * Create a new UserService instance
   * @param validator - User validator instance
   * @param repository - User repository instance
   * @dependsOn UserValidator
   * @dependsOn UserRepository
   * @contract Initialize service with required dependencies
   */
  constructor(validator: UserValidator, repository: UserRepository) {
    this.validator = validator;
    this.repository = repository;
  }

  /**
   * Create a new user
   * @param user - User data to create
   * @returns Created user
   * @throws Error if user is invalid
   * @precondition user must have all required fields
   * @postcondition Valid user is persisted
   * @contract Validate and persist new user
   * @testedBy UserService.test.ts - createUser tests
   * @testScenario Valid user creation
   * @testScenario Invalid user rejection
   * @usedBy UserController (if exists)
   * @relatedTo User interface
   * @relatedTo UserValidator
   * @relatedTo UserRepository
   * @invariant Only valid users are persisted
   */
  createUser(user: User): User {
    if (!this.validator.validateUser(user)) {
      throw new Error('Invalid user data');
    }

    const existingUser = this.repository.findById(user.id);
    if (existingUser) {
      throw new Error('User already exists');
    }

    return this.repository.save(user);
  }

  /**
   * Get a user by ID
   * @param id - User ID
   * @returns User if found, undefined otherwise
   * @precondition id must be non-empty string
   * @postcondition Returns user or undefined
   * @contract Retrieve user by ID
   * @testedBy UserService.test.ts - getUser tests
   * @relatedTo UserRepository
   */
  getUser(id: string): User | undefined {
    return this.repository.findById(id);
  }

  /**
   * Update an existing user
   * @param user - Updated user data
   * @returns Updated user
   * @throws Error if user is invalid or not found
   * @precondition user must exist and be valid
   * @postcondition User is updated in repository
   * @contract Validate and update existing user
   * @testedBy UserService.test.ts - updateUser tests
   * @testScenario Successful update
   * @testScenario User not found
   * @testScenario Invalid update data
   */
  updateUser(user: User): User {
    if (!this.validator.validateUser(user)) {
      throw new Error('Invalid user data');
    }

    const existingUser = this.repository.findById(user.id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    return this.repository.save(user);
  }

  /**
   * Delete a user
   * @param id - User ID to delete
   * @returns True if deleted, false if not found
   * @precondition id must be non-empty string
   * @postcondition User is removed if existed
   * @contract Delete user by ID
   * @testedBy UserService.test.ts - deleteUser tests
   */
  deleteUser(id: string): boolean {
    return this.repository.delete(id);
  }

  /**
   * List all users
   * @returns Array of all users
   * @postcondition Returns array of users
   * @contract Return all users
   * @testedBy UserService.test.ts - listUsers tests
   */
  listUsers(): User[] {
    return this.repository.findAll();
  }
}
