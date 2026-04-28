import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

type Role = "ADMIN" | "MANAGER" | "SECURITY_ENGINEER" | "ANALYST" | "AUDITOR";

type StoredUser = {
  id: number;
  email: string;
  role: Role;
};

type DbUser = {
  id: number;
  email: string;
  role: string;
  enabled?: boolean;
};

type AlertItem = {
  id: number;
  source: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  createdAt: string;
};

type IncidentItem = {
  id: number;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "closed";
  source: "manual" | "rule_based" | "ml_based";
  confidenceScore: number;
  assignedUser: string;
  createdAt: string;
};

type PlaybookItem = {
  id: number;
  name: string;
  description: string;
  automated: boolean;
  runs: number;
  successRate: number;
  steps: Array<{
    id: number;
    stepOrder: number;
    actionType: "API_CALL" | "EMAIL" | "SCRIPT";
    label: string;
    config: string;
  }>;
};

type AuditItem = {
  id: number;
  actor: string;
  action: string;
  details: string;
  timestamp: string;
  surface: string;
};

type ExecutionItem = {
  id: number;
  playbook: string;
  incidentId: number;
  status: "running" | "success" | "failed";
  startedAt: string;
  duration: string;
};

type IncidentAlertLink = {
  incidentId: number;
  alertIds: number[];
};

type AutomationRuleItem = {
  id: number;
  name: string;
  condition: string;
  action: string;
  enabled: boolean;
};

type AuditorReportType =
  | "compliance"
  | "risk"
  | "policy"
  | "system_controls";

type CommitItem = {
  id: string;
  title: string;
  summary: string;
  author: string;
  timestamp: string;
  scope: string;
  status: "merged" | "review" | "draft";
};

type TaskItem = {
  id: number;
  title: string;
  priority: "low" | "medium" | "high";
  status: "queued" | "in_progress" | "done";
  owner: string;
  due: string;
};

type MailThread = {
  id: number;
  mailbox: string;
  kind: "direct" | "group";
  participants: string[];
  subject: string;
  unread: boolean;
  tag: string;
  preview: string;
  messages: Array<{
    sender: string;
    timestamp: string;
    body: string;
  }>;
};

type MeetingItem = {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  participants: string[];
  organizer: string;
  type: "daily" | "planning" | "incident" | "review";
};

type DailyUpdateItem = {
  id: number;
  author: string;
  role: string;
  focus: string;
  blockers: string;
  nextStep: string;
  timestamp: string;
};

const alerts: AlertItem[] = [
  {
    id: 2041,
    source: "SIEM / Edge Firewall",
    severity: "critical",
    message: "High-volume brute force detected against VPN gateway.",
    createdAt: "09:12",
  },
  {
    id: 2042,
    source: "Mail Security",
    severity: "high",
    message: "Malicious attachment quarantined for finance mailbox.",
    createdAt: "09:25",
  },
  {
    id: 2043,
    source: "EDR",
    severity: "medium",
    message: "Unsigned PowerShell execution on workstation WS-114.",
    createdAt: "10:04",
  },
  {
    id: 2044,
    source: "Identity Provider",
    severity: "low",
    message: "Repeated MFA fatigue requests from foreign IP.",
    createdAt: "10:18",
  },
];

const incidents: IncidentItem[] = [
  {
    id: 801,
    title: "VPN brute force campaign",
    description: "Correlated from 3 alerts and elevated by ML due to lateral movement pattern.",
    severity: "critical",
    status: "in_progress",
    source: "ml_based",
    confidenceScore: 0.94,
    assignedUser: "mihai.ionescu",
    createdAt: "08:57",
  },
  {
    id: 802,
    title: "Suspicious mailbox forwarding rule",
    description: "Rule-based detection on finance mailbox with suspicious destination.",
    severity: "high",
    status: "open",
    source: "rule_based",
    confidenceScore: 0.82,
    assignedUser: "unassigned",
    createdAt: "09:21",
  },
  {
    id: 803,
    title: "Possible false positive on PowerShell script",
    description: "Execution resembles IT automation playbook triggered during patching.",
    severity: "medium",
    status: "open",
    source: "ml_based",
    confidenceScore: 0.61,
    assignedUser: "mihai.ionescu",
    createdAt: "10:10",
  },
];

const playbooks: PlaybookItem[] = [
  {
    id: 31,
    name: "Contain Suspicious Endpoint",
    description: "Isolate host, notify analyst and enrich ticket with endpoint telemetry.",
    automated: true,
    runs: 48,
    successRate: 96,
    steps: [
      {
        id: 1,
        stepOrder: 1,
        actionType: "API_CALL",
        label: "Call EDR isolate endpoint API",
        config: '{ "provider": "SentinelOne", "mode": "network_isolation" }',
      },
      {
        id: 2,
        stepOrder: 2,
        actionType: "EMAIL",
        label: "Send analyst notification",
        config: '{ "to": "soc@local.dev", "template": "endpoint-contained" }',
      },
      {
        id: 3,
        stepOrder: 3,
        actionType: "SCRIPT",
        label: "Enrich incident with process tree",
        config: '{ "script": "collect_process_tree.sh" }',
      },
    ],
  },
  {
    id: 32,
    name: "Block Malicious IP",
    description: "Push firewall block rule and create a change trace in audit logs.",
    automated: true,
    runs: 76,
    successRate: 92,
    steps: [
      {
        id: 4,
        stepOrder: 1,
        actionType: "API_CALL",
        label: "Create temporary firewall deny rule",
        config: '{ "provider": "Palo Alto", "ttl_minutes": 90 }',
      },
      {
        id: 5,
        stepOrder: 2,
        actionType: "SCRIPT",
        label: "Write evidence to artifact bucket",
        config: '{ "script": "archive_ioc.py" }',
      },
    ],
  },
];

const auditLogs: AuditItem[] = [
  {
    id: 701,
    actor: "admin@local.dev",
    action: "ROLE_CHANGE",
    details: "Changed anca.popescu from ANALYST to SECURITY_ENGINEER.",
    timestamp: "2026-04-15 08:32",
    surface: "users",
  },
  {
    id: 702,
    actor: "anca.popescu@local.dev",
    action: "PLAYBOOK_UPDATE",
    details: "Updated step config for Block Malicious IP playbook.",
    timestamp: "2026-04-15 09:05",
    surface: "playbooks",
  },
  {
    id: 703,
    actor: "mihai.ionescu@local.dev",
    action: "INCIDENT_STATUS_CHANGE",
    details: "Closed incident #784 as false positive.",
    timestamp: "2026-04-15 09:41",
    surface: "incidents",
  },
  {
    id: 704,
    actor: "system",
    action: "ML_THRESHOLD_UPDATE",
    details: "Critical-confidence threshold changed to 0.87.",
    timestamp: "2026-04-15 10:02",
    surface: "ml-config",
  },
];

const executionLogs: ExecutionItem[] = [
  {
    id: 301,
    playbook: "Contain Suspicious Endpoint",
    incidentId: 801,
    status: "success",
    startedAt: "08:58",
    duration: "1m 42s",
  },
  {
    id: 302,
    playbook: "Block Malicious IP",
    incidentId: 801,
    status: "running",
    startedAt: "09:11",
    duration: "4m 06s",
  },
  {
    id: 303,
    playbook: "Mailbox Triage",
    incidentId: 802,
    status: "failed",
    startedAt: "09:28",
    duration: "0m 39s",
  },
];

const incidentAlertLinks: IncidentAlertLink[] = [
  { incidentId: 801, alertIds: [2041, 2043, 2044] },
  { incidentId: 802, alertIds: [2042] },
  { incidentId: 803, alertIds: [2043] },
];

const automationRules: AutomationRuleItem[] = [
  {
    id: 91,
    name: "Critical VPN brute force escalation",
    condition: 'alerts.severity = "critical" AND alerts.source = "SIEM / Edge Firewall"',
    action: "Create incident and attach Block Malicious IP playbook",
    enabled: true,
  },
  {
    id: 92,
    name: "Mailbox threat triage",
    condition: 'alerts.source = "Mail Security" AND incidents.source = "rule_based"',
    action: "Create finance incident and notify analyst mailbox",
    enabled: true,
  },
  {
    id: 93,
    name: "Low-confidence script review",
    condition: 'incidents.source = "ml_based" AND confidence_score < 0.70',
    action: "Require analyst validation before containment",
    enabled: true,
  },
];

const securityEngineerCapabilities = [
  {
    title: "System design",
    detail: "Secure cloud lanes, segmented environments and access boundaries for AWS, Azure and internal services.",
  },
  {
    title: "Automation",
    detail: "Build playbooks, rotate secrets, orchestrate firewall changes and automate repetitive response work.",
  },
  {
    title: "Threat mitigation",
    detail: "Monitor telemetry, inspect logs, respond to malware or DDoS patterns and harden exposed services fast.",
  },
  {
    title: "Compliance",
    detail: "Track evidence for GDPR, HIPAA or PCI DSS and keep every privileged workflow traceable.",
  },
  {
    title: "Vulnerability management",
    detail: "Test weak points, patch risky flows and keep remediation work visible inside one workspace.",
  },
];

const securityEngineerMetrics = [
  { label: "Automations live", value: "18", note: "12 fully active in production" },
  { label: "Secrets rotated", value: "42", note: "last 24 hours across cloud and VPN" },
  { label: "Coverage score", value: "91%", note: "design, monitoring and rollback checks" },
  { label: "Pending reviews", value: "3", note: "changes waiting for approval" },
];

const codeWorkbenchFiles = [
  "playbooks/block-malicious-ip.yml",
  "scripts/archive_ioc.py",
  "infra/firewall/deny_rule.tf",
  "policies/iam/temporary-access.json",
];

const codeWorkbenchPreview = `def rotate_firewall_rule(ip_address: str, ttl_minutes: int = 90) -> dict:
    payload = {
        "indicator": ip_address,
        "ttl_minutes": ttl_minutes,
        "reason": "incident_containment",
    }

    response = palo_alto.create_temporary_block(payload)
    audit.write("PLAYBOOK_UPDATE", f"Temporary deny rule added for {ip_address}")
    return response`;

const securityCommits: CommitItem[] = [
  {
    id: "sec-142",
    title: "Add rollback path for endpoint isolation failures",
    summary: "Introduces guarded fallback logic so the host is re-checked before rollback is triggered.",
    author: "anca.popescu",
    timestamp: "2026-04-15 10:24",
    scope: "containment",
    status: "merged",
  },
  {
    id: "sec-143",
    title: "Tune mail queue retry policy for SOC notifications",
    summary: "Reduces timeout exposure for analyst notifications and keeps audit trace attached to each retry.",
    author: "anca.popescu",
    timestamp: "2026-04-15 09:58",
    scope: "notifications",
    status: "review",
  },
  {
    id: "sec-144",
    title: "Add compliance tags to privileged playbook changes",
    summary: "Maps updates to GDPR and PCI evidence lanes so auditors can follow the lifecycle without manual exports.",
    author: "anca.popescu",
    timestamp: "2026-04-15 09:31",
    scope: "audit",
    status: "draft",
  },
];

const analystCapabilities = [
  {
    title: "Monitoring",
    detail: "Watch SIEM feeds, network activity and policy violations without losing the incident context.",
  },
  {
    title: "Incident response",
    detail: "Investigate phishing, malware and suspicious behavior, then isolate and remediate quickly.",
  },
  {
    title: "Vulnerability work",
    detail: "Track weak configurations, follow remediation status and escalate risky gaps early.",
  },
  {
    title: "Reporting",
    detail: "Prepare evidence-ready security summaries and identify the root causes behind each case.",
  },
];

const analystMetrics = [
  { label: "Alerts triaged", value: "46", note: "this shift across mail, endpoint and network" },
  { label: "Open investigations", value: "7", note: "3 are waiting on engineering feedback" },
  { label: "False positive rate", value: "11%", note: "kept low with merged signal context" },
  { label: "MTTR", value: "38m", note: "average response from alert to analyst action" },
];

