import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import type { AuditFinding, AuditOptions, AuditSummary, Severity } from "./types.js";
import { isAllowed } from "./allowlist.js";

const SUPPORTED_EXTENSIONS = new Set([".md", ".markdown", ".json", ".yaml", ".yml", ".env", ".example", ".txt"]);

interface Rule {
  id: string;
  severity: Severity;
  pattern: RegExp;
  message: string;
  suggestion: string;
}

const RULES: Rule[] = [
  {
    id: "secret.openai-key",
    severity: "error",
    pattern: /\bsk-[A-Za-z0-9]{24,}\b/g,
    message: "Possible live OpenAI-style API key.",
    suggestion: "Replace with sk_test_example or <OPENAI_API_KEY>."
  },
  {
    id: "secret.slack-token",
    severity: "error",
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{12,}\b/g,
    message: "Possible live Slack token.",
    suggestion: "Replace with xoxb-example-token or <SLACK_TOKEN>."
  },
  {
    id: "secret.private-key",
    severity: "error",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    message: "Private key material appears in a public skill artifact.",
    suggestion: "Remove the key and document a placeholder path instead."
  },
  {
    id: "pii.email",
    severity: "warning",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    message: "Email address looks real rather than illustrative.",
    suggestion: "Use user@example.com or a role placeholder."
  },
  {
    id: "pii.phone",
    severity: "warning",
    pattern: /\b(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?[2-9]\d{2}[-.\s]?\d{4}\b/g,
    message: "Phone number looks real rather than illustrative.",
    suggestion: "Use +1-555-0100 or <PHONE_NUMBER>."
  },
  {
    id: "private.workspace-path",
    severity: "warning",
    pattern: /(?:\/Users\/|\/home\/)[A-Za-z0-9._-]+(?:\/[^\s`'")]*)?/g,
    message: "Local workspace path may reveal a private username or machine layout.",
    suggestion: "Use <WORKSPACE>/path or a relative fixture path."
  },
  {
    id: "side-effect.live-action",
    severity: "warning",
    pattern: /\b(send|publish|delete|charge|transfer|invite|email|post to|write to)\b/gi,
    message: "Live external-action language needs an approval boundary.",
    suggestion: "Clarify that the skill plans or drafts unless explicit approval is granted."
  }
];

export async function scan(options: AuditOptions): Promise<AuditSummary> {
  const files = await collectFiles(options.root, options.exclude ?? []);
  const findings: AuditFinding[] = [];
  let suppressedFindings = 0;

  for (const file of files) {
    const relativeFile = relative(options.root, file);
    const text = await readFile(file, "utf8");
    const result = scanText(text, relativeFile, options);
    findings.push(...result.findings);
    suppressedFindings += result.suppressedFindings;
  }

  if (!files.some((file) => relative(options.root, file).toLowerCase() === "skill.md")) {
    findings.push({
      file: "SKILL.md",
      line: 1,
      column: 1,
      severity: "error",
      ruleId: "skill.missing",
      message: "Skill bundle is missing SKILL.md.",
      suggestion: "Add SKILL.md with use cases, side-effect boundaries, approvals, and validation steps.",
      excerpt: ""
    });
  }

  findings.push(...(await missingSafetySectionFindings(files, options.root)));

  return {
    filesScanned: files.length,
    findings,
    suppressedFindings,
    maxSeverity: maxSeverity(findings),
    severityCounts: countBySeverity(findings),
    ruleCounts: countByRule(findings)
  };
}

function scanText(text: string, file: string, options: AuditOptions): { findings: AuditFinding[]; suppressedFindings: number } {
  const findings: AuditFinding[] = [];
  const lines = text.split(/\r?\n/);
  const allowlist = options.allowlist ?? { patterns: [], files: [] };
  let suppressedFindings = 0;

  for (const rule of RULES) {
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (rule.id === "side-effect.live-action" && /\b(does not|do not|must not|never)\b/i.test(line)) {
        continue;
      }
      const matches = line.matchAll(new RegExp(rule.pattern.source, rule.pattern.flags));
      for (const match of matches) {
        const value = match[0];
        if (isAllowed(value, file, allowlist)) {
          continue;
        }
        if (isSuppressed(rule.id, lines[index - 1])) {
          suppressedFindings += 1;
          continue;
        }
        findings.push({
          file,
          line: index + 1,
          column: (match.index ?? 0) + 1,
          severity: rule.severity,
          ruleId: rule.id,
          message: rule.message,
          suggestion: rule.suggestion,
          excerpt: redactExcerpt(line.trim())
        });
      }
    }
  }

  return { findings, suppressedFindings };
}

function isSuppressed(ruleId: string, previousLine: string | undefined): boolean {
  if (!previousLine) {
    return false;
  }

  const match = previousLine.match(/redaction-audit-ignore-next-line\s+([a-z0-9.*_-]+)/i);
  if (!match) {
    return false;
  }

  const scope = match[1].toLowerCase();
  return scope === "*" || ruleId === scope || ruleId.startsWith(`${scope}.`);
}

function redactExcerpt(line: string): string {
  let redacted = line;
  for (const sensitiveRule of RULES.filter((rule) => rule.id.startsWith("secret.") || rule.id.startsWith("pii.") || rule.id.startsWith("private."))) {
    redacted = redacted.replace(new RegExp(sensitiveRule.pattern.source, sensitiveRule.pattern.flags), placeholderFor(sensitiveRule.id));
  }
  return redacted;
}

function placeholderFor(ruleId: string): string {
  if (ruleId.startsWith("secret.")) {
    return "<REDACTED_SECRET>";
  }
  if (ruleId.startsWith("private.")) {
    return "<REDACTED_PATH>";
  }
  return "<REDACTED_PII>";
}

async function collectFiles(root: string, exclude: string[]): Promise<string[]> {
  const entry = await stat(root);
  if (entry.isFile()) {
    return [root];
  }

  const found: string[] = [];
  async function walk(directory: string): Promise<void> {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      if (item.name === "node_modules" || item.name === ".git" || item.name === "dist") {
        continue;
      }
      const fullPath = join(directory, item.name);
      const relativePath = relative(root, fullPath);
      if (isExcluded(relativePath, exclude)) {
        continue;
      }
      if (item.isDirectory()) {
        await walk(fullPath);
      } else if (isSupported(item.name)) {
        found.push(fullPath);
      }
    }
  }

  await walk(root);
  return found.sort();
}

function isExcluded(relativePath: string, exclude: string[]): boolean {
  const normalized = relativePath.replaceAll("\\", "/");
  return exclude.some((entry) => {
    const pattern = entry.replaceAll("\\", "/").replace(/^\.?\//, "").replace(/\/$/, "");
    return normalized === pattern || normalized.startsWith(`${pattern}/`);
  });
}

function isSupported(name: string): boolean {
  return [...SUPPORTED_EXTENSIONS].some((extension) => name.endsWith(extension));
}

async function missingSafetySectionFindings(files: string[], root: string): Promise<AuditFinding[]> {
  const skillFile = files.find((file) => relative(root, file).toLowerCase() === "skill.md");
  if (!skillFile) {
    return [];
  }

  const text = await readFile(skillFile, "utf8");
  const lower = text.toLowerCase();
  const requiredSections = [
    {
      id: "skill.section.side-effects",
      terms: ["side-effect", "side effect", "boundaries"],
      message: "SKILL.md does not describe side-effect boundaries.",
      suggestion: "Add a section that states which actions are read-only, draft-only, or require approval."
    },
    {
      id: "skill.section.approvals",
      terms: ["approval", "approve"],
      message: "SKILL.md does not describe approval requirements.",
      suggestion: "Add approval requirements before any external action or publication step."
    },
    {
      id: "skill.section.validation",
      terms: ["validation", "verification", "verify"],
      message: "SKILL.md does not describe validation steps.",
      suggestion: "Add commands or review steps that prove the skill output is ready to use."
    }
  ];

  return requiredSections
    .filter((section) => !section.terms.some((term) => lower.includes(term)))
    .map((section) => ({
      file: "SKILL.md",
      line: 1,
      column: 1,
      severity: "warning" as const,
      ruleId: section.id,
      message: section.message,
      suggestion: section.suggestion,
      excerpt: ""
    }));
}

function maxSeverity(findings: AuditFinding[]): Severity | "none" {
  if (findings.some((finding) => finding.severity === "error")) {
    return "error";
  }
  if (findings.some((finding) => finding.severity === "warning")) {
    return "warning";
  }
  if (findings.some((finding) => finding.severity === "info")) {
    return "info";
  }
  return "none";
}

function countBySeverity(findings: AuditFinding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { info: 0, warning: 0, error: 0 };
  for (const finding of findings) {
    counts[finding.severity] += 1;
  }
  return counts;
}

function countByRule(findings: AuditFinding[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const finding of findings) {
    counts[finding.ruleId] = (counts[finding.ruleId] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}
