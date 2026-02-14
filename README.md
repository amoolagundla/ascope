# ng-nav: Token-Efficient Angular Navigation Plugin

Angular navigation index with bundle-scoped file access for Claude Code.

## Problem

Claude Code scans entire Angular repos (90+ components, 45+ services) when fixing bugs, wasting tokens and context.

## Solution

- **Navigation index** - Components, services, guards, patterns
- **Bundle resolver** - Query → file allowlist
- **PreToolUse hook** - Blocks reads outside bundle

## Installation

```bash
# Plugin already installed at:
~/.claude/plugins/repos/ng-nav/

# Install dependencies
cd ~/.claude/plugins/repos/ng-nav
npm install

# Make scripts executable
chmod +x scripts/*.mjs hooks/*.mjs
```

## Token Savings Example

**Without ng-nav:**
```
Query: "Fix auth guard bug"
Claude scans: 262 files (~156,000 tokens)
Context pollution: High
```

**With ng-nav:**
```
Query: "Fix auth guard bug"
/ng-nav:fix auth guard

Resolved to 6 files:
- auth.guard.ts, api-auth.service.ts, login.component.ts, ...

Token Usage:
- Bundle: 12,450 tokens (6 files)
- Full project: 156,789 tokens (262 files)
- Savings: 144,339 tokens (92.1% reduction)
```

**Result:** 92% token reduction, faster responses, cleaner context

## Usage

### 1. Generate Index (One-Time)

**Option A: Store in Project (Recommended)**
```bash
/ng-nav:index /path/to/angular/project/src/app --local
```

**Option B: Store in Plugin Directory**
```bash
/ng-nav:index /path/to/angular/project/src/app
```

**Example (local storage):**
```bash
/ng-nav:index /mnt/c/Users/knimi/OneDrive/Documents/Gyglers.UI/Olympus.Gyglers.UI/src/app --local
```

**AI-Powered Summaries (Recommended):**
```bash
# Set API key first
export ANTHROPIC_API_KEY=your_api_key

# Index with AI summarization
/ng-nav:index /path/to/src/app --local

# Skip AI summarization (faster, but less descriptive summaries)
/ng-nav:index /path/to/src/app --local --no-llm
```

**Features:**
- **AI Summaries** - Claude analyzes each file and generates functional descriptions
- **JSDoc Extraction** - Pulls existing documentation from code comments
- **Pattern Detection** - Identifies DI, signals, RxJS, HTTP calls, Capacitor usage
- **Token Counting** - Accurate token estimation using js-tiktoken

**Output (with --local):**
- `<project-root>/nav/index.json` - Node catalog (components, services, guards) with token counts
- `<project-root>/nav/graph.json` - Dependency graph
- `<project-root>/nav/summaries/*.md` - AI-generated summaries + JSDoc + patterns
- `<project-root>/nav/.gitignore` - Excludes artifacts from git

**Output (without --local):**
- `~/.claude/plugins/repos/ng-nav/nav/*` - All files in plugin directory

**Recommendation:** Use `--local` to keep index with your project. Each developer can generate their own index.

### 2. Fix Issues with Bundle

```bash
/ng-nav:fix <query>
```

**Examples:**
```bash
/ng-nav:fix auth guard
/ng-nav:fix signals in dashboard
/ng-nav:fix geolocation capacitor
```

**What happens:**
1. Query resolves to 5-10 relevant files
2. Bundle activates (allowlist enforced)
3. Claude fixes bug using only those files
4. Bundle auto-deactivates when done

### Query Tips

- **Specific terms:** "auth", "dashboard", "geolocation"
- **Type filters:** "auth service", "login component"
- **Pattern-based:** "signals", "rxjs", "capacitor"
- **Combined:** "auth guard signals"

## Architecture

### Generated Artifacts

```
nav/
├── index.json              # Node catalog
├── graph.json              # Dependency graph
├── summaries/              # Per-node summaries
│   ├── component__login.component.ts.md
│   ├── service__auth.service.ts.md
│   └── guard__auth.guard.ts.md
└── .ng-nav-state.json      # Active bundle state
```

### Pattern Detection