const analystTrend = [
  { label: "Mon", value: 34 },
  { label: "Tue", value: 49 },
  { label: "Wed", value: 45 },
  { label: "Thu", value: 58 },
  { label: "Fri", value: 51 },
  { label: "Sat", value: 29 },
];

const analystToolset = [
  "SIEM investigation",
  "Threat intel lookup",
  "Vulnerability scanner",
  "Firewall isolate host",
  "Phishing evidence pack",
  "Disaster recovery drill",
];

const analystChartSeries = {
  incidentSeverity: [
    { label: "Critical", value: 4 },
    { label: "High", value: 7 },
    { label: "Medium", value: 11 },
    { label: "Low", value: 5 },
  ],
  incidentStatus: [
    { label: "Open", value: 9 },
    { label: "In progress", value: 6 },
    { label: "Closed", value: 12 },
  ],
  alertSources: [
    { label: "SIEM", value: 15 },
    { label: "Mail", value: 11 },
    { label: "EDR", value: 8 },
    { label: "Identity", value: 5 },
  ],
  executionHealth: [
    { label: "Success", value: 18 },
    { label: "Running", value: 4 },
    { label: "Failed", value: 3 },
  ],
};

const auditorReportTypes: Array<{
  id: AuditorReportType;
  title: string;
  description: string;
}> = [
  {
    id: "compliance",
    title: "Compliance PDF",
    description: "HIPAA, PCI-DSS and internal control alignment across procedures and audit evidence.",
  },
  {
    id: "risk",
    title: "Risk Assessment PDF",
    description: "Vulnerabilities, weak controls and priority remediation recommendations for management.",
  },
  {
    id: "policy",
    title: "Policy Review PDF",
    description: "Security policies, incident response plans and access control matrices under review.",
  },
  {
    id: "system_controls",
    title: "System Controls PDF",
    description: "System audit of incidents, playbook executions and unauthorized access exposure.",
  },
];

const auditorMetrics = [
  { label: "Compliance gaps", value: "4", note: "two procedural, two control-design findings" },
  { label: "Open risks", value: "7", note: "tracked across incidents, rules and privileged flows" },
  { label: "Policies reviewed", value: "12", note: "including IR plan and access matrix" },
  { label: "Report exports", value: "6", note: "segmented by audit report type" },
];

const auditorChartSeries = {
  compliance: [
    { label: "HIPAA", value: 92 },
    { label: "PCI", value: 96 },
    { label: "IR Plan", value: 89 },
    { label: "Access", value: 94 },
  ],
  risk: [
    { label: "Critical", value: 2 },
    { label: "High", value: 5 },
    { label: "Medium", value: 8 },
    { label: "Low", value: 4 },
  ],
  controlCoverage: [
    { label: "alerts", value: 93 },
    { label: "incidents", value: 95 },
    { label: "executions", value: 88 },
    { label: "audit", value: 98 },
  ],
  reportMix: [
    { label: "Compliance", value: 3 },
    { label: "Risk", value: 1 },
    { label: "Policy", value: 1 },
    { label: "Controls", value: 1 },
  ],
};

const policyReviewItems = [
  {
    title: "Access control matrix",
    detail: "Mapped against privileged role changes from `audit_logs` and operator assignments.",
    status: "needs update",
  },
  {
    title: "Incident response plan",
    detail: "Validated against escalation paths visible in `incidents` and mailbox workflows.",
    status: "reviewed",
  },
  {
    title: "Playbook governance standard",
    detail: "Checks `playbooks`, `playbook_steps` and `automation_rules` for approval traceability.",
    status: "in review",
  },
];

const managerMetrics = [
  { label: "Policies active", value: "14", note: "security protocols and emergency procedures in force" },
  { label: "Team coverage", value: "96%", note: "shift staffing, on-call coverage and escalation readiness" },
  { label: "Risk actions", value: "9", note: "physical and cyber mitigation items currently tracked" },
  { label: "Systems monitored", value: "27", note: "CCTV, alarms, access control and SOC tooling" },
];

const managerCapabilities = [
  {
    title: "Policy development",
    detail: "Create and enforce protocols, procedures and emergency response plans across teams.",
  },
  {
    title: "Personnel management",
    detail: "Allocate staff, supervise teams, manage workloads and maintain shift readiness.",
  },
  {
    title: "Risk mitigation",
    detail: "Track vulnerabilities, assess exposure and prioritize action before small gaps become incidents.",
  },
  {
    title: "Incident leadership",
    detail: "Lead investigations, coordinate escalations and keep stakeholders aligned during major events.",
  },
];

const managerChartSeries = {
  staffing: [
    { label: "Analysts", value: 8 },
    { label: "Engineers", value: 5 },
    { label: "On-call", value: 3 },
    { label: "Auditors", value: 2 },
  ],
  systemOversight: [
    { label: "CCTV", value: 12 },
    { label: "Access", value: 8 },
    { label: "Alarms", value: 5 },
    { label: "SOC", value: 2 },
  ],
  compliance: [
    { label: "Legal", value: 94 },
    { label: "Industry", value: 91 },
    { label: "Internal", value: 96 },
    { label: "Training", value: 88 },
  ],
};

const adminMetrics = [
  { label: "Global modules", value: "5", note: "admin can inspect and adjust every role workspace" },
  { label: "Privileged tables", value: "9", note: "direct visibility across operational and governance data" },
  { label: "Automation controls", value: "18", note: "rules, playbooks and thresholds editable from one place" },
  { label: "Live operators", value: "26", note: "accounts, roles and access state under central control" },
];

const adminCapabilities = [
  {
    title: "Cross-role control",
    detail: "Preview, tune and govern dashboards and workflows for analyst, engineer, manager and auditor.",
  },
  {
    title: "DB visibility",
    detail: "Inspect core tables, relations and operational state directly inside the admin surface.",
  },
  {
    title: "Direct maintenance",
    detail: "Edit thresholds, account state, rule behavior and privileged settings without leaving the app.",
  },
  {
    title: "Platform governance",
    detail: "Track risky changes, system health and role-wide capability exposure from a single command layer.",
  },
];

const adminDbTables = [
  { name: "alerts", description: "raw security telemetry intake", rows: 214, mode: "inspect" },
  { name: "incidents", description: "confirmed and in-progress cases", rows: 57, mode: "edit" },
  { name: "incident_alerts", description: "alert-to-incident many-to-many graph", rows: 184, mode: "relations" },
  { name: "playbooks", description: "automation definitions and control flows", rows: 12, mode: "govern" },
  { name: "playbook_steps", description: "step-level response actions and configs", rows: 41, mode: "edit" },
  { name: "playbook_executions", description: "runtime orchestration history", rows: 96, mode: "inspect" },
  { name: "execution_logs", description: "debug detail for each execution path", rows: 322, mode: "trace" },
  { name: "audit_logs", description: "append-only privileged activity trail", rows: 148, mode: "review" },
  { name: "automation_rules", description: "conditions and automated actions", rows: 9, mode: "edit" },
];

const adminRoleMatrix = [
  { role: "Analyst", control: "Investigations, alert triage, evidence actions" },
  { role: "Security Engineer", control: "Playbooks, steps, automation rules, execution logic" },
  { role: "Manager", control: "Policies, staffing, escalations, system oversight" },
  { role: "Auditor", control: "Reports, compliance lanes, audit exports" },
];

const adminDbPreview = `UPDATE automation_rules
SET enabled = TRUE,
    action = 'Create incident and attach containment playbook'
WHERE id = 91;

UPDATE users
SET enabled = FALSE
WHERE email = 'operator@local.dev';`;

const quickStats = [
  { label: "Alerts today", value: "146", accent: "cyan" },
  { label: "Open incidents", value: "12", accent: "amber" },
  { label: "Auto-contained", value: "8", accent: "emerald" },
  { label: "Failed runs", value: "2", accent: "rose" },
];

const metricTrend = [
  { label: "Mon", value: 42 },
  { label: "Tue", value: 58 },
  { label: "Wed", value: 31 },
  { label: "Thu", value: 77 },
  { label: "Fri", value: 65 },
  { label: "Sat", value: 28 },
];

const tasksByRole: Record<Exclude<Role, "ADMIN">, TaskItem[]> = {
  MANAGER: [
    {
      id: 10,
      title: "Approve priority escalation for the VPN brute force incident cluster",
      priority: "high",
      status: "in_progress",
      owner: "manager.soc@local.dev",
      due: "Today, 12:30",
    },
    {
      id: 11,
      title: "Review team workload and redistribute open investigations",
      priority: "medium",
      status: "queued",
      owner: "manager.soc@local.dev",
      due: "Today, 15:00",
    },
    {
      id: 12,
      title: "Sign off weekly SOC performance snapshot",
      priority: "low",
      status: "done",
      owner: "manager.soc@local.dev",
      due: "Completed",
    },
  ],
  ANALYST: [
    {
      id: 1,
      title: "Validate incident #801 and confirm source IP cluster",
      priority: "high",
      status: "in_progress",
      owner: "mihai.ionescu@local.dev",
      due: "Today, 13:00",
    },
    {
      id: 2,
      title: "Review suspicious mailbox forwarding rule for finance",
      priority: "medium",
      status: "queued",
      owner: "mihai.ionescu@local.dev",
      due: "Today, 16:30",
    },
    {
      id: 3,
      title: "Close low-confidence PowerShell case if patching confirmed",
      priority: "low",
      status: "done",
      owner: "mihai.ionescu@local.dev",
      due: "Completed",
    },
  ],
  SECURITY_ENGINEER: [
    {
      id: 4,
      title: "Patch API retry logic for firewall deny action",
      priority: "high",
      status: "in_progress",
      owner: "anca.popescu@local.dev",
      due: "Today, 14:00",
    },
    {
      id: 5,
      title: "Add rollback branch for endpoint isolation failure",
      priority: "medium",
      status: "queued",
      owner: "anca.popescu@local.dev",
      due: "Tomorrow, 10:00",
    },
    {
      id: 6,
      title: "Review analyst feedback on containment email template",
      priority: "low",
      status: "done",
      owner: "anca.popescu@local.dev",
      due: "Completed",
    },
  ],
  AUDITOR: [
    {
      id: 7,
      title: "Prepare weekly governance report for security steering group",
      priority: "high",
      status: "in_progress",
      owner: "alexandru.stan@local.dev",
      due: "Friday, 12:00",
    },
    {
      id: 8,
      title: "Review all privileged changes related to playbooks",
      priority: "medium",
      status: "queued",
      owner: "alexandru.stan@local.dev",
      due: "Friday, 17:00",
    },
    {
      id: 9,
      title: "Archive signed PDF reports for Q2",
      priority: "low",
      status: "done",
      owner: "alexandru.stan@local.dev",
      due: "Completed",
    },
  ],
};

const mailboxByRole: Record<Exclude<Role, "ADMIN">, string> = {
  MANAGER: "manager.soc@local.dev",
  ANALYST: "mihai.ionescu@local.dev",
  SECURITY_ENGINEER: "anca.popescu@local.dev",
  AUDITOR: "alexandru.stan@local.dev",
};

