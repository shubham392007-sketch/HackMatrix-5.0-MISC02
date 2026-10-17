import {
  EvidenceItem,
  ConnectedSource,
  IngestionRun,
} from "@/types/evidence";

/**
 * Clean, Zero-Demo Initial State for Domain 1 (Evidence Intelligence).
 * All sources begin strictly in "not_connected" state.
 * All evidence lists and ingestion run histories begin empty.
 */
export const INITIAL_CONNECTED_SOURCES: ConnectedSource[] = [
  {
    id: "source-github",
    name: "GitHub",
    type: "github",
    status: "not_connected",
    lastSync: "Never",
    importedRecordsCount: 0,
    accountIdentity: "Not Connected",
    permissions: ["Read repositories", "Read pull requests", "Read commit history"],
    selectedEntities: [],
  },
  {
    id: "source-jira",
    name: "Jira Software",
    type: "jira",
    status: "not_connected",
    lastSync: "Never",
    importedRecordsCount: 0,
    accountIdentity: "Not Connected",
    permissions: ["Read issue details", "Read worklogs", "Read sprint outcomes"],
    selectedEntities: [],
  },
  {
    id: "source-portfolio",
    name: "Portfolio & URLs",
    type: "portfolio",
    status: "not_connected",
    lastSync: "Never",
    importedRecordsCount: 0,
    accountIdentity: "Not Connected",
    permissions: ["Crawl public project pages"],
    selectedEntities: [],
  },
  {
    id: "source-documents",
    name: "Document Uploads",
    type: "document",
    status: "not_connected",
    lastSync: "Never",
    importedRecordsCount: 0,
    accountIdentity: "Not Connected",
    permissions: ["File upload & OCR normalization"],
    selectedEntities: [],
  },
];

export const INITIAL_EVIDENCE_ITEMS: EvidenceItem[] = [];

export const INITIAL_INGESTION_RUNS: IngestionRun[] = [];