**DI (Dependency Injection):**
- Constructor-based: `constructor(private foo: FooService)`
- inject()-based: `const router = inject(Router)`

**Signals:**
- `signal()`, `computed()`, `effect()`, `toSignal()`

**RxJS:**
- Operators: `map`, `switchMap`, `tap`, `catchError`, etc.
- Observables: `data$`, `users$`

**HTTP:**
- `this.http.get('/api/...')`, `this.http.post(...)`

**Capacitor:**
- `from '@capacitor/geolocation'`, etc.

### Bundle Lifecycle

1. **Activate:** `/ng-nav:fix <query>` writes `.ng-nav-state.json`
2. **Enforce:** PreToolUse hook blocks reads outside allowlist
3. **Deactivate:** Auto-deactivates after command completes

## File Types

- **Component** - `*.component.ts` or `@Component({`
- **Service** - `*.service.ts` or `@Injectable({`
- **Guard** - `*.guard.ts` or `implements CanActivate`
- **Interceptor** - `*.interceptor.ts`
- **Routes** - `*routes*.ts` or `app.routes.ts`
- **Model** - `*.model.ts`, `*.interface.ts`
- **Directive** - `*.directive.ts`
- **Pipe** - `*.pipe.ts`

## Development

### Regenerate Index

```bash
cd ~/.claude/plugins/repos/ng-nav
node scripts/indexer.mjs /path/to/src/app
```

### Test Bundle Resolution

```bash
node scripts/bundle.mjs "auth guard"
cat nav/.ng-nav-state.json
```

### Test Hook Guard

```bash
echo '{"tool_name":"Read","tool_input":{"file_path":"/path/to/auth.guard.ts"}}' | node hooks/pretooluse.mjs
```

### Deactivate Bundle Manually

```bash
node scripts/bundle.mjs --deactivate
```

## Configuration

**Environment Variables:**
- `NG_NAV_BUNDLE_SIZE` - Max nodes in bundle (default: 5)

**Example:**
```bash
export NG_NAV_BUNDLE_SIZE=10
/ng-nav:fix auth
```

## Troubleshooting

### "Navigation index not found"

Run `/ng-nav:index` first to generate the index.

### "No files found matching query"

Try broader terms:
- "auth" instead of "authentication"
- "component" instead of specific name
- "signals" for all signal usage

### "File not in active bundle"

Either:
1. Expand bundle: `/ng-nav:fix "current-query filename"`
2. Complete current fix and start new bundle

### Hook not working

```bash
# Verify hook registration
cat ~/.claude/plugins/repos/ng-nav/hooks/hooks.json

# Make hook executable
chmod +x ~/.claude/plugins/repos/ng-nav/hooks/pretooluse.mjs

# Test manually
echo '{"tool_name":"Read","tool_input":{"file_path":"/tmp/test.ts"}}' | node hooks/pretooluse.mjs
```

## Performance

**Token counting** - ng-nav uses `js-tiktoken` (same tokenizer as Claude) for accurate token estimation.

**Example project (262 TypeScript files):**

Without ng-nav:
- Claude scans entire repo: 262 files
- Estimated token usage: 156,789 tokens
- High context pollution

With ng-nav:
- Bundle resolver finds 6 relevant files
- Estimated token usage: 12,450 tokens
- Token savings: 144,339 tokens (92% reduction)

**Token usage display** - Shown after bundle resolution, before Claude reads files:
```
Token Usage (estimated for this fix):
- Bundle will use: 12,450 tokens (6 files)
- Full project would use: 156,789 tokens (262 files)
- Savings: 144,339 tokens (92.1% reduction)
```

## Target Project

- **Path:** `/mnt/c/Users/knimi/OneDrive/Documents/Gyglers.UI/Olympus.Gyglers.UI/`
- **Stack:** Angular 19, Signals, RxJS, Capacitor
- **Size:** 90+ components, 45+ services
- **Patterns:** Modern `inject()` DI, signals, RxJS observables

## Future Enhancements

- TypeScript AST parsing (100% accurate DI extraction)
- Template selector resolution (component usage graph)
- Hot-reload index on file changes
- Multi-bundle support
- Bundle visualization
- Angular Language Service integration

## License

MIT