const threadsByRole: Record<Exclude<Role, "ADMIN">, MailThread[]> = {
  MANAGER: [
    {
      id: 4000,
      mailbox: "manager.soc@local.dev",
      kind: "group",
      participants: ["manager.soc@local.dev", "coordonare.manageri@local.dev", "leadership.security@local.dev"],
      subject: "Grup Manageri - coordonare operațională",
      unread: true,
      tag: "Grup",
      preview: "Stabilim prioritățile pentru ziua de azi, aprobările și redistribuirea echipei.",
      messages: [
        {
          sender: "leadership.security@local.dev",
          timestamp: "08:10",
          body: "Bună dimineața. Avem nevoie până la 09:00 de prioritățile pe incidente, staffing și aprobările critice.",
        },
        {
          sender: "manager.soc@local.dev",
          timestamp: "08:18",
          body: "Pornesc cu escalările, verific disponibilitatea pe shift și revin cu propunerea finală în 20 de minute.",
        },
      ],
    },
    {
      id: 4001,
      mailbox: "manager.soc@local.dev",
      kind: "direct",
      participants: ["admin@local.dev", "manager.soc@local.dev"],
      subject: "Prioritizare incidente pentru shiftul de azi",
      unread: true,
      tag: "Coordonare",
      preview: "Te rog să confirmi ce intră în escalation lane și ce rămâne la triere normală.",
      messages: [
        {
          sender: "admin@local.dev",
          timestamp: "08:36",
          body: "Te rog să confirmi ce incidente intră azi în escalation lane și ce rămâne la triere normală, ca să alocăm corect resursele.",
        },
        {
          sender: "manager.soc@local.dev",
          timestamp: "08:47",
          body: "Confirm în 15 minute. Mă uit acum la severitate, la încărcarea echipei și la ce poate fi automatizat fără risc.",
        },
      ],
    },
    {
      id: 4002,
      mailbox: "manager.soc@local.dev",
      kind: "direct",
      participants: ["mihai.ionescu@local.dev", "manager.soc@local.dev"],
      subject: "Escaladare pentru incidentul 802",
      unread: false,
      tag: "Echipă",
      preview: "Am nevoie de confirmare dacă alocăm încă un analist pe cazul de mail.",
      messages: [
        {
          sender: "mihai.ionescu@local.dev",
          timestamp: "09:03",
          body: "Am nevoie de confirmare dacă alocăm încă un analist pe cazul de mail. Are impact mai mare decât părea inițial.",
        },
        {
          sender: "manager.soc@local.dev",
          timestamp: "09:09",
          body: "Da, mutăm încă o persoană pe caz dacă în următoarele 20 de minute se confirmă persistența regulii de forwarding.",
        },
      ],
    },
  ],
  ANALYST: [
    {
      id: 1000,
      mailbox: "mihai.ionescu@local.dev",
      kind: "group",
      participants: ["mihai.ionescu@local.dev", "triage.analysts@local.dev", "soc.shift@local.dev"],
      subject: "Grup Analiști - triere și investigații",
      unread: true,
      tag: "Grup",
      preview: "Centralizăm cazurile de azi, blocajele și ce intră în daily.",
      messages: [
        {
          sender: "triage.analysts@local.dev",
          timestamp: "08:32",
          body: "Avem 3 alerte care pot deveni incidente. Notați aici dacă luați un caz și ce context aveți nevoie.",
        },
        {
          sender: "mihai.ionescu@local.dev",
          timestamp: "08:36",
          body: "Preiau eu incidentul 801 și revin cu status după ce verific dacă payload-ul eșuat vine din firewall sau din playbook.",
        },
      ],
    },
    {
      id: 1001,
      mailbox: "mihai.ionescu@local.dev",
      kind: "direct",
      participants: ["anca.popescu@local.dev", "mihai.ionescu@local.dev"],
      subject: "Incidentul 801 - verificare rapidă",
      unread: true,
      tag: "Inginerie",
      preview: "Am pus un fallback nou pe playbook, poți să verifici dacă mai apare eroarea?",
      messages: [
        {
          sender: "anca.popescu@local.dev",
          timestamp: "09:18",
          body: "Salut, am pus un fallback nou pe playbook pentru blocarea IP-urilor. Poți să verifici dacă incidentul 801 mai ridică aceeași eroare?",
        },
        {
          sender: "mihai.ionescu@local.dev",
          timestamp: "09:24",
          body: "Da, mă uit acum. Dacă văd că încă ratează pasul doi, îți trimit exact payload-ul din execuție.",
        },
      ],
    },
    {
      id: 1002,
      mailbox: "mihai.ionescu@local.dev",
      kind: "direct",
      participants: ["admin@local.dev", "mihai.ionescu@local.dev"],
      subject: "Confirmare false positive",
      unread: false,
      tag: "Admin",
      preview: "Închide cazul doar după ce confirmi cu echipa de patching.",
      messages: [
        {
          sender: "admin@local.dev",
          timestamp: "08:41",
          body: "Te rog să închizi cazul de PowerShell doar după ce confirmi cu echipa de patching că scriptul a fost planificat.",
        },
        {
          sender: "mihai.ionescu@local.dev",
          timestamp: "08:55",
          body: "În regulă, las incidentul deschis până primesc confirmarea și adaug notă în ticket.",
        },
      ],
    },
  ],
  SECURITY_ENGINEER: [
    {
      id: 2000,
      mailbox: "anca.popescu@local.dev",
      kind: "group",
      participants: ["anca.popescu@local.dev", "security.engineering@local.dev", "automation.builders@local.dev"],
      subject: "Grup Security Engineering - automatizări și cod",
      unread: true,
      tag: "Grup",
      preview: "Sincronizăm modificările pe playbooks, rollout-urile și problemele din execuții.",
      messages: [
        {
          sender: "security.engineering@local.dev",
          timestamp: "08:22",
          body: "Astăzi verificăm retry-ul pe firewall, fallback-ul de izolare și impactul în audit trail.",
        },
        {
          sender: "anca.popescu@local.dev",
          timestamp: "08:29",
          body: "Mă ocup eu de rollback și actualizez grupul după testul de execuție pe incidentul 801.",
        },
      ],
    },
    {
      id: 2001,
      mailbox: "anca.popescu@local.dev",
      kind: "direct",
      participants: ["mihai.ionescu@local.dev", "anca.popescu@local.dev"],
      subject: "Playbook containment - timeout",
      unread: true,
      tag: "SOC",
      preview: "Pasul de izolare a mers, dar emailul a întârziat aproape un minut.",
      messages: [
        {
          sender: "mihai.ionescu@local.dev",
          timestamp: "09:07",
          body: "Pasul de izolare a mers, dar emailul de notificare a întârziat aproape un minut. Poți să verifici queue-ul?",
        },
        {
          sender: "anca.popescu@local.dev",
          timestamp: "09:12",
          body: "Da, verific acum și mut notificarea pe un retry mai agresiv. Revin imediat ce fac testul.",
        },
      ],
    },
    {
      id: 2002,
      mailbox: "anca.popescu@local.dev",
      kind: "direct",
      participants: ["admin@local.dev", "anca.popescu@local.dev"],
      subject: "Aprobarea schimbării pentru regula fallback",
      unread: false,
      tag: "Schimbare",
      preview: "Poți aplica modificarea după ce actualizezi și audit trail-ul.",
      messages: [
        {
          sender: "admin@local.dev",
          timestamp: "08:16",
          body: "Poți aplica modificarea pentru regula fallback după ce actualizezi și audit trail-ul, ca să fie totul urmărit corect.",
        },
        {
          sender: "anca.popescu@local.dev",
          timestamp: "08:26",
          body: "Perfect, fac update-ul împreună cu notița de change și trimit și către audit rezumatul.",
        },
      ],
    },
  ],
  AUDITOR: [
    {
      id: 3000,
      mailbox: "alexandru.stan@local.dev",
      kind: "group",
      participants: ["alexandru.stan@local.dev", "audit.team@local.dev", "compliance.office@local.dev"],
      subject: "Grup Auditori - rapoarte și conformitate",
      unread: true,
      tag: "Grup",
      preview: "Adunăm observațiile pentru rapoarte, gap-urile de conformitate și reviziile de politici.",
      messages: [
        {
          sender: "audit.team@local.dev",
          timestamp: "08:40",
          body: "Vă rog să actualizați aici ce secțiuni rămân deschise în rapoartele de săptămâna aceasta și ce dovezi lipsesc.",
        },
        {
          sender: "alexandru.stan@local.dev",
          timestamp: "08:46",
          body: "Eu verific partea de playbook changes și execuțiile eșuate. Revin cu rezumat înainte de ședința de la 11:00.",
        },
      ],
    },
    {
      id: 3001,
      mailbox: "alexandru.stan@local.dev",
      kind: "direct",
      participants: ["admin@local.dev", "alexandru.stan@local.dev"],
      subject: "Raport săptămânal pentru comitet",
      unread: true,
      tag: "Raport",
      preview: "Avem nevoie de PDF-ul final până vineri la prânz.",
      messages: [
        {
          sender: "admin@local.dev",
          timestamp: "09:02",
          body: "Avem nevoie de PDF-ul final pentru comitet până vineri la prânz. Te rog să incluzi și schimbările privilegiate pe playbooks.",
        },
        {
          sender: "alexandru.stan@local.dev",
          timestamp: "09:14",
          body: "Da, includ atât modificările de roluri, cât și execuțiile eșuate. O să atașez și sumarul pe ultimele 7 zile.",
        },
      ],
    },
    {
      id: 3002,
      mailbox: "alexandru.stan@local.dev",
      kind: "direct",
      participants: ["anca.popescu@local.dev", "alexandru.stan@local.dev"],
      subject: "Clarificare pe update-ul de playbook",
      unread: false,
      tag: "Revizie",
      preview: "Îți pot trimite și config-ul anterior dacă ai nevoie de comparație.",
      messages: [
        {
          sender: "anca.popescu@local.dev",
          timestamp: "08:48",
          body: "Îți pot trimite și config-ul anterior pentru playbook dacă ai nevoie de comparație în raport.",
        },
        {
          sender: "alexandru.stan@local.dev",
          timestamp: "08:53",
          body: "Da, te rog. Așa pot documenta exact ce s-a schimbat între versiuni.",
        },
      ],
    },
  ],
};

const meetingsByRole: Record<Exclude<Role, "ADMIN">, MeetingItem[]> = {
  MANAGER: [
    {
      id: 1,
      title: "Daily coordonare operațională",
      description: "Stabilim prioritățile pe incidente, staffing și aprobările de leadership pentru ziua curentă.",
      date: "2026-04-15",
      time: "09:00",
      participants: ["manager.soc@local.dev", "mihai.ionescu@local.dev", "anca.popescu@local.dev"],
      organizer: "manager.soc@local.dev",
      type: "daily",
    },
  ],
  ANALYST: [
    {
      id: 2,
      title: "Daily triere și cazuri active",
      description: "Fiecare analist spune ce cazuri are, ce blocaje există și ce trebuie escalat.",
      date: "2026-04-15",
      time: "09:15",
      participants: ["mihai.ionescu@local.dev", "triage.analysts@local.dev", "manager.soc@local.dev"],
      organizer: "mihai.ionescu@local.dev",
      type: "daily",
    },
  ],
  SECURITY_ENGINEER: [
    {
      id: 3,
      title: "Sync automatizări și rollout",
      description: "Revizuim playbook-urile, execuțiile eșuate și modificările care intră azi în producție.",
      date: "2026-04-15",
      time: "10:00",
      participants: ["anca.popescu@local.dev", "security.engineering@local.dev", "mihai.ionescu@local.dev"],
      organizer: "anca.popescu@local.dev",
      type: "planning",
    },
  ],
  AUDITOR: [
    {
      id: 4,
      title: "Review rapoarte și dovezi",
      description: "Verificăm ce secțiuni mai sunt deschise în rapoarte și ce dovezi trebuie cerute de la echipe.",
      date: "2026-04-15",
      time: "11:00",
      participants: ["alexandru.stan@local.dev", "audit.team@local.dev", "anca.popescu@local.dev"],
      organizer: "alexandru.stan@local.dev",
      type: "review",
    },
  ],
};

