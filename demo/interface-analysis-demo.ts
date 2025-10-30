/**
 * Demo: Interface Analysis for Domain-Driven Development
 *
 * This demo shows how to use the interface analysis features to:
 * 1. Extract and analyze TypeScript interfaces
 * 2. Map dependencies between interfaces
 * 3. Analyze domain structure and cohesion
 * 4. Generate domain boundary reports
 *
 * @packageDocumentation
 */

import {
  DomainStructureAnalyzer,
  InterfaceAnalyzer,
  InterfaceDependencyMapper,
} from '../src/index';

// Example domain code
const userDomainCode = `
/**
 * User entity in the user domain
 */
export interface UserEntity {
  id: string;
  name: string;
  email: string;
  address: Address;
}

/**
 * Address value object
 */
export interface Address {
  street: string;
  city: string;
  zipCode: string;
}

/**
 * User repository for data access
 */
export interface UserRepository {
  findById(id: string): Promise<UserEntity>;
  save(user: UserEntity): Promise<void>;
  delete(id: string): Promise<boolean>;
  findByEmail(email: string): Promise<UserEntity | null>;
}
`;

const orderDomainCode = `
/**
 * Order entity in the order domain
 */
export interface OrderEntity {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
}

/**
 * Order item value object
 */
export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

/**
 * Order status enum values
 */
export interface OrderStatus {
  PENDING: 'pending';
  PROCESSING: 'processing';
  COMPLETED: 'completed';
  CANCELLED: 'cancelled';
}

/**
 * Order repository
 */
export interface OrderRepository {
  create(order: OrderEntity): Promise<OrderEntity>;
  update(order: OrderEntity): Promise<void>;
  findByUser(userId: string): Promise<OrderEntity[]>;
}
`;

const paymentDomainCode = `
/**
 * Payment entity
 */
export interface PaymentEntity {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
}

/**
 * Payment method
 */
export interface PaymentMethod {
  type: 'credit_card' | 'debit_card' | 'paypal';
  details: Record<string, unknown>;
}

/**
 * Payment status
 */
export interface PaymentStatus {
  PENDING: 'pending';
  AUTHORIZED: 'authorized';
  CAPTURED: 'captured';
  FAILED: 'failed';
  REFUNDED: 'refunded';
}

/**
 * Payment service
 */
export interface PaymentService {
  processPayment(payment: PaymentEntity): Promise<PaymentEntity>;
  refund(paymentId: string): Promise<void>;
}
`;

/**
 * Run interface analysis demo
 */
