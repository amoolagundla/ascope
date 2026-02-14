#!/usr/bin/env node

/**
 * Shared patterns and utilities for Angular codebase analysis
 */

export const patterns = {
  // DI: constructor(private foo: FooService, public bar: BarService)
  constructorDI: /constructor\s*\([^)]*\b(?:private|public|protected)\s+(\w+):\s*([A-Za-z0-9_]+)/g,

  // DI: const router = inject(Router);
  injectDI: /const\s+(\w+)\s*=\s*inject\(([A-Za-z0-9_]+)\)/g,

  // Signals: signal<boolean>(false), computed(() => ...)
  signals: /\b(signal|computed|effect|toSignal)\s*<?[^>]*>?\s*\(/g,

  // RxJS: .pipe(map(...), switchMap(...))
  rxjsPipe: /\.(pipe|subscribe)\s*\(/g,
  rxjsOperators: /\b(map|filter|tap|switchMap|mergeMap|concatMap|catchError|finalize|shareReplay|retry|take|takeUntil|debounceTime|distinctUntilChanged|exhaustMap|withLatestFrom|combineLatest|forkJoin)\s*\(/g,

  // Observables: private data$ = ...
  observables: /\b([A-Za-z0-9_]+)\$\s*[:=]/g,

  // HTTP: this.http.post('/api/auth', body)
  httpCalls: /this\.http\.(get|post|put|delete|patch)\s*<?[^>]*>?\s*\(\s*['"`]([^'"`]+)['"`]/g,

  // Capacitor: from '@capacitor/geolocation'
  capacitor: /from\s+['"](@capacitor\/[^'"]+)['"]/g,

  // Routes: { path: 'login', component: LoginComponent }
  routes: /path:\s*['"]([^'"]+)['"]/g,

  // Component decorator
  componentDecorator: /@Component\s*\(/,

  // Injectable decorator
  injectableDecorator: /@Injectable\s*\(/,

  // CanActivate interface
  canActivate: /implements\s+CanActivate/,
};

/**
 * Extract all DI dependencies from file content
 */
export function extractDependencies(content) {
  const deps = new Set();

  // Constructor-based DI
  const constructorMatches = content.matchAll(patterns.constructorDI);
  for (const match of constructorMatches) {
    deps.add(match[2]); // Service name (e.g., "FooService")
  }

  // inject() DI
  const injectMatches = content.matchAll(patterns.injectDI);
  for (const match of injectMatches) {
    deps.add(match[2]); // Service name (e.g., "Router")
  }

  return Array.from(deps);
}

/**
 * Extract signal usage patterns
 */
export function extractSignals(content) {
  const signals = [];
  const matches = content.matchAll(patterns.signals);
  for (const match of matches) {
    signals.push(match[1]); // signal, computed, effect, toSignal
  }
  return signals;
}

/**
 * Extract RxJS operators
 */
export function extractRxJSOperators(content) {
  const operators = new Set();
  const matches = content.matchAll(patterns.rxjsOperators);
  for (const match of matches) {
    operators.add(match[1]);
  }
  return Array.from(operators);
}

/**
 * Extract HTTP endpoints
 */
export function extractHttpEndpoints(content) {
  const endpoints = [];
  const matches = content.matchAll(patterns.httpCalls);
  for (const match of matches) {
    endpoints.push({
      method: match[1].toUpperCase(),
      url: match[2]
    });
  }
  return endpoints;
}

/**
 * Extract Capacitor plugins
 */
export function extractCapacitorPlugins(content) {
  const plugins = new Set();
  const matches = content.matchAll(patterns.capacitor);
  for (const match of matches) {
    plugins.add(match[1]);
  }
  return Array.from(plugins);
}

/**
 * Extract observable declarations
 */
export function extractObservables(content) {
  const observables = new Set();
  const matches = content.matchAll(patterns.observables);
  for (const match of matches) {
    observables.add(match[1] + '$');
  }
  return Array.from(observables);
}

/**
 * Extract route paths
 */
export function extractRoutes(content) {
  const routes = [];
  const matches = content.matchAll(patterns.routes);
  for (const match of matches) {
    routes.push(match[1]);
  }
  return routes;
}

/**
 * Classify file type based on filename and content
 */
export function classifyFile(filePath, content) {
  const fileName = filePath.split('/').pop();

  // Component
  if (fileName.endsWith('.component.ts') || patterns.componentDecorator.test(content)) {
    return 'component';
  }

  // Service
  if (fileName.endsWith('.service.ts') || patterns.injectableDecorator.test(content)) {
    return 'service';
  }

  // Guard
  if (fileName.endsWith('.guard.ts') || patterns.canActivate.test(content)) {
    return 'guard';
  }

  // Interceptor
  if (fileName.endsWith('.interceptor.ts')) {
    return 'interceptor';
  }

  // Routes
  if (fileName.includes('routes') || fileName === 'app.routes.ts') {
    return 'routes';
  }

  // Model/Interface
  if (fileName.endsWith('.model.ts') || fileName.endsWith('.interface.ts')) {
    return 'model';
  }

  // Directive
  if (fileName.endsWith('.directive.ts')) {
    return 'directive';
  }

  // Pipe
  if (fileName.endsWith('.pipe.ts')) {
    return 'pipe';
  }

  return 'other';
}

/**
 * Extract file name without extension
 */
export function getFileName(filePath) {
  const fileName = filePath.split('/').pop();
  return fileName.replace(/\.ts$/, '');
}

/**
 * Generate unique node ID from file path
 */
export function generateNodeId(type, filePath) {
  const fileName = filePath.split('/').pop();
  return `${type}:${fileName}`;
}

/**
 * Truncate content to max length
 */
export function truncate(content, maxLength = 4500) {
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength) + '\n\n[... truncated to 4500 chars ...]';
}

/**
 * Extract class name from file content
 */
export function extractClassName(content) {
  const classMatch = content.match(/export\s+class\s+(\w+)/);
  if (classMatch) {
    return classMatch[1];
  }

  // Try function name for functional components/guards
  const funcMatch = content.match(/export\s+(?:const|function)\s+(\w+)/);
  if (funcMatch) {
    return funcMatch[1];
  }

  return null;
}
