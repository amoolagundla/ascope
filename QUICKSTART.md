# ng-nav Quick Start Guide

## What is ng-nav?

Token-efficient Angular navigation plugin that prevents Claude from scanning your entire Angular repo when fixing bugs.

**Problem:** Claude scans 90+ components → wastes tokens
**Solution:** Claude only reads 5-10 relevant files → 90% token reduction

## Installation

Already installed at: `~/.claude/plugins/repos/ng-nav/`

## First Time Setup

### Step 1: Generate Navigation Index

**With local storage (recommended):**
```bash
/ng-nav:index /mnt/c/Users/knimi/OneDrive/Documents/Gyglers.UI/Olympus.Gyglers.UI/src/app --local
```

**Or store in plugin directory:**
```bash
/ng-nav:index /mnt/c/Users/knimi/OneDrive/Documents/Gyglers.UI/Olympus.Gyglers.UI/src/app
```

**Output:**
```
Using local project directory: .../Olympus.Gyglers.UI/nav
Scanning Angular project...
Found 262 TypeScript files

Indexing complete:
- Components: 128
- Services: 89
- Guards: 5
...

Generated 262 summaries
Index ready at .../Olympus.Gyglers.UI/nav/
```

**Note:**
- Use `--local` to store nav files in your project (excluded from git via .gitignore)
- Only run this once, or when your codebase changes significantly
- Each developer can generate their own index

## Daily Usage

### Fix Auth Bug

```bash
/ng-nav:fix auth guard
```

**What happens:**
1. Finds 6 relevant files (auth.guard.ts, auth.service.ts, etc.)
2. Activates bundle (only these files can be read)
3. You fix the bug using only those files
4. Bundle auto-deactivates when done

### Fix Signal Issues

```bash
/ng-nav:fix signals
```

Finds all files using `signal()`, `computed()`, `effect()`

### Fix Capacitor/Native Issues

```bash
/ng-nav:fix geolocation capacitor
```

Finds all geolocation-related services and Capacitor imports

### Fix Specific Component

```bash
/ng-nav:fix dashboard component
```

Finds dashboard.component.ts and its dependencies

## Query Tips

**Good queries:**
- `auth` - Finds auth guard, auth service, login component
- `signals` - Finds files with heavy signal usage
- `rxjs` - Finds files with RxJS operators
- `capacitor` - Finds native plugin usage
- `auth guard signals` - Combines multiple criteria

**Bad queries:**
- Too specific: `AuthenticationGuardService` (just use "auth")
- Too vague: `code` (everything is code)

## Common Workflows

### Scenario 1: Auth Bug
```bash
User: "The auth guard is failing"
You: /ng-nav:fix auth guard
You: [Read and fix auth.guard.ts, auth.service.ts]
```

### Scenario 2: Signal Refactoring
```bash
User: "Convert all signals to use new syntax"
You: /ng-nav:fix signals
You: [Read and update signal-heavy components]
```

### Scenario 3: Geolocation Issue
```bash
User: "Geolocation not working on iOS"
You: /ng-nav:fix geolocation capacitor
You: [Read and fix geolocation services]
```

## What Files Are Included in a Bundle?

When you run `/ng-nav:fix auth guard`, the plugin:

1. **Scores** all 262 nodes by relevance
2. **Selects** top 5-10 matches
3. **Expands** to include direct dependencies
4. **Activates** bundle (hook enforces restrictions)

**Example bundle for "auth guard":**
- auth.guard.ts (primary match)
- document.guard.ts (type match: guard)
- consent.guard.ts (type match: guard)
- first-install.guard.ts (type match: guard)
- onboarding.guard.ts (type match: guard)
- document-status.service.ts (dependency of guard)

## What Happens When Bundle is Active?

**Allowed:**
- Read files in the bundle
- Read navigation artifacts (index.json, summaries)
- Run tests
- Grep within bundle scope

**Blocked:**
- Read files outside bundle
- Glob outside bundle scope
- Bash destructive commands (rm, mv, cp)

**Error message when blocked:**
```
ng-nav: File not in active bundle: pages/dashboard/dashboard.component.ts

Active bundle: bundle:auth-guard:2026-02-14T21:22:20.958Z
Query: "auth guard"

To access this file:
1. Expand bundle: /ng-nav:fix "auth guard dashboard.component.ts"
2. Or deactivate bundle (complete current fix first)
```

## Manual Bundle Control

### Deactivate Bundle
```bash
node ~/.claude/plugins/repos/ng-nav/scripts/bundle.mjs --deactivate
```

### Check Current Bundle
```bash
cat ~/.claude/plugins/repos/ng-nav/nav/.ng-nav-state.json
```

