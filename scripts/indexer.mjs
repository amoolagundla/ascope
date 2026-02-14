#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import {
  patterns,
  extractDependencies,
  extractSignals,
  extractRxJSOperators,
  extractHttpEndpoints,
  extractCapacitorPlugins,
  extractObservables,
  extractRoutes,
  classifyFile,
  getFileName,
  generateNodeId,
  truncate,
  extractClassName
} from './utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = path.join(__dirname, '..');
const NAV_DIR = path.join(PLUGIN_ROOT, 'nav');
const SUMMARIES_DIR = path.join(NAV_DIR, 'summaries');

/**
 * Main indexer - scan Angular codebase and generate navigation artifacts
 */
async function index(targetDir) {
  console.log(`Scanning Angular project: ${targetDir}`);

  // Verify target directory exists
  if (!fs.existsSync(targetDir)) {
    console.error(`Error: Target directory not found: ${targetDir}`);
    process.exit(1);
  }

  // Find all TypeScript files (exclude build dirs, node_modules, etc.)
  const tsFiles = await glob('**/*.ts', {
    cwd: targetDir,
    absolute: true,
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.angular/**',
      '**/www/**',
      '**/ios/**',
      '**/android/**',
      '**/*.spec.ts',
      '**/*.d.ts'
    ]
  });

  console.log(`Found ${tsFiles.length} TypeScript files`);

  // Process each file
  const nodes = [];
  const edges = [];
  const stats = {
    components: 0,
    services: 0,
    guards: 0,
    interceptors: 0,
    routes: 0,
    models: 0,
    directives: 0,
    pipes: 0,
    other: 0,
    totalDI: 0,
    totalSignals: 0,
    totalRxJS: 0,
    totalHTTP: 0,
    totalCapacitor: 0
  };

  for (const filePath of tsFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(targetDir, filePath);
      const fileType = classifyFile(filePath, content);
      const className = extractClassName(content) || getFileName(filePath);
      const nodeId = generateNodeId(fileType, relativePath);

      // Extract patterns
      const dependencies = extractDependencies(content);
      const signalUsage = extractSignals(content);
      const rxjsOps = extractRxJSOperators(content);
      const httpEndpoints = extractHttpEndpoints(content);
      const capacitorPlugins = extractCapacitorPlugins(content);
      const observables = extractObservables(content);
      const routePaths = extractRoutes(content);

      // Update stats
      stats[`${fileType}s`] = (stats[`${fileType}s`] || 0) + 1;
      stats.totalDI += dependencies.length;
      stats.totalSignals += signalUsage.length;
      stats.totalRxJS += rxjsOps.length;
      stats.totalHTTP += httpEndpoints.length;
      stats.totalCapacitor += capacitorPlugins.length;

      // Create node
      const node = {
        id: nodeId,
        path: relativePath,
        type: fileType,
        name: className,
        patterns: {
          di: dependencies,
          signals: signalUsage,
          rxjs: rxjsOps,
          http: httpEndpoints.map(e => `${e.method} ${e.url}`),
          capacitor: capacitorPlugins,
          observables: observables,
          routes: routePaths
        }
      };

      nodes.push(node);

      // Build dependency edges
      for (const dep of dependencies) {
        edges.push({
          from: nodeId,
          to: dep,
          type: 'injects'
        });
      }

      // Generate summary
      await generateSummary(node, content, filePath);

    } catch (error) {
      console.warn(`Warning: Failed to process ${filePath}: ${error.message}`);
    }
  }

  // Write index.json
  const index = {
    version: '1',
    generated: new Date().toISOString(),
    target: targetDir,
    nodes: nodes
  };

  fs.writeFileSync(
    path.join(NAV_DIR, 'index.json'),
    JSON.stringify(index, null, 2)
  );

  // Write graph.json
  const graph = {
    version: '1',
    edges: edges
  };

  fs.writeFileSync(
    path.join(NAV_DIR, 'graph.json'),
    JSON.stringify(graph, null, 2)
  );

  // Print stats
  console.log('\nIndexing complete:');
  console.log(`- Components: ${stats.components || 0}`);
  console.log(`- Services: ${stats.services || 0}`);
  console.log(`- Guards: ${stats.guards || 0}`);
  console.log(`- Interceptors: ${stats.interceptors || 0}`);
  console.log(`- Routes: ${stats.routes || 0}`);
  console.log(`- Models: ${stats.models || 0}`);
  console.log(`- Directives: ${stats.directives || 0}`);
  console.log(`- Pipes: ${stats.pipes || 0}`);
  console.log(`- Other: ${stats.other || 0}`);
  console.log(`\nPattern usage:`);
  console.log(`- DI: ${stats.totalDI}`);
  console.log(`- Signals: ${stats.totalSignals}`);
  console.log(`- RxJS: ${stats.totalRxJS}`);
  console.log(`- HTTP: ${stats.totalHTTP}`);
  console.log(`- Capacitor: ${stats.totalCapacitor}`);
  console.log(`\nGenerated ${nodes.length} summaries in ${SUMMARIES_DIR}`);
  console.log(`Index ready at ${NAV_DIR}`);
}