function runDemo(): void {
  console.log('='.repeat(80));
  console.log('Interface Analysis for Domain-Driven Development');
  console.log('='.repeat(80));
  console.log();

  // Step 1: Analyze interfaces from each domain
  console.log('Step 1: Analyzing interfaces from source code...');
  console.log('-'.repeat(80));

  const analyzer = new InterfaceAnalyzer({
    includePrivate: false,
    inferDomainFromPath: true,
    inferDomainRole: true,
  });

  const userInterfaces = analyzer.analyzeFile('src/domain/user/UserDomain.ts', userDomainCode);
  const orderInterfaces = analyzer.analyzeFile('src/domain/order/OrderDomain.ts', orderDomainCode);
  const paymentInterfaces = analyzer.analyzeFile(
    'src/domain/payment/PaymentDomain.ts',
    paymentDomainCode
  );

  const allInterfaces = [...userInterfaces, ...orderInterfaces, ...paymentInterfaces];

  console.log(
    `Found ${allInterfaces.length} interfaces across ${new Set(allInterfaces.map((i) => i.domain)).size} domains`
  );
  console.log();

  // Display interface summary
  console.log('Interfaces by Domain:');
  const byDomain = new Map<string, typeof allInterfaces>();
  for (const iface of allInterfaces) {
    const domain = iface.domain || 'unknown';
    if (!byDomain.has(domain)) {
      byDomain.set(domain, []);
    }
    byDomain.get(domain)!.push(iface);
  }

  for (const [domain, interfaces] of byDomain.entries()) {
    console.log(`  ${domain}: ${interfaces.length} interfaces`);
    for (const iface of interfaces) {
      console.log(`    - ${iface.symbol.name} (${iface.domainRole})`);
      console.log(`      Properties: ${iface.properties.length}, Methods: ${iface.methods.length}`);
    }
  }
  console.log();

  // Step 2: Build dependency graph
  console.log('Step 2: Building dependency graph...');
  console.log('-'.repeat(80));

  const dependencyMapper = new InterfaceDependencyMapper();
  let graph = dependencyMapper.buildDependencyGraph(allInterfaces);

  console.log(`Total dependencies: ${graph.dependencies.length}`);
  console.log();

  // Show dependency types
  const depsByType = new Map<string, number>();
  for (const dep of graph.dependencies) {
    depsByType.set(dep.dependencyType, (depsByType.get(dep.dependencyType) || 0) + 1);
  }

  console.log('Dependencies by type:');
  for (const [type, count] of depsByType.entries()) {
    console.log(`  ${type}: ${count}`);
  }
  console.log();

  // Find circular dependencies
  const cycles = dependencyMapper.findCircularDependencies(graph);
  if (cycles.length > 0) {
    console.log(`⚠️  Found ${cycles.length} circular dependencies:`);
    for (const cycle of cycles) {
      console.log(`  ${cycle.join(' → ')}`);
    }
  } else {
    console.log('✅ No circular dependencies found');
  }
  console.log();

  // Step 3: Analyze domain structure
  console.log('Step 3: Analyzing domain structure...');
  console.log('-'.repeat(80));

  const domainAnalyzer = new DomainStructureAnalyzer();
  graph = domainAnalyzer.analyzeDomains(graph);

  console.log(`Analyzed ${graph.domains.size} domains`);
  console.log();

  // Display domain metrics
  for (const [domainName, domain] of graph.domains.entries()) {
    console.log(`Domain: ${domainName}`);
    console.log(`  Interfaces: ${domain.interfaces.length}`);
    console.log(`  Internal dependencies: ${domain.internalDependencies.length}`);
    console.log(`  External dependencies: ${domain.externalDependencies.length}`);
    console.log(`  Cohesion score: ${(domain.cohesionScore * 100).toFixed(1)}%`);
    console.log(`  Coupling score: ${(domain.couplingScore * 100).toFixed(1)}%`);

    // Calculate metrics for key interfaces
    console.log('  Key interfaces:');
    for (const iface of domain.interfaces) {
      const metrics = dependencyMapper.calculateMetrics(iface.symbol.name, graph);
      if (metrics.efferentCoupling > 0 || metrics.afferentCoupling > 0) {
        console.log(`    ${iface.symbol.name}:`);
        console.log(
          `      Efferent: ${metrics.efferentCoupling}, Afferent: ${metrics.afferentCoupling}`
        );
        console.log(`      Instability: ${(metrics.instability * 100).toFixed(0)}%`);
      }
    }
    console.log();
  }

  // Step 4: Generate domain report
  console.log('Step 4: Generating domain boundary report...');
  console.log('-'.repeat(80));

  const report = domainAnalyzer.generateDomainReport(graph);

  console.log(report);

  // Additional insights
  console.log('='.repeat(80));
  console.log('Key Insights:');
  console.log('='.repeat(80));
  console.log();
  console.log('✅ Benefits of this analysis:');
  console.log('  1. Identify domain boundaries and verify proper separation of concerns');
  console.log('  2. Detect tight coupling between domains that should be independent');
  console.log('  3. Find circular dependencies that indicate design issues');
  console.log('  4. Measure cohesion within domains to ensure related interfaces are grouped');
  console.log('  5. Track interface stability using efferent/afferent coupling metrics');
  console.log();
  console.log('💡 Next steps:');
  console.log('  - Review interfaces with high coupling (instability > 70%)');
  console.log('  - Refactor domains with low cohesion (< 30%)');
  console.log('  - Break circular dependencies');
  console.log('  - Consider splitting large domains (> 20 interfaces)');
  console.log();
}

// Run the demo
if (require.main === module) {
  runDemo();
}

export { runDemo };
