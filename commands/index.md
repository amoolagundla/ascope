---
description: Generate Angular navigation index
argument-hint: [target-dir]
allowed-tools: [Bash, Read, Write, Glob]
---

Generate navigation index from Angular codebase.

**Process:**
1. Verify target directory (defaults to cwd, expects src/app/)
2. Run indexer to scan TypeScript files
3. Generate nav/index.json, nav/graph.json, nav/summaries/*.md
4. Report stats (components, services, guards, signals, RxJS, Capacitor)

**Output:** Artifacts written to `~/.claude/plugins/repos/ng-nav/nav/`

**Usage:**
```bash
/ng-nav:index /path/to/angular/project/src/app
```

**Example:**
```bash
/ng-nav:index /mnt/c/Users/knimi/OneDrive/Documents/Gyglers.UI/Olympus.Gyglers.UI/src/app
```
