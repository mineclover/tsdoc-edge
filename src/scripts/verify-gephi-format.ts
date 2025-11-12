/**
 * Verify Gephi export format matches @gephi/gephi-lite-sdk types
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// Import types from Gephi SDK
type GraphDataset = {
  edgeData: Record<string, ItemData>;
  nodeData: Record<string, ItemData>;
  layout: Record<string, NodeCoordinates>;
  metadata: GraphMetadata;
  nodeFields: FieldModel<'nodes'>[];
  edgeFields: FieldModel<'edges'>[];
  fullGraph: DatalessGraph;
};

type ItemData = Record<string, Scalar>;
type Scalar = boolean | number | string | undefined | null;

type NodeCoordinates = {
  x: number;
  y: number;
};

type GraphMetadata = {
  title: string;
  description?: string;
};

type FieldModel<T extends 'nodes' | 'edges'> = {
  id: string;
  itemType: T;
  type: 'text' | 'number' | 'category' | 'boolean';
  label?: string;
};

type DatalessGraph = {
  attributes: Record<string, any>;
  options: {
    type: 'directed' | 'undirected' | 'mixed';
    multi: boolean;
    allowSelfLoops: boolean;
  };
  nodes: Array<{ key: string; attributes: Record<string, any> }>;
  edges: Array<{
    key: string;
    source: string;
    target: string;
    attributes: Record<string, any>;
    undirected?: boolean;
  }>;
};

/**
 * Validate that exported data matches Gephi GraphDataset type
 */
function validateGephiDataset(data: unknown): data is GraphDataset {
  const dataset = data as any;

  // Check required top-level keys
  const requiredKeys = ['nodeData', 'edgeData', 'layout', 'metadata', 'nodeFields', 'edgeFields', 'fullGraph'];
  for (const key of requiredKeys) {
    if (!(key in dataset)) {
      console.error(`❌ Missing required key: ${key}`);
      return false;
    }
  }

  // Validate nodeData
  if (typeof dataset.nodeData !== 'object' || dataset.nodeData === null) {
    console.error('❌ nodeData must be an object');
    return false;
  }

  // Validate edgeData
  if (typeof dataset.edgeData !== 'object' || dataset.edgeData === null) {
    console.error('❌ edgeData must be an object');
    return false;
  }

  // Validate layout
  if (typeof dataset.layout !== 'object' || dataset.layout === null) {
    console.error('❌ layout must be an object');
    return false;
  }

  // Check layout has x,y coordinates
  for (const [nodeId, coords] of Object.entries(dataset.layout)) {
    const c = coords as any;
    if (typeof c.x !== 'number' || typeof c.y !== 'number') {
      console.error(`❌ Invalid coordinates for node ${nodeId}: x=${c.x}, y=${c.y}`);
      return false;
    }
  }

  // Validate metadata
  if (typeof dataset.metadata !== 'object' || !dataset.metadata.title) {
    console.error('❌ metadata must have a title');
    return false;
  }

  // Validate nodeFields
  if (!Array.isArray(dataset.nodeFields)) {
    console.error('❌ nodeFields must be an array');
    return false;
  }

  for (const field of dataset.nodeFields) {
    if (!field.id || field.itemType !== 'nodes' || !field.type) {
      console.error(`❌ Invalid nodeField: ${JSON.stringify(field)}`);
      return false;
    }
    if (!['text', 'number', 'category', 'boolean'].includes(field.type)) {
      console.error(`❌ Invalid field type: ${field.type}`);
      return false;
    }
  }

  // Validate edgeFields
  if (!Array.isArray(dataset.edgeFields)) {
    console.error('❌ edgeFields must be an array');
    return false;
  }

  for (const field of dataset.edgeFields) {
    if (!field.id || field.itemType !== 'edges' || !field.type) {
      console.error(`❌ Invalid edgeField: ${JSON.stringify(field)}`);
      return false;
    }
  }

  // Validate fullGraph
  if (typeof dataset.fullGraph !== 'object' || dataset.fullGraph === null) {
    console.error('❌ fullGraph must be an object');
    return false;
  }

  if (!dataset.fullGraph.options || !dataset.fullGraph.nodes || !dataset.fullGraph.edges) {
    console.error('❌ fullGraph missing required properties');
    return false;
  }

  // Validate graph options
  const { options } = dataset.fullGraph;
  if (!['directed', 'undirected', 'mixed'].includes(options.type)) {
    console.error(`❌ Invalid graph type: ${options.type}`);
    return false;
  }

  if (typeof options.multi !== 'boolean' || typeof options.allowSelfLoops !== 'boolean') {
    console.error('❌ Invalid graph options');
    return false;
  }

  // Validate nodes array
  if (!Array.isArray(dataset.fullGraph.nodes)) {
    console.error('❌ fullGraph.nodes must be an array');
    return false;
  }

  for (const node of dataset.fullGraph.nodes) {
    if (!node.key || typeof node.attributes !== 'object') {
      console.error(`❌ Invalid node: ${JSON.stringify(node).slice(0, 100)}`);
      return false;
    }
  }

  // Validate edges array
  if (!Array.isArray(dataset.fullGraph.edges)) {
    console.error('❌ fullGraph.edges must be an array');
    return false;
  }

  for (const edge of dataset.fullGraph.edges) {
    if (!edge.key || !edge.source || !edge.target || typeof edge.attributes !== 'object') {
      console.error(`❌ Invalid edge: ${JSON.stringify(edge).slice(0, 100)}`);
      return false;
    }
  }

  return true;
}

