import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

type Role = "ADMIN" | "MANAGER" | "SECURITY_ENGINEER" | "ANALYST" | "AUDITOR";

type StoredUser = {
  id: number;
  email: string;
  role: Role;
};

type AdminDbTable = {
  name: string;
  description: string;
  rows: number;
  editable: boolean;
};

type AdminDbData = {
  table: string;
  columns: string[];
  editable_columns: string[];
  insertable_columns: string[];
  editable: boolean;
  rows: Array<Record<string, unknown>>;
};

type AdminQueryResult = {
  command: string;
  affected_rows: number;
  rows: Array<Record<string, unknown>>;
  truncated: boolean;
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

type AuditorReportType =
  | "compliance"
  | "risk"
  | "policy"
  | "system_controls";

type AuditorReportStatus = "draft" | "review" | "approved";

type AuditorReport = {
  id: number;
  title: string;
  report_type: AuditorReportType;
  description: string;
  status: AuditorReportStatus;
  recommendation: string;
  owner: string;
  updated_at: string;
};

type AuditorDashboardData = {
  metrics: SecurityEngineerMetric[];
  modules: SecurityEngineerModule[];
  priorities: SecurityEngineerPriority[];
  notifications: SecurityEngineerNotification[];
  tasks: TaskItem[];
  reports: AuditorReport[];
};

type ManagerReportStatus = "draft" | "review" | "approved";

type ManagerReport = {
  id: number;
  title: string;
  report_type: string;
  description: string;
  status: ManagerReportStatus;
  recommendation: string;
  owner: string;
  updated_at: string;
};

type ManagerTask = TaskItem & {
  description: string;
  approval_status: "pending" | "approved" | "rejected";
};

type ManagerLeaveRequest = {
  id: number;
  employee: string;
  request_type: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  starts_on: string;
  ends_on: string;
};

type ManagerTeamMember = {
  id: number;
  email: string;
  role: Exclude<Role, "ADMIN">;
};

type ManagerDashboardData = {
  metrics: SecurityEngineerMetric[];
  modules: SecurityEngineerModule[];
  priorities: SecurityEngineerPriority[];
  notifications: SecurityEngineerNotification[];
  tasks: ManagerTask[];
  leave_requests: ManagerLeaveRequest[];
  reports: ManagerReport[];
  team: ManagerTeamMember[];
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

type ChatDirectoryUser = {
  id: number;
  email: string;
  role: Exclude<Role, "ADMIN">;
  enabled: boolean;
};

type ChatDirectoryGroup = {
  id: string;
  label: string;
  role: Exclude<Role, "ADMIN"> | null;
  participants: string[];
};

type SecurityEngineerMetric = {
  label: string;
  value: string;
  note: string;
};

type SecurityEngineerModule = {
  id: string;
  title: string;
  description: string;
  action: string;
  count: string;
  rows: Array<{
    name: string;
    detail: string;
    value: string;
  }>;
};

type SecurityEngineerPriority = {
  title: string;
  detail: string;
  status: string;
};

type SecurityEngineerNotification = {
  id: number;
  title: string;
  detail: string;
  time: string;
  tone: string;
};

type SecurityEngineerDashboardData = {
  metrics: SecurityEngineerMetric[];
  modules: SecurityEngineerModule[];
  priorities: SecurityEngineerPriority[];
  notifications: SecurityEngineerNotification[];
  playbooks: PlaybookItem[];
  tasks: TaskItem[];
};

type ChatDirectory = {
  users: ChatDirectoryUser[];
  groups: ChatDirectoryGroup[];
};

type ChatConversation = {
  id: string;
  kind: "direct" | "group";
  subject: string;
  participants: string[];
  preview: string;
  unread: boolean;
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

const securityEngineerMetrics: SecurityEngineerMetric[] = [
  { label: "Automations live", value: "18", note: "12 fully active in production" },
  { label: "Secrets rotated", value: "42", note: "last 24 hours across cloud and VPN" },
  { label: "Coverage score", value: "91%", note: "design, monitoring and rollback checks" },
  { label: "Pending reviews", value: "3", note: "changes waiting for approval" },
];

const securityEngineerModules: SecurityEngineerModule[] = [
  {
    id: "architecture",
    title: "Secure Architecture",
    description: "Design cloud, network and application boundaries before risky paths reach production.",
    action: "Review architecture",
    count: "8",
    rows: [
      { name: "AWS landing zone", detail: "Segmentation review", value: "96%" },
      { name: "VPN gateway", detail: "Hardening checklist", value: "84%" },
      { name: "IAM policy set", detail: "Least privilege drift", value: "12" },
    ],
  },
  {
    id: "automation",
    title: "Security Automation",
    description: "Build response playbooks, rotate secrets and remove repetitive manual work.",
    action: "Open automation studio",
    count: "18",
    rows: [
      { name: "Block malicious IP", detail: "Palo Alto API", value: "76 runs" },
      { name: "Contain endpoint", detail: "EDR isolation", value: "48 runs" },
      { name: "Secret rotation", detail: "Cloud and VPN", value: "42 runs" },
    ],
  },
  {
    id: "monitoring",
    title: "Threat Monitoring",
    description: "Watch logs, firewall events, malware indicators and DDoS patterns in one queue.",
    action: "Inspect threat signals",
    count: "27",
    rows: [
      { name: "Firewall spikes", detail: "Edge SIEM", value: "9" },
      { name: "EDR scripts", detail: "Unsigned PowerShell", value: "6" },
      { name: "Identity signals", detail: "MFA fatigue", value: "12" },
    ],
  },
  {
    id: "compliance",
    title: "Compliance & Audit",
    description: "Keep GDPR, HIPAA and PCI controls mapped to engineering changes and audit trails.",
    action: "View audit evidence",
    count: "91%",
    rows: [
      { name: "GDPR", detail: "Access traceability", value: "94%" },
      { name: "PCI DSS", detail: "Change evidence", value: "89%" },
      { name: "HIPAA", detail: "Control coverage", value: "90%" },
    ],
  },
  {
    id: "vulnerabilities",
    title: "Vulnerability Management",
    description: "Prioritize weaknesses, penetration test findings and remediation work.",
    action: "Open remediation queue",
    count: "11",
    rows: [
      { name: "Critical exposure", detail: "External perimeter", value: "2" },
      { name: "Patch validation", detail: "Endpoint fleet", value: "5" },
      { name: "Config drift", detail: "Cloud services", value: "4" },
    ],
  },
];

const securityEngineerPriorities: SecurityEngineerPriority[] = [
  {
    title: "Harden firewall deny action retry",
    detail: "Incident #801 needs rollback coverage before rollout.",
    status: "critical",
  },
  {
    title: "Review IAM policy drift",
    detail: "12 privileged paths changed across the AWS landing zone.",
    status: "review",
  },
  {
    title: "Validate endpoint isolation fallback",
    detail: "Dry run is ready for the EDR containment path.",
    status: "testing",
  },
];

const securityEngineerNotifications: SecurityEngineerNotification[] = [
  {
    id: 1,
    title: "Firewall retry requires review",
    detail: "The deny action for incident #801 returned a partial provider response.",
    time: "8 min ago",
    tone: "critical",
  },
  {
    id: 2,
    title: "IAM drift scan completed",
    detail: "12 privileged paths changed since the previous AWS landing zone review.",
    time: "24 min ago",
    tone: "review",
  },
  {
    id: 3,
    title: "Secret rotation succeeded",
    detail: "Cloud and VPN credentials rotated without failed targets.",
    time: "1h ago",
    tone: "testing",
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

type AnalystChartPoint = {
  label: string;
  value: number;
};

type AnalystChart = {
  id: number;
  title: string;
  dataset: keyof typeof analystChartSeries;
  type: "bar" | "line" | "donut";
};

type AnalystChartSeries = Record<keyof typeof analystChartSeries, AnalystChartPoint[]>;

type AnalystDashboardData = {
  metrics: SecurityEngineerMetric[];
  modules: SecurityEngineerModule[];
  priorities: SecurityEngineerPriority[];
  notifications: SecurityEngineerNotification[];
  tasks: TaskItem[];
  chartSeries: AnalystChartSeries;
  reportCharts: AnalystChart[];
};

const analystModules: SecurityEngineerModule[] = [
  {
    id: "monitoring",
    title: "SIEM Monitoring",
    description: "Follow network, endpoint, identity and mailbox signals from one triage surface.",
    action: "Inspect signal stream",
    count: "46",
    rows: [
      { name: "Edge firewall", detail: "VPN brute-force cluster", value: "9 alerts" },
      { name: "Endpoint detection", detail: "Unsigned PowerShell activity", value: "6 alerts" },
      { name: "Identity provider", detail: "MFA fatigue pattern", value: "12 alerts" },
    ],
  },
  {
    id: "investigations",
    title: "Incident Response",
    description: "Investigate, isolate and remediate suspicious activity while preserving evidence.",
    action: "Open investigation desk",
    count: "7",
    rows: [
      { name: "VPN credential attack", detail: "Incident #801 · critical", value: "in progress" },
      { name: "Finance mailbox forwarding", detail: "Incident #802 · phishing", value: "triage" },
      { name: "Endpoint script execution", detail: "Incident #803 · medium", value: "review" },
    ],
  },
  {
    id: "vulnerabilities",
    title: "Vulnerability Scans",
    description: "Review exposed services, weak configurations and remediation progress.",
    action: "Open scan findings",
    count: "11",
    rows: [
      { name: "External perimeter", detail: "Critical exposure validation", value: "2 findings" },
      { name: "Endpoint fleet", detail: "Patch verification", value: "5 findings" },
      { name: "Cloud services", detail: "Configuration drift", value: "4 findings" },
    ],
  },
  {
    id: "analytics",
    title: "Analytics & Reports",
    description: "Turn SIEM data into focused visual investigations and evidence-ready reports.",
    action: "Open analytics studio",
    count: "4",
    rows: [
      { name: "Incident severity", detail: "Cases grouped by operational risk", value: "27 cases" },
      { name: "Alert source mix", detail: "Signals grouped by detection source", value: "39 alerts" },
      { name: "Execution health", detail: "Response workflow outcomes", value: "25 runs" },
    ],
  },
  {
    id: "recovery",
    title: "Recovery & Training",
    description: "Track recovery drills, policy readiness and awareness activities after incidents.",
    action: "Review readiness plan",
    count: "3",
    rows: [
      { name: "Identity restore drill", detail: "Backup service validation", value: "scheduled" },
      { name: "Phishing awareness", detail: "Finance team simulation", value: "82%" },
      { name: "Incident handbook", detail: "Quarterly recovery review", value: "ready" },
    ],
  },
];

const analystNotifications: SecurityEngineerNotification[] = [
  { id: 101, title: "Critical VPN cluster assigned", detail: "Nine correlated firewall alerts are ready for analyst triage.", time: "6 min ago", tone: "critical" },
  { id: 102, title: "Mailbox evidence enriched", detail: "Finance forwarding-rule evidence is available for review.", time: "19 min ago", tone: "review" },
  { id: 103, title: "Recovery drill reminder", detail: "Backup identity validation starts tomorrow at 10:00.", time: "1h ago", tone: "testing" },
];

const analystPriorities: SecurityEngineerPriority[] = [
  { title: "Contain VPN credential attack", detail: "Correlate source IPs and confirm firewall isolation for incident #801.", status: "critical" },
  { title: "Review finance mailbox evidence", detail: "Validate forwarding-rule history before escalating the phishing case.", status: "review" },
  { title: "Build daily SOC snapshot", detail: "Summarize severity, source mix and workflow health for the shift report.", status: "testing" },
];

const auditorMetrics = [
  { label: "Compliance gaps", value: "4", note: "two procedural, two control-design findings" },
  { label: "Open risks", value: "7", note: "tracked across incidents, rules and privileged flows" },
  { label: "Policies reviewed", value: "12", note: "including IR plan and access matrix" },
  { label: "Report exports", value: "6", note: "segmented by audit report type" },
];

const auditorModules: SecurityEngineerModule[] = [
  { id: "compliance", title: "Compliance Evaluations", description: "Evaluate procedures and evidence against HIPAA, PCI-DSS and internal requirements.", action: "Review compliance evidence", count: "92%", rows: [{ name: "HIPAA safeguards", detail: "Administrative and technical safeguard evidence", value: "92%" }, { name: "PCI DSS controls", detail: "Payment-data access and traceability", value: "96%" }] },
  { id: "risk", title: "Risk Assessment & Testing", description: "Identify vulnerabilities, test controls and evaluate external or insider-threat exposure.", action: "Open risk testing desk", count: "3", rows: [{ name: "External perimeter", detail: "Network vulnerability and exposure testing", value: "2 critical" }, { name: "Insider threat paths", detail: "Privileged role and access review", value: "5 paths" }] },
  { id: "policies", title: "Policy Review", description: "Audit security policies, incident response plans and access-control matrices.", action: "Inspect policy evidence", count: "2", rows: [{ name: "Access control matrix", detail: "Role assignment documentation", value: "update" }, { name: "Playbook governance", detail: "Automated-action approvals", value: "ready" }] },
  { id: "systems", title: "System Auditing", description: "Examine technical controls and traceability paths that minimize unauthorized access.", action: "Inspect system controls", count: "3", rows: [{ name: "Incident traceability", detail: "Evidence linking across alerts", value: "95%" }, { name: "Execution controls", detail: "Response workflow failure review", value: "88%" }] },
  { id: "reports", title: "Report Management", description: "Create management-ready reports, capture recommendations and move drafts toward approval.", action: "Open report manager", count: "3", rows: [{ name: "Quarterly compliance assurance", detail: "HIPAA and PCI-DSS alignment", value: "review" }, { name: "Privileged access risk assessment", detail: "Insider-threat path testing", value: "draft" }] },
];

const auditorPriorities: SecurityEngineerPriority[] = [
  { title: "Close PCI-DSS evidence gap", detail: "Attach the missing change-approval evidence for the payment-data workflow.", status: "critical" },
  { title: "Review privileged access exceptions", detail: "Validate five role exceptions against the access control matrix.", status: "review" },
  { title: "Publish quarterly control report", detail: "Summarize compliance coverage, risks and management recommendations.", status: "testing" },
];

const auditorNotifications: SecurityEngineerNotification[] = [
  { id: 201, title: "PCI-DSS evidence needs attention", detail: "One approval artifact is missing from the current audit window.", time: "12 min ago", tone: "critical" },
  { id: 202, title: "Access review sample ready", detail: "Five privileged exceptions are ready for auditor validation.", time: "31 min ago", tone: "review" },
];

const auditorReports: AuditorReport[] = [
  { id: 1, title: "Quarterly compliance assurance", report_type: "compliance", description: "HIPAA, PCI-DSS and internal procedure alignment.", status: "review", recommendation: "Attach missing PCI-DSS approval evidence before sign-off.", owner: "alexandru.stan@local.dev", updated_at: "Jun 02, 2026 10:00" },
  { id: 2, title: "Privileged access risk assessment", report_type: "risk", description: "Insider-threat paths and privileged role exception testing.", status: "draft", recommendation: "Remove stale access paths and document approved exceptions.", owner: "alexandru.stan@local.dev", updated_at: "Jun 02, 2026 09:30" },
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

const managerModules: SecurityEngineerModule[] = [
  { id: "policies", title: "Policy Development", description: "Create and supervise security protocols, procedures and emergency response plans.", action: "Review policy desk", count: "2", rows: [{ name: "Emergency response plan", detail: "Escalation and continuity procedures", value: "active" }, { name: "Physical access protocol", detail: "Visitor and restricted-zone controls", value: "review" }] },
  { id: "personnel", title: "Personnel Management", description: "Assign work, supervise teams, approve tasks and keep training and coverage visible.", action: "Open management center", count: "3", rows: [{ name: "SOC shift coverage", detail: "Analysts, engineers and on-call supervision", value: "96%" }, { name: "Security awareness training", detail: "Quarterly workforce program", value: "88%" }] },
  { id: "risks", title: "Risk Mitigation", description: "Assess physical security gaps and cyber exposure, then prioritize mitigation ownership.", action: "Inspect risk actions", count: "2", rows: [{ name: "Physical perimeter review", detail: "Camera blind spots and badge-reader gaps", value: "3 actions" }, { name: "Cyber exposure review", detail: "Critical remediation items", value: "6 actions" }] },
  { id: "incidents", title: "Incident Investigation", description: "Lead breach, theft and vandalism investigations with clear escalation ownership.", action: "Open investigation desk", count: "1", rows: [{ name: "VPN brute-force cluster", detail: "Cross-team investigation and escalation", value: "lead" }] },
  { id: "systems", title: "Systems Oversight", description: "Supervise CCTV, alarms, access control and operational security technology.", action: "Inspect security systems", count: "3", rows: [{ name: "CCTV estate", detail: "Surveillance cameras and retention", value: "12 online" }, { name: "Access control", detail: "Badge readers and privileged areas", value: "8 online" }] },
  { id: "compliance", title: "Compliance", description: "Keep legal standards, industry regulations and internal requirements under review.", action: "Review compliance posture", count: "2", rows: [{ name: "Legal standards", detail: "Policy and evidence alignment", value: "94%" }, { name: "Industry controls", detail: "External obligation tracking", value: "91%" }] },
  { id: "management", title: "Management Center", description: "Assign tasks, approve work and leave requests, and generate leadership reports.", action: "Open management center", count: "8", rows: [{ name: "Task approvals", detail: "Assignments waiting for decisions", value: "1" }, { name: "Leave approvals", detail: "Personnel requests awaiting review", value: "2" }, { name: "Leadership reports", detail: "Draft, review and approved reports", value: "3" }] },
];

const managerPriorities: SecurityEngineerPriority[] = [
  { title: "Approve VPN escalation plan", detail: "Validate staffing, containment ownership and stakeholder communications.", status: "critical" },
  { title: "Close restricted-zone badge gap", detail: "Assign the access-control remediation before the weekly review.", status: "review" },
  { title: "Publish weekly leadership report", detail: "Summarize staffing, risks, systems oversight and compliance posture.", status: "testing" },
];

const managerNotifications: SecurityEngineerNotification[] = [
  { id: 301, title: "Two task approvals are pending", detail: "Review cross-team assignments before their planned start time.", time: "8 min ago", tone: "critical" },
  { id: 302, title: "Leave request requires decision", detail: "An analyst annual-leave request is ready for approval.", time: "23 min ago", tone: "review" },
];

const managerTasks: ManagerTask[] = [
  { id: 10, title: "Validate restricted-zone badge drift", description: "Review the access exception.", priority: "high", status: "queued", approval_status: "pending", owner: "mihai.ionescu@local.dev", due: "Today, 15:00" },
  { id: 11, title: "Patch CCTV retention policy exception", description: "Publish corrected configuration.", priority: "medium", status: "in_progress", approval_status: "approved", owner: "anca.popescu@local.dev", due: "Tomorrow, 10:00" },
];

const managerLeaveRequests: ManagerLeaveRequest[] = [
  { id: 1, employee: "mihai.ionescu@local.dev", request_type: "annual_leave", reason: "Planned annual leave", status: "pending", starts_on: "Jun 10, 2026", ends_on: "Jun 12, 2026" },
];

const managerReports: ManagerReport[] = [
  { id: 1, title: "Weekly security leadership snapshot", report_type: "leadership", description: "Staffing, risk actions, systems posture and incident leadership summary.", status: "review", recommendation: "Approve the physical access remediation owner before distribution.", owner: "manager.soc@local.dev", updated_at: "Jun 02, 2026 10:00" },
];

const managerTeam: ManagerTeamMember[] = [
  { id: 1, email: "manager.soc@local.dev", role: "MANAGER" },
  { id: 2, email: "mihai.ionescu@local.dev", role: "ANALYST" },
  { id: 3, email: "anca.popescu@local.dev", role: "SECURITY_ENGINEER" },
  { id: 4, email: "alexandru.stan@local.dev", role: "AUDITOR" },
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

function getNonAdminThreads(role: Exclude<Role, "ADMIN">) {
  return threadsByRole[role].filter((thread) => (
    !thread.participants.some((participant) => participant === "admin@local.dev")
    && !thread.messages.some((message) => message.sender === "admin@local.dev")
  ));
}

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
        <p>Generated on ${new Date().toLocaleString()} by ${user?.email ?? "unknown user"}.</p>
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

function NonAdminWorkspace({
  role,
  forceOpen,
}: {
  role: Exclude<Role, "ADMIN">;
  forceOpen: boolean;
}) {
  const threads = getNonAdminThreads(role);
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

function AdminDatabaseExplorer({ adminEmail }: { adminEmail: string }) {
  const [adminPassword, setAdminPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [tables, setTables] = useState<AdminDbTable[]>([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [tableData, setTableData] = useState<AdminDbData | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [newRowDraft, setNewRowDraft] = useState("{}");
  const [query, setQuery] = useState("SELECT id, email, role, enabled FROM users ORDER BY id;");
  const [queryResult, setQueryResult] = useState<AdminQueryResult | null>(null);

  const request = async (path: string, options: RequestInit = {}) => {
    const response = await fetch(`http://localhost:8000/admin/database/${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
    const data = await response.json().catch(() => ({ detail: "The backend returned an unreadable response." }));

    if (!response.ok) {
      throw new Error(data.detail || "The administrative request failed.");
    }

    return data;
  };

  const credentials = {
    admin_email: adminEmail,
    admin_password: adminPassword,
  };

  const loadTables = async () => {
    const data = await request("tables", {
      method: "POST",
      body: JSON.stringify(credentials),
    }) as { tables: AdminDbTable[] };
    setTables(data.tables);
    return data.tables;
  };

  const loadTable = async (table: string) => {
    setIsLoading(true);
    setError("");
    try {
      const data = await request("rows", {
        method: "POST",
        body: JSON.stringify({ ...credentials, table }),
      }) as AdminDbData;
      setSelectedTable(table);
      setTableData(data);
      setDrafts({});
      setNewRowDraft(JSON.stringify(
        Object.fromEntries(data.insertable_columns.map((column) => [column, ""])),
        null,
        2
      ));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load table data.");
    } finally {
      setIsLoading(false);
    }
  };

  const unlock = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const tables = await loadTables();
      setIsUnlocked(true);
      setMessage("Privileged database mode unlocked for this page session.");
      if (tables.length) {
        await loadTable(tables[0].name);
      }
    } catch (unlockError) {
      setError(unlockError instanceof Error ? unlockError.message : "Could not unlock admin mode.");
    } finally {
      setIsLoading(false);
    }
  };

  const editableDraft = (row: Record<string, unknown>) => Object.fromEntries(
    Object.entries(row).filter(([column]) => tableData?.editable_columns.includes(column))
  );

  const updateRow = async (row: Record<string, unknown>) => {
    const rowId = Number(row.id);
    setError("");
    setMessage("");

    try {
      const changes = JSON.parse(drafts[rowId] ?? JSON.stringify(editableDraft(row)));
      await request("rows", {
        method: "PATCH",
        body: JSON.stringify({ ...credentials, table: selectedTable, row_id: rowId, changes }),
      });
      setMessage(`Row #${rowId} updated in ${selectedTable}.`);
      await loadTable(selectedTable);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update the selected row.");
    }
  };

  const createRow = async () => {
    setError("");
    setMessage("");

    try {
      const values = JSON.parse(newRowDraft);
      await request("rows/create", {
        method: "POST",
        body: JSON.stringify({ ...credentials, table: selectedTable, values }),
      });
      setMessage(`New row added to ${selectedTable}.`);
      await loadTables();
      await loadTable(selectedTable);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not add the row.");
    }
  };

  const deleteRow = async (row: Record<string, unknown>) => {
    const rowId = Number(row.id);
    if (!window.confirm(`Delete row #${rowId} from ${selectedTable}? This action cannot be undone.`)) {
      return;
    }

    setError("");
    setMessage("");
    try {
      await request("rows/delete", {
        method: "POST",
        body: JSON.stringify({ ...credentials, table: selectedTable, row_id: rowId }),
      });
      setMessage(`Row #${rowId} deleted from ${selectedTable}.`);
      await loadTables();
      await loadTable(selectedTable);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete the selected row.");
    }
  };

  const runQuery = async () => {
    const command = query.trim().split(/\s+/, 1)[0]?.toUpperCase();
    const isReadOnlyQuery = command === "SELECT"
      || (command === "WITH" && !/\b(INSERT|UPDATE|DELETE)\b/i.test(query));
    if (!isReadOnlyQuery && !window.confirm("Run this write query against the database?")) {
      return;
    }

    setError("");
    setMessage("");
    try {
      const result = await request("query", {
        method: "POST",
        body: JSON.stringify({ ...credentials, query }),
      }) as AdminQueryResult;
      setQueryResult(result);
      setMessage(`${result.command} completed. ${result.affected_rows} row(s) reported by PostgreSQL.`);
      await loadTables();
      if (selectedTable) {
        await loadTable(selectedTable);
      }
    } catch (queryError) {
      setError(queryError instanceof Error ? queryError.message : "Could not execute query.");
    }
  };

  const lockExplorer = () => {
    setAdminPassword("");
    setIsUnlocked(false);
    setTables([]);
    setSelectedTable("");
    setTableData(null);
    setDrafts({});
    setQueryResult(null);
    setMessage("");
    setError("");
  };

  if (!isUnlocked) {
    return (
      <form className="admin-unlock-card" onSubmit={unlock}>
        <span className="eyebrow tone-cyan">Protected access</span>
        <h3>Unlock database explorer</h3>
        <p>Confirm your administrator password to inspect and maintain approved tables. The password stays in page memory only.</p>
        <input
          type="password"
          className="admin-db-input"
          value={adminPassword}
          onChange={(event) => setAdminPassword(event.target.value)}
          placeholder="Administrator password"
          autoComplete="current-password"
          required
        />
        <button type="submit" className="primary-button" disabled={isLoading}>
          {isLoading ? "Verifying..." : "Unlock explorer"}
        </button>
        {error ? <p className="admin-db-error">{error}</p> : null}
      </form>
    );
  }

  return (
    <div className="admin-explorer">
      <div className="admin-db-sidebar">
        <div className="section-heading">
          <h3>Database tables</h3>
          <span>{tables.length} live tables</span>
        </div>
        <div className="table-list">
          {tables.map((table) => (
            <button
              key={table.name}
              type="button"
              className={classNames("admin-table-button", selectedTable === table.name && "active")}
              onClick={() => loadTable(table.name)}
            >
              <strong>{table.name}</strong>
              <span>{table.rows} rows • {table.editable ? "edit + delete" : "inspect only"}</span>
              <small>{table.description}</small>
            </button>
          ))}
        </div>
        <button type="button" className="ghost-button admin-lock-button" onClick={lockExplorer}>
          Lock explorer
        </button>
      </div>

      <div className="admin-db-workspace">
        <div className="panel-heading">
          <div>
            <span className="eyebrow tone-cyan">Live table editor</span>
            <h3>{selectedTable || "Select a table"}</h3>
          </div>
          <button type="button" className="ghost-button" onClick={() => loadTable(selectedTable)} disabled={!selectedTable || isLoading}>
            Refresh
          </button>
        </div>

        {message ? <p className="admin-db-success">{message}</p> : null}
        {error ? <p className="admin-db-error">{error}</p> : null}
        {isLoading ? <div className="security-empty-state">Loading database rows...</div> : null}

        {!isLoading && tableData ? (
          <div className="admin-table-content">
            {tableData.editable ? (
              <div className="admin-create-card">
                <div>
                  <strong>Add row</strong>
                  <span>Complete the JSON fields required by `{selectedTable}`.</span>
                </div>
                <textarea
                  className="admin-json-editor"
                  value={newRowDraft}
                  onChange={(event) => setNewRowDraft(event.target.value)}
                  aria-label={`New row JSON for ${selectedTable}`}
                />
                <button type="button" className="primary-button" onClick={createRow}>Add row</button>
              </div>
            ) : null}

            <div className="admin-row-list">
              {tableData.rows.map((row, index) => {
                const rowId = Number(row.id);
                const hasEditableId = Number.isFinite(rowId);
                return (
                  <article key={hasEditableId ? rowId : index} className="admin-row-card">
                    <div className="admin-row-summary">
                      <strong>{hasEditableId ? `#${rowId}` : `Row ${index + 1}`}</strong>
                      <code>{JSON.stringify(row)}</code>
                    </div>
                    {tableData.editable && hasEditableId ? (
                      <>
                        <textarea
                          className="admin-json-editor"
                          value={drafts[rowId] ?? JSON.stringify(editableDraft(row), null, 2)}
                          onChange={(event) => setDrafts((current) => ({ ...current, [rowId]: event.target.value }))}
                          aria-label={`Editable JSON for row ${rowId}`}
                        />
                        <div className="row-actions">
                          <button type="button" className="mini-button" onClick={() => updateRow(row)}>Save changes</button>
                          <button type="button" className="mini-button danger-button" onClick={() => deleteRow(row)}>Delete row</button>
                        </div>
                      </>
                    ) : (
                      <span className="status-pill neutral">inspect only</span>
                    )}
                  </article>
                );
              })}
              {!tableData.rows.length ? <div className="security-empty-state">This table is empty.</div> : null}
            </div>
          </div>
        ) : null}
      </div>

      <section className="admin-query-console">
        <div className="section-heading">
          <h3>SQL query console</h3>
          <span>one SELECT, INSERT, UPDATE, DELETE or WITH query at a time</span>
        </div>
        <textarea
          className="admin-json-editor admin-query-editor"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="SQL query"
        />
        <div className="row-actions">
          <button type="button" className="primary-button" onClick={runQuery}>Run query</button>
          <span className="admin-query-note">Write queries require confirmation. DDL commands are blocked.</span>
        </div>
        {queryResult ? (
          <div className="admin-query-result">
            <strong>{queryResult.command} result</strong>
            <span>{queryResult.affected_rows} row(s) reported{queryResult.truncated ? " • first 200 displayed" : ""}</span>
            <pre><code>{JSON.stringify(queryResult.rows, null, 2)}</code></pre>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function AdminDashboard({ user }: { user: StoredUser }) {
  return (
    <div className="dashboard-grid">
      <section className="dashboard-card span-12 admin-shell">
        <div className="panel-heading">
          <div>
            <span className="eyebrow tone-cyan">Administrator workspace</span>
            <h2>Database administration and direct SQL access</h2>
            <p className="dashboard-subtitle security-panel-copy">
              Inspect tables, add records, update operational data, remove rows and run controlled SQL queries from one protected workspace.
            </p>
          </div>
        </div>
      </section>

      <section className="dashboard-card span-12" id="admin-database">
        <div className="section-heading">
          <h3>Database control surface</h3>
          <span>live tables, CRUD operations and SQL console</span>
        </div>
        <AdminDatabaseExplorer adminEmail={user.email} />
      </section>
    </div>
  );
}

function LegacyManagerDashboard({ mailOpen }: { mailOpen: boolean }) {
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

void LegacyManagerDashboard;

function AnalystDashboard({
  mailOpen,
  user,
  onLogout,
  legacy = false,
}: {
  mailOpen: boolean;
  user: StoredUser;
  onLogout: () => void;
  legacy?: boolean;
}) {
  if (!legacy) {
    return <AnalystRoleWorkspace user={user} onLogout={onLogout} />;
  }

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

type RoleWorkspaceModule = {
  id: string;
  title: string;
};

function WorkspaceIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    architecture: (
      <>
        <path d="M4 19h16" />
        <path d="M6 19V8l6-4 6 4v11" />
        <path d="M9 19v-6h6v6" />
      </>
    ),
    automation: (
      <>
        <path d="M12 3v3" />
        <path d="M12 18v3" />
        <path d="m4.2 7.5 2.6 1.5" />
        <path d="m17.2 15 2.6 1.5" />
        <path d="m4.2 16.5 2.6-1.5" />
        <path d="m17.2 9 2.6-1.5" />
        <circle cx="12" cy="12" r="4" />
      </>
    ),
    monitoring: (
      <>
        <path d="M3 12h4l2-5 4 10 2-5h6" />
        <path d="M4 5h16v14H4z" />
      </>
    ),
    investigations: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="m16 16 4 4" />
        <path d="M8 11h6" />
        <path d="M11 8v6" />
      </>
    ),
    analytics: (
      <>
        <path d="M4 19h16" />
        <path d="M6 16v-5" />
        <path d="M12 16V5" />
        <path d="M18 16V8" />
      </>
    ),
    recovery: (
      <>
        <path d="M4 12a8 8 0 1 0 3-6.2" />
        <path d="M4 4v5h5" />
        <path d="M12 8v4l3 2" />
      </>
    ),
    compliance: (
      <>
        <path d="M12 3 5 6v5c0 4.6 3 8.1 7 10 4-1.9 7-5.4 7-10V6z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    vulnerabilities: (
      <>
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
        <path d="M10.3 4.7 3.6 17a2 2 0 0 0 1.8 3h13.2a2 2 0 0 0 1.8-3L13.7 4.7a2 2 0 0 0-3.4 0Z" />
      </>
    ),
    risk: (
      <>
        <path d="M12 3 4 7v5c0 4.4 3.2 7.5 8 9 4.8-1.5 8-4.6 8-9V7z" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </>
    ),
    policies: (
      <>
        <path d="M6 3h9l3 3v15H6z" />
        <path d="M14 3v4h4" />
        <path d="M9 12h6" />
        <path d="M9 16h6" />
      </>
    ),
    personnel: (
      <>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2" />
        <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" />
        <path d="M15 15c3 0 5 1.8 5 4" />
      </>
    ),
    incidents: (
      <>
        <path d="M12 3 4 7v5c0 4.4 3.2 7.5 8 9 4.8-1.5 8-4.6 8-9V7z" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </>
    ),
    management: (
      <>
        <path d="M5 4h14v16H5z" />
        <path d="M9 4V2h6v2" />
        <path d="m8 11 2 2 5-5" />
        <path d="M8 17h8" />
      </>
    ),
    systems: (
      <>
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M8 21h8" />
        <path d="M12 17v4" />
        <path d="m8 10 2 2 5-5" />
      </>
    ),
    reports: (
      <>
        <path d="M5 3h14v18H5z" />
        <path d="M9 8h6" />
        <path d="M9 12h6" />
        <path d="M9 16h4" />
      </>
    ),
    inbox: (
      <>
        <path d="M4 4h16v16H4z" />
        <path d="m4 6 8 7 8-7" />
      </>
    ),
    chat: (
      <>
        <path d="M4 5h16v11H8l-4 4z" />
        <path d="M8 9h8" />
        <path d="M8 12h5" />
      </>
    ),
    notifications: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    task: (
      <>
        <path d="M9 5h10" />
        <path d="M9 12h10" />
        <path d="M9 19h10" />
        <path d="m4 5 1 1 2-2" />
        <path d="m4 12 1 1 2-2" />
        <path d="m4 19 1 1 2-2" />
      </>
    ),
    search: <circle cx="11" cy="11" r="6" />,
    logout: (
      <>
        <path d="M10 5H5v14h5" />
        <path d="m14 8 4 4-4 4" />
        <path d="M9 12h9" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12" />
        <path d="m18 6-12 12" />
      </>
    ),
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
      {name === "search" ? <path d="m16 16 4 4" /> : null}
    </svg>
  );
}

function RoleWorkspaceShell({
  roleLabel,
  boardTitle,
  personaDetail,
  chatLabel,
  modules,
  activeModuleId,
  onSelectModule,
  searchValue,
  onSearchChange,
  unreadChatCount,
  notificationCount,
  drawerMode,
  onOpenDrawer,
  onCloseDrawer,
  onLogout,
  signedInUser,
  workspacePersona,
  children,
  drawer,
}: {
  roleLabel: string;
  boardTitle: string;
  personaDetail: string;
  chatLabel: string;
  modules: RoleWorkspaceModule[];
  activeModuleId: string;
  onSelectModule: (moduleId: string) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  unreadChatCount: number;
  notificationCount: number;
  drawerMode: "chat" | "notifications" | null;
  onOpenDrawer: (mode: "chat" | "notifications") => void;
  onCloseDrawer: () => void;
  onLogout: () => void;
  signedInUser: StoredUser;
  workspacePersona: string;
  children: ReactNode;
  drawer: ReactNode;
}) {
  return (
    <div className={classNames("role-workspace-shell", drawerMode && "drawer-open")}>
      <aside className="role-workspace-sidebar">
        <div className="role-workspace-brand">
          <div className="role-workspace-mark">CS</div>
          <div>
            <strong>CoreShield</strong>
            <span>{roleLabel}</span>
          </div>
        </div>

        <nav className="role-workspace-nav" aria-label={`${roleLabel} modules`}>
          {modules.map((module) => (
            <button
              key={module.id}
              type="button"
              className={classNames("role-workspace-nav-item", activeModuleId === module.id && "active")}
              onClick={() => onSelectModule(module.id)}
              title={module.title}
            >
              <span className="role-workspace-nav-icon"><WorkspaceIcon name={module.id} /></span>
              <span>{module.title}</span>
            </button>
          ))}
        </nav>

        <div className="role-workspace-persona">
          <span>Workspace persona</span>
          <strong>{workspacePersona}</strong>
          <small>{personaDetail}</small>
        </div>
      </aside>

      <main className="role-workspace-main">
        <header className="role-workspace-topbar">
          <div>
            <span>{roleLabel}</span>
            <strong>{boardTitle}</strong>
          </div>

          <label className="role-workspace-search">
            <WorkspaceIcon name="search" />
            <input
              type="search"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search active module"
            />
          </label>

          <div className="role-workspace-actions">
            <button type="button" className="role-workspace-icon-button" onClick={() => onOpenDrawer("chat")} aria-label={`Open ${chatLabel.toLowerCase()}`}>
              <WorkspaceIcon name="chat" />
              {unreadChatCount ? <small>{unreadChatCount}</small> : null}
            </button>
            <button type="button" className="role-workspace-icon-button" onClick={() => onOpenDrawer("notifications")} aria-label="Open notifications and tasks">
              <WorkspaceIcon name="notifications" />
              {notificationCount ? <small>{notificationCount}</small> : null}
            </button>
            <div className="role-workspace-user">
              <span>Signed in as</span>
              <strong>{signedInUser.email}</strong>
            </div>
            <button type="button" className="role-workspace-icon-button" onClick={onLogout} aria-label="Logout">
              <WorkspaceIcon name="logout" />
            </button>
          </div>
        </header>

        {children}
      </main>

      <aside className="role-workspace-drawer" aria-hidden={!drawerMode}>
        <div className="role-workspace-drawer-head">
          <div>
            <span>{drawerMode === "chat" ? chatLabel : "Operations center"}</span>
            <strong>{drawerMode === "chat" ? "Team conversations" : "Notifications & tasks"}</strong>
          </div>
          <button type="button" className="role-workspace-icon-button" onClick={onCloseDrawer} aria-label="Close side panel">
            <WorkspaceIcon name="close" />
          </button>
        </div>
        {drawer}
      </aside>

      {drawerMode ? <button type="button" className="role-workspace-scrim" onClick={onCloseDrawer} aria-label="Close side panel" /> : null}
    </div>
  );
}

type ChatComposerMode = "direct" | "group";

function SecurityEngineerChatDrawer({
  directory,
  currentUserEmail,
  isLoading,
  errorMessage,
}: {
  directory: ChatDirectory;
  currentUserEmail: string;
  isLoading: boolean;
  errorMessage: string;
}) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [draftReply, setDraftReply] = useState("");
  const [isContactPickerOpen, setIsContactPickerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<ChatComposerMode>("direct");
  const [contactSearch, setContactSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
  const [chatApiError, setChatApiError] = useState("");
  const activeThread = conversations.find((thread) => thread.id === activeThreadId) ?? conversations[0];
  const normalizedContactSearch = contactSearch.trim().toLowerCase();
  const availableContacts = directory.users.filter((user) => (
    user.email !== currentUserEmail
    && user.email.toLowerCase().includes(normalizedContactSearch)
  ));

  const loadConversations = useCallback(async (preferredThreadId = "") => {
    setChatApiError("");
    try {
      const response = await fetch(`http://localhost:8000/chat/threads?user_email=${encodeURIComponent(currentUserEmail)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not load persistent conversations.");
      const threads: ChatConversation[] = data.conversations ?? [];
      setConversations(threads);
      setActiveThreadId((current) => preferredThreadId || (threads.some((thread) => thread.id === current) ? current : threads[0]?.id ?? ""));
    } catch (error) {
      setChatApiError(error instanceof Error ? error.message : "Could not load persistent conversations.");
    }
  }, [currentUserEmail]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const sendReply = async () => {
    const reply = draftReply.trim();

    if (!reply || !activeThread) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/chat/threads/${activeThread.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender_email: currentUserEmail, body: reply }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not save the chat message.");
      setDraftReply("");
      await loadConversations(activeThread.id);
    } catch (error) {
      setChatApiError(error instanceof Error ? error.message : "Could not save the chat message.");
    }
  };

  const createConversation = async (subject: string, participantEmails: string[]) => {
    const response = await fetch("http://localhost:8000/chat/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, creator_email: currentUserEmail, participant_emails: participantEmails }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Could not create the conversation.");
    await loadConversations(data.id);
  };

  const startDirectConversation = async (contact: ChatDirectoryUser) => {
    const existingConversation = conversations.find((conversation) => (
      conversation.kind === "direct"
      && conversation.participants.length === 2
      && conversation.participants.includes(currentUserEmail)
      && conversation.participants.includes(contact.email)
    ));

    try {
      if (existingConversation) {
        setActiveThreadId(existingConversation.id);
      } else {
        await createConversation(contact.email, [contact.email]);
      }
      setIsContactPickerOpen(false);
      setContactSearch("");
    } catch (error) {
      setChatApiError(error instanceof Error ? error.message : "Could not create the direct conversation.");
    }
  };

  const toggleGroupContact = (contactId: number) => {
    setSelectedContactIds((current) => (
      current.includes(contactId)
        ? current.filter((entry) => entry !== contactId)
        : [...current, contactId]
    ));
  };

  const createGroupConversation = async () => {
    const selectedContacts = directory.users.filter((user) => selectedContactIds.includes(user.id));
    const normalizedGroupName = groupName.trim();

    if (!normalizedGroupName || !selectedContacts.length) {
      return;
    }

    try {
      await createConversation(normalizedGroupName, selectedContacts.map((contact) => contact.email));
      setIsContactPickerOpen(false);
      setComposerMode("direct");
      setContactSearch("");
      setGroupName("");
      setSelectedContactIds([]);
    } catch (error) {
      setChatApiError(error instanceof Error ? error.message : "Could not create the group conversation.");
    }
  };

  return (
    <div className="security-drawer-content security-chat-drawer">
      <section className="security-chat-thread-list">
        <div className="security-drawer-section-head">
          <strong>Conversations</strong>
          <button type="button" className="security-chat-new-button" onClick={() => setIsContactPickerOpen((current) => !current)}>
            + New
          </button>
        </div>

        {isContactPickerOpen ? (
          <div className="security-chat-contact-picker">
            <div className="security-chat-composer-tabs">
              <button type="button" className={composerMode === "direct" ? "active" : ""} onClick={() => setComposerMode("direct")}>
                Direct message
              </button>
              <button type="button" className={composerMode === "group" ? "active" : ""} onClick={() => setComposerMode("group")}>
                New group
              </button>
            </div>

            {composerMode === "group" ? (
              <input
                className="security-chat-group-name"
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="Group name"
              />
            ) : null}

            <label>
              <WorkspaceIcon name="search" />
              <input
                type="search"
                value={contactSearch}
                onChange={(event) => setContactSearch(event.target.value)}
                placeholder="Find a non-admin teammate"
              />
            </label>
            <div className="security-chat-contact-results">
              {availableContacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  className={composerMode === "group" && selectedContactIds.includes(contact.id) ? "selected" : ""}
                  onClick={() => composerMode === "direct" ? startDirectConversation(contact) : toggleGroupContact(contact.id)}
                >
                  <strong>{contact.email}</strong>
                  <span>{contact.role.replace("_", " ")}</span>
                </button>
              ))}
              {!availableContacts.length && !isLoading ? <small>No matching teammates found.</small> : null}
            </div>

            {composerMode === "group" ? (
              <button
                type="button"
                className="security-primary-button security-chat-create-group"
                disabled={!groupName.trim() || !selectedContactIds.length}
                onClick={createGroupConversation}
              >
                Create group · {selectedContactIds.length} selected
              </button>
            ) : null}
          </div>
        ) : null}

        {isLoading ? <div className="security-empty-state">Loading teammates from users...</div> : null}
        {errorMessage ? <div className="security-chat-error">{errorMessage}</div> : null}
        {chatApiError ? <div className="security-chat-error">{chatApiError}</div> : null}

        <div className="security-drawer-list">
          {conversations.map((thread) => (
            <button
              key={thread.id}
              type="button"
              className={classNames("security-drawer-thread", activeThread?.id === thread.id && "active")}
              onClick={() => setActiveThreadId(thread.id)}
            >
              <strong>{thread.subject}</strong>
              <span>{thread.preview}</span>
            </button>
          ))}
        </div>
      </section>

      {activeThread ? <section className="security-drawer-conversation">
        <div className="security-drawer-section-head">
          <strong>{activeThread.subject}</strong>
          <span>{activeThread.participants.length} participants</span>
        </div>
        <div className="security-chat-feed">
          {activeThread.messages.map((message, index) => (
            <article
              key={`${activeThread.id}-${index}`}
              className={classNames("security-chat-message", message.sender === currentUserEmail && "own")}
            >
              <strong>{message.sender}</strong>
              <p>{message.body}</p>
              <small>{message.timestamp}</small>
            </article>
          ))}
          {!activeThread.messages.length ? (
            <div className="security-empty-state">No messages yet. Write the first one below.</div>
          ) : null}
        </div>
        <div className="security-chat-compose">
          <textarea
            value={draftReply}
            onChange={(event) => setDraftReply(event.target.value)}
            placeholder="Write a reply..."
          />
          <button type="button" className="security-primary-button" onClick={sendReply}>Send reply</button>
        </div>
      </section> : null}
    </div>
  );
}

function SecurityEngineerNotificationsDrawer({
  notifications,
  onDismissNotification,
  tasks,
  onAdvanceTask,
}: {
  notifications: SecurityEngineerNotification[];
  onDismissNotification: (notificationId: number) => void;
  tasks: TaskItem[];
  onAdvanceTask: (taskId: number) => void;
}) {
  return (
    <div className="security-drawer-content">
      <section>
        <div className="security-drawer-section-head">
          <strong>Notifications</strong>
          <span>{notifications.length} active</span>
        </div>
        <div className="security-drawer-list">
          {notifications.length ? notifications.map((notification) => (
            <article key={notification.id} className="security-drawer-notification">
              <span className={`security-priority-dot ${notification.tone}`} />
              <div>
                <strong>{notification.title}</strong>
                <p>{notification.detail}</p>
                <small>{notification.time}</small>
              </div>
              <button type="button" onClick={() => onDismissNotification(notification.id)} aria-label={`Dismiss ${notification.title}`}>
                <WorkspaceIcon name="close" />
              </button>
            </article>
          )) : <div className="security-empty-state">No active notifications.</div>}
        </div>
      </section>

      <section>
        <div className="security-drawer-section-head">
          <strong>Assigned tasks</strong>
          <span>{tasks.filter((task) => task.status !== "done").length} active</span>
        </div>
        <div className="security-drawer-list">
          {tasks.map((task) => (
            <article key={task.id} className="security-drawer-task">
              <span className={`status-pill task-${task.status}`}>{task.status.replace("_", " ")}</span>
              <strong>{task.title}</strong>
              <small>{task.due}</small>
              <button type="button" className="security-demo-button" onClick={() => onAdvanceTask(task.id)}>
                Advance status
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function SecurityAutomationStudio({
  initialPlaybooks,
  onClose,
}: {
  initialPlaybooks: PlaybookItem[];
  onClose: () => void;
}) {
  const [studioPlaybooks, setStudioPlaybooks] = useState(initialPlaybooks);
  const [selectedPlaybookId, setSelectedPlaybookId] = useState(initialPlaybooks[0].id);
  const selectedPlaybook = studioPlaybooks.find((playbook) => playbook.id === selectedPlaybookId) ?? studioPlaybooks[0];
  const [selectedStepId, setSelectedStepId] = useState(selectedPlaybook.steps[0].id);
  const [studioMessage, setStudioMessage] = useState("");
  const selectedStep = selectedPlaybook.steps.find((step) => step.id === selectedStepId) ?? selectedPlaybook.steps[0];

  const selectPlaybook = (playbookId: number) => {
    const playbook = studioPlaybooks.find((entry) => entry.id === playbookId) ?? studioPlaybooks[0];
    setSelectedPlaybookId(playbook.id);
    setSelectedStepId(playbook.steps[0].id);
    setStudioMessage("");
  };

  const updateStepConfig = (config: string) => {
    setStudioPlaybooks((current) => current.map((playbook) => (
      playbook.id === selectedPlaybook.id
        ? {
            ...playbook,
            steps: playbook.steps.map((step) => step.id === selectedStep.id ? { ...step, config } : step),
          }
        : playbook
    )));
  };

  const addValidationStep = () => {
    const nextId = Math.max(...studioPlaybooks.flatMap((playbook) => playbook.steps.map((step) => step.id))) + 1;

    setStudioPlaybooks((current) => current.map((playbook) => (
      playbook.id === selectedPlaybook.id
        ? {
            ...playbook,
            steps: [
              ...playbook.steps,
              {
                id: nextId,
                stepOrder: playbook.steps.length + 1,
                actionType: "SCRIPT",
                label: "Validate provider response",
                config: '{ "script": "validate_provider_response.py", "rollback_on_failure": true }',
              },
            ],
          }
        : playbook
    )));
    setSelectedStepId(nextId);
    setStudioMessage("Validation step added to the draft.");
  };

  const saveStepConfig = async () => {
    let config;

    try {
      config = JSON.parse(selectedStep.config);
    } catch {
      setStudioMessage("Configuration must be valid JSON before it can be saved.");
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/security-engineer/playbook-steps/${selectedStep.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not save the selected playbook step.");
      }

      setStudioMessage(`${selectedStep.label} configuration saved to PostgreSQL.`);
    } catch (error) {
      setStudioMessage(error instanceof Error ? error.message : "Could not save the selected playbook step.");
    }
  };

  return (
    <section className="security-studio">
      <header className="security-studio-topbar">
        <div>
          <button type="button" className="security-demo-button" onClick={onClose}>Back to overview</button>
          <span>Automation studio</span>
          <h1>{selectedPlaybook.name}</h1>
        </div>
        <div className="security-studio-actions">
          <button type="button" className="security-demo-button" onClick={() => setStudioMessage("Draft saved locally.")}>Save draft</button>
          <button type="button" className="security-primary-button" onClick={() => setStudioMessage("Playbook published in demo mode.")}>Publish playbook</button>
        </div>
      </header>

      {studioMessage ? <div className="security-studio-message">{studioMessage}</div> : null}

      <div className="security-studio-layout">
        <aside className="security-studio-sidebar">
          <span className="security-command-kicker">Playbook catalog</span>
          <div className="security-studio-catalog">
            {studioPlaybooks.map((playbook) => (
              <button
                key={playbook.id}
                type="button"
                className={classNames("security-studio-playbook", selectedPlaybook.id === playbook.id && "active")}
                onClick={() => selectPlaybook(playbook.id)}
              >
                <strong>{playbook.name}</strong>
                <span>{playbook.steps.length} steps · {playbook.successRate}% success</span>
              </button>
            ))}
          </div>

          <div className="security-studio-toolbox">
            <span className="security-command-kicker">Action toolbox</span>
            <div>
              <button type="button" onClick={addValidationStep}>+ Validation script</button>
              <button type="button" onClick={() => setStudioMessage("API action selected. Add it from the active playbook flow.")}>+ API call</button>
              <button type="button" onClick={() => setStudioMessage("Notification action selected. Add it from the active playbook flow.")}>+ Notification</button>
            </div>
          </div>
        </aside>

        <div className="security-studio-canvas">
          <div className="security-studio-canvas-head">
            <div>
              <span>Response workflow</span>
              <strong>{selectedPlaybook.description}</strong>
            </div>
            <small>{selectedPlaybook.runs} executions</small>
          </div>

          <div className="security-flow-grid">
            <article className="security-flow-trigger">
              <span>Trigger</span>
              <strong>Incident severity ≥ high</strong>
              <small>SIEM, EDR or identity signal</small>
            </article>

            {selectedPlaybook.steps.map((step) => (
              <button
                key={step.id}
                type="button"
                className={classNames("security-flow-node", selectedStep.id === step.id && "active")}
                onClick={() => setSelectedStepId(step.id)}
              >
                <span>{step.actionType}</span>
                <strong>{step.stepOrder}. {step.label}</strong>
                <small>{selectedStep.id === step.id ? "Selected for editing" : "Click to configure"}</small>
              </button>
            ))}

            <button type="button" className="security-flow-add" onClick={addValidationStep}>+ Add validation step</button>
          </div>
        </div>

        <aside className="security-studio-config">
          <span className="security-command-kicker">Selected block</span>
          <h2>{selectedStep.label}</h2>
          <label>
            <span>Action type</span>
            <input value={selectedStep.actionType} readOnly />
          </label>
          <label>
            <span>Step configuration</span>
            <textarea value={selectedStep.config} onChange={(event) => updateStepConfig(event.target.value)} />
          </label>
          <div className="security-studio-config-actions">
            <button type="button" className="security-primary-button" onClick={saveStepConfig}>Save changes</button>
            <button type="button" className="security-demo-button" onClick={() => setStudioMessage("Dry test passed. Audit trace attached.")}>Run dry test</button>
          </div>
        </aside>
      </div>
    </section>
  );
}

function SecurityModuleWorkspace({
  module,
  mode,
  onClose,
}: {
  module: SecurityEngineerModule;
  mode: "module" | "evidence";
  onClose: () => void;
}) {
  const [selectedRow, setSelectedRow] = useState(module.rows[0]);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");

  return (
    <section className="security-generic-workspace">
      <header className="security-studio-topbar">
        <div>
          <button type="button" className="security-demo-button" onClick={onClose}>Back to overview</button>
          <span>{mode === "evidence" ? "Evidence workspace" : "Operational workspace"}</span>
          <h1>{module.title}</h1>
        </div>
        <button type="button" className="security-primary-button" onClick={() => setMessage("Workspace changes saved locally.")}>Save review</button>
      </header>

      {message ? <div className="security-studio-message">{message}</div> : null}

      <div className="security-generic-grid">
        <article className="security-glass-card security-generic-list">
          <span className="security-command-kicker">{mode === "evidence" ? "Evidence lanes" : "Managed controls"}</span>
          <p>{module.description}</p>
          {module.rows.map((row) => (
            <button key={row.name} type="button" className={classNames("security-module-row", selectedRow.name === row.name && "active")} onClick={() => setSelectedRow(row)}>
              <div>
                <strong>{row.name}</strong>
                <span>{row.detail}</span>
              </div>
              <em>{row.value}</em>
            </button>
          ))}
        </article>

        <article className="security-glass-card security-generic-detail">
          <span className="security-command-kicker">Selected control</span>
          <h2>{selectedRow.name}</h2>
          <p>{selectedRow.detail}. Track the engineering decision, attach validation notes and keep the change trace ready for audit.</p>
          <label>
            <span>Engineering notes</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add validation context..." />
          </label>
          <div className="security-module-footer">
            <button type="button" className="security-primary-button" onClick={() => setMessage(`${selectedRow.name} marked as reviewed.`)}>Mark reviewed</button>
            <button type="button" className="security-demo-button" onClick={() => setMessage(`Evidence bundle prepared for ${selectedRow.name}.`)}>Prepare evidence</button>
          </div>
        </article>
      </div>
    </section>
  );
}

function AnalystChartPreview({
  points,
  type,
}: {
  points: AnalystChartPoint[];
  type: AnalystChart["type"];
}) {
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const total = points.reduce((sum, point) => sum + point.value, 0);

  if (type === "donut") {
    return (
      <div className="analyst-donut-layout">
        <div className="analyst-donut">
          <strong>{total}</strong>
          <span>events</span>
        </div>
        <div className="analyst-chart-legend">
          {points.map((point) => (
            <span key={point.label}><i />{point.label} · {point.value}</span>
          ))}
        </div>
      </div>
    );
  }

  if (type === "line") {
    return (
      <div className="analyst-line-chart">
        {points.map((point) => (
          <div key={point.label} className="analyst-line-point">
            <span style={{ bottom: `${Math.max(8, point.value / maxValue * 82)}%` }} />
            <small>{point.label}</small>
            <strong>{point.value}</strong>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="analyst-bar-chart">
      {points.map((point) => (
        <div key={point.label}>
          <strong>{point.value}</strong>
          <span style={{ height: `${Math.max(12, point.value / maxValue * 100)}%` }} />
          <small>{point.label}</small>
        </div>
      ))}
    </div>
  );
}

function AnalystAnalyticsStudio({
  chartSeries,
  initialReportCharts,
  onAddChart,
  onDeleteChart,
  onClose,
}: {
  chartSeries: AnalystChartSeries;
  initialReportCharts: AnalystChart[];
  onAddChart: (chart: Omit<AnalystChart, "id">) => Promise<AnalystChart>;
  onDeleteChart: (chartId: number) => Promise<void>;
  onClose: () => void;
}) {
  const [dataset, setDataset] = useState<keyof typeof analystChartSeries>("incidentSeverity");
  const [chartType, setChartType] = useState<AnalystChart["type"]>("bar");
  const [chartTitle, setChartTitle] = useState("Incident severity overview");
  const [reportCharts, setReportCharts] = useState<AnalystChart[]>(initialReportCharts);
  const [message, setMessage] = useState("");
  const datasetLabels: Record<keyof typeof analystChartSeries, string> = {
    incidentSeverity: "Incidents by severity",
    incidentStatus: "Incidents by status",
    alertSources: "Alert source mix",
    executionHealth: "Execution health",
  };

  const addChart = async () => {
    const title = chartTitle.trim();

    if (!title) {
      setMessage("Add a title before saving this visualization.");
      return;
    }

    try {
      const chart = await onAddChart({ title, dataset, type: chartType });
      setReportCharts((current) => [...current, chart]);
      setMessage(`${title} added to the PostgreSQL-backed daily SOC report.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add visualization.");
    }
  };

  const removeChart = async (chartId: number) => {
    try {
      await onDeleteChart(chartId);
      setReportCharts((current) => current.filter((entry) => entry.id !== chartId));
      setMessage("Visualization removed from the daily SOC report.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove visualization.");
    }
  };

  const exportReport = () => {
    const blob = new Blob([JSON.stringify({ name: "Daily SOC snapshot", charts: reportCharts }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "analyst-soc-report.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Report exported as analyst-soc-report.json.");
  };

  return (
    <section className="security-studio analyst-studio">
      <header className="security-studio-topbar">
        <div>
          <button type="button" className="security-demo-button" onClick={onClose}>Back to overview</button>
          <span>Analytics studio</span>
          <h1>SIEM report builder</h1>
        </div>
        <button type="button" className="security-primary-button" onClick={exportReport}>Export report</button>
      </header>

      {message ? <div className="security-studio-message">{message}</div> : null}

      <div className="analyst-studio-layout">
        <aside className="security-studio-sidebar">
          <span className="security-command-kicker">Dataset catalog</span>
          <div className="security-studio-catalog">
            {(Object.keys(chartSeries) as Array<keyof typeof analystChartSeries>).map((entry) => (
              <button
                key={entry}
                type="button"
                className={classNames("security-studio-playbook", dataset === entry && "active")}
                onClick={() => {
                  setDataset(entry);
                  setChartTitle(datasetLabels[entry]);
                }}
              >
                <strong>{datasetLabels[entry]}</strong>
                <span>{chartSeries[entry].length} grouped values</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="analyst-studio-canvas">
          <div className="security-studio-canvas-head">
            <div>
              <span>Live visualization preview</span>
              <strong>{chartTitle || datasetLabels[dataset]}</strong>
            </div>
            <small>{chartSeries[dataset].reduce((sum, point) => sum + point.value, 0)} correlated events</small>
          </div>
          <div className="analyst-preview-card">
            <AnalystChartPreview points={chartSeries[dataset]} type={chartType} />
          </div>
        </main>

        <aside className="security-studio-config">
          <span className="security-command-kicker">Visualization settings</span>
          <h2>Build chart</h2>
          <label>
            <span>Chart title</span>
            <input value={chartTitle} onChange={(event) => setChartTitle(event.target.value)} />
          </label>
          <label>
            <span>Chart type</span>
            <select value={chartType} onChange={(event) => setChartType(event.target.value as AnalystChart["type"])}>
              <option value="bar">Bar chart</option>
              <option value="line">Line chart</option>
              <option value="donut">Donut summary</option>
            </select>
          </label>
          <button type="button" className="security-primary-button" onClick={addChart}>Add to report</button>

          <div className="analyst-report-charts">
            <span className="security-command-kicker">Daily SOC snapshot</span>
            {reportCharts.map((chart) => (
              <article key={chart.id}>
                <div>
                  <strong>{chart.title}</strong>
                  <small>{chart.type} · {datasetLabels[chart.dataset]}</small>
                </div>
                <button type="button" onClick={() => removeChart(chart.id)} aria-label={`Remove ${chart.title}`}>
                  <WorkspaceIcon name="close" />
                </button>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

function AnalystRoleWorkspace({
  user,
  onLogout,
}: {
  user: StoredUser;
  onLogout: () => void;
}) {
  const [activeModuleId, setActiveModuleId] = useState(analystModules[0].id);
  const [searchValue, setSearchValue] = useState("");
  const [drawerMode, setDrawerMode] = useState<"chat" | "notifications" | null>(null);
  const [studioOpen, setStudioOpen] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<"module" | "evidence" | null>(null);
  const [dashboardData, setDashboardData] = useState<AnalystDashboardData>({
    metrics: analystMetrics,
    modules: analystModules,
    priorities: analystPriorities,
    notifications: analystNotifications,
    tasks: tasksByRole.ANALYST,
    chartSeries: analystChartSeries,
    reportCharts: [{ id: 1, title: "Incident severity overview", dataset: "incidentSeverity", type: "bar" }],
  });
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [chatDirectory, setChatDirectory] = useState<ChatDirectory>({ users: [], groups: [] });
  const [chatDirectoryError, setChatDirectoryError] = useState("");
  const [isChatDirectoryLoading, setIsChatDirectoryLoading] = useState(true);
  const modules = dashboardData.modules.length ? dashboardData.modules : analystModules;
  const activeModule = modules.find((module) => module.id === activeModuleId) ?? modules[0];
  const filteredRows = activeModule.rows.filter((row) =>
    `${row.name} ${row.detail}`.toLowerCase().includes(searchValue.trim().toLowerCase())
  );
  const chatPersona = user.role === "ANALYST"
    ? user.email
    : chatDirectory.users.find((entry) => entry.role === "ANALYST")?.email ?? "mihai.ionescu@local.dev";

  useEffect(() => {
    let isCancelled = false;

    async function loadChatDirectory() {
      try {
        const response = await fetch("http://localhost:8000/users/chat-directory");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Could not load chat teammates.");
        }

        if (!isCancelled) {
          setChatDirectory({ users: data.users ?? [], groups: data.groups ?? [] });
        }
      } catch (error) {
        if (!isCancelled) {
          setChatDirectoryError(error instanceof Error ? error.message : "Could not load chat teammates.");
        }
      } finally {
        if (!isCancelled) {
          setIsChatDirectoryLoading(false);
        }
      }
    }

    loadChatDirectory();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadDashboard() {
      setIsDashboardLoading(true);
      setDashboardError("");

      try {
        const response = await fetch("http://localhost:8000/analyst/dashboard");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Could not load Analyst data.");
        }

        if (!isCancelled) {
          setDashboardData(data);
        }
      } catch (error) {
        if (!isCancelled) {
          setDashboardError(error instanceof Error ? error.message : "Could not load Analyst data.");
        }
      } finally {
        if (!isCancelled) {
          setIsDashboardLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isCancelled = true;
    };
  }, []);

  const dismissNotification = async (notificationId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/analyst/notifications/${notificationId}/dismiss`, { method: "PUT" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not dismiss notification.");
      }

      setDashboardData((current) => ({
        ...current,
        notifications: current.notifications.filter((entry) => entry.id !== notificationId),
      }));
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "Could not dismiss notification.");
    }
  };

  const advanceTask = async (taskId: number) => {
    const task = dashboardData.tasks.find((entry) => entry.id === taskId);

    if (!task) {
      return;
    }

    const status = task.status === "queued" ? "in_progress" : task.status === "in_progress" ? "done" : "queued";

    try {
      const response = await fetch(`http://localhost:8000/analyst/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not update task.");
      }

      setDashboardData((current) => ({
        ...current,
        tasks: current.tasks.map((entry) => entry.id === taskId ? { ...entry, status } : entry),
      }));
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "Could not update task.");
    }
  };

  const addReportChart = async (chart: Omit<AnalystChart, "id">) => {
    const response = await fetch("http://localhost:8000/analyst/report-charts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chart),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Could not save visualization.");
    }

    setDashboardData((current) => ({ ...current, reportCharts: [...current.reportCharts, data] }));
    return data;
  };

  const deleteReportChart = async (chartId: number) => {
    const response = await fetch(`http://localhost:8000/analyst/report-charts/${chartId}`, { method: "DELETE" });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Could not remove visualization.");
    }

    setDashboardData((current) => ({
      ...current,
      reportCharts: current.reportCharts.filter((entry) => entry.id !== chartId),
    }));
  };

  if (studioOpen) {
    return (
      <AnalystAnalyticsStudio
        chartSeries={dashboardData.chartSeries}
        initialReportCharts={dashboardData.reportCharts}
        onAddChart={addReportChart}
        onDeleteChart={deleteReportChart}
        onClose={() => setStudioOpen(false)}
      />
    );
  }

  if (workspaceMode) {
    return <SecurityModuleWorkspace module={activeModule} mode={workspaceMode} onClose={() => setWorkspaceMode(null)} />;
  }

  return (
    <RoleWorkspaceShell
      roleLabel="Cybersecurity Analyst"
      boardTitle="SOC investigation board"
      personaDetail="triage + analytics"
      chatLabel="Analyst chat"
      modules={modules}
      activeModuleId={activeModule.id}
      onSelectModule={(moduleId) => {
        setActiveModuleId(moduleId);
        setSearchValue("");
        setWorkspaceMode(null);
      }}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      unreadChatCount={0}
      notificationCount={dashboardData.notifications.length}
      drawerMode={drawerMode}
      onOpenDrawer={setDrawerMode}
      onCloseDrawer={() => setDrawerMode(null)}
      onLogout={onLogout}
      signedInUser={user}
      workspacePersona={chatPersona.split("@")[0]}
      drawer={
        <>
          <div hidden={drawerMode !== "chat"}>
            <SecurityEngineerChatDrawer
              directory={{
                users: chatDirectory.users,
                groups: chatDirectory.groups.filter((group) => group.role === null || group.role === "ANALYST"),
              }}
              currentUserEmail={chatPersona}
              isLoading={isChatDirectoryLoading}
              errorMessage={chatDirectoryError}
            />
          </div>
          <div hidden={drawerMode !== "notifications"}>
            <SecurityEngineerNotificationsDrawer
              notifications={dashboardData.notifications}
              onDismissNotification={dismissNotification}
              tasks={dashboardData.tasks}
              onAdvanceTask={advanceTask}
            />
          </div>
        </>
      }
    >
      <section className="security-command-content">
        <div className="security-command-intro">
          <div>
            <span className="security-command-kicker">SOC analysis workspace</span>
            <h1>Detect patterns.<br />Resolve incidents.</h1>
          </div>
          <p>Monitor SIEM signals, investigate suspicious activity and shape clear reports from the evidence that matters.</p>
        </div>
        {isDashboardLoading ? <div className="security-studio-message">Loading SOC data from PostgreSQL...</div> : null}
        {dashboardError ? <div className="security-chat-error">{dashboardError}</div> : null}

        <div className="security-command-metrics">
          {dashboardData.metrics.map((metric) => (
            <article key={metric.label} className="security-glass-card security-metric-card">
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <p>{metric.note}</p>
            </article>
          ))}
        </div>

        <div className="security-command-grid">
          <article className="security-glass-card security-module-panel">
            <div className="security-module-heading">
              <span className="role-workspace-nav-icon"><WorkspaceIcon name={activeModule.id} /></span>
              <div>
                <span>Selected module</span>
                <h2>{activeModule.title}</h2>
              </div>
              <strong>{activeModule.count}</strong>
            </div>
            <p>{activeModule.description}</p>
            <div className="security-module-results">
              {filteredRows.length ? filteredRows.map((row) => (
                <div key={row.name} className="security-module-row">
                  <div><strong>{row.name}</strong><span>{row.detail}</span></div>
                  <em>{row.value}</em>
                </div>
              )) : <div className="security-empty-state">No results found in {activeModule.title}.</div>}
            </div>
            <div className="security-module-footer">
              <button
                type="button"
                className="security-primary-button"
                onClick={() => activeModule.id === "analytics" ? setStudioOpen(true) : setWorkspaceMode("module")}
              >
                {activeModule.action}
              </button>
              <button type="button" className="security-demo-button" onClick={() => setWorkspaceMode("evidence")}>
                View evidence
              </button>
            </div>
          </article>

          <aside className="security-command-priorities">
            <div className="security-section-title">
              <div><span>Current focus</span><h2>Analyst priorities</h2></div>
              <strong>{String(dashboardData.priorities.length).padStart(2, "0")}</strong>
            </div>
            {dashboardData.priorities.map((priority) => (
              <article key={priority.title} className="security-glass-card security-priority-card">
                <span className={`security-priority-dot ${priority.status}`} />
                <div><strong>{priority.title}</strong><p>{priority.detail}</p></div>
              </article>
            ))}
          </aside>
        </div>
      </section>
    </RoleWorkspaceShell>
  );
}

function SecurityEngineerDashboard({
  user,
  onLogout,
}: {
  user: StoredUser;
  onLogout: () => void;
}) {
  const [activeModuleId, setActiveModuleId] = useState(securityEngineerModules[0].id);
  const [searchValue, setSearchValue] = useState("");
  const [drawerMode, setDrawerMode] = useState<"chat" | "notifications" | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<"module" | "evidence" | null>(null);
  const [dashboardData, setDashboardData] = useState<SecurityEngineerDashboardData>({
    metrics: securityEngineerMetrics,
    modules: securityEngineerModules,
    priorities: securityEngineerPriorities,
    notifications: securityEngineerNotifications,
    playbooks,
    tasks: tasksByRole.SECURITY_ENGINEER,
  });
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [chatDirectory, setChatDirectory] = useState<ChatDirectory>({ users: [], groups: [] });
  const [isChatDirectoryLoading, setIsChatDirectoryLoading] = useState(true);
  const [chatDirectoryError, setChatDirectoryError] = useState("");
  const modules = dashboardData.modules.length ? dashboardData.modules : securityEngineerModules;
  const activeModule =
    modules.find((module) => module.id === activeModuleId) ?? modules[0];
  const normalizedSearch = searchValue.trim().toLowerCase();
  const filteredRows = activeModule.rows.filter((row) =>
    `${row.name} ${row.detail}`.toLowerCase().includes(normalizedSearch)
  );
  const chatPersona = user.role === "SECURITY_ENGINEER"
    ? user.email
    : chatDirectory.users.find((entry) => entry.role === "SECURITY_ENGINEER")?.email ?? "anca.popescu@local.dev";

  useEffect(() => {
    let isCancelled = false;

    async function loadChatDirectory() {
      setIsChatDirectoryLoading(true);
      setChatDirectoryError("");

      try {
        const response = await fetch("http://localhost:8000/users/chat-directory");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Could not load chat teammates.");
        }

        if (!isCancelled) {
          setChatDirectory({
            users: data.users ?? [],
            groups: data.groups ?? [],
          });
        }
      } catch (error) {
        if (!isCancelled) {
          setChatDirectory({ users: [], groups: [] });
          setChatDirectoryError(error instanceof Error ? error.message : "Could not load chat teammates.");
        }
      } finally {
        if (!isCancelled) {
          setIsChatDirectoryLoading(false);
        }
      }
    }

    loadChatDirectory();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadDashboard() {
      setIsDashboardLoading(true);
      setDashboardError("");

      try {
        const response = await fetch("http://localhost:8000/security-engineer/dashboard");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Could not load Security Engineer data.");
        }

        if (!isCancelled) {
          setDashboardData(data);
        }
      } catch (error) {
        if (!isCancelled) {
          setDashboardError(error instanceof Error ? error.message : "Could not load Security Engineer data.");
        }
      } finally {
        if (!isCancelled) {
          setIsDashboardLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isCancelled = true;
    };
  }, []);

  const dismissNotification = async (notificationId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/security-engineer/notifications/${notificationId}/dismiss`, {
        method: "PUT",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not dismiss notification.");
      }

      setDashboardData((current) => ({
        ...current,
        notifications: current.notifications.filter((notification) => notification.id !== notificationId),
      }));
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "Could not dismiss notification.");
    }
  };

  const advanceTask = async (taskId: number) => {
    const task = dashboardData.tasks.find((entry) => entry.id === taskId);

    if (!task) {
      return;
    }

    const status = task.status === "queued"
      ? "in_progress"
      : task.status === "in_progress"
        ? "done"
        : "queued";

    try {
      const response = await fetch(`http://localhost:8000/security-engineer/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not update task.");
      }

      setDashboardData((current) => ({
        ...current,
        tasks: current.tasks.map((entry) => entry.id === taskId ? { ...entry, status } : entry),
      }));
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "Could not update task.");
    }
  };

  const selectModule = (moduleId: string) => {
    setActiveModuleId(moduleId);
    setSearchValue("");
    setWorkspaceMode(null);
  };

  if (workspaceMode === "module" && activeModule.id === "automation") {
    return <SecurityAutomationStudio initialPlaybooks={dashboardData.playbooks.length ? dashboardData.playbooks : playbooks} onClose={() => setWorkspaceMode(null)} />;
  }

  if (workspaceMode) {
    return <SecurityModuleWorkspace module={activeModule} mode={workspaceMode} onClose={() => setWorkspaceMode(null)} />;
  }

  return (
    <RoleWorkspaceShell
      roleLabel="Security Engineer"
      boardTitle="Engineering command board"
      personaDetail="automation + infrastructure"
      chatLabel="Engineering chat"
      modules={modules}
      activeModuleId={activeModuleId}
      onSelectModule={selectModule}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      unreadChatCount={0}
      notificationCount={dashboardData.notifications.length}
      drawerMode={drawerMode}
      onOpenDrawer={setDrawerMode}
      onCloseDrawer={() => setDrawerMode(null)}
      onLogout={onLogout}
      signedInUser={user}
      workspacePersona={chatPersona.split("@")[0]}
      drawer={
        <>
          <div hidden={drawerMode !== "chat"}>
            <SecurityEngineerChatDrawer
              key={chatDirectory.groups
                .filter((group) => group.role === null || group.role === "SECURITY_ENGINEER")
                .map((group) => `${group.id}:${group.participants.join(",")}`)
                .join("|")}
              directory={{
                users: chatDirectory.users,
                groups: chatDirectory.groups.filter((group) => group.role === null || group.role === "SECURITY_ENGINEER"),
              }}
              currentUserEmail={chatPersona}
              isLoading={isChatDirectoryLoading}
              errorMessage={chatDirectoryError}
            />
          </div>
          <div hidden={drawerMode !== "notifications"}>
            <SecurityEngineerNotificationsDrawer
              notifications={dashboardData.notifications}
              onDismissNotification={dismissNotification}
              tasks={dashboardData.tasks}
              onAdvanceTask={advanceTask}
            />
          </div>
        </>
      }
    >
      <section className="security-command-content">
        <div className="security-command-intro">
          <div>
            <span className="security-command-kicker">Active defense workspace</span>
            <h1>Build resilient systems.<br />Respond with precision.</h1>
          </div>
          <p>Design secure infrastructure, automate containment and keep engineering evidence ready for review.</p>
        </div>
        {isDashboardLoading ? <div className="security-studio-message">Loading operational data from PostgreSQL...</div> : null}
        {dashboardError ? <div className="security-chat-error">{dashboardError}</div> : null}

        <div className="security-command-metrics">
          {dashboardData.metrics.map((metric) => (
            <article key={metric.label} className="security-glass-card security-metric-card">
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <p>{metric.note}</p>
            </article>
          ))}
        </div>

        <div className="security-command-grid">
          <article className="security-glass-card security-module-panel">
            <div className="security-module-heading">
              <span className="role-workspace-nav-icon"><WorkspaceIcon name={activeModule.id} /></span>
              <div>
                <span>Selected module</span>
                <h2>{activeModule.title}</h2>
              </div>
              <strong>{activeModule.count}</strong>
            </div>
            <p>{activeModule.description}</p>

            <div className="security-module-results">
              {filteredRows.length ? filteredRows.map((row) => (
                <div key={row.name} className="security-module-row">
                  <div>
                    <strong>{row.name}</strong>
                    <span>{row.detail}</span>
                  </div>
                  <em>{row.value}</em>
                </div>
              )) : (
                <div className="security-empty-state">No results found in {activeModule.title}.</div>
              )}
            </div>

            <div className="security-module-footer">
              <button type="button" className="security-primary-button" onClick={() => setWorkspaceMode("module")}>
                {activeModule.action}
              </button>
              <button type="button" className="security-demo-button" onClick={() => setWorkspaceMode("evidence")}>
                View evidence
              </button>
            </div>
          </article>

          <aside className="security-command-priorities">
            <div className="security-section-title">
              <div>
                <span>Current focus</span>
                <h2>Engineering priorities</h2>
              </div>
              <strong>{String(dashboardData.priorities.length).padStart(2, "0")}</strong>
            </div>
            {dashboardData.priorities.map((priority) => (
              <article key={priority.title} className="security-glass-card security-priority-card">
                <span className={`security-priority-dot ${priority.status}`} />
                <div>
                  <strong>{priority.title}</strong>
                  <p>{priority.detail}</p>
                </div>
              </article>
            ))}
          </aside>
        </div>
      </section>
    </RoleWorkspaceShell>
  );
}

function generateManagerPdf(report: ManagerReport) {
  const printWindow = window.open("", "_blank", "width=1080,height=900");
  if (!printWindow) {
    window.alert("Browser-ul a blocat fereastra pentru raportul PDF.");
    return;
  }
  printWindow.document.write(`
    <!doctype html><html><head><title>${report.title}</title>
    <style>body{font-family:Arial,sans-serif;padding:42px;color:#172033}h1{margin-bottom:8px}small{color:#657086}.card{margin-top:22px;padding:18px;border:1px solid #d8deea;border-radius:12px}strong{display:block;margin-bottom:7px}</style>
    </head><body><small>CoreShield management report · ${new Date().toLocaleString()}</small><h1>${report.title}</h1>
    <p>Type: ${report.report_type} · Status: ${report.status}</p>
    <div class="card"><strong>Executive summary</strong>${report.description}</div>
    <div class="card"><strong>Management recommendation</strong>${report.recommendation || "No recommendation added yet."}</div>
    </body></html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function ManagerControlCenter({
  data,
  onCreateTask,
  onApproveTask,
  onApproveLeave,
  onCreateReport,
  onUpdateReport,
  onDeleteReport,
  onClose,
}: {
  data: ManagerDashboardData;
  onCreateTask: (values: { title: string; description: string; priority: string; assignee_email: string; due_at: string }) => Promise<void>;
  onApproveTask: (taskId: number, approval_status: "approved" | "rejected") => Promise<void>;
  onApproveLeave: (requestId: number, status: "approved" | "rejected") => Promise<void>;
  onCreateReport: (values: { title: string; report_type: string; description: string; recommendation: string }) => Promise<void>;
  onUpdateReport: (reportId: number, status: ManagerReportStatus) => Promise<void>;
  onDeleteReport: (reportId: number) => Promise<void>;
  onClose: () => void;
}) {
  const assignees = data.team.filter((member) => member.role !== "MANAGER");
  const [task, setTask] = useState({ title: "", description: "", priority: "medium", assignee_email: assignees[0]?.email ?? "", due_at: "2026-06-03T15:00" });
  const [report, setReport] = useState({ title: "", report_type: "leadership", description: "", recommendation: "" });
  const [message, setMessage] = useState("");

  const createTask = async (event: React.FormEvent) => {
    event.preventDefault();
    await onCreateTask(task);
    setTask((current) => ({ ...current, title: "", description: "" }));
    setMessage("Task assigned and added to the approval queue.");
  };

  const createReport = async (event: React.FormEvent) => {
    event.preventDefault();
    await onCreateReport(report);
    setReport((current) => ({ ...current, title: "", description: "", recommendation: "" }));
    setMessage("Leadership report draft saved.");
  };

  return (
    <section className="security-studio manager-control-studio">
      <header className="security-studio-topbar">
        <div>
          <button type="button" className="security-demo-button" onClick={onClose}>Back to overview</button>
          <span>Manager operations</span>
          <h1>Management control center</h1>
        </div>
      </header>
      {message ? <div className="security-studio-message">{message}</div> : null}

      <div className="manager-control-layout">
        <section className="manager-control-column">
          <form className="auditor-report-form" onSubmit={createTask}>
            <span className="security-command-kicker">Personnel management</span>
            <h2>Assign task</h2>
            <label><span>Task title</span><input value={task.title} onChange={(event) => setTask({ ...task, title: event.target.value })} required /></label>
            <label><span>Description</span><textarea value={task.description} onChange={(event) => setTask({ ...task, description: event.target.value })} /></label>
            <label><span>Assignee</span><select value={task.assignee_email} onChange={(event) => setTask({ ...task, assignee_email: event.target.value })}>{assignees.map((member) => <option key={member.id} value={member.email}>{member.email} · {member.role.replace("_", " ")}</option>)}</select></label>
            <label><span>Priority</span><select value={task.priority} onChange={(event) => setTask({ ...task, priority: event.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
            <label><span>Due date</span><input type="datetime-local" value={task.due_at} onChange={(event) => setTask({ ...task, due_at: event.target.value })} required /></label>
            <button type="submit" className="security-primary-button">Assign task</button>
          </form>

          <section className="manager-control-card">
            <div className="security-section-title"><div><span>Task governance</span><h2>Task approvals</h2></div><strong>{String(data.tasks.length).padStart(2, "0")}</strong></div>
            <div className="manager-approval-list">{data.tasks.map((entry) => <article key={entry.id} className="security-glass-card manager-approval-card"><div><span className={`status-pill manager-approval-${entry.approval_status}`}>{entry.approval_status}</span><h3>{entry.title}</h3><p>{entry.owner} · {entry.due}</p></div>{entry.approval_status === "pending" ? <div className="auditor-report-actions"><button type="button" className="security-primary-button" onClick={() => onApproveTask(entry.id, "approved")}>Approve</button><button type="button" className="security-demo-button danger-button" onClick={() => onApproveTask(entry.id, "rejected")}>Reject</button></div> : null}</article>)}</div>
          </section>

          <section className="manager-control-card">
            <div className="security-section-title"><div><span>Personnel availability</span><h2>Leave requests</h2></div><strong>{String(data.leave_requests.length).padStart(2, "0")}</strong></div>
            <div className="manager-approval-list">{data.leave_requests.map((request) => <article key={request.id} className="security-glass-card manager-approval-card"><div><span className={`status-pill manager-approval-${request.status}`}>{request.status}</span><h3>{request.employee}</h3><p>{request.request_type.replace("_", " ")} · {request.starts_on} - {request.ends_on}</p><small>{request.reason}</small></div>{request.status === "pending" ? <div className="auditor-report-actions"><button type="button" className="security-primary-button" onClick={() => onApproveLeave(request.id, "approved")}>Approve leave</button><button type="button" className="security-demo-button danger-button" onClick={() => onApproveLeave(request.id, "rejected")}>Reject</button></div> : null}</article>)}</div>
          </section>
        </section>

        <section className="manager-control-column">
          <form className="auditor-report-form" onSubmit={createReport}>
            <span className="security-command-kicker">Leadership reporting</span>
            <h2>New management report</h2>
            <label><span>Report title</span><input value={report.title} onChange={(event) => setReport({ ...report, title: event.target.value })} required /></label>
            <label><span>Type</span><select value={report.report_type} onChange={(event) => setReport({ ...report, report_type: event.target.value })}><option value="leadership">Leadership</option><option value="risk">Risk mitigation</option><option value="personnel">Personnel</option><option value="systems">Systems oversight</option><option value="compliance">Compliance</option></select></label>
            <label><span>Description</span><textarea value={report.description} onChange={(event) => setReport({ ...report, description: event.target.value })} required /></label>
            <label><span>Recommendation</span><textarea value={report.recommendation} onChange={(event) => setReport({ ...report, recommendation: event.target.value })} /></label>
            <button type="submit" className="security-primary-button">Save report draft</button>
          </form>

          <section className="manager-control-card">
            <div className="security-section-title"><div><span>Saved reports</span><h2>Leadership report library</h2></div><strong>{String(data.reports.length).padStart(2, "0")}</strong></div>
            <div className="manager-approval-list">{data.reports.map((entry) => <article key={entry.id} className="security-glass-card manager-approval-card"><div><span className={`status-pill auditor-report-${entry.status}`}>{entry.status}</span><h3>{entry.title}</h3><p>{entry.description}</p><small>{entry.recommendation}</small></div><div className="auditor-report-actions"><button type="button" className="security-primary-button" onClick={() => generateManagerPdf(entry)}>Generate PDF</button><button type="button" className="security-demo-button" onClick={() => onUpdateReport(entry.id, entry.status === "approved" ? "review" : "approved")}>{entry.status === "approved" ? "Return to review" : "Approve"}</button><button type="button" className="security-demo-button danger-button" onClick={() => onDeleteReport(entry.id)}>Delete</button></div></article>)}</div>
          </section>
        </section>
      </div>
    </section>
  );
}

function ManagerDashboard({ user, onLogout }: { user: StoredUser; onLogout: () => void }) {
  const [activeModuleId, setActiveModuleId] = useState(managerModules[0].id);
  const [searchValue, setSearchValue] = useState("");
  const [drawerMode, setDrawerMode] = useState<"chat" | "notifications" | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<"module" | "evidence" | "management" | null>(null);
  const [dashboardData, setDashboardData] = useState<ManagerDashboardData>({ metrics: managerMetrics, modules: managerModules, priorities: managerPriorities, notifications: managerNotifications, tasks: managerTasks, leave_requests: managerLeaveRequests, reports: managerReports, team: managerTeam });
  const [dashboardError, setDashboardError] = useState("");
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [chatDirectory, setChatDirectory] = useState<ChatDirectory>({ users: [], groups: [] });
  const [isChatDirectoryLoading, setIsChatDirectoryLoading] = useState(true);
  const [chatDirectoryError, setChatDirectoryError] = useState("");
  const modules = dashboardData.modules.length ? dashboardData.modules : managerModules;
  const activeModule = modules.find((module) => module.id === activeModuleId) ?? modules[0];
  const filteredRows = activeModule.rows.filter((row) => `${row.name} ${row.detail}`.toLowerCase().includes(searchValue.trim().toLowerCase()));
  const chatPersona = user.role === "MANAGER" ? user.email : chatDirectory.users.find((entry) => entry.role === "MANAGER")?.email ?? "manager.soc@local.dev";

  const loadDashboard = async () => {
    setIsDashboardLoading(true);
    setDashboardError("");
    try {
      const response = await fetch("http://localhost:8000/manager/dashboard");
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not load Manager data.");
      setDashboardData(data);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "Could not load Manager data.");
    } finally {
      setIsDashboardLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);
  useEffect(() => {
    fetch("http://localhost:8000/users/chat-directory").then((response) => response.json()).then((data) => setChatDirectory({ users: data.users ?? [], groups: data.groups ?? [] })).catch((error) => setChatDirectoryError(error instanceof Error ? error.message : "Could not load chat teammates.")).finally(() => setIsChatDirectoryLoading(false));
  }, []);

  const requestAndReload = async (url: string, options: RequestInit) => {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Manager operation failed.");
    await loadDashboard();
  };
  const createTask = (values: { title: string; description: string; priority: string; assignee_email: string; due_at: string }) => requestAndReload("http://localhost:8000/manager/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
  const approveTask = (id: number, approval_status: "approved" | "rejected") => requestAndReload(`http://localhost:8000/manager/tasks/${id}/approval`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approval_status }) });
  const approveLeave = (id: number, status: "approved" | "rejected") => requestAndReload(`http://localhost:8000/manager/leave-requests/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
  const createReport = (values: { title: string; report_type: string; description: string; recommendation: string }) => requestAndReload("http://localhost:8000/manager/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
  const updateReport = (id: number, status: ManagerReportStatus) => requestAndReload(`http://localhost:8000/manager/reports/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
  const deleteReport = async (id: number) => { if (window.confirm("Delete this manager report?")) await requestAndReload(`http://localhost:8000/manager/reports/${id}`, { method: "DELETE" }); };
  const dismissNotification = async (id: number) => { await requestAndReload(`http://localhost:8000/manager/notifications/${id}/dismiss`, { method: "PUT" }); };
  const advanceTask = async (id: number) => {
    const task = dashboardData.tasks.find((entry) => entry.id === id);
    if (!task) return;
    const status = task.status === "queued" ? "in_progress" : task.status === "in_progress" ? "done" : "queued";
    await requestAndReload(`http://localhost:8000/manager/tasks/${id}/status`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
  };
  const selectModule = (id: string) => { setActiveModuleId(id); setSearchValue(""); setWorkspaceMode(null); };

  if (workspaceMode === "management") return <ManagerControlCenter data={dashboardData} onCreateTask={createTask} onApproveTask={approveTask} onApproveLeave={approveLeave} onCreateReport={createReport} onUpdateReport={updateReport} onDeleteReport={deleteReport} onClose={() => setWorkspaceMode(null)} />;
  if (workspaceMode) return <SecurityModuleWorkspace module={activeModule} mode={workspaceMode} onClose={() => setWorkspaceMode(null)} />;

  return <RoleWorkspaceShell roleLabel="Security Manager" boardTitle="Leadership & operations board" personaDetail="people + policy + risk" chatLabel="Manager chat" modules={modules} activeModuleId={activeModule.id} onSelectModule={selectModule} searchValue={searchValue} onSearchChange={setSearchValue} unreadChatCount={0} notificationCount={dashboardData.notifications.length} drawerMode={drawerMode} onOpenDrawer={setDrawerMode} onCloseDrawer={() => setDrawerMode(null)} onLogout={onLogout} signedInUser={user} workspacePersona={chatPersona.split("@")[0]} drawer={<><div hidden={drawerMode !== "chat"}><SecurityEngineerChatDrawer directory={{ users: chatDirectory.users, groups: chatDirectory.groups.filter((group) => group.role === null || group.role === "MANAGER") }} currentUserEmail={chatPersona} isLoading={isChatDirectoryLoading} errorMessage={chatDirectoryError} /></div><div hidden={drawerMode !== "notifications"}><SecurityEngineerNotificationsDrawer notifications={dashboardData.notifications} onDismissNotification={dismissNotification} tasks={dashboardData.tasks} onAdvanceTask={advanceTask} /></div></>}>
    <section className="security-command-content">
      <div className="security-command-intro"><div><span className="security-command-kicker">Leadership operations workspace</span><h1>Lead teams.<br />Reduce risk.</h1></div><p>Develop policies, supervise personnel, assess threats and coordinate security decisions from one management surface.</p></div>
      {isDashboardLoading ? <div className="security-studio-message">Loading management data from PostgreSQL...</div> : null}
      {dashboardError ? <div className="security-chat-error">{dashboardError}</div> : null}
      <div className="security-command-metrics">{dashboardData.metrics.map((metric) => <article key={metric.label} className="security-glass-card security-metric-card"><span>{metric.label}</span><strong>{metric.value}</strong><p>{metric.note}</p></article>)}</div>
      <div className="security-command-grid"><article className="security-glass-card security-module-panel"><div className="security-module-heading"><span className="role-workspace-nav-icon"><WorkspaceIcon name={activeModule.id} /></span><div><span>Selected module</span><h2>{activeModule.title}</h2></div><strong>{activeModule.count}</strong></div><p>{activeModule.description}</p><div className="security-module-results">{filteredRows.length ? filteredRows.map((row) => <div key={row.name} className="security-module-row"><div><strong>{row.name}</strong><span>{row.detail}</span></div><em>{row.value}</em></div>) : <div className="security-empty-state">No management evidence found.</div>}</div><div className="security-module-footer"><button type="button" className="security-primary-button" onClick={() => setWorkspaceMode(activeModule.id === "management" || activeModule.id === "personnel" ? "management" : "module")}>{activeModule.action}</button><button type="button" className="security-demo-button" onClick={() => setWorkspaceMode("evidence")}>View evidence</button></div></article><aside className="security-command-priorities"><div className="security-section-title"><div><span>Current focus</span><h2>Manager priorities</h2></div><strong>{String(dashboardData.priorities.length).padStart(2, "0")}</strong></div>{dashboardData.priorities.map((priority) => <article key={priority.title} className="security-glass-card security-priority-card"><span className={`security-priority-dot ${priority.status}`} /><div><strong>{priority.title}</strong><p>{priority.detail}</p></div></article>)}</aside></div>
    </section>
  </RoleWorkspaceShell>;
}

function AuditorReportManager({
  reports,
  user,
  onAddReport,
  onUpdateStatus,
  onDeleteReport,
  onClose,
}: {
  reports: AuditorReport[];
  user: StoredUser;
  onAddReport: (values: { title: string; report_type: AuditorReportType; description: string; recommendation: string }) => Promise<void>;
  onUpdateStatus: (reportId: number, status: AuditorReportStatus) => Promise<void>;
  onDeleteReport: (reportId: number) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [reportType, setReportType] = useState<AuditorReportType>("compliance");
  const [description, setDescription] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [message, setMessage] = useState("");

  const createReport = async (event: React.FormEvent) => {
    event.preventDefault();
    await onAddReport({ title, report_type: reportType, description, recommendation });
    setTitle("");
    setDescription("");
    setRecommendation("");
    setMessage("Report draft saved to the auditor workspace.");
  };

  return (
    <section className="security-studio auditor-report-studio">
      <header className="security-studio-topbar">
        <div>
          <button type="button" className="security-demo-button" onClick={onClose}>Back to overview</button>
          <span>Auditor management</span>
          <h1>Report control center</h1>
        </div>
      </header>

      {message ? <div className="security-studio-message">{message}</div> : null}

      <div className="auditor-report-layout">
        <form className="auditor-report-form" onSubmit={createReport}>
          <span className="security-command-kicker">Add management report</span>
          <h2>New report draft</h2>
          <label><span>Title</span><input value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
          <label>
            <span>Report type</span>
            <select value={reportType} onChange={(event) => setReportType(event.target.value as AuditorReportType)}>
              <option value="compliance">Compliance evaluation</option>
              <option value="risk">Risk assessment</option>
              <option value="policy">Policy review</option>
              <option value="system_controls">System controls</option>
            </select>
          </label>
          <label><span>Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} required /></label>
          <label><span>Recommendation</span><textarea value={recommendation} onChange={(event) => setRecommendation(event.target.value)} /></label>
          <button type="submit" className="security-primary-button">Save draft</button>
        </form>

        <main className="auditor-report-catalog">
          <div className="security-section-title">
            <div><span>Saved reports</span><h2>Management report library</h2></div>
            <strong>{String(reports.length).padStart(2, "0")}</strong>
          </div>
          <div className="auditor-report-list">
            {reports.map((report) => (
              <article key={report.id} className="security-glass-card auditor-report-card">
                <div className="auditor-report-card-head">
                  <div>
                    <span className={`status-pill auditor-report-${report.status}`}>{report.status}</span>
                    <h3>{report.title}</h3>
                  </div>
                  <small>{report.updated_at}</small>
                </div>
                <p>{report.description}</p>
                <div className="auditor-recommendation"><strong>Recommendation</strong><span>{report.recommendation || "No recommendation added yet."}</span></div>
                <div className="auditor-report-actions">
                  <button type="button" className="security-primary-button" onClick={() => generateAuditPdf(user, report.report_type)}>Generate PDF</button>
                  <button type="button" className="security-demo-button" onClick={() => onUpdateStatus(report.id, report.status === "approved" ? "review" : "approved")}>
                    {report.status === "approved" ? "Return to review" : "Approve"}
                  </button>
                  <button type="button" className="security-demo-button danger-button" onClick={() => onDeleteReport(report.id)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        </main>
      </div>
    </section>
  );
}

function AuditorDashboard({
  user,
  onLogout,
}: {
  user: StoredUser;
  onLogout: () => void;
}) {
  const [activeModuleId, setActiveModuleId] = useState(auditorModules[0].id);
  const [searchValue, setSearchValue] = useState("");
  const [drawerMode, setDrawerMode] = useState<"chat" | "notifications" | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<"module" | "evidence" | "reports" | null>(null);
  const [dashboardData, setDashboardData] = useState<AuditorDashboardData>({
    metrics: auditorMetrics,
    modules: auditorModules,
    priorities: auditorPriorities,
    notifications: auditorNotifications,
    tasks: tasksByRole.AUDITOR,
    reports: auditorReports,
  });
  const [dashboardError, setDashboardError] = useState("");
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [chatDirectory, setChatDirectory] = useState<ChatDirectory>({ users: [], groups: [] });
  const [isChatDirectoryLoading, setIsChatDirectoryLoading] = useState(true);
  const [chatDirectoryError, setChatDirectoryError] = useState("");
  const modules = dashboardData.modules.length ? dashboardData.modules : auditorModules;
  const activeModule = modules.find((module) => module.id === activeModuleId) ?? modules[0];
  const filteredRows = activeModule.rows.filter((row) => `${row.name} ${row.detail}`.toLowerCase().includes(searchValue.trim().toLowerCase()));
  const chatPersona = user.role === "AUDITOR" ? user.email : chatDirectory.users.find((entry) => entry.role === "AUDITOR")?.email ?? "alexandru.stan@local.dev";

  const loadDashboard = async () => {
    setIsDashboardLoading(true);
    setDashboardError("");
    try {
      const response = await fetch("http://localhost:8000/auditor/dashboard");
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not load Auditor data.");
      setDashboardData(data);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "Could not load Auditor data.");
    } finally {
      setIsDashboardLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadChatDirectory() {
      setIsChatDirectoryLoading(true);
      setChatDirectoryError("");

      try {
        const response = await fetch("http://localhost:8000/users/chat-directory");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Could not load chat teammates.");
        }

        if (!isCancelled) {
          setChatDirectory({
            users: data.users ?? [],
            groups: data.groups ?? [],
          });
        }
      } catch (error) {
        if (!isCancelled) {
          setChatDirectory({ users: [], groups: [] });
          setChatDirectoryError(error instanceof Error ? error.message : "Could not load chat teammates.");
        }
      } finally {
        if (!isCancelled) {
          setIsChatDirectoryLoading(false);
        }
      }
    }

    loadChatDirectory();

    return () => {
      isCancelled = true;
    };
  }, []);

  const dismissNotification = async (notificationId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/auditor/notifications/${notificationId}/dismiss`, {
        method: "PUT",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not dismiss notification.");
      }

      setDashboardData((current) => ({
        ...current,
        notifications: current.notifications.filter((notification) => notification.id !== notificationId),
      }));
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "Could not dismiss notification.");
    }
  };

  const advanceTask = async (taskId: number) => {
    const task = dashboardData.tasks.find((entry) => entry.id === taskId);

    if (!task) {
      return;
    }

    const status = task.status === "queued" ? "in_progress" : task.status === "in_progress" ? "done" : "queued";

    try {
      const response = await fetch(`http://localhost:8000/auditor/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not update task.");
      }

      setDashboardData((current) => ({
        ...current,
        tasks: current.tasks.map((entry) => entry.id === taskId ? { ...entry, status } : entry),
      }));
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "Could not update task.");
    }
  };

  const addReport = async (values: { title: string; report_type: AuditorReportType; description: string; recommendation: string }) => {
    const response = await fetch("http://localhost:8000/auditor/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Could not create report.");
    await loadDashboard();
  };
  const updateReportStatus = async (reportId: number, status: AuditorReportStatus) => {
    const response = await fetch(`http://localhost:8000/auditor/reports/${reportId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (!response.ok) throw new Error("Could not update report.");
    await loadDashboard();
  };
  const deleteReport = async (reportId: number) => {
    if (!window.confirm("Delete this auditor report?")) return;
    const response = await fetch(`http://localhost:8000/auditor/reports/${reportId}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Could not delete report.");
    await loadDashboard();
  };

  const selectModule = (moduleId: string) => {
    setActiveModuleId(moduleId);
    setSearchValue("");
    setWorkspaceMode(null);
  };

  if (workspaceMode === "reports") return <AuditorReportManager reports={dashboardData.reports} user={user} onAddReport={addReport} onUpdateStatus={updateReportStatus} onDeleteReport={deleteReport} onClose={() => setWorkspaceMode(null)} />;
  if (workspaceMode) return <SecurityModuleWorkspace module={activeModule} mode={workspaceMode} onClose={() => setWorkspaceMode(null)} />;

  return (
    <RoleWorkspaceShell
      roleLabel="Security Auditor"
      boardTitle="Assurance & compliance board"
      personaDetail="controls + reporting"
      chatLabel="Auditor chat"
      modules={modules}
      activeModuleId={activeModule.id}
      onSelectModule={selectModule}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      unreadChatCount={0}
      notificationCount={dashboardData.notifications.length}
      drawerMode={drawerMode}
      onOpenDrawer={setDrawerMode}
      onCloseDrawer={() => setDrawerMode(null)}
      onLogout={onLogout}
      signedInUser={user}
      workspacePersona={chatPersona.split("@")[0]}
      drawer={
        <>
          <div hidden={drawerMode !== "chat"}>
            <SecurityEngineerChatDrawer
              key={chatDirectory.groups
                .filter((group) => group.role === null || group.role === "AUDITOR")
                .map((group) => `${group.id}:${group.participants.join(",")}`)
                .join("|")}
              directory={{
                users: chatDirectory.users,
                groups: chatDirectory.groups.filter((group) => group.role === null || group.role === "AUDITOR"),
              }}
              currentUserEmail={chatPersona}
              isLoading={isChatDirectoryLoading}
              errorMessage={chatDirectoryError}
            />
          </div>
          <div hidden={drawerMode !== "notifications"}>
            <SecurityEngineerNotificationsDrawer
              notifications={dashboardData.notifications}
              onDismissNotification={dismissNotification}
              tasks={dashboardData.tasks}
              onAdvanceTask={advanceTask}
            />
          </div>
        </>
      }
    >
      <section className="security-command-content">
        <div className="security-command-intro">
          <div>
            <span className="security-command-kicker">Audit assurance workspace</span>
            <h1>Inspect controls.<br />Improve resilience.</h1>
          </div>
          <p>Evaluate compliance, test risks, audit policies and turn evidence into actionable management recommendations.</p>
        </div>
        {isDashboardLoading ? <div className="security-studio-message">Loading audit data from PostgreSQL...</div> : null}
        {dashboardError ? <div className="security-chat-error">{dashboardError}</div> : null}

        <div className="security-command-metrics">
          {dashboardData.metrics.map((metric) => (
            <article key={metric.label} className="security-glass-card security-metric-card">
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <p>{metric.note}</p>
            </article>
          ))}
        </div>

        <div className="security-command-grid">
          <article className="security-glass-card security-module-panel">
            <div className="security-module-heading">
              <span className="role-workspace-nav-icon"><WorkspaceIcon name={activeModule.id} /></span>
              <div>
                <span>Selected module</span>
                <h2>{activeModule.title}</h2>
              </div>
              <strong>{activeModule.count}</strong>
            </div>
            <p>{activeModule.description}</p>

            <div className="security-module-results">
              {filteredRows.length ? filteredRows.map((row) => (
                <div key={row.name} className="security-module-row">
                  <div>
                    <strong>{row.name}</strong>
                    <span>{row.detail}</span>
                  </div>
                  <em>{row.value}</em>
                </div>
              )) : (
                <div className="security-empty-state">No audit evidence found.</div>
              )}
            </div>

            <div className="security-module-footer">
              <button
                type="button"
                className="security-primary-button"
                onClick={() => setWorkspaceMode(activeModule.id === "reports" ? "reports" : "module")}
              >
                {activeModule.action}
              </button>
              <button type="button" className="security-demo-button" onClick={() => setWorkspaceMode("evidence")}>
                View evidence
              </button>
            </div>
          </article>

          <aside className="security-command-priorities">
            <div className="security-section-title">
              <div>
                <span>Current focus</span>
                <h2>Audit priorities</h2>
              </div>
              <strong>{String(dashboardData.priorities.length).padStart(2, "0")}</strong>
            </div>
            {dashboardData.priorities.map((priority) => (
              <article key={priority.title} className="security-glass-card security-priority-card">
                <span className={`security-priority-dot ${priority.status}`} />
                <div>
                  <strong>{priority.title}</strong>
                  <p>{priority.detail}</p>
                </div>
              </article>
            ))}
          </aside>
        </div>
      </section>
    </RoleWorkspaceShell>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedView, setSelectedView] = useState<Role | "AUTO">("AUTO");

  const user = useMemo<StoredUser | null>(() => {
    const rawUser = window.sessionStorage.getItem("coreshieldUser");
    const parsedUser: StoredUser | null = rawUser ? JSON.parse(rawUser) : null;

    return parsedUser
      ? { ...parsedUser, role: normalizeRole(parsedUser.role) }
      : null;
  }, []);

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

  const handleLogout = () => {
    window.sessionStorage.removeItem("coreshieldUser");
    navigate("/login", { replace: true });
  };

  const selectView = (view: Role | "AUTO") => {
    setSelectedView(view);
  };

  if (!user || !activeRole) {
    return null;
  }

  return (
    <section className={classNames("dashboard-shell", user.role === "ADMIN" && "dashboard-shell-admin")}>
      <div className="dashboard-backdrop" />

      <div className="dashboard-frame">
        {user.role === "ADMIN" ? (
          <div className="role-switcher">
            <span>Preview dashboards:</span>
            {(["ADMIN", "MANAGER", "ANALYST", "SECURITY_ENGINEER", "AUDITOR"] as Role[]).map((role) => (
              <button
                key={role}
                type="button"
                className={classNames("role-chip", activeRole === role && "active")}
                onClick={() => selectView(role)}
              >
                {formatRole(role)}
              </button>
            ))}
          </div>
        ) : null}

        {activeRole === "ADMIN" ? <AdminDashboard user={user} /> : null}
        {activeRole === "MANAGER" ? <ManagerDashboard user={user} onLogout={handleLogout} /> : null}
        {activeRole === "ANALYST" ? <AnalystDashboard user={user} onLogout={handleLogout} mailOpen={false} /> : null}
        {activeRole === "SECURITY_ENGINEER" ? (
          <SecurityEngineerDashboard
            user={user}
            onLogout={handleLogout}
          />
        ) : null}
        {activeRole === "AUDITOR" ? <AuditorDashboard user={user} onLogout={handleLogout} /> : null}
      </div>
    </section>
  );
}
