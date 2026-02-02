# TDD: Competency Tracking — Technical Design

**Author:** Kit  
**Date:** 2026-02-02  
**Status:** Draft  
**Related:** [PRD: Competency Tracking](./prd-competency-tracking.md)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Commands                            │
│                  spp analyze  |  spp competency                  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Competency Module                           │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │   Analyzer  │→ │  Synthesizer │→ │  Profile Renderer      │  │
│  │  (commits)  │  │  (patterns)  │  │  (display/export)      │  │
│  └─────────────┘  └──────────────┘  └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Data Layer                                │
│     .spp/competency-log.jsonl  |  .spp/competency-profile.json  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Module Structure

```
src/
├── competency/
│   ├── index.ts              # Public API exports
│   ├── analyzer.ts           # Commit analysis logic
│   ├── synthesizer.ts        # Pattern → profile synthesis
│   ├── renderer.ts           # Profile display formatting
│   ├── skills.ts             # Skill taxonomy & definitions
│   ├── quality.ts            # Quality signal detection
│   ├── storage.ts            # Data persistence layer
│   └── types.ts              # TypeScript interfaces
├── commands/
│   ├── analyze.ts            # spp analyze command
│   └── competency.ts         # spp competency command
```

---

## Data Models

### types.ts

```typescript
// Skill identifier using hierarchical notation
// e.g., "typescript/generics", "patterns/error-handling"
type SkillId = string;

// Individual observation from commit analysis
interface SkillObservation {
  id: string;                          // UUID
  timestamp: string;                   // ISO date
  commitSha: string;                   // Git commit
  skillId: SkillId;                    // What skill was observed
  context: {
    file: string;                      // File path
    lines?: [number, number];          // Line range if applicable
    snippet?: string;                  // Code snippet (truncated)
  };
  quality: QualityAssessment;
  notes: string[];                     // AI observations
}

interface QualityAssessment {
  score: number;                       // 0-100
  signals: {
    positive: string[];                // Good patterns observed
    negative: string[];                // Areas for improvement
  };
  confidence: 'low' | 'medium' | 'high';
}

// Synthesized skill record in profile
interface SkillRecord {
  skillId: SkillId;
  displayName: string;
  category: SkillCategory;
  level: SkillLevel;
  exposureCount: number;
  lastPracticed: string;               // ISO date
  qualityTrend: QualityTrend;
  averageQuality: number;              // 0-100
  recentObservations: string[];        // Last 5 observation IDs
  notes: string[];                     // Synthesized insights
}

type SkillLevel = 'learning' | 'practicing' | 'proficient' | 'expert';
type QualityTrend = 'improving' | 'stable' | 'declining' | 'unknown';
type SkillCategory = 'language' | 'concept' | 'pattern' | 'domain';

// Full competency profile
interface CompetencyProfile {
  version: number;                     // Schema version
  lastUpdated: string;                 // ISO date
  lastCommitAnalyzed: string;          // Commit SHA
  skills: Record<SkillId, SkillRecord>;
  recommendations: Recommendation[];
  meta: {
    totalCommitsAnalyzed: number;
    totalObservations: number;
    analysisPeriod: {
      start: string;
      end: string;
    };
  };
}

interface Recommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  type: 'practice' | 'improve' | 'learn';
  skillId?: SkillId;
  title: string;
  description: string;
  actionable: string;                  // Specific action to take
}
```

---

## Component Details

### 1. Analyzer (`analyzer.ts`)

Responsible for extracting skill observations from commits.

