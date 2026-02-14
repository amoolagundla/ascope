#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = path.join(__dirname, '..');

// Auto-detect nav directory: prefer local project nav/, fallback to plugin nav/
function findNavDir() {
  const cwd = process.cwd();

  // Check current directory for nav/
  const localNav = path.join(cwd, 'nav');
  if (fs.existsSync(path.join(localNav, 'index.json'))) {
    return localNav;
  }

  // Check parent directory for nav/ (in case we're in src/)
  const parentNav = path.join(cwd, '..', 'nav');
  if (fs.existsSync(path.join(parentNav, 'index.json'))) {
    return parentNav;
  }

  // Fallback to plugin directory
  return path.join(PLUGIN_ROOT, 'nav');
}

const NAV_DIR = findNavDir();
const INDEX_PATH = path.join(NAV_DIR, 'index.json');
const GRAPH_PATH = path.join(NAV_DIR, 'graph.json');
const STATE_PATH = path.join(NAV_DIR, '.ng-nav-state.json');

/**
 * Resolve query to bundle of relevant files
 */
async function resolveBundle(query, maxNodes = 5) {
  // Load index
  if (!fs.existsSync(INDEX_PATH)) {
    console.error('Error: Navigation index not found. Run /ng-nav:index first.');
    process.exit(1);
  }

  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  const graph = fs.existsSync(GRAPH_PATH)
    ? JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'))
    : { edges: [] };

  // Normalize query
  const queryLower = query.toLowerCase();
  const queryTokens = queryLower.split(/\s+/);

  // Score nodes
  const scored = index.nodes.map(node => {
    let score = 0;

    // Exact name match (case-insensitive)
    if (node.name.toLowerCase() === queryLower) {
      score += 100;
    } else if (node.name.toLowerCase().includes(queryLower)) {
      score += 80;
    }

    // Token-based name matching
    for (const token of queryTokens) {
      if (node.name.toLowerCase().includes(token)) {
        score += 40;
      }
      if (node.path.toLowerCase().includes(token)) {
        score += 30;
      }
    }

    // Type match
    if (queryTokens.includes(node.type)) {
      score += 50;
    }

    // Pattern matches
    if (queryTokens.includes('signal') || queryTokens.includes('signals')) {
      score += node.patterns.signals.length * 10;
    }
    if (queryTokens.includes('rxjs') || queryTokens.includes('observable')) {
      score += node.patterns.rxjs.length * 10;
    }
    if (queryTokens.includes('http') || queryTokens.includes('api')) {
      score += node.patterns.http.length * 10;
    }
    if (queryTokens.includes('capacitor') || queryTokens.includes('native')) {
      score += node.patterns.capacitor.length * 10;
    }

    // Specific pattern keywords
    for (const token of queryTokens) {
      // Check if token matches DI dependencies
      if (node.patterns.di.some(dep => dep.toLowerCase().includes(token))) {
        score += 20;
      }
      // Check RxJS operators
      if (node.patterns.rxjs.some(op => op.toLowerCase() === token)) {
        score += 20;
      }
      // Check Capacitor plugins
      if (node.patterns.capacitor.some(plugin => plugin.toLowerCase().includes(token))) {
        score += 30;
      }
    }

    // Path-based scoring (folder names)
    const pathParts = node.path.toLowerCase().split('/');
    for (const token of queryTokens) {
      if (pathParts.some(part => part.includes(token))) {
        score += 25;
      }
    }

    return { node, score };
  });

  // Sort by score (descending)
  scored.sort((a, b) => b.score - a.score);

  // Select top N nodes
  const topNodes = scored.slice(0, maxNodes).filter(s => s.score > 0);

  if (topNodes.length === 0) {
    console.error(`No files found matching query: "${query}"`);
    console.error('Try broader terms like: auth, signal, component, service, etc.');
    process.exit(1);
  }

  // Expand to include direct dependencies
  const selectedIds = new Set(topNodes.map(s => s.node.id));
  const expanded = new Set(selectedIds);

  for (const nodeId of selectedIds) {
    // Find edges where this node is the source
    const outgoing = graph.edges.filter(e => e.from === nodeId);
    for (const edge of outgoing) {
      // Find the target node
      const targetNode = index.nodes.find(n =>
        n.id.includes(edge.to) ||
        n.name === edge.to ||
        n.patterns.di.includes(edge.to)
      );
      if (targetNode) {
        expanded.add(targetNode.id);
      }
    }
  }

  // Collect file paths (limit to 20 files)
  const allowlist = [];
  const bundleNodes = [];

  for (const nodeId of Array.from(expanded).slice(0, 20)) {
    const node = index.nodes.find(n => n.id === nodeId);
    if (node) {
      const absolutePath = path.join(index.target, node.path);
      allowlist.push(absolutePath);
      bundleNodes.push(node);

      // Also allow summary file
      const summaryFileName = node.id.replace(/:/g, '__') + '.md';
      const summaryPath = path.join(NAV_DIR, 'summaries', summaryFileName);
      if (fs.existsSync(summaryPath)) {
        allowlist.push(summaryPath);
      }
    }
  }

  // Always allow nav artifacts
  allowlist.push(INDEX_PATH);
  allowlist.push(GRAPH_PATH);

  // Create bundle state
  const bundleState = {
    active: true,
    query: query,
    bundleId: `bundle:${query.replace(/\s+/g, '-')}:${new Date().toISOString()}`,
    allowlist: allowlist,
    scopeRoot: index.target,
    timestamp: new Date().toISOString()
  };

  // Write state file
  fs.writeFileSync(STATE_PATH, JSON.stringify(bundleState, null, 2));

  // Print results
  console.log(`Resolved query "${query}" to ${bundleNodes.length} files:\n`);
  for (const node of bundleNodes) {
    console.log(`- ${node.path} (${node.type})`);
  }
  console.log(`\nBundle active. PreToolUse hook enforcing scope.`);
  console.log(`Bundle ID: ${bundleState.bundleId}`);

  return bundleState;
}

/**
 * Deactivate current bundle
 */
function deactivateBundle() {
  if (fs.existsSync(STATE_PATH)) {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    state.active = false;
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
    console.log('Bundle deactivated.');
  } else {
    console.log('No active bundle.');
  }
}

// Main execution
const command = process.argv[2];

if (!command) {
  console.error('Usage: node bundle.mjs <query>');
  console.error('   or: node bundle.mjs --deactivate');
  process.exit(1);
}

if (command === '--deactivate') {
  deactivateBundle();
} else {
  const query = process.argv.slice(2).join(' ');
  const maxNodes = parseInt(process.env.NG_NAV_BUNDLE_SIZE || '5', 10);
  resolveBundle(query, maxNodes).catch(error => {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
  });
}
