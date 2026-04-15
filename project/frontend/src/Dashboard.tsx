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

const auditChart = [
  { label: "Role changes", value: 4 },
  { label: "Playbook edits", value: 9 },
  { label: "Manual actions", value: 12 },
  { label: "Exports", value: 3 },
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
      id: 4001,
      mailbox: "manager.soc@local.dev",
      participants: ["admin@local.dev", "manager.soc@local.dev"],
      subject: "Prioritizare incidente pentru shiftul de azi",
      unread: true,
      tag: "Leadership",
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
      participants: ["mihai.ionescu@local.dev", "manager.soc@local.dev"],
      subject: "Escaladare pentru incidentul 802",
      unread: false,
      tag: "Team",
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
      id: 1001,
      mailbox: "mihai.ionescu@local.dev",
      participants: ["anca.popescu@local.dev", "mihai.ionescu@local.dev"],
      subject: "Incidentul 801 - verificare rapidă",
      unread: true,
      tag: "Engineering",
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
      id: 2001,
      mailbox: "anca.popescu@local.dev",
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
      participants: ["admin@local.dev", "anca.popescu@local.dev"],
      subject: "Aprobarea schimbării pentru regula fallback",
      unread: false,
      tag: "Change",
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
      id: 3001,
      mailbox: "alexandru.stan@local.dev",
      participants: ["admin@local.dev", "alexandru.stan@local.dev"],
      subject: "Raport săptămânal pentru comitet",
      unread: true,
      tag: "Report",
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
      participants: ["anca.popescu@local.dev", "alexandru.stan@local.dev"],
      subject: "Clarificare pe update-ul de playbook",
      unread: false,
      tag: "Review",
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

function generateAuditPdf(user: StoredUser | null) {
  const printWindow = window.open("", "_blank", "width=1080,height=900");

  if (!printWindow) {
    window.alert("Browser-ul a blocat fereastra pentru raportul PDF.");
    return;
  }

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
        <title>CoreShield Audit Report</title>
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
        <h1>CoreShield Audit Report</h1>
        <p>Generated on 2026-04-15 by ${user?.email ?? "unknown user"}.</p>
        <div class="meta">
          <div class="card"><strong>Total audit events</strong><br/>148</div>
          <div class="card"><strong>Critical workflow changes</strong><br/>11</div>
          <div class="card"><strong>Read-only exports</strong><br/>3</div>
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
  const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? threads[0];

  return (
    <section
      className={classNames("dashboard-card", "span-12", "workspace-card", forceOpen && "workspace-focus")}
      id="service-inbox"
    >
      <div className="panel-heading">
        <div>
          <span className="eyebrow tone-cyan">Service operations</span>
          <h2>Inbox, conversations and assigned tasks</h2>
        </div>
        <div className="workspace-mailbox">
          <span>Mailbox</span>
          <strong>{mailbox}</strong>
        </div>
      </div>

      <div className="workspace-layout">
        <div className="mail-panel">
          <div className="section-heading">
            <h3>Inbox</h3>
            <span>{threads.filter((thread) => thread.unread).length} unread threads</span>
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
                <span className="mail-thread-tag">{thread.tag}</span>
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
              Reply
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
            <span>Quick reply</span>
            <textarea
              defaultValue="Confirm primirea mesajului și adaugă contextul operațional aici."
            />
          </label>
        </div>

        <div className="task-panel">
          <div className="section-heading">
            <h3>Task board</h3>
            <span>Assigned to this mailbox</span>
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
                    Open task
                  </button>
                </div>
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
      <section className="dashboard-card hero-panel span-8">
        <div className="panel-heading">
          <div>
            <span className="eyebrow tone-cyan">System overview</span>
            <h2>Administrator command center</h2>
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
          <h3>User management</h3>
          <span>live data from users table</span>
        </div>

        <div className="table-list compact-list">
          {users.map((entry) => (
            <div key={entry.id} className="table-row">
              <div>
                <strong>{entry.email}</strong>
                <span>{formatRole(normalizeRole(entry.role))}</span>
              </div>
              <div className="row-actions">
                <span className="status-pill neutral">
                  {entry.enabled === false ? "disabled" : "active"}
                </span>
                <button type="button" className="mini-button">
                  Manage
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

      <section className="dashboard-card span-8">
        <div className="section-heading">
          <h3>Database control surface</h3>
          <span>schema visibility, table health and privileged maintenance</span>
        </div>
        <div className="stats-grid">
          <article className="stat-card">
            <span>Tracked tables</span>
            <strong>10</strong>
            <small className="tone-cyan">including mail and tasks</small>
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
        <div className="table-list">
          <div className="table-row">
            <div>
              <strong>users</strong>
              <span>authentication, roles, account state</span>
            </div>
            <div className="row-metrics">
              <span>26 rows</span>
              <button type="button" className="mini-button">Inspect table</button>
            </div>
          </div>
          <div className="table-row">
            <div>
              <strong>incidents / incident_alerts</strong>
              <span>active incident graph and alert relationships</span>
            </div>
            <div className="row-metrics">
              <span>184 rows</span>
              <button type="button" className="mini-button">Open relations</button>
            </div>
          </div>
          <div className="table-row">
            <div>
              <strong>mail_threads / mail_messages / tasks</strong>
              <span>department collaboration and operational workload</span>
            </div>
            <div className="row-metrics">
              <span>91 rows</span>
              <button type="button" className="mini-button">Run maintenance</button>
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-card span-4">
        <div className="section-heading">
          <h3>Privileged actions</h3>
          <span>absolute control plane</span>
        </div>
        <div className="action-grid">
          <button type="button" className="action-tile">Open DB explorer</button>
          <button type="button" className="action-tile">Rotate service secrets</button>
          <button type="button" className="action-tile">Force-disable account</button>
          <button type="button" className="action-tile">Rebuild ML ruleset</button>
        </div>
      </section>
    </div>
  );
}

function ManagerDashboard({ mailOpen }: { mailOpen: boolean }) {
  return (
    <div className="dashboard-grid">
      <NonAdminWorkspace role="MANAGER" forceOpen={mailOpen} />

      <section className="dashboard-card hero-panel span-8">
        <div className="panel-heading">
          <div>
            <span className="eyebrow tone-cyan">Department operations</span>
            <h2>Security operations management desk</h2>
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

        <div className="stats-grid">
          <article className="stat-card">
            <span>Team utilization</span>
            <strong>84%</strong>
            <small className="tone-amber">high but stable</small>
          </article>
          <article className="stat-card">
            <span>Open escalations</span>
            <strong>5</strong>
            <small className="tone-rose">requires decisions</small>
          </article>
          <article className="stat-card">
            <span>SLA within target</span>
            <strong>93%</strong>
            <small className="tone-emerald">team performance</small>
          </article>
          <article className="stat-card">
            <span>Analyst backlog</span>
            <strong>17</strong>
            <small className="tone-cyan">triage items</small>
          </article>
        </div>

        <div className="dashboard-split">
          <div>
            <div className="section-heading">
              <h3>Team workload</h3>
              <span>capacity and queue balancing</span>
            </div>
            {renderMiniBars(
              [
                { label: "Mihai", value: 8 },
                { label: "Anca", value: 6 },
                { label: "Tier2", value: 5 },
                { label: "On-call", value: 3 },
              ],
              "cyan"
            )}
          </div>

          <div>
            <div className="section-heading">
              <h3>Manager approvals</h3>
              <span>leadership-only actions</span>
            </div>
            <div className="table-list compact-list">
              <div className="table-row">
                <div>
                  <strong>Incident #801 escalation</strong>
                  <span>Move to executive watchlist</span>
                </div>
                <button type="button" className="mini-button">Approve</button>
              </div>
              <div className="table-row">
                <div>
                  <strong>Extra analyst allocation</strong>
                  <span>Finance mailbox case</span>
                </div>
                <button type="button" className="mini-button">Review</button>
              </div>
              <div className="table-row">
                <div>
                  <strong>After-hours playbook run</strong>
                  <span>Requires manager sign-off</span>
                </div>
                <button type="button" className="mini-button">Authorize</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-card span-4">
        <div className="section-heading">
          <h3>Department health</h3>
          <span>not audit, but operational oversight</span>
        </div>
        <div className="timeline">
          <article className="timeline-item">
            <span className="timeline-time">Today</span>
            <div>
              <strong>Shift coverage full</strong>
              <p>No staffing gaps for day and evening rotations.</p>
            </div>
          </article>
          <article className="timeline-item">
            <span className="timeline-time">09:20</span>
            <div>
              <strong>Escalation queue reviewed</strong>
              <p>Two incidents promoted, one sent back to triage.</p>
            </div>
          </article>
          <article className="timeline-item">
            <span className="timeline-time">08:45</span>
            <div>
              <strong>Playbook approval pending</strong>
              <p>Waiting for engineering confirmation on rollback coverage.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="dashboard-card span-6">
        <div className="section-heading">
          <h3>Incident priority board</h3>
          <span>manager view over active response</span>
        </div>
        <div className="table-list">
          {incidents.map((incident) => (
            <div key={incident.id} className="table-row">
              <div>
                <strong>#{incident.id} {incident.title}</strong>
                <span>{incident.assignedUser} • {incident.source}</span>
              </div>
              <div className="row-metrics">
                <span className={`status-pill severity-${incident.severity}`}>{incident.severity}</span>
                <button type="button" className="mini-button">Prioritize</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-card span-6">
        <div className="section-heading">
          <h3>KPI snapshot</h3>
          <span>managerial performance indicators</span>
        </div>
        {renderMiniBars(
          [
            { label: "MTTR", value: 72 },
            { label: "SLA", value: 93 },
            { label: "Auto-resolved", value: 68 },
            { label: "Escalated", value: 24 },
          ],
          "emerald"
        )}
      </section>
    </div>
  );
}

function AnalystDashboard({ mailOpen }: { mailOpen: boolean }) {
  return (
    <div className="dashboard-grid">
      <NonAdminWorkspace role="ANALYST" forceOpen={mailOpen} />

      <section className="dashboard-card hero-panel span-8">
        <div className="panel-heading">
          <div>
            <span className="eyebrow tone-amber">Investigation queue</span>
            <h2>Analyst triage workspace</h2>
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

      <section className="dashboard-card span-6">
        <div className="section-heading">
          <h3>Manual actions</h3>
          <span>fast SOC controls</span>
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

      <section className="dashboard-card span-6">
        <div className="section-heading">
          <h3>Execution status</h3>
          <span>latest playbook runs</span>
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
    </div>
  );
}

function SecurityEngineerDashboard({ mailOpen }: { mailOpen: boolean }) {
  const [selectedPlaybook, setSelectedPlaybook] = useState<PlaybookItem>(playbooks[0]);

  return (
    <div className="dashboard-grid">
      <NonAdminWorkspace role="SECURITY_ENGINEER" forceOpen={mailOpen} />

      <section className="dashboard-card hero-panel span-12">
        <div className="panel-heading">
          <div>
            <span className="eyebrow tone-emerald">Automation studio</span>
            <h2>Security engineering flow builder</h2>
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

      <section className="dashboard-card span-6">
        <div className="section-heading">
          <h3>Recent engineering changes</h3>
          <span>traceability for automation updates</span>
        </div>
        <div className="timeline">
          {auditLogs.slice(0, 3).map((log) => (
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
  return (
    <div className="dashboard-grid">
      <NonAdminWorkspace role="AUDITOR" forceOpen={mailOpen} />

      <section className="dashboard-card hero-panel span-8">
        <div className="panel-heading">
          <div>
            <span className="eyebrow tone-rose">Read-only oversight</span>
            <h2>Audit and reporting center</h2>
          </div>
          <div className="button-row">
            <button type="button" className="primary-button" onClick={() => generateAuditPdf(user)}>
              Generate PDF report
            </button>
            <button type="button" className="ghost-button">
              Export CSV
            </button>
          </div>
        </div>

        <div className="stats-grid">
          <article className="stat-card">
            <span>Audit events today</span>
            <strong>148</strong>
            <small className="tone-cyan">append-only trail</small>
          </article>
          <article className="stat-card">
            <span>Privileged changes</span>
            <strong>11</strong>
            <small className="tone-amber">requires review</small>
          </article>
          <article className="stat-card">
            <span>Playbook failures</span>
            <strong>2</strong>
            <small className="tone-rose">investigate path</small>
          </article>
          <article className="stat-card">
            <span>Compliance score</span>
            <strong>97%</strong>
            <small className="tone-emerald">within target</small>
          </article>
        </div>

        <div className="dashboard-split">
          <div>
            <div className="section-heading">
              <h3>Activity categories</h3>
              <span>quick visual breakdown</span>
            </div>
            {renderMiniBars(auditChart, "rose")}
          </div>

          <div>
            <div className="section-heading">
              <h3>Review scope</h3>
              <span>current audit window</span>
            </div>
            <div className="scope-list">
              <div className="scope-row">
                <span>Users</span>
                <strong>19 tracked accounts</strong>
              </div>
              <div className="scope-row">
                <span>Playbooks</span>
                <strong>7 production flows</strong>
              </div>
              <div className="scope-row">
                <span>Incidents</span>
                <strong>32 closed this week</strong>
              </div>
              <div className="scope-row">
                <span>Exports</span>
                <strong>3 PDF / 2 CSV</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-card span-4">
        <div className="section-heading">
          <h3>Execution logs</h3>
          <span>playbook timeline</span>
        </div>
        <div className="table-list compact-list">
          {executionLogs.map((entry) => (
            <div key={entry.id} className="table-row">
              <div>
                <strong>{entry.playbook}</strong>
                <span>{entry.startedAt}</span>
              </div>
              <span className={`status-pill exec-${entry.status}`}>{entry.status}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-card span-12">
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
      title: "Build the automation behind the response.",
      subtitle:
        "Design playbook flows, wire action steps and test orchestration paths before they run in production.",
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