const dailyUpdatesByRole: Record<Exclude<Role, "ADMIN">, DailyUpdateItem[]> = {
  MANAGER: [
    {
      id: 1,
      author: "manager.soc@local.dev",
      role: "Manager",
      focus: "Redistribui workload-ul și aprob două escalări critice.",
      blockers: "Aștept confirmarea finală pentru disponibilitatea pe after-hours.",
      nextStep: "Închid planul de staffing până la 10:00.",
      timestamp: "08:50",
    },
  ],
  ANALYST: [
    {
      id: 2,
      author: "mihai.ionescu@local.dev",
      role: "Analyst",
      focus: "Investighez incidentul 801 și regula suspectă de forwarding pe finance.",
      blockers: "Aștept payload-ul complet din execuția de firewall ca să confirm sursa erorii.",
      nextStep: "Actualizez incidentul și decid dacă escalăm către engineering.",
      timestamp: "08:54",
    },
  ],
  SECURITY_ENGINEER: [
    {
      id: 3,
      author: "anca.popescu@local.dev",
      role: "Security Engineer",
      focus: "Lucrez la retry logic și la rollback pentru izolarea endpoint-urilor.",
      blockers: "Am nevoie de încă un test pe execuția incidentului 801 după schimbarea fallback-ului.",
      nextStep: "Public patch-ul și update-ul de audit trail după validare.",
      timestamp: "08:58",
    },
  ],
  AUDITOR: [
    {
      id: 4,
      author: "alexandru.stan@local.dev",
      role: "Auditor",
      focus: "Pregătesc raportul de săptămână și verific schimbările privilegiate pe playbooks.",
      blockers: "Lipsește comparația completă între configurația veche și cea nouă pentru un playbook.",
      nextStep: "Închid secțiunea de conformitate și trimit draftul pentru review.",
      timestamp: "09:05",
    },
  ],
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function formatRole(role: Role) {
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeRole(role: string): Role {
  const normalized = role.trim().toUpperCase();

  if (normalized === "ADMIN") return "ADMIN";
  if (normalized === "MANAGER") return "MANAGER";
  if (normalized === "SECURITY_ENGINEER") return "SECURITY_ENGINEER";
  if (normalized === "ANALYST") return "ANALYST";
  return "AUDITOR";
}

function renderMiniBars(items: Array<{ label: string; value: number }>, tone: string) {
  const max = Math.max(...items.map((item) => item.value));

  return (
    <div className="mini-chart">
      {items.map((item) => (
        <div key={item.label} className="mini-chart-row">
          <span>{item.label}</span>
          <div className="mini-chart-track">
            <div
              className={classNames("mini-chart-fill", `tone-${tone}`)}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function getIncidentAlertCount(incidentId: number) {
  return incidentAlertLinks.find((link) => link.incidentId === incidentId)?.alertIds.length ?? 0;
}

function generateAuditPdf(user: StoredUser | null, reportType: AuditorReportType = "compliance") {
  const printWindow = window.open("", "_blank", "width=1080,height=900");

  if (!printWindow) {
    window.alert("Browser-ul a blocat fereastra pentru raportul PDF.");
    return;
  }

  const reportMeta: Record<
    AuditorReportType,
    {
      title: string;
      subtitle: string;
      cards: [string, string, string];
    }
  > = {
    compliance: {
      title: "Compliance Report",
      subtitle: "Procedure alignment, regulatory checks and evidence coverage.",
      cards: ["HIPAA controls 92%", "PCI-DSS alignment 96%", "4 open compliance gaps"],
    },
    risk: {
      title: "Risk Assessment Report",
      subtitle: "Control weaknesses, exposure review and remediation priority.",
      cards: ["2 critical risks", "5 high-risk findings", "7 active remediation items"],
    },
    policy: {
      title: "Policy Review Report",
      subtitle: "Security policies, response procedures and access governance review.",
      cards: ["12 policies reviewed", "3 policies need updates", "1 access matrix pending sign-off"],
    },
    system_controls: {
      title: "System Controls Report",
      subtitle: "System audit over incidents, executions and unauthorized access prevention.",
      cards: ["95% incident traceability", "88% execution control coverage", "11 privileged changes reviewed"],
    },
  };

  const selectedReport = reportMeta[reportType];

  const rows = auditLogs
    .map(
      (log) => `
        <tr>
          <td>${log.timestamp}</td>
          <td>${log.actor}</td>
          <td>${log.action}</td>
          <td>${log.surface}</td>
          <td>${log.details}</td>
        </tr>
      `
    )
    .join("");

  printWindow.document.write(`
    <html>
      <head>
        <title>CoreShield ${selectedReport.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #0f172a; }
          h1, h2 { margin-bottom: 8px; }
          p { color: #475569; }
          .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 24px 0 32px; }
          .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px; background: #f8fafc; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #cbd5e1; text-align: left; padding: 10px; font-size: 13px; }
          th { background: #e2e8f0; }
        </style>
      </head>
      <body>
        <h1>CoreShield ${selectedReport.title}</h1>
        <p>Generated on 2026-04-15 by ${user?.email ?? "unknown user"}.</p>
        <p>${selectedReport.subtitle}</p>
        <div class="meta">
          <div class="card"><strong>${selectedReport.cards[0]}</strong></div>
          <div class="card"><strong>${selectedReport.cards[1]}</strong></div>
          <div class="card"><strong>${selectedReport.cards[2]}</strong></div>
        </div>
        <h2>Recent audit timeline</h2>
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Surface</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function RoleHeader({
  user,
  title,
  subtitle,
  onLogout,
  onOpenMail,
  mailCount,
  showMailAction,
}: {
  user: StoredUser;
  title: string;
  subtitle: string;
  onLogout: () => void;
  onOpenMail: () => void;
  mailCount: number;
  showMailAction: boolean;
}) {
  return (
    <header className="dashboard-hero">
      <div>
        <p className="dashboard-kicker">CoreShield Control Layer</p>
        <h1>{title}</h1>
        <p className="dashboard-subtitle">{subtitle}</p>
      </div>

      <div className="hero-actions">
        <div className="identity-card">
          <span className="identity-label">Signed in as</span>
          <strong>{user.email}</strong>
          <span className="identity-role">{formatRole(user.role)}</span>
        </div>

        {showMailAction ? (
          <button type="button" className="mail-icon-button" onClick={onOpenMail} aria-label="Open service inbox">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
              <path d="m22 6-10 7L2 6" />
            </svg>
            <span>Inbox</span>
            <small>{mailCount}</small>
          </button>
        ) : null}

        <button type="button" className="ghost-button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

function NonAdminWorkspace({
  role,
  forceOpen,
}: {
  role: Exclude<Role, "ADMIN">;
  forceOpen: boolean;
}) {
  const threads = threadsByRole[role];
  const mailbox = mailboxByRole[role];
  const [activeThreadId, setActiveThreadId] = useState<number>(threads[0]?.id ?? 0);
  const [meetings, setMeetings] = useState<MeetingItem[]>(meetingsByRole[role]);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDescription, setMeetingDescription] = useState("");
  const [meetingDate, setMeetingDate] = useState("2026-04-16");
  const [meetingTime, setMeetingTime] = useState("10:00");
  const [meetingParticipants, setMeetingParticipants] = useState(mailbox);
  const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? threads[0];
  const dailyUpdates = dailyUpdatesByRole[role];

  const handleCreateMeeting = (event: React.FormEvent) => {
    event.preventDefault();

    if (!meetingTitle.trim() || !meetingDescription.trim()) {
      return;
    }

    setMeetings((current) => [
      {
        id: current.length + 100,
        title: meetingTitle.trim(),
        description: meetingDescription.trim(),
        date: meetingDate,
        time: meetingTime,
        participants: meetingParticipants
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean),
        organizer: mailbox,
        type: "planning",
      },
      ...current,
    ]);

    setMeetingTitle("");
    setMeetingDescription("");
    setMeetingParticipants(mailbox);
  };

  return (
    <section
      className={classNames("dashboard-card", "span-12", "workspace-card", forceOpen && "workspace-focus")}
      id="service-inbox"
    >
      <div className="panel-heading">
        <div>
          <span className="eyebrow tone-cyan">Service operations</span>
          <h2>Inbox, conversații și task-uri alocate</h2>
        </div>
        <div className="workspace-mailbox">
          <span>Căsuță</span>
          <strong>{mailbox}</strong>
        </div>
      </div>

      <div className="workspace-layout">
        <div className="mail-panel">
          <div className="section-heading">
            <h3>Inbox</h3>
            <span>{threads.filter((thread) => thread.unread).length} conversații necitite</span>
          </div>

          <div className="mail-thread-list">
            {threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                className={classNames("mail-thread-item", activeThread?.id === thread.id && "active")}
                onClick={() => setActiveThreadId(thread.id)}
              >
                <div className="mail-thread-head">
                  <strong>{thread.subject}</strong>
                  <span>{thread.messages.at(-1)?.timestamp}</span>
                </div>
                <span className="mail-thread-tag">{thread.kind === "group" ? `Grup • ${thread.tag}` : thread.tag}</span>
                <p>{thread.preview}</p>
                {thread.unread ? <span className="mail-unread-dot" /> : null}
              </button>
            ))}
          </div>
        </div>

        <div className="conversation-panel">
          <div className="section-heading">
            <div>
              <h3>{activeThread.subject}</h3>
              <span>{activeThread.participants.join(" • ")}</span>
            </div>
            <button type="button" className="mini-button">
              Răspunde
            </button>
          </div>

          <div className="conversation-feed">
            {activeThread.messages.map((message, index) => (
              <article
                key={`${activeThread.id}-${index}`}
                className={classNames(
                  "message-bubble",
                  message.sender === mailbox && "message-own"
                )}
              >
                <div className="message-meta">
                  <strong>{message.sender}</strong>
                  <span>{message.timestamp}</span>
                </div>
                <p>{message.body}</p>
              </article>
            ))}
          </div>

          <label className="editor-field">
            <span>Răspuns rapid</span>
            <textarea
              defaultValue="Confirm primirea mesajului și adaugă contextul operațional aici."
            />
          </label>
        </div>

        <div className="task-panel">
          <div className="section-heading">
            <h3>Task board</h3>
            <span>Alocate acestei căsuțe</span>
          </div>

          <div className="task-list">
            {tasksByRole[role].map((task) => (
              <article key={task.id} className="task-card">
                <div className="task-topline">
                  <span className={`status-pill priority-${task.priority}`}>{task.priority}</span>
                  <span className={`status-pill task-${task.status}`}>{task.status.replace("_", " ")}</span>
                </div>
                <strong>{task.title}</strong>
                <p>{task.owner}</p>
                <div className="task-footer">
                  <span>{task.due}</span>
                  <button type="button" className="mini-button">
                    Deschide task
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="workspace-meta-layout">
        <div className="dashboard-card workspace-meta-card">
          <div className="section-heading">
            <h3>Ședințe și daily-uri</h3>
            <span>Orice rol poate crea și organiza întâlniri</span>
          </div>

          <div className="meeting-list">
            {meetings.map((meeting) => (
              <article key={meeting.id} className="meeting-card">
                <div className="meeting-head">
                  <div>
                    <strong>{meeting.title}</strong>
                    <span>{meeting.date} • {meeting.time}</span>
                  </div>
                  <span className="status-pill neutral">{meeting.type}</span>
                </div>
                <p>{meeting.description}</p>
                <div className="meeting-meta">
                  <span>Organizator: {meeting.organizer}</span>
                  <span>Participanți: {meeting.participants.join(", ")}</span>
                </div>
              </article>
            ))}
          </div>

          <form className="meeting-form" onSubmit={handleCreateMeeting}>
            <div className="section-heading">
              <h3>Creează ședință</h3>
              <span>titlu, dată, oră, descriere și participanți</span>
            </div>

            <label className="editor-field">
              <span>Titlu</span>
              <input value={meetingTitle} onChange={(event) => setMeetingTitle(event.target.value)} placeholder="ex: Daily incident response" />
            </label>

            <div className="meeting-form-grid">
              <label className="editor-field">
                <span>Data</span>
                <input type="date" value={meetingDate} onChange={(event) => setMeetingDate(event.target.value)} />
              </label>
              <label className="editor-field">
                <span>Ora</span>
                <input type="time" value={meetingTime} onChange={(event) => setMeetingTime(event.target.value)} />
              </label>
            </div>

            <label className="editor-field">
              <span>Descriere</span>
              <textarea value={meetingDescription} onChange={(event) => setMeetingDescription(event.target.value)} />
            </label>

            <label className="editor-field">
              <span>Participanți</span>
              <input
                value={meetingParticipants}
                onChange={(event) => setMeetingParticipants(event.target.value)}
                placeholder="email1@local.dev, email2@local.dev"
              />
            </label>

            <button type="submit" className="primary-button">
              Adaugă ședință
            </button>
          </form>
        </div>

        <div className="dashboard-card workspace-meta-card">
          <div className="section-heading">
            <h3>Daily updates</h3>
            <span>Ce are fiecare de făcut, blocaje și următorii pași</span>
          </div>

          <div className="daily-list">
            {dailyUpdates.map((update) => (
              <article key={update.id} className="daily-card">
                <div className="meeting-head">
                  <div>
                    <strong>{update.author}</strong>
                    <span>{update.role} • {update.timestamp}</span>
                  </div>
                </div>
                <p><strong>Focus:</strong> {update.focus}</p>
                <p><strong>Blocaje:</strong> {update.blockers}</p>
                <p><strong>Next:</strong> {update.nextStep}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function AdminDashboard({ users }: { users: DbUser[] }) {
  return (
    <div className="dashboard-grid">
      <section className="dashboard-card span-12 admin-shell">
        <div className="panel-heading">
          <div>
            <span className="eyebrow tone-cyan">Administrator workspace</span>
            <h2>Full platform control over every role, workflow, table and privileged system action</h2>
          </div>
          <div className="button-row">
            <a href="#admin-control" className="ghost-button">Control</a>
            <a href="#admin-database" className="ghost-button">Database</a>
            <a href="#admin-maintenance" className="ghost-button">Maintenance</a>
          </div>
        </div>

        <div className="security-summary-grid">
          {adminMetrics.map((item) => (
            <article key={item.label} className="security-summary-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.note}</p>
            </article>
          ))}
        </div>

        <div className="analyst-capability-grid">
          {adminCapabilities.map((capability) => (
            <article key={capability.title} className="security-mission-card">
              <strong>{capability.title}</strong>
              <p>{capability.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-card hero-panel span-8" id="admin-control">
        <div className="panel-heading">
          <div>
            <span className="eyebrow tone-cyan">System overview</span>
            <h2>Administrator command center</h2>
            <p className="dashboard-subtitle security-panel-copy">
              The administrator can inspect and modify every role experience, platform workflow, system threshold and privileged data path from one control surface.
            </p>
          </div>
          <button type="button" className="primary-button">
            Open system config
          </button>
        </div>

        <div className="stats-grid">
          {quickStats.map((item) => (
            <article key={item.label} className="stat-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small className={`tone-${item.accent}`}>live telemetry</small>
            </article>
          ))}
        </div>

        <div className="dashboard-split">
          <div>
            <div className="section-heading">
              <h3>ML thresholds & fallback rules</h3>
              <span>Editable control plane</span>
            </div>

            <div className="config-stack">
              <label className="config-row">
                <span>Critical auto-create threshold</span>
                <input type="range" min="60" max="99" defaultValue="87" />
                <strong>0.87</strong>
              </label>
              <label className="config-row">
                <span>Medium severity analyst review</span>
                <input type="range" min="20" max="90" defaultValue="55" />
                <strong>0.55</strong>
              </label>
              <label className="toggle-row">
                <span>Enable rule fallback when ML is uncertain</span>
                <button type="button" className="toggle-chip active">
                  Enabled
                </button>
              </label>
              <label className="toggle-row">
                <span>Allow direct DB maintenance mode</span>
                <button type="button" className="toggle-chip active">
                  Full access
                </button>
              </label>
            </div>
          </div>

          <div>
            <div className="section-heading">
              <h3>Weekly control signals</h3>
              <span>alerts, incidents, automation</span>
            </div>
            {renderMiniBars(metricTrend, "cyan")}
          </div>
        </div>
      </section>

      <section className="dashboard-card span-4">
        <div className="section-heading">
          <h3>Cross-role control</h3>
          <span>what admin can alter for everyone</span>
        </div>

        <div className="table-list compact-list">
          {adminRoleMatrix.map((entry) => (
            <div key={entry.role} className="table-row">
              <div>
                <strong>{entry.role}</strong>
                <span>{entry.control}</span>
              </div>
              <div className="row-actions">
                <span className="status-pill neutral">full access</span>
                <button type="button" className="mini-button">
                  Modify
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-card span-12">
        <div className="section-heading">
          <h3>User and privilege management</h3>
          <span>live control over accounts, roles and account state</span>
        </div>

        <div className="table-list">
          {users.map((entry) => (
            <div key={entry.id} className="table-row">
              <div>
                <strong>{entry.email}</strong>
                <span>{formatRole(normalizeRole(entry.role))} • {entry.enabled === false ? "disabled" : "active"}</span>
              </div>
              <div className="row-actions">
                <button type="button" className="mini-button">
                  Edit role
                </button>
                <button type="button" className="mini-button">
                  Toggle access
                </button>
                <button type="button" className="mini-button">
                  Open account
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-card span-6">
        <div className="section-heading">
          <h3>Playbooks under governance</h3>
          <span>automation catalog</span>
        </div>

        <div className="table-list">
          {playbooks.map((playbook) => (
            <div key={playbook.id} className="table-row">
              <div>
                <strong>{playbook.name}</strong>
                <span>{playbook.description}</span>
              </div>
              <div className="row-metrics">
                <span>{playbook.runs} runs</span>
                <span>{playbook.successRate}% success</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-card span-6">
        <div className="section-heading">
          <h3>Audit highlights</h3>
          <span>high-risk administrative changes</span>
        </div>
        <div className="timeline">
          {auditLogs.map((log) => (
            <article key={log.id} className="timeline-item">
              <span className="timeline-time">{log.timestamp}</span>
              <div>
                <strong>{log.action}</strong>
                <p>{log.details}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-card span-8" id="admin-database">
        <div className="section-heading">
          <h3>Database control surface</h3>
          <span>schema visibility, direct edits and privileged maintenance</span>
        </div>
        <div className="stats-grid">
          <article className="stat-card">
            <span>Tracked tables</span>
            <strong>9</strong>
            <small className="tone-cyan">core operational and governance tables</small>
          </article>
          <article className="stat-card">
            <span>DB sessions</span>
            <strong>14</strong>
            <small className="tone-amber">2 elevated</small>
          </article>
          <article className="stat-card">
            <span>Slow queries</span>
            <strong>3</strong>
            <small className="tone-rose">needs tuning</small>
          </article>
          <article className="stat-card">
            <span>Last backup</span>
            <strong>02:00</strong>
            <small className="tone-emerald">verified</small>
          </article>
        </div>

        <div className="admin-db-layout">
          <div className="table-list">
            {adminDbTables.map((table) => (
              <div key={table.name} className="table-row">
                <div>
                  <strong>{table.name}</strong>
                  <span>{table.description}</span>
                </div>
                <div className="row-metrics">
                  <span>{table.rows} rows</span>
                  <button type="button" className="mini-button">{table.mode}</button>
                </div>
              </div>
            ))}
          </div>

          <div className="code-editor-card">
            <div className="code-editor-topline">
              <strong>Direct DB patch console</strong>
              <span>privileged admin mode</span>
            </div>
            <pre className="code-editor-preview">
              <code>{adminDbPreview}</code>
            </pre>
            <div className="code-lab-footer">
              <span>Targets: `automation_rules`, `users`</span>
              <span>Audit trail required</span>
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-card span-4" id="admin-maintenance">
        <div className="section-heading">
          <h3>Privileged actions</h3>
          <span>absolute control plane</span>
        </div>
        <div className="action-grid">
          <button type="button" className="action-tile">Open DB explorer</button>
          <button type="button" className="action-tile">Edit any dashboard</button>
          <button type="button" className="action-tile">Rotate service secrets</button>
          <button type="button" className="action-tile">Force-disable account</button>
          <button type="button" className="action-tile">Rebuild ML ruleset</button>
          <button type="button" className="action-tile">Override automation rule</button>
        </div>
      </section>
    </div>
  );
}

function ManagerDashboard({ mailOpen }: { mailOpen: boolean }) {
  const managerTasks = tasksByRole.MANAGER;

  return (
    <div className="dashboard-grid">
      <section className="dashboard-card span-12 manager-shell">
        <div className="panel-heading">
          <div>
            <span className="eyebrow tone-cyan">Manager workspace</span>
            <h2>Leadership, policy, oversight and risk decisions across people, systems and incidents</h2>
          </div>
          <div className="button-row">
            <a href="#manager-operations" className="ghost-button">Operations</a>
            <a href="#manager-risks" className="ghost-button">Risk</a>
            <a href="#manager-systems" className="ghost-button">Systems</a>
          </div>
        </div>

        <div className="security-summary-grid">
          {managerMetrics.map((item) => (
            <article key={item.label} className="security-summary-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.note}</p>
            </article>
          ))}
        </div>

        <div className="analyst-capability-grid">
          {managerCapabilities.map((capability) => (
            <article key={capability.title} className="security-mission-card">
              <strong>{capability.title}</strong>
              <p>{capability.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <NonAdminWorkspace role="MANAGER" forceOpen={mailOpen} />

      <section className="dashboard-card hero-panel span-8" id="manager-operations">
        <div className="panel-heading">
          <div>
            <span className="eyebrow tone-cyan">Department operations</span>
            <h2>Security operations management desk</h2>
            <p className="dashboard-subtitle security-panel-copy">
              Coordinate staff, enforce procedures, oversee incidents and keep security technologies and compliance obligations under control.
            </p>
          </div>
          <div className="button-row">
            <button type="button" className="primary-button">
              Reassign workload
            </button>
            <button type="button" className="ghost-button">
              Approve escalation
            </button>
          </div>
        </div>

        <div className="dashboard-split">
          <div>
            <div className="section-heading">
              <h3>Personnel management</h3>
              <span>team load, staffing and supervision</span>
            </div>
            {renderMiniBars(managerChartSeries.staffing, "cyan")}
          </div>

          <div>
            <div className="section-heading">
              <h3>Policy and leadership actions</h3>
              <span>approvals, procedures and emergency response</span>
            </div>
            <div className="table-list compact-list">
              <div className="table-row">
                <div>
                  <strong>Emergency response plan refresh</strong>
                  <span>Approve updated outage and breach communication sequence</span>
                </div>
                <button type="button" className="mini-button">Approve</button>
              </div>
              <div className="table-row">
                <div>
                  <strong>Extra analyst allocation</strong>
                  <span>Finance mailbox case and weekend shift balancing</span>
                </div>
                <button type="button" className="mini-button">Review</button>
              </div>
              <div className="table-row">
                <div>
                  <strong>After-hours systems test</strong>
                  <span>CCTV and access control maintenance requires manager sign-off</span>
                </div>
                <button type="button" className="mini-button">Authorize</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-card span-4">
        <div className="section-heading">
          <h3>Leadership pulse</h3>
          <span>team, stakeholders and investigation direction</span>
        </div>
        <div className="timeline">
          <article className="timeline-item">
            <span className="timeline-time">Today</span>
            <div>
              <strong>Shift coverage full</strong>
              <p>No staffing gaps for day and evening rotations; on-call backup confirmed.</p>
            </div>
          </article>
          <article className="timeline-item">
            <span className="timeline-time">09:20</span>
            <div>
              <strong>Escalation queue reviewed</strong>
              <p>Two incidents promoted, one sent back to triage and one assigned to engineering.</p>
            </div>
          </article>
          <article className="timeline-item">
            <span className="timeline-time">08:45</span>
            <div>
              <strong>Stakeholder update prepared</strong>
              <p>Leadership note drafted for legal, operations and incident stakeholders.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="dashboard-card span-12">
        <div className="section-heading">
          <h3>Manager charts</h3>
          <span>people, systems and compliance oversight</span>
        </div>
        <div className="chart-grid chart-grid-three">
          <article className="chart-card">
            <div className="chart-card-head">
              <strong>Staffing allocation</strong>
              <span>personnel management</span>
            </div>
            {renderMiniBars(managerChartSeries.staffing, "cyan")}
          </article>
          <article className="chart-card" id="manager-systems">
            <div className="chart-card-head">
              <strong>Systems oversight</strong>
              <span>CCTV, alarms, access control, SOC</span>
            </div>
            {renderMiniBars(managerChartSeries.systemOversight, "amber")}
          </article>
          <article className="chart-card">
            <div className="chart-card-head">
              <strong>Compliance readiness</strong>
              <span>legal and internal adherence</span>
            </div>
            {renderMiniBars(managerChartSeries.compliance, "emerald")}
          </article>
        </div>
      </section>

      <section className="dashboard-card span-6" id="manager-risks">
        <div className="section-heading">
          <h3>Risk mitigation board</h3>
          <span>physical and cyber exposure under management</span>
        </div>
        <div className="table-list">
          <div className="table-row">
            <div>
              <strong>Badge access drift in restricted area</strong>
              <span>Access control review opened with facilities team</span>
            </div>
            <div className="row-metrics">
              <span className="status-pill severity-high">high</span>
              <button type="button" className="mini-button">Mitigate</button>
            </div>
          </div>
          <div className="table-row">
            <div>
              <strong>Incident #801 executive escalation</strong>
              <span>Cross-functional coordination with engineering and legal</span>
            </div>
            <div className="row-metrics">
              <span className="status-pill severity-critical">critical</span>
              <button type="button" className="mini-button">Lead</button>
            </div>
          </div>
          <div className="table-row">
            <div>
              <strong>CCTV retention policy exception</strong>
              <span>Needs policy update and compliance confirmation</span>
            </div>
            <div className="row-metrics">
              <span className="status-pill severity-medium">medium</span>
              <button type="button" className="mini-button">Review</button>
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-card span-6">
        <div className="section-heading">
          <h3>Manager duty board</h3>
          <span>current responsibilities and investigations</span>
        </div>
        <div className="security-side-list">
          {managerTasks.map((task) => (
            <article key={task.id} className="security-side-card">
              <div className="task-topline">
                <span className={`status-pill priority-${task.priority}`}>{task.priority}</span>
                <span className={`status-pill task-${task.status}`}>{task.status.replace("_", " ")}</span>
              </div>
              <strong>{task.title}</strong>
              <p>{task.due}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function AnalystDashboard({ mailOpen }: { mailOpen: boolean }) {
  const analystTasks = tasksByRole.ANALYST;

  return (
    <div className="dashboard-grid">
      <section className="dashboard-card span-12 analyst-shell">
        <div className="panel-heading">
          <div>
            <span className="eyebrow tone-amber">Analyst workspace</span>
            <h2>Fast triage, clean visibility and response tools that stay easy to navigate</h2>
          </div>
          <div className="button-row">
            <a href="#analyst-investigations" className="ghost-button">Investigations</a>
            <a href="#analyst-tools" className="ghost-button">Tools</a>
            <a href="#analyst-reporting" className="ghost-button">Reporting</a>
          </div>
        </div>

        <div className="security-summary-grid">
          {analystMetrics.map((item) => (
            <article key={item.label} className="security-summary-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.note}</p>
            </article>
          ))}
        </div>

        <div className="analyst-capability-grid">
          {analystCapabilities.map((capability) => (
            <article key={capability.title} className="security-mission-card">
              <strong>{capability.title}</strong>
              <p>{capability.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <NonAdminWorkspace role="ANALYST" forceOpen={mailOpen} />

      <section className="dashboard-card hero-panel span-8" id="analyst-investigations">
        <div className="panel-heading">
          <div>
            <span className="eyebrow tone-amber">Investigation queue</span>
            <h2>Analyst triage workspace</h2>
            <p className="dashboard-subtitle security-panel-copy">
              Monitor malicious activity, investigate incidents and move from alert noise to clear analyst action without losing speed.
            </p>
          </div>
          <div className="button-row">
            <button type="button" className="primary-button">
              Run playbook
            </button>
            <button type="button" className="ghost-button">
              Mark false positive
            </button>
          </div>
        </div>

        <div className="incident-stack">
          {incidents.map((incident) => (
            <article key={incident.id} className="incident-card">
              <div className="incident-head">
                <div>
                  <div className="incident-meta">
                    <span className={`status-pill severity-${incident.severity}`}>
                      {incident.severity}
                    </span>
                    <span className={`status-pill incident-${incident.status}`}>
                      {incident.status.replace("_", " ")}
                    </span>
                    <span className="status-pill neutral">{incident.source}</span>
                  </div>
                  <h3>
                    #{incident.id} {incident.title}
                  </h3>
                </div>
                <div className="confidence-ring">
                  <strong>{Math.round(incident.confidenceScore * 100)}%</strong>
                  <span>ML confidence</span>
                </div>
              </div>

              <p>{incident.description}</p>

              <div className="incident-db-meta">
                <span>{getIncidentAlertCount(incident.id)} linked alerts</span>
                <span>{executionLogs.filter((entry) => entry.incidentId === incident.id).length} playbook runs</span>
                <span>{incident.source.replace("_", " ")} creation</span>
              </div>

              <div className="incident-graph-strip">
                <div className="incident-graph-node">
                  <strong>{getIncidentAlertCount(incident.id)}</strong>
                  <span>alerts</span>
                </div>
                <div className="incident-graph-connector" />
                <div className="incident-graph-node">
                  <strong>1</strong>
                  <span>incident</span>
                </div>
                <div className="incident-graph-connector" />
                <div className="incident-graph-node">
                  <strong>{executionLogs.filter((entry) => entry.incidentId === incident.id).length}</strong>
                  <span>executions</span>
                </div>
              </div>

              <div className="incident-footer">
                <span>Assigned: {incident.assignedUser}</span>
                <span>Created: {incident.createdAt}</span>
                <div className="button-row">
                  <button type="button" className="mini-button">
                    Close incident
                  </button>
                  <button type="button" className="mini-button">
                    Add comment
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-card span-4">
        <div className="section-heading">
          <h3>Incoming alerts</h3>
          <span>sorted by severity</span>
        </div>
        <div className="alert-list">
          {alerts.map((alert) => (
            <article key={alert.id} className="alert-card">
              <div className="alert-topline">
                <span className={`status-pill severity-${alert.severity}`}>
                  {alert.severity}
                </span>
                <span>{alert.createdAt}</span>
              </div>
              <strong>{alert.source}</strong>
              <p>{alert.message}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-card span-4 analyst-side-stack">
        <div className="section-heading">
          <h3>Analyst toolbelt</h3>
          <span>specific tools for daily response work</span>
        </div>
        <div className="analyst-tool-grid" id="analyst-tools">
          {analystToolset.map((tool) => (
            <button key={tool} type="button" className="action-tile analyst-tool-tile">
              {tool}
            </button>
          ))}
        </div>
      </section>

      <section className="dashboard-card span-4">
        <div className="section-heading">
          <h3>Detection trend</h3>
          <span>alert flow this week</span>
        </div>
        {renderMiniBars(analystTrend, "amber")}
      </section>

      <section className="dashboard-card span-12">
        <div className="section-heading">
          <h3>Analyst charts</h3>
          <span>built around alerts, incidents, incident_alerts and playbook_executions</span>
        </div>
        <div className="chart-grid chart-grid-four">
          <article className="chart-card">
            <div className="chart-card-head">
              <strong>Incidents by severity</strong>
              <span>from `incidents.severity`</span>
            </div>
            {renderMiniBars(analystChartSeries.incidentSeverity, "rose")}
          </article>
          <article className="chart-card">
            <div className="chart-card-head">
              <strong>Incidents by status</strong>
              <span>from `incidents.status`</span>
            </div>
            {renderMiniBars(analystChartSeries.incidentStatus, "cyan")}
          </article>
          <article className="chart-card">
            <div className="chart-card-head">
              <strong>Alert source mix</strong>
              <span>from `alerts.source`</span>
            </div>
            {renderMiniBars(analystChartSeries.alertSources, "amber")}
          </article>
          <article className="chart-card">
            <div className="chart-card-head">
              <strong>Execution health</strong>
              <span>from `playbook_executions.status`</span>
            </div>
            {renderMiniBars(analystChartSeries.executionHealth, "emerald")}
          </article>
        </div>
      </section>

      <section className="dashboard-card span-4">
        <div className="section-heading">
          <h3>Task focus</h3>
          <span>what the analyst should finish next</span>
        </div>
        <div className="security-side-list">
          {analystTasks.map((task) => (
            <article key={task.id} className="security-side-card">
              <div className="task-topline">
                <span className={`status-pill priority-${task.priority}`}>{task.priority}</span>
                <span className={`status-pill task-${task.status}`}>{task.status.replace("_", " ")}</span>
              </div>
              <strong>{task.title}</strong>
              <p>{task.due}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-card span-6">
        <div className="section-heading">
          <h3>Manual actions</h3>
          <span>fast SOC controls and analyst tools</span>
        </div>
        <div className="action-grid">
          <button type="button" className="action-tile">
            Run containment playbook
          </button>
          <button type="button" className="action-tile">
            Escalate to engineer
          </button>
          <button type="button" className="action-tile">
            Merge related alerts
          </button>
          <button type="button" className="action-tile">
            Export evidence snapshot
          </button>
        </div>
      </section>

      <section className="dashboard-card span-6" id="analyst-reporting">
        <div className="section-heading">
          <h3>Execution status</h3>
          <span>latest `playbook_executions` rows</span>
        </div>
        <div className="table-list">
          {executionLogs.map((entry) => (
            <div key={entry.id} className="table-row">
              <div>
                <strong>{entry.playbook}</strong>
                <span>Incident #{entry.incidentId}</span>
              </div>
              <div className="row-metrics">
                <span className={`status-pill exec-${entry.status}`}>{entry.status}</span>
                <span>{entry.duration}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-card span-6">
        <div className="section-heading">
          <h3>Incident relationship board</h3>
          <span>context from `incident_alerts`</span>
        </div>
        <div className="table-list">
          {incidentAlertLinks.map((link) => (
            <div key={link.incidentId} className="table-row">
              <div>
                <strong>Incident #{link.incidentId}</strong>
                <span>{link.alertIds.join(", ")} linked alert IDs</span>
              </div>
              <div className="row-metrics">
                <span className="status-pill neutral">{link.alertIds.length} alerts</span>
                <button type="button" className="mini-button">Open graph</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-card span-6">
        <div className="section-heading">
          <h3>Evidence and execution logs</h3>
          <span>debug path from `execution_logs` and audit</span>
        </div>
        <div className="timeline">
          <article className="timeline-item">
            <span className="timeline-time">09:11</span>
            <div>
              <strong>execution_logs: API timeout on firewall step</strong>
              <p>Analyst can correlate failure with incident #801 before escalating to engineering.</p>
            </div>
          </article>
          <article className="timeline-item">
            <span className="timeline-time">09:18</span>
            <div>
              <strong>execution_logs: retry succeeded on second attempt</strong>
              <p>Evidence snapshot updated and containment path preserved in execution history.</p>
            </div>
          </article>
          <article className="timeline-item">
            <span className="timeline-time">09:41</span>
            <div>
              <strong>audit_logs: incident state changed by analyst</strong>
              <p>Root-cause and false-positive review can be traced directly from the reporting lane.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="dashboard-card span-12">
        <div className="section-heading">
          <h3>Reporting and readiness</h3>
          <span>incident reporting, compliance context and recovery preparation</span>
        </div>
        <div className="analyst-report-grid">
          <article className="security-side-card">
            <span className="status-pill neutral">Security report</span>
            <strong>Daily incident summary ready for export</strong>
            <p>Includes root cause notes, affected assets, remediation status and recommended next steps.</p>
          </article>
          <article className="security-side-card">
            <span className="status-pill incident-open">Compliance</span>
            <strong>Policy and control checks remain visible</strong>
            <p>Track regulation-sensitive incidents and confirm evidence exists before closure.</p>
          </article>
          <article className="security-side-card">
            <span className="status-pill exec-running">Disaster recovery</span>
            <strong>Recovery drill scheduled for backup identity services</strong>
            <p>Analyst can review recovery notes, validation steps and post-incident lessons in one place.</p>
          </article>
        </div>
      </section>
    </div>
  );
}

function SecurityEngineerDashboard({ mailOpen }: { mailOpen: boolean }) {
  const [selectedPlaybook, setSelectedPlaybook] = useState<PlaybookItem>(playbooks[0]);
  const securityTasks = tasksByRole.SECURITY_ENGINEER;
  const securityThreads = threadsByRole.SECURITY_ENGINEER;

  return (
    <div className="dashboard-grid">
      <section className="dashboard-card span-12 security-engineer-shell">
        <div className="panel-heading">
          <div>
            <span className="eyebrow tone-emerald">Security engineer workspace</span>
            <h2>One place for defense design, response automation and engineering traceability</h2>
          </div>
          <div className="button-row">
            <a href="#security-automation" className="ghost-button">Automation</a>
            <a href="#security-code-lab" className="ghost-button">Code lab</a>
            <a href="#security-changes" className="ghost-button">Changes</a>
          </div>
        </div>

        <div className="security-summary-grid">
          {securityEngineerMetrics.map((item) => (
            <article key={item.label} className="security-summary-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.note}</p>
            </article>
          ))}
        </div>

        <div className="security-mission-grid">
          {securityEngineerCapabilities.map((capability) => (
            <article key={capability.title} className="security-mission-card">
              <strong>{capability.title}</strong>
              <p>{capability.detail}</p>
            </article>
          ))}
        </div>

        <div className="chart-grid chart-grid-three security-db-grid">
          <article className="chart-card">
            <div className="chart-card-head">
              <strong>Automation rules</strong>
              <span>from `automation_rules`</span>
            </div>
            {renderMiniBars(
              automationRules.map((rule) => ({ label: `#${rule.id}`, value: rule.enabled ? 1 : 0 })),
              "emerald"
            )}
          </article>
          <article className="chart-card">
            <div className="chart-card-head">
              <strong>Playbook execution health</strong>
              <span>from `playbook_executions`</span>
            </div>
            {renderMiniBars(
              [
                { label: "Success", value: executionLogs.filter((entry) => entry.status === "success").length },
                { label: "Running", value: executionLogs.filter((entry) => entry.status === "running").length },
                { label: "Failed", value: executionLogs.filter((entry) => entry.status === "failed").length },
              ],
              "emerald"
            )}
          </article>
          <article className="chart-card">
            <div className="chart-card-head">
              <strong>Audit surfaces</strong>
              <span>from `audit_logs.surface`</span>
            </div>
            {renderMiniBars(
              [
                { label: "users", value: auditLogs.filter((log) => log.surface === "users").length },
                { label: "playbooks", value: auditLogs.filter((log) => log.surface === "playbooks").length },
                { label: "incidents", value: auditLogs.filter((log) => log.surface === "incidents").length },
                { label: "ml", value: auditLogs.filter((log) => log.surface === "ml-config").length },
              ],
              "cyan"
            )}
          </article>
        </div>
      </section>

      <NonAdminWorkspace role="SECURITY_ENGINEER" forceOpen={mailOpen} />

      <section className="dashboard-card span-4 security-side-stack">
        <div className="section-heading">
          <h3>Operations focus</h3>
          <span>what needs attention right now</span>
        </div>

        <div className="security-side-list">
          <article className="security-side-card">
            <span className="status-pill severity-critical">Containment risk</span>
            <strong>Firewall deny action still needs retry hardening</strong>
            <p>Priority task linked to incident `#801`, with rollback required if provider returns partial success.</p>
          </article>

          <article className="security-side-card">
            <span className="status-pill neutral">Internal chat</span>
            <strong>{securityThreads.filter((thread) => thread.unread).length} unread engineering threads</strong>
            <p>Inbox stays visible below so ops context and implementation work remain in the same flow.</p>
          </article>

          <article className="security-side-card">
            <span className="status-pill task-in_progress">Task lane</span>
            <strong>{securityTasks.filter((task) => task.status !== "done").length} active tasks in motion</strong>
            <p>Engineering delivery, change notes and collaboration are grouped instead of split across tools.</p>
          </article>
        </div>
      </section>

      <section className="dashboard-card hero-panel span-8" id="security-automation">
        <div className="panel-heading">
          <div>
            <span className="eyebrow tone-emerald">Automation studio</span>
            <h2>Security engineering flow builder</h2>
            <p className="dashboard-subtitle security-panel-copy">
              Configure secure actions, validate trigger conditions and keep every run tied to incidents, audit trails and rollback logic.
            </p>
          </div>
          <div className="button-row">
            <button type="button" className="primary-button">
              Save draft
            </button>
            <button type="button" className="ghost-button">
              Test playbook
            </button>
          </div>
        </div>

        <div className="builder-layout">
          <aside className="builder-sidebar">
            <div className="section-heading">
              <h3>Playbook catalog</h3>
              <span>select a flow to edit</span>
            </div>

            <div className="builder-list">
              {playbooks.map((playbook) => (
                <button
                  key={playbook.id}
                  type="button"
                  className={classNames(
                    "builder-list-item",
                    selectedPlaybook.id === playbook.id && "active"
                  )}
                  onClick={() => setSelectedPlaybook(playbook)}
                >
                  <strong>{playbook.name}</strong>
                  <span>{playbook.steps.length} steps</span>
                </button>
              ))}
            </div>

            <div className="toolbox">
              <span className="toolbox-title">Step toolbox</span>
              <div className="toolbox-pills">
                <span>API_CALL</span>
                <span>EMAIL</span>
                <span>SCRIPT</span>
              </div>
            </div>
          </aside>

          <div className="builder-canvas">
            <div className="flow-meta">
              <div>
                <h3>{selectedPlaybook.name}</h3>
                <p>{selectedPlaybook.description}</p>
              </div>
              <div className="row-metrics">
                <span>{selectedPlaybook.runs} executions</span>
                <span>{selectedPlaybook.successRate}% success</span>
              </div>
            </div>

            <div className="flow-lane">
              {selectedPlaybook.steps.map((step, index) => (
                <div key={step.id} className="flow-step-wrap">
                  <article className="flow-step">
                    <span className="flow-step-type">{step.actionType}</span>
                    <strong>
                      {step.stepOrder}. {step.label}
                    </strong>
                    <code>{step.config}</code>
                  </article>
                  {index < selectedPlaybook.steps.length - 1 ? <div className="flow-arrow" /> : null}
                </div>
              ))}

              <button type="button" className="flow-add">
                + Add step
              </button>
            </div>
          </div>

          <aside className="builder-sidebar">
            <div className="section-heading">
              <h3>Step configuration</h3>
              <span>editable JSON shape</span>
            </div>

            <label className="editor-field">
              <span>Trigger condition</span>
              <textarea
                defaultValue={`{\n  "severity": "critical",\n  "source": "ml_based",\n  "confidence_score": { "gte": 0.85 }\n}`}
              />
            </label>

            <label className="editor-field">
              <span>Execution notes</span>
              <textarea
                defaultValue={`- Validate external provider response\n- Write execution_logs on each transition\n- Roll back deny rule if API returns partial failure`}
              />
            </label>
          </aside>
        </div>
      </section>

      <section className="dashboard-card span-4">
        <div className="section-heading">
          <h3>Automation rules</h3>
          <span>actual logic from `automation_rules`</span>
        </div>
        <div className="table-list">
          {automationRules.map((rule) => (
            <div key={rule.id} className="table-row">
              <div>
                <strong>{rule.name}</strong>
                <span>{rule.action}</span>
              </div>
              <div className="row-metrics">
                <span className="status-pill neutral">{rule.enabled ? "enabled" : "disabled"}</span>
                <button type="button" className="mini-button">Inspect</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-card span-6" id="security-code-lab">
        <div className="section-heading">
          <div>
            <h3>Code and automation lab</h3>
            <span>write scripts, review infrastructure config and ship safe changes</span>
          </div>
          <button type="button" className="mini-button">
            Run dry test
          </button>
        </div>

        <div className="code-lab-layout">
          <div className="code-lab-files">
            <span className="code-lab-label">Workspace</span>
            {codeWorkbenchFiles.map((file) => (
              <button key={file} type="button" className="builder-list-item">
                <strong>{file.split("/").at(-1)}</strong>
                <span>{file}</span>
              </button>
            ))}
          </div>

          <div className="code-editor-card">
            <div className="code-editor-topline">
              <strong>archive_ioc.py</strong>
              <span>autosave sandbox</span>
            </div>
            <pre className="code-editor-preview">
              <code>{codeWorkbenchPreview}</code>
            </pre>
            <div className="code-lab-footer">
              <span>Linked to: Block Malicious IP</span>
              <span>Last validation: 10:19</span>
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-card span-6">
        <div className="section-heading">
          <h3>Execution pipeline</h3>
          <span>success vs. failure rate</span>
        </div>
        {renderMiniBars(
          [
            { label: "API actions", value: 94 },
            { label: "Script actions", value: 88 },
            { label: "Email actions", value: 99 },
          ],
          "emerald"
        )}
      </section>

      <section className="dashboard-card span-6" id="security-changes">
        <div className="section-heading">
          <h3>Recent engineering changes</h3>
          <span>commit-style traceability for automation updates</span>
        </div>

        <div className="commit-list">
          {securityCommits.map((commit) => (
            <article key={commit.id} className="commit-card">
              <div className="commit-topline">
                <div>
                  <strong>{commit.title}</strong>
                  <span>{commit.id} • {commit.scope}</span>
                </div>
                <span className={`status-pill commit-${commit.status}`}>{commit.status}</span>
              </div>
              <p>{commit.summary}</p>
              <div className="commit-meta">
                <span>{commit.author}</span>
                <span>{commit.timestamp}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-card span-6">
        <div className="section-heading">
          <h3>DB mapping</h3>
          <span>how the engineer role touches core tables</span>
        </div>
        <div className="timeline">
          <article className="timeline-item">
            <span className="timeline-time">alerts</span>
            <div>
              <strong>Input signals trigger automation conditions</strong>
              <p>Engineers use alert attributes to design `automation_rules` and attach the right playbook path.</p>
            </div>
          </article>
          <article className="timeline-item">
            <span className="timeline-time">playbooks</span>
            <div>
              <strong>Execution logic lives in playbooks and steps</strong>
              <p>Each response flow is modeled through `playbooks`, `playbook_steps` and execution monitoring.</p>
            </div>
          </article>
          <article className="timeline-item">
            <span className="timeline-time">audit_logs</span>
            <div>
              <strong>Every privileged change remains traceable</strong>
              <p>Engineer changes surface in audit and can be reviewed alongside commit-style updates.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="dashboard-card span-6">
        <div className="section-heading">
          <h3>Audit-linked timeline</h3>
          <span>who changed what and why</span>
        </div>
        <div className="timeline">
          {auditLogs.map((log) => (
            <article key={log.id} className="timeline-item">
              <span className="timeline-time">{log.timestamp}</span>
              <div>
                <strong>{log.action}</strong>
                <p>{log.details}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function AuditorDashboard({
  user,
  mailOpen,
}: {
  user: StoredUser;
  mailOpen: boolean;
}) {
  const [selectedReportType, setSelectedReportType] = useState<AuditorReportType>("compliance");

  return (
    <div className="dashboard-grid">
      <section className="dashboard-card span-12 auditor-shell">
        <div className="panel-heading">
          <div>
            <span className="eyebrow tone-rose">Audit workspace</span>
            <h2>Compliance, risk, policy review and system control oversight in one evidence-driven surface</h2>
          </div>
          <div className="button-row">
            <a href="#auditor-reports" className="ghost-button">Reports</a>
            <a href="#auditor-policies" className="ghost-button">Policies</a>
            <a href="#auditor-timeline" className="ghost-button">Timeline</a>
          </div>
        </div>

        <div className="security-summary-grid">
          {auditorMetrics.map((item) => (
            <article key={item.label} className="security-summary-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.note}</p>
            </article>
          ))}
        </div>

        <div className="analyst-capability-grid">
          <article className="security-mission-card">
            <strong>Compliance evaluations</strong>
            <p>Validate procedures and evidence against standards like HIPAA and PCI-DSS.</p>
          </article>
          <article className="security-mission-card">
            <strong>Risk assessment</strong>
            <p>Identify vulnerabilities, insider-risk exposure and weak controls across systems.</p>
          </article>
          <article className="security-mission-card">
            <strong>Policy review</strong>
            <p>Audit policies, response plans and access control matrices with DB-backed evidence.</p>
          </article>
          <article className="security-mission-card">
            <strong>Reporting</strong>
            <p>Generate management-ready PDF reports by audit type, not just one generic export.</p>
          </article>
        </div>
      </section>

      <NonAdminWorkspace role="AUDITOR" forceOpen={mailOpen} />

      <section className="dashboard-card hero-panel span-8" id="auditor-reports">
        <div className="panel-heading">
          <div>
            <span className="eyebrow tone-rose">Read-only oversight</span>
            <h2>Audit and reporting center</h2>
            <p className="dashboard-subtitle security-panel-copy">
              Review infrastructure controls, procedures and audit trails, then export the exact PDF report type needed by management or compliance.
            </p>
          </div>
          <div className="button-row">
            <button type="button" className="ghost-button">
              Export CSV
            </button>
          </div>
        </div>

        <div className="report-type-grid">
          {auditorReportTypes.map((report) => (
            <article
              key={report.id}
              className={classNames(
                "report-type-card",
                selectedReportType === report.id && "active"
              )}
            >
              <div>
                <strong>{report.title}</strong>
                <p>{report.description}</p>
              </div>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setSelectedReportType(report.id);
                  generateAuditPdf(user, report.id);
                }}
              >
                Generate PDF
              </button>
            </article>
          ))}
        </div>

        <div className="dashboard-split">
          <div>
            <div className="section-heading">
              <h3>Compliance and risk charts</h3>
              <span>from audit evidence and operational tables</span>
            </div>
            <div className="chart-grid">
              <article className="chart-card">
                <div className="chart-card-head">
                  <strong>Compliance coverage</strong>
                  <span>policies and procedures</span>
                </div>
                {renderMiniBars(auditorChartSeries.compliance, "emerald")}
              </article>
              <article className="chart-card">
                <div className="chart-card-head">
                  <strong>Risk findings</strong>
                  <span>current audit window</span>
                </div>
                {renderMiniBars(auditorChartSeries.risk, "rose")}
              </article>
            </div>
          </div>

          <div>
            <div className="section-heading">
              <h3>Review scope</h3>
              <span>mapped to database entities</span>
            </div>
            <div className="scope-list">
              <div className="scope-row">
                <span>`audit_logs`</span>
                <strong>148 trace events and privileged actions</strong>
              </div>
              <div className="scope-row">
                <span>`playbooks` / `playbook_steps`</span>
                <strong>7 production flows under control review</strong>
              </div>
              <div className="scope-row">
                <span>`incidents` / `incident_alerts`</span>
                <strong>incident traceability and evidence linkage checked</strong>
              </div>
              <div className="scope-row">
                <span>`playbook_executions` / `execution_logs`</span>
                <strong>execution control coverage and failure review</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-card span-4">
        <div className="section-heading">
          <h3>System audit focus</h3>
          <span>control testing and unauthorized access prevention</span>
        </div>
        <div className="security-side-list">
          <article className="security-side-card">
            <span className="status-pill neutral">Infrastructure</span>
            <strong>Firewall and execution controls sampled this week</strong>
            <p>`playbook_executions` and `execution_logs` are reviewed for failed or partially controlled actions.</p>
          </article>
          <article className="security-side-card">
            <span className="status-pill incident-open">Access review</span>
            <strong>Privileged changes traced from `audit_logs`</strong>
            <p>Focus on role changes, policy exceptions and any path that could permit unauthorized access.</p>
          </article>
          <article className="security-side-card">
            <span className="status-pill exec-running">Threat exposure</span>
            <strong>Incident creation paths tested against policy</strong>
            <p>Manual, rule-based and ML-created incidents are checked for evidence completeness and governance coverage.</p>
          </article>
        </div>
      </section>

      <section className="dashboard-card span-6" id="auditor-policies">
        <div className="section-heading">
          <h3>Policy and procedure review</h3>
          <span>documentation audit with system context</span>
        </div>
        <div className="security-side-list">
          {policyReviewItems.map((item) => (
            <article key={item.title} className="security-side-card">
              <div className="task-topline">
                <span className="status-pill neutral">{item.status}</span>
              </div>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-card span-6">
        <div className="section-heading">
          <h3>Control coverage charts</h3>
          <span>how well the core tables are governed</span>
        </div>
        <div className="chart-grid">
          <article className="chart-card">
            <div className="chart-card-head">
              <strong>Coverage by table</strong>
              <span>data security and traceability</span>
            </div>
            {renderMiniBars(auditorChartSeries.controlCoverage, "cyan")}
          </article>
          <article className="chart-card">
            <div className="chart-card-head">
              <strong>Report exports by type</strong>
              <span>PDF reporting mix</span>
            </div>
            {renderMiniBars(auditorChartSeries.reportMix, "amber")}
          </article>
        </div>
      </section>

      <section className="dashboard-card span-12" id="auditor-timeline">
        <div className="section-heading">
          <h3>Immutable audit timeline</h3>
          <span>who changed what and when</span>
        </div>
        <div className="audit-table">
          <div className="audit-header">
            <span>Timestamp</span>
            <span>Actor</span>
            <span>Action</span>
            <span>Surface</span>
            <span>Details</span>
          </div>
          {auditLogs.map((log) => (
            <div key={log.id} className="audit-row">
              <span>{log.timestamp}</span>
              <span>{log.actor}</span>
              <span>{log.action}</span>
              <span>{log.surface}</span>
              <span>{log.details}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedView, setSelectedView] = useState<Role | "AUTO">("AUTO");
  const [mailOpen, setMailOpen] = useState(false);
  const [dbUsers, setDbUsers] = useState<DbUser[]>([]);

  const rawUser = window.sessionStorage.getItem("coreshieldUser");
  const parsedUser: StoredUser | null = rawUser ? JSON.parse(rawUser) : null;
  const user: StoredUser | null = parsedUser
    ? { ...parsedUser, role: normalizeRole(parsedUser.role) }
    : null;

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    const handlePopState = () => {
      window.sessionStorage.removeItem("coreshieldUser");
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [navigate, user]);

  const activeRole = useMemo<Role | null>(() => {
    if (!user) {
      return null;
    }

    return selectedView === "AUTO" ? user.role : selectedView;
  }, [selectedView, user]);

  useEffect(() => {
    setMailOpen(false);
  }, [activeRole]);

  useEffect(() => {
    if (!user || activeRole !== "ADMIN") {
      return;
    }

    let isCancelled = false;

    async function loadUsers() {
      try {
        const response = await fetch("http://localhost:8000/users");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Could not load users.");
        }

        if (!isCancelled) {
          setDbUsers(data.users ?? []);
        }
      } catch {
        if (!isCancelled) {
          setDbUsers([]);
        }
      }
    }

    loadUsers();

    return () => {
      isCancelled = true;
    };
  }, [activeRole, user]);

  const handleLogout = () => {
    window.sessionStorage.removeItem("coreshieldUser");
    navigate("/login", { replace: true });
  };

  const openMailPanel = () => {
    setMailOpen(true);
    window.requestAnimationFrame(() => {
      document.getElementById("service-inbox")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  if (!user || !activeRole) {
    return null;
  }

  const roleMeta: Record<Role, { title: string; subtitle: string }> = {
    ADMIN: {
      title: "Platform-wide visibility and control.",
      subtitle:
        "Configure operators, automation policy, ML thresholds and governance signals from a single command surface.",
    },
    ANALYST: {
      title: "Investigate, validate and respond fast.",
      subtitle:
        "Review alerts, validate ML-created incidents and take the right action before noise becomes impact.",
    },
    SECURITY_ENGINEER: {
      title: "Engineer secure workflows behind every response.",
      subtitle:
        "Design secure infrastructure workflows, automate containment and keep chat, tasks, code and change history in one operational workspace.",
    },
    AUDITOR: {
      title: "Read-only oversight with evidence-ready reporting.",
      subtitle:
        "Track every privileged action, review execution trails and generate formal reports for compliance and leadership.",
    },
    MANAGER: {
      title: "Lead the department, capacity and operational decisions.",
      subtitle:
        "Coordinate people, approve escalations, balance workload and keep the response function on target without stepping into audit forensics.",
    },
  };

  const unreadCount =
    activeRole === "ADMIN" ? 0 : threadsByRole[activeRole].filter((thread) => thread.unread).length;

  return (
    <section className="dashboard-shell">
      <div className="dashboard-backdrop" />

      <div className="dashboard-frame">
        <RoleHeader
          user={user}
          title={roleMeta[activeRole].title}
          subtitle={roleMeta[activeRole].subtitle}
          onLogout={handleLogout}
          onOpenMail={openMailPanel}
          mailCount={unreadCount}
          showMailAction={activeRole !== "ADMIN"}
        />

        {user.role === "ADMIN" ? (
          <div className="role-switcher">
            <span>Preview dashboards:</span>
            <button
              type="button"
              className={classNames("role-chip", selectedView === "AUTO" && "active")}
              onClick={() => setSelectedView("AUTO")}
            >
              My role
            </button>
            {(["ADMIN", "MANAGER", "ANALYST", "SECURITY_ENGINEER", "AUDITOR"] as Role[]).map((role) => (
              <button
                key={role}
                type="button"
                className={classNames(
                  "role-chip",
                  activeRole === role && selectedView !== "AUTO" && "active"
                )}
                onClick={() => setSelectedView(role)}
              >
                {formatRole(role)}
              </button>
            ))}
          </div>
        ) : null}

        {activeRole === "ADMIN" ? <AdminDashboard users={dbUsers} /> : null}
        {activeRole === "MANAGER" ? <ManagerDashboard mailOpen={mailOpen} /> : null}
        {activeRole === "ANALYST" ? <AnalystDashboard mailOpen={mailOpen} /> : null}
        {activeRole === "SECURITY_ENGINEER" ? (
          <SecurityEngineerDashboard mailOpen={mailOpen} />
        ) : null}
        {activeRole === "AUDITOR" ? <AuditorDashboard user={user} mailOpen={mailOpen} /> : null}
      </div>
    </section>
  );
}
