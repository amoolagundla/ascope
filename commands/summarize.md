---
description: Generate AI summaries for indexed components using Claude Code
argument-hint: [--batch-size N]
allowed-tools: [Read, Write, Glob]
---

Generate AI-powered functional summaries for all indexed Angular files using Claude Code session.

**Process:**
1. Read nav/index.json to get list of all files
2. For each file without AI summary:
   - Read the TypeScript source
   - Generate 2-3 sentence functional description
   - Update summary markdown file
3. Show progress every 10 files
4. Report final statistics

**Features:**
- Uses current Claude Code session (no API key needed)
- Focuses on WHAT components do, not HOW
- Updates existing summary files with AI descriptions
- Batch processing with progress indicators
- Skips files that already have AI summaries

**Usage:**
```bash
/ng-nav:summarize
```

**Options:**
- `--batch-size N`: Process N files at a time (default: 10)
- `--force`: Regenerate summaries even if they exist

**Example Output:**
```
Generating AI summaries using Claude Code session...
Found 262 files in index

Processing batch 1 (files 1-10)...
  ✓ GeofencePopupComponent
  ✓ AuthGuard
  ✓ ApiAuthService
  ...

Processing batch 2 (files 11-20)...
  ...

Summary generation complete:
- AI summaries: 262/262 files
- Skipped (already done): 0 files
- Failed: 0 files
```

**Note:** This leverages your active Claude Code session, so no separate API key is required.
