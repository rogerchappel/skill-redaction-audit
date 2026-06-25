export type Severity = "info" | "warning" | "error";

export interface AuditFinding {
  file: string;
  line: number;
  column: number;
  severity: Severity;
  ruleId: string;
  message: string;
  suggestion: string;
  excerpt: string;
}

export interface AuditOptions {
  root: string;
  allowlist?: Allowlist;
  exclude?: string[];
}

export interface Allowlist {
  patterns: string[];
  files: string[];
}

export interface AuditSummary {
  filesScanned: number;
  findings: AuditFinding[];
  suppressedFindings: number;
  maxSeverity: Severity | "none";
}
