#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(__dirname, '../nav/.ng-nav-state.json');

// Read hook input from stdin
let inputData = '';
process.stdin.on('data', chunk => inputData += chunk);
process.stdin.on('end', () => {
  try {
    const hook = JSON.parse(inputData);
    const result = evaluateHook(hook);
    console.log(JSON.stringify(result));
    process.exit(0);
  } catch (error) {
    // Fail-open for safety - allow on error
    console.log(JSON.stringify({ systemMessage: `ng-nav hook error: ${error.message}` }));
    process.exit(0);
  }
});

function evaluateHook(hook) {
  // No active bundle → allow all
  if (!fs.existsSync(STATE_FILE)) {
    return {};
  }

  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  if (!state.active || !state.allowlist) {
    return {};
  }

  const toolName = hook.tool_name;
  const toolInput = hook.tool_input || {};

  // Read/Edit/Write tools - check file path
  if (['Read', 'Edit', 'Write', 'MultiEdit'].includes(toolName)) {
    const filePath = toolInput.file_path;
    if (!filePath) return {};

    // Normalize paths for comparison
    const normalized = normalizePath(filePath);
    const allowed = state.allowlist.some(p => {
      const resolvedAllowed = normalizePath(p);
      return resolvedAllowed === normalized;
    });

    if (!allowed) {
      const rel = getRelativePath(filePath, state.scopeRoot);
      return {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny'
        },
        systemMessage: [
          `ng-nav: File not in active bundle: ${rel}`,
          ``,
          `Active bundle: ${state.bundleId}`,
          `Query: "${state.query}"`,
          ``,
          `To access this file:`,
          `1. Expand bundle: /ng-nav:fix "${state.query} ${path.basename(filePath)}"`,
          `2. Or deactivate bundle (complete current fix first)`
        ].join('\n')
      };
    }
  }

  // Glob/Grep tools - check search scope
  if (['Glob', 'Grep'].includes(toolName)) {
    const searchPath = toolInput.path || process.cwd();
    const normalized = normalizePath(searchPath);
    const scopeRoot = normalizePath(state.scopeRoot);

    // Only allow searches within scope root
    if (!normalized.startsWith(scopeRoot)) {
      return {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny'
        },
        systemMessage: [
          `ng-nav: Search outside bundle scope: ${searchPath}`,
          ``,
          `Allowed scope: ${state.scopeRoot}`,
          `Use /ng-nav:fix with broader query to expand scope.`
        ].join('\n')
      };
    }
  }

  // Bash tool - block destructive file operations
  if (toolName === 'Bash') {
    const command = toolInput.command || '';
    const destructive = /^(rm|mv|cp|touch|mkdir|rmdir)\s/.test(command.trim());

    if (destructive) {
      return {
        systemMessage: [
          `ng-nav: File modification blocked in bundle mode`,
          `Command: ${command.substring(0, 50)}...`,
          ``,
          `Deactivate bundle first if you need to modify files.`
        ].join('\n')
      };
    }
  }

  // Allow operation
  return {};
}

/**
 * Normalize file path for comparison (handle WSL, resolve absolute)
 */
function normalizePath(filePath) {
  // Expand home directory
  let expanded = filePath.replace(/^~/, process.env.HOME);

  // Handle WSL Windows paths
  if (expanded.startsWith('/mnt/')) {
    // Already in WSL format, just resolve
    return path.resolve(expanded);
  }

  // Handle Windows paths (C:\... → /mnt/c/...)
  if (/^[A-Z]:\\/i.test(expanded)) {
    const drive = expanded[0].toLowerCase();
    expanded = `/mnt/${drive}/${expanded.substring(3).replace(/\\/g, '/')}`;
  }

  return path.resolve(expanded);
}

/**
 * Get relative path for display
 */
function getRelativePath(filePath, scopeRoot) {
  try {
    const normalized = normalizePath(filePath);
    const normalizedRoot = normalizePath(scopeRoot);
    if (normalized.startsWith(normalizedRoot)) {
      return normalized.substring(normalizedRoot.length + 1);
    }
    return filePath;
  } catch {
    return filePath;
  }
}