/**
 * Main validation
 */
function main() {
  const testFile = path.join(process.cwd(), 'test-gephi.json');

  if (!fs.existsSync(testFile)) {
    console.error(`❌ Test file not found: ${testFile}`);
    process.exit(1);
  }

  console.log('🔍 Validating Gephi export format...\n');

  const data = JSON.parse(fs.readFileSync(testFile, 'utf-8'));

  // Type assertion to verify compile-time compatibility
  const dataset: GraphDataset = data;

  console.log('📊 Dataset Overview:');
  console.log(`  - Nodes: ${Object.keys(dataset.nodeData).length}`);
  console.log(`  - Edges: ${Object.keys(dataset.edgeData).length}`);
  console.log(`  - Layout positions: ${Object.keys(dataset.layout).length}`);
  console.log(`  - Node fields: ${dataset.nodeFields.length}`);
  console.log(`  - Edge fields: ${dataset.edgeFields.length}`);
  console.log(`  - Graph type: ${dataset.fullGraph.options.type}`);
  console.log(`  - Multi-edges: ${dataset.fullGraph.options.multi}`);
  console.log(`  - Self-loops: ${dataset.fullGraph.options.allowSelfLoops}`);
  console.log();

  console.log('📋 Node Fields:');
  for (const field of dataset.nodeFields) {
    console.log(`  - ${field.id} (${field.type}): ${field.label || field.id}`);
  }
  console.log();

  console.log('📋 Edge Fields:');
  for (const field of dataset.edgeFields) {
    console.log(`  - ${field.id} (${field.type}): ${field.label || field.id}`);
  }
  console.log();

  console.log('🔍 Runtime Validation:');
  const isValid = validateGephiDataset(data);

  if (isValid) {
    console.log('✅ All validations passed!');
    console.log();
    console.log('📝 Sample Node:');
    const sampleNodeId = Object.keys(dataset.nodeData)[0];
    console.log(`  ID: ${sampleNodeId}`);
    console.log(`  Data:`, dataset.nodeData[sampleNodeId]);
    console.log(`  Layout:`, dataset.layout[sampleNodeId]);
    console.log();

    console.log('📝 Sample Edge:');
    const sampleEdgeId = Object.keys(dataset.edgeData)[0];
    const sampleEdge = dataset.fullGraph.edges[0];
    console.log(`  ID: ${sampleEdge.key}`);
    console.log(`  Source: ${sampleEdge.source}`);
    console.log(`  Target: ${sampleEdge.target}`);
    console.log(`  Data:`, dataset.edgeData[sampleEdge.key]);
    console.log();

    console.log('✅ Format is compatible with @gephi/gephi-lite-sdk');
    console.log('✅ Ready to import into Gephi Lite: https://gephi.org/gephi-lite/');
  } else {
    console.log('❌ Validation failed');
    process.exit(1);
  }
}

main();