```typescript
interface AnalyzerOptions {
  since?: string;          // Git date spec
  commit?: string;         // Specific commit
  maxCommits?: number;     // Limit
  exclude?: string[];      // Glob patterns
}

interface AnalysisResult {
  commitSha: string;
  observations: SkillObservation[];
  filesAnalyzed: number;
  tokensUsed: number;
}

class CommitAnalyzer {
  constructor(
    private repoPath: string,
    private aiClient: AIClient,
    private skillTaxonomy: SkillTaxonomy
  ) {}

  // Main entry point
  async analyze(options: AnalyzerOptions): Promise<AnalysisResult[]> {
    const commits = await this.getCommits(options);
    const results: AnalysisResult[] = [];
    
    for (const commit of commits) {
      const diff = await this.getCommitDiff(commit);
      const observations = await this.analyzeCommit(commit, diff);
      results.push({ commitSha: commit.sha, observations, ... });
    }
    
    return results;
  }

  // Analyze single commit with AI
  private async analyzeCommit(
    commit: GitCommit, 
    diff: string
  ): Promise<SkillObservation[]> {
    const prompt = this.buildAnalysisPrompt(commit, diff);
    const response = await this.aiClient.complete(prompt);
    return this.parseObservations(response, commit);
  }

  // Build prompt for AI analysis
  private buildAnalysisPrompt(commit: GitCommit, diff: string): string {
    return `
      Analyze this git commit for coding competencies.
      
      Commit: ${commit.sha}
      Message: ${commit.message}
      Author: ${commit.author}
      Date: ${commit.date}
      
      Diff:
      ${diff}
      
      For each skill demonstrated, provide:
      1. Skill ID (from taxonomy: ${this.skillTaxonomy.list()})
      2. Quality assessment (0-100)
      3. Positive signals (good patterns)
      4. Negative signals (areas for improvement)
      5. Brief notes
      
      Focus on substantive code changes. Ignore trivial changes.
      Return JSON array of observations.
    `;
  }
}
```

**Key Design Decisions:**

1. **Batch by commit** — Analyze one commit at a time for clear attribution
2. **Diff-based** — Look at changes, not full file contents (more focused, less tokens)
3. **AI-powered** — Use LLM for nuanced skill detection and quality assessment
4. **Structured output** — Request JSON for reliable parsing

### 2. Synthesizer (`synthesizer.ts`)

Aggregates observations into a coherent profile.

```typescript
class ProfileSynthesizer {
  constructor(private storage: CompetencyStorage) {}

  // Update profile with new observations
  async synthesize(observations: SkillObservation[]): Promise<CompetencyProfile> {
    const existing = await this.storage.loadProfile();
    
    for (const obs of observations) {
      this.updateSkillRecord(existing, obs);
    }
    
    this.calculateTrends(existing);
    this.generateRecommendations(existing);
    
    await this.storage.saveProfile(existing);
    return existing;
  }

  private updateSkillRecord(profile: CompetencyProfile, obs: SkillObservation) {
    const record = profile.skills[obs.skillId] ?? this.createNewRecord(obs.skillId);
    
    record.exposureCount++;
    record.lastPracticed = obs.timestamp;
    record.averageQuality = this.updateAverage(
      record.averageQuality, 
      obs.quality.score,
      record.exposureCount
    );
    record.recentObservations = [
      obs.id, 
      ...record.recentObservations.slice(0, 4)
    ];
    record.level = this.calculateLevel(record);
    
    profile.skills[obs.skillId] = record;
  }

  private calculateLevel(record: SkillRecord): SkillLevel {
    const { exposureCount, averageQuality } = record;
    
    if (exposureCount >= 20 && averageQuality >= 80) return 'expert';
    if (exposureCount >= 20 && averageQuality >= 60) return 'proficient';
    if (exposureCount >= 5) return 'practicing';
    return 'learning';
  }

  private calculateTrends(profile: CompetencyProfile) {
    // Compare recent observations vs older ones
    // Look at quality score trajectory
    // Set trend: improving / stable / declining
  }

  private generateRecommendations(profile: CompetencyProfile) {
    const recommendations: Recommendation[] = [];
    
    // Find neglected skills
    const neglected = this.findNeglectedSkills(profile);
    for (const skill of neglected) {
      recommendations.push({
        type: 'practice',
        priority: 'medium',
        skillId: skill.skillId,
        title: `Practice ${skill.displayName}`,
        description: `You haven't practiced this in ${daysSince(skill.lastPracticed)} days`,
        actionable: `Try incorporating ${skill.displayName} in your next task`
      });
    }
    
    // Find declining skills
    const declining = this.findDecliningSkills(profile);
    for (const skill of declining) {
      recommendations.push({
        type: 'improve',
        priority: 'high',
        skillId: skill.skillId,
        title: `Review ${skill.displayName}`,
        description: `Quality has been declining in recent commits`,
        actionable: skill.notes[0] ?? 'Review recent code for patterns to improve'
      });
    }
    
    // Find skills ready to level up
    const almostThere = this.findAlmostLevelUp(profile);
    // ...
    
    profile.recommendations = recommendations.slice(0, 5); // Top 5
  }
}
```

### 3. Skill Taxonomy (`skills.ts`)

Defines the universe of trackable skills.

```typescript
interface SkillDefinition {
  id: SkillId;
  displayName: string;
  category: SkillCategory;
  description: string;
  signals: {
    positive: string[];    // Patterns indicating good use
    negative: string[];    // Anti-patterns
  };
  parent?: SkillId;        // For hierarchy
}

