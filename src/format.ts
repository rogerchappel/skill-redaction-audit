import type { AuditSummary } from "./types.js";

export function formatJson(summary: AuditSummary): string {
  return `${JSON.stringify(summary, null, 2)}\n`;
}

export function formatMarkdown(summary: AuditSummary): string {
  const lines = [
    "# Skill Redaction Audit",
    "",
    `Files scanned: ${summary.filesScanned}`,
    `Max severity: ${summary.maxSeverity}`,
    `Findings: ${summary.findings.length}`,
    `Suppressed findings: ${summary.suppressedFindings}`,
    ""
  ];

  if (summary.findings.length === 0) {
    lines.push("No redaction or side-effect findings detected.", "");
    return lines.join("\n");
  }

  lines.push("| Severity | Rule | Location | Finding | Suggestion |", "|---|---|---|---|---|");
  for (const finding of summary.findings) {
    lines.push(
      `| ${finding.severity} | ${finding.ruleId} | ${finding.file}:${finding.line}:${finding.column} | ${escapePipe(finding.message)} | ${escapePipe(finding.suggestion)} |`
    );
  }
  lines.push("");
  return lines.join("\n");
}

function escapePipe(value: string): string {
  return value.replaceAll("|", "\\|");
}