/**
 * Generate markdown summary for a node
 */
async function generateSummary(node, content, filePath) {
  const summaryFileName = node.id.replace(/:/g, '__') + '.md';
  const summaryPath = path.join(SUMMARIES_DIR, summaryFileName);

  // Build summary content
  let summary = `# ${node.name}\n\n`;
  summary += `**Path:** ${node.path}\n`;
  summary += `**Type:** ${node.type}\n`;
  summary += `**ID:** ${node.id}\n\n`;

  // Dependencies
  if (node.patterns.di.length > 0) {
    summary += `## Dependencies\n`;
    for (const dep of node.patterns.di) {
      summary += `- ${dep}\n`;
    }
    summary += '\n';
  }

  // Patterns
  summary += `## Patterns\n`;
  if (node.patterns.di.length > 0) {
    summary += `- DI: ${node.patterns.di.length} dependencies\n`;
  }
  if (node.patterns.signals.length > 0) {
    summary += `- Signals: ${node.patterns.signals.join(', ')}\n`;
  }
  if (node.patterns.rxjs.length > 0) {
    summary += `- RxJS: ${node.patterns.rxjs.join(', ')}\n`;
  }
  if (node.patterns.http.length > 0) {
    summary += `- HTTP: ${node.patterns.http.length} endpoints\n`;
  }
  if (node.patterns.capacitor.length > 0) {
    summary += `- Capacitor: ${node.patterns.capacitor.join(', ')}\n`;
  }
  if (node.patterns.observables.length > 0) {
    summary += `- Observables: ${node.patterns.observables.join(', ')}\n`;
  }
  if (node.patterns.routes.length > 0) {
    summary += `- Routes: ${node.patterns.routes.join(', ')}\n`;
  }
  summary += '\n';

  // Key code sections
  summary += `## Key Code\n\n`;
  summary += '```typescript\n';

  // Extract constructor, public methods, signal declarations
  const constructorMatch = content.match(/constructor\s*\([^)]*\)\s*{[^}]*}/s);
  if (constructorMatch) {
    summary += `// Constructor\n${constructorMatch[0]}\n\n`;
  }

  // Extract signal declarations
  const signalMatches = content.matchAll(/(\w+)\s*=\s*(signal|computed|effect|toSignal)\s*<?[^>]*>?\s*\([^)]*\)/g);
  for (const match of signalMatches) {
    summary += `// Signal: ${match[1]}\n${match[0]}\n\n`;
  }

  // Extract public methods (first 3)
  const methodMatches = content.matchAll(/^\s*(public\s+)?(\w+)\s*\([^)]*\)\s*:\s*[^{]+\s*{/gm);
  let methodCount = 0;
  for (const match of methodMatches) {
    if (methodCount >= 3) break;
    if (match[2] !== 'constructor') {
      summary += `// Method: ${match[2]}\n${match[0]}...\n\n`;
      methodCount++;
    }
  }

  summary += '```\n';

  // Truncate to 4500 chars
  summary = truncate(summary, 4500);

  fs.writeFileSync(summaryPath, summary);
}

// Main execution
const targetDir = process.argv[2] || process.cwd();
const resolvedTarget = path.resolve(targetDir);

// Ensure nav directories exist
if (!fs.existsSync(NAV_DIR)) {
  fs.mkdirSync(NAV_DIR, { recursive: true });
}
if (!fs.existsSync(SUMMARIES_DIR)) {
  fs.mkdirSync(SUMMARIES_DIR, { recursive: true });
}

index(resolvedTarget).catch(error => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
