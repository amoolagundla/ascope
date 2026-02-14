---
description: Fix issues using bundle-scoped navigation
argument-hint: <query>
allowed-tools: [Bash, Read, Write, Edit, Grep]
---

Resolve query to relevant files, activate bundle, fix issues.

**Process:**
1. Parse query from arguments (e.g., "auth guard", "signals in dashboard")
2. Run bundle resolver to find relevant files
3. Activate bundle (write nav/.ng-nav-state.json allowlist)
4. PreToolUse hook enforces file restrictions
5. Fix using only allowed files
6. Deactivate bundle on completion

**Examples:**
- `/ng-nav:fix auth guard` → auth.guard.ts, auth.service.ts, login.component.ts
- `/ng-nav:fix signals` → all files using signal(), computed(), effect()
- `/ng-nav:fix geolocation` → geolocation.service.ts, capacitor imports

**Bundle:** Active only during this command execution.

**Query Tips:**
- Use specific terms: "auth", "dashboard", "geolocation"
- Combine with type: "auth service", "login component"
- Pattern-based: "signals", "rxjs", "capacitor"
- Combine multiple: "auth guard signals"