const SKILL_TAXONOMY: SkillDefinition[] = [
  // Languages
  {
    id: 'lang/typescript',
    displayName: 'TypeScript',
    category: 'language',
    description: 'TypeScript language proficiency',
    signals: {
      positive: ['proper type annotations', 'generic usage', 'type guards'],
      negative: ['excessive any', 'type assertions without checks']
    }
  },
  {
    id: 'lang/typescript/generics',
    displayName: 'TypeScript Generics',
    category: 'language',
    parent: 'lang/typescript',
    description: 'Generic type parameters and constraints',
    signals: {
      positive: ['constrained generics', 'utility types', 'mapped types'],
      negative: ['unconstrained T', 'overly complex generics']
    }
  },
  
  // Concepts
  {
    id: 'concept/async',
    displayName: 'Async Programming',
    category: 'concept',
    description: 'Asynchronous code patterns',
    signals: {
      positive: ['proper await', 'error handling in async', 'Promise.all for parallel'],
      negative: ['unhandled promises', 'unnecessary await', 'callback hell']
    }
  },
  {
    id: 'concept/error-handling',
    displayName: 'Error Handling',
    category: 'concept',
    description: 'Exception and error management',
    signals: {
      positive: ['specific catch blocks', 'error recovery', 'user-friendly messages'],
      negative: ['empty catch', 'swallowed errors', 'generic error handling']
    }
  },
  {
    id: 'concept/testing',
    displayName: 'Testing',
    category: 'concept',
    description: 'Writing and maintaining tests',
    signals: {
      positive: ['test coverage', 'edge cases', 'clear test names'],
      negative: ['no assertions', 'flaky tests', 'testing implementation details']
    }
  },
  
  // Patterns
  {
    id: 'pattern/refactoring',
    displayName: 'Refactoring',
    category: 'pattern',
    description: 'Code improvement without behavior change',
    signals: {
      positive: ['extract function', 'rename for clarity', 'reduce duplication'],
      negative: ['refactor + feature in same commit', 'breaking changes']
    }
  },
  
  // ... more skills
];

class SkillTaxonomy {
  private skills: Map<SkillId, SkillDefinition>;
  
  list(): SkillId[] { ... }
  get(id: SkillId): SkillDefinition | undefined { ... }
  getByCategory(category: SkillCategory): SkillDefinition[] { ... }
  getChildren(parentId: SkillId): SkillDefinition[] { ... }
}
```

### 4. Storage (`storage.ts`)

Handles persistence of observations and profile.

```typescript
class CompetencyStorage {
  private basePath: string;  // .spp/
  
  constructor(repoPath: string) {
    this.basePath = path.join(repoPath, '.spp');
  }

  // Append observations to log (JSONL format)
  async appendObservations(observations: SkillObservation[]): Promise<void> {
    const logPath = path.join(this.basePath, 'competency-log.jsonl');
    const lines = observations.map(o => JSON.stringify(o)).join('\n') + '\n';
    await fs.appendFile(logPath, lines);
  }

