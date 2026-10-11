import { ShareRecord, ShareActivityEvent } from "@/types/sharing";
import { DEFAULT_SHARE_PERMISSIONS } from "@/lib/sharingCalculations";

export const INITIAL_SHARE_RECORDS: ShareRecord[] = [
  {
    shareId: "share-recruiter-demo",
    label: "Stripe Senior Platform Engineer Recruiter",
    status: "active",
    createdAt: "2026-03-24",
    expiresAt: "2026-04-07",
    lastAccessedAt: "Today, 11:42 AM",
    accessCount: 6,
    permissions: {
      ...DEFAULT_SHARE_PERMISSIONS,
      customLinkLabel: "Stripe Senior Platform Engineer Recruiter",
    },
  },
  {
    shareId: "share-restricted-evidence",
    label: "High-Level Screening (Summary Only)",
    status: "active",
    createdAt: "2026-03-20",
    expiresAt: "2026-04-20",
    lastAccessedAt: "Yesterday, 03:15 PM",
    accessCount: 3,
    permissions: {
      ...DEFAULT_SHARE_PERMISSIONS,
      customLinkLabel: "High-Level Screening (Summary Only)",
      evidenceAccessLevel: "summary_only",
      selectedEvidencePermissions: {
        "ev-01": { shareSummary: true, allowDetail: false },
        "ev-02": { shareSummary: true, allowDetail: false },
        "ev-03": { shareSummary: true, allowDetail: false },
      },
    },
  },
  {
    shareId: "share-role-alignment",
    label: "Anthropic Research Engineer Role Match",
    status: "active",
    createdAt: "2026-03-22",
    expiresAt: "2026-04-05",
    lastAccessedAt: "Today, 08:30 AM",
    accessCount: 11,
    permissions: {
      ...DEFAULT_SHARE_PERMISSIONS,
      customLinkLabel: "Anthropic Research Engineer Role Match",
      targetRoleId: "role-data-scientist",
      includeRoleAlignment: true,
    },
  },
  {
    shareId: "share-no-role",
    label: "General Capability Passport (No Target Role)",
    status: "active",
    createdAt: "2026-03-15",
    expiresAt: null, // Never expires
    lastAccessedAt: "3 days ago",
    accessCount: 14,
    permissions: {
      ...DEFAULT_SHARE_PERMISSIONS,
      customLinkLabel: "General Capability Passport (No Target Role)",
      includeRoleAlignment: false,
      expiryDays: null,
    },
  },
  {
    shareId: "share-expired",
    label: "Archived Winter Hiring Cycle",
    status: "expired",
    createdAt: "2026-02-01",
    expiresAt: "2026-02-15",
    lastAccessedAt: "2026-02-14",
    accessCount: 4,
    permissions: {
      ...DEFAULT_SHARE_PERMISSIONS,
      customLinkLabel: "Archived Winter Hiring Cycle",
      expiryDays: 14,
    },
  },
  {
    shareId: "share-revoked",
    label: "Revoked Agency Screening Link",
    status: "revoked",
    createdAt: "2026-03-10",
    expiresAt: "2026-03-24",
    lastAccessedAt: "2026-03-12",
    revokedAt: "2026-03-13",
    revocationReason: "Candidate withdrew application from third-party agency.",
    accessCount: 2,
    permissions: {
      ...DEFAULT_SHARE_PERMISSIONS,
      customLinkLabel: "Revoked Agency Screening Link",
    },
  },
];

export const INITIAL_SHARE_ACTIVITIES: ShareActivityEvent[] = [
  {
    id: "act-01",
    timestamp: "Today, 11:42 AM",
    shareId: "share-recruiter-demo",
    shareLabel: "Stripe Senior Platform Engineer Recruiter",
    action: "viewed",
    details: "Recruiter opened shared passport. Inspected 4 verified skills and 2 project evidence summaries.",
  },
  {
    id: "act-02",
    timestamp: "Today, 08:30 AM",
    shareId: "share-role-alignment",
    shareLabel: "Anthropic Research Engineer Role Match",
    action: "viewed",
    details: "Recruiter reviewed role-alignment breakdown for Senior Data Scientist.",
  },
  {
    id: "act-03",
    timestamp: "Yesterday, 03:15 PM",
    shareId: "share-restricted-evidence",
    shareLabel: "High-Level Screening (Summary Only)",
    action: "viewed",
    details: "Recruiter opened passport with summary-only permissions.",
  },
  {
    id: "act-04",
    timestamp: "2026-03-24, 09:10 AM",
    shareId: "share-recruiter-demo",
    shareLabel: "Stripe Senior Platform Engineer Recruiter",
    action: "created",
    details: "Created share link with 14-day expiry and detailed evidence inspection authorization.",
  },
  {
    id: "act-05",
    timestamp: "2026-03-13, 02:40 PM",
    shareId: "share-revoked",
    shareLabel: "Revoked Agency Screening Link",
    action: "revoked",
    details: "Candidate revoked link. Public URL immediately disabled.",
  },
];