### Regenerate Index (After Major Codebase Changes)
```bash
node ~/.claude/plugins/repos/ng-nav/scripts/indexer.mjs /path/to/src/app
```

## Troubleshooting

### "Navigation index not found"
**Solution:** Run `/ng-nav:index` first

### "No files found matching query"
**Solution:** Use broader terms ("auth" instead of "authentication")

### "File not in active bundle"
**Solution 1:** Expand query: `/ng-nav:fix "auth dashboard"`
**Solution 2:** Deactivate and start fresh

### Hook Not Working
```bash
# Make sure hook script is executable
chmod +x ~/.claude/plugins/repos/ng-nav/hooks/pretooluse.mjs

# Test manually
echo '{"tool_name":"Read","tool_input":{"file_path":"/tmp/test.ts"}}' | node hooks/pretooluse.mjs
```

## Performance

**Traditional approach (without ng-nav):**
- Scans: 262 files
- Tokens: ~100K
- Time: Slow
- Context: Polluted

**With ng-nav:**
- Scans: 5-10 files
- Tokens: ~10K
- Time: Fast
- Context: Clean

**Result: 90% token reduction**

## Configuration

### Change Bundle Size
```bash
export NG_NAV_BUNDLE_SIZE=10  # Default is 5
/ng-nav:fix auth
```

Larger bundles = more context but more tokens

## File Structure

```
~/.claude/plugins/repos/ng-nav/
├── commands/           # /ng-nav:index, /ng-nav:fix
├── hooks/              # PreToolUse hook guard
├── scripts/            # Indexer, bundle resolver
├── nav/                # Generated artifacts
│   ├── index.json      # 262 nodes
│   ├── graph.json      # Dependencies
│   └── summaries/      # 256 markdown files
└── README.md           # Full documentation
```

## Key Concepts

### Index
Catalog of all Angular files with metadata (type, dependencies, patterns)

### Bundle
Subset of files (5-10) relevant to your query

### Hook Guard
Enforces bundle restrictions (blocks reads outside allowlist)

### Query
Search term that resolves to a bundle ("auth", "signals", etc.)

### Patterns
Code patterns detected: DI, Signals, RxJS, HTTP, Capacitor

## Supported File Types

- **Component** - `*.component.ts`
- **Service** - `*.service.ts`
- **Guard** - `*.guard.ts`
- **Interceptor** - `*.interceptor.ts`
- **Routes** - `*routes*.ts`
- **Model** - `*.model.ts`
- **Directive** - `*.directive.ts`
- **Pipe** - `*.pipe.ts`

## Detected Patterns

### Dependency Injection
- `constructor(private foo: FooService)`
- `const router = inject(Router)`

### Signals
- `signal(initialValue)`
- `computed(() => ...)`
- `effect(() => ...)`
- `toSignal(observable$)`

### RxJS
- `.pipe(map(...), switchMap(...))`
- `data$`, `users$`, `loading$`

### HTTP
- `this.http.get('/api/...')`
- `this.http.post(...)`

### Capacitor
- `from '@capacitor/geolocation'`
- `from '@capacitor/camera'`

## Best Practices

1. **Run index once** - Only regenerate when codebase changes significantly
2. **Use specific queries** - "auth guard" is better than "code"
3. **Complete fixes in bundle** - Don't leave bundles active across sessions
4. **Combine patterns** - "auth signals rxjs" narrows results
5. **Expand when needed** - Add more terms if bundle too narrow

## Examples

### Example 1: Fix Login Bug
```
User: "Login button doesn't work"
You: /ng-nav:fix login component
[Bundle: login.component.ts, auth.service.ts, api-auth.service.ts]
You: [Fix bug in login.component.ts]
```

### Example 2: Refactor Signals
```
User: "Convert dashboard to use signals"
You: /ng-nav:fix dashboard signals
[Bundle: dashboard.component.ts, related services]
You: [Refactor to signals]
```

### Example 3: Fix Geofencing
```
User: "Geofencing not working"
You: /ng-nav:fix geofencing capacitor
[Bundle: geofencing.service.ts, geolocation services]
You: [Debug Capacitor plugin]
```

## Next Steps

1. **Index your project:** `/ng-nav:index /path/to/src/app`
2. **Try a query:** `/ng-nav:fix auth`
3. **Fix a bug:** Use only the bundled files
4. **See token reduction:** Check context size

## Learn More

- Full docs: `~/.claude/plugins/repos/ng-nav/README.md`
- Implementation: `~/.claude/plugins/repos/ng-nav/IMPLEMENTATION.md`
- Verification: `~/.claude/plugins/repos/ng-nav/VERIFICATION.md`

## Support

Issues or questions? Check the README or examine test results in VERIFICATION.md.

---

**Ready to use! Start with:** `/ng-nav:index /path/to/your/angular/src/app`