  // Load full observation log
  async loadObservations(): Promise<SkillObservation[]> {
    const logPath = path.join(this.basePath, 'competency-log.jsonl');
    const content = await fs.readFile(logPath, 'utf-8');
    return content.trim().split('\n').map(line => JSON.parse(line));
  }

  // Load/save profile
  async loadProfile(): Promise<CompetencyProfile> {
    const profilePath = path.join(this.basePath, 'competency-profile.json');
    try {
      const content = await fs.readFile(profilePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return this.createEmptyProfile();
    }
  }

  async saveProfile(profile: CompetencyProfile): Promise<void> {
    // Save JSON
    const jsonPath = path.join(this.basePath, 'competency-profile.json');
    await fs.writeFile(jsonPath, JSON.stringify(profile, null, 2));
    
    // Generate and save markdown
    const mdPath = path.join(this.basePath, 'competency-profile.md');
    const md = this.renderProfileMarkdown(profile);
    await fs.writeFile(mdPath, md);
  }

  // Get last analyzed commit
  async getLastAnalyzedCommit(): Promise<string | null> {
    const profile = await this.loadProfile();
    return profile.lastCommitAnalyzed ?? null;
  }
}
```

---

## Command Implementation

### `spp analyze`

```typescript
// commands/analyze.ts
import { Command } from 'commander';
import { CommitAnalyzer } from '../competency/analyzer';
import { ProfileSynthesizer } from '../competency/synthesizer';
import { CompetencyStorage } from '../competency/storage';

export const analyzeCommand = new Command('analyze')
  .description('Analyze commits for competency tracking')
  .option('--since <duration>', 'Analyze commits since duration (e.g., 7d, 1w)')
  .option('--commit <sha>', 'Analyze specific commit')
  .option('--full', 'Re-analyze all commits')
  .option('--dry-run', 'Show what would be analyzed')
  .action(async (options) => {
    const storage = new CompetencyStorage(process.cwd());
    const analyzer = new CommitAnalyzer(process.cwd(), aiClient, taxonomy);
    const synthesizer = new ProfileSynthesizer(storage);
    
    // Determine what to analyze
    let since = options.since;
    if (!since && !options.commit && !options.full) {
      // Default: since last analysis
      const lastCommit = await storage.getLastAnalyzedCommit();
      since = lastCommit ? `${lastCommit}..HEAD` : '7d';
    }
    
    console.log(`Analyzing commits ${since ?? options.commit ?? 'all'}...`);
    
    if (options.dryRun) {
      const commits = await analyzer.getCommits({ since, commit: options.commit });
      console.log(`Would analyze ${commits.length} commits.`);
      return;
    }
    
    // Run analysis
    const results = await analyzer.analyze({
      since,
      commit: options.commit,
      maxCommits: config.competency.maxCommitsPerAnalysis
    });
    
    // Persist observations
    const allObservations = results.flatMap(r => r.observations);
    await storage.appendObservations(allObservations);
    
    // Update profile
    const profile = await synthesizer.synthesize(allObservations);
    
    console.log(`✅ Analyzed ${results.length} commits, ${allObservations.length} observations.`);
    console.log(`Run 'spp competency' to view your profile.`);
  });
```

### `spp competency`

```typescript
// commands/competency.ts
import { Command } from 'commander';
import { CompetencyStorage } from '../competency/storage';
import { ProfileRenderer } from '../competency/renderer';

export const competencyCommand = new Command('competency')
  .alias('skills')
  .description('View your competency profile')
  .option('--json', 'Output as JSON')
  .option('--category <cat>', 'Filter by category')
  .action(async (options) => {
    const storage = new CompetencyStorage(process.cwd());
    const profile = await storage.loadProfile();
    
    if (options.json) {
      console.log(JSON.stringify(profile, null, 2));
      return;
    }
    
    const renderer = new ProfileRenderer();
    const output = renderer.render(profile, { category: options.category });
    console.log(output);
  });

competencyCommand
  .command('reset')
  .description('Reset all competency data')
  .action(async () => {
    const confirm = await promptConfirm('Delete all competency data?');
    if (!confirm) return;
    
    const storage = new CompetencyStorage(process.cwd());
    await storage.reset();
    console.log('✅ Competency data reset.');
  });
```

---

## API Cost Management

Commit analysis uses AI calls, which cost money. Strategies to manage:

1. **Batch commits** — Analyze multiple small commits in one prompt
2. **Diff size limits** — Skip or truncate very large diffs
3. **Max commits per run** — Default cap of 50 commits
4. **Caching** — Don't re-analyze already-processed commits
5. **Smart scheduling** — Daily batch vs. per-commit tradeoff

```typescript
interface CostEstimate {
  commits: number;
  estimatedTokens: number;
  estimatedCost: string;  // e.g., "$0.12"
}

async function estimateCost(options: AnalyzerOptions): Promise<CostEstimate> {
  const commits = await getCommits(options);
  const totalDiffSize = await getTotalDiffSize(commits);
  const estimatedTokens = Math.ceil(totalDiffSize / 4) + (commits.length * 500); // prompt overhead
  const estimatedCost = (estimatedTokens / 1000) * 0.003; // approximate
  return { commits: commits.length, estimatedTokens, estimatedCost: `$${estimatedCost.toFixed(2)}` };
}
```

---

## Testing Strategy

### Unit Tests

- `analyzer.test.ts` — Mock git commands, test parsing logic
- `synthesizer.test.ts` — Test aggregation, trends, recommendations
- `skills.test.ts` — Taxonomy integrity, hierarchy
- `storage.test.ts` — JSONL read/write, profile persistence

### Integration Tests

- End-to-end: create repo, make commits, run analyze, check profile
- Test with real (small) git history

### Fixtures

- Sample commits with known skill patterns
- Expected observations for each
- Expected profile after synthesis

---

## Migration & Compatibility

- **Schema versioning:** `profile.version` field for future migrations
- **Backward compat:** Old profiles without new fields get defaults
- **Forward compat:** Unknown fields preserved (JSON pass-through)

---

## Security Considerations

1. **No external transmission** — All data stays in `.spp/`
2. **Gitignore by default** — Add `.spp/competency-*` to `.gitignore` template
3. **Exclude sensitive paths** — Config option to skip certain directories
4. **Code snippets** — Truncate and sanitize before storing

---

## Open Implementation Questions

1. **Which AI model for analysis?** 
   - Use same model as spp sessions? Dedicated cheaper model?
   - Recommendation: Sonnet for cost/quality balance

2. **How to handle merge commits?**
   - Skip them? Analyze the merge result?
   - Recommendation: Skip, analyze individual commits only

3. **Multi-language repos?**
   - Detect language per file, tag observations accordingly
   - Skills can be language-specific or general

4. **Monorepo support?**
   - Analyze from repo root or subdirectory?
   - Consider path-based filtering

---

## Implementation Phases

### Phase 1: Core (Week 1-2)
- [ ] Data models and types
- [ ] Storage layer (JSONL + JSON)
- [ ] Basic analyzer (single commit)
- [ ] `spp analyze` command (manual trigger)
- [ ] Basic tests

### Phase 2: Synthesis (Week 2-3)
- [ ] Skill taxonomy (initial set)
- [ ] Profile synthesizer
- [ ] Trend calculation
- [ ] `spp competency` command
- [ ] Profile renderer (CLI output)

### Phase 3: Polish (Week 3-4)
- [ ] Recommendations engine
- [ ] Quality signals refinement
- [ ] Auto-analyze (config-based)
- [ ] Cost estimation
- [ ] Documentation

### Phase 4: Iteration (Ongoing)
- [ ] Expand skill taxonomy based on usage
- [ ] Tune quality heuristics
- [ ] User feedback integration
