import { computeDiff } from "./diff.js";

const FIELD_LABELS = {
  status: "Status",
  priority: "Priority",
  ownerId: "Owner",
  title: "Title",
  description: "Description",
  dueDate: "Due date",
  department: "Department",
  slaPolicyId: "SLA policy",
  teamId: "Team",
  workItemType: "Type",
  customer: "Customer",
  project: "Project",
  effortEstimate: "Effort estimate",
};

function hasMeaningfulValue(value) {
  if (value === null || value === undefined || value === "") return false;
  if (value === "—") return false;
  return true;
}

function formatValue(value) {
  if (!hasMeaningfulValue(value)) return "";
  if (typeof value === "string" && value.length > 120) {
    return `${value.slice(0, 117)}...`;
  }
  return String(value);
}

export function buildAuditEntry({ action, actorId, detail, changes = [] }) {
  return {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    actorId: actorId || "system",
    detail,
    changes,
    timestamp: new Date().toISOString(),
  };
}

function summarizeChecklistChange(before = [], after = []) {
  const prev = Array.isArray(before) ? before : [];
  const next = Array.isArray(after) ? after : [];

  if (prev.length !== next.length) {
    return {
      field: "checklist",
      label: "Checklist",
      from: `${prev.length} item(s)`,
      to: `${next.length} item(s)`,
    };
  }

  const prevCompleted = prev.filter((item) => item?.completed).length;
  const nextCompleted = next.filter((item) => item?.completed).length;
  if (prevCompleted !== nextCompleted) {
    return {
      field: "checklist",
      label: "Checklist",
      from: `${prevCompleted}/${prev.length} completed`,
      to: `${nextCompleted}/${next.length} completed`,
    };
  }

  const prevTitles = prev.map((item) => item?.title).join("|");
  const nextTitles = next.map((item) => item?.title).join("|");
  if (prevTitles !== nextTitles) {
    return { field: "checklist", label: "Checklist", from: "Previous items", to: "Updated items" };
  }

  return null;
}

function summarizeActionItemsChange(before = [], after = []) {
  const prev = Array.isArray(before) ? before : [];
  const next = Array.isArray(after) ? after : [];

  if (prev.length !== next.length) {
    return {
      field: "actionItems",
      label: "Action items",
      from: String(prev.length),
      to: String(next.length),
    };
  }

  const prevTitles = prev.map((item) => item?.title).join("|");
  const nextTitles = next.map((item) => item?.title).join("|");
  if (prevTitles !== nextTitles) {
    return { field: "actionItems", label: "Action items", from: "Previous items", to: "Updated items" };
  }

  return null;
}

function buildFieldChanges(before = {}, patch = {}) {
  const diff = computeDiff(
    Object.fromEntries(
      Object.keys(FIELD_LABELS)
        .filter((key) => key in patch)
        .map((key) => [key, before[key]])
    ),
    Object.fromEntries(
      Object.keys(FIELD_LABELS)
        .filter((key) => key in patch)
        .map((key) => [key, patch[key]])
    )
  );

  const changes = [];

  for (const [field, change] of Object.entries(diff)) {
    const from = formatValue(change.from);
    const to = formatValue(change.to);
    if (!hasMeaningfulValue(from) && !hasMeaningfulValue(to)) continue;
    if (from === to) continue;

    changes.push({
      field,
      label: FIELD_LABELS[field] || field,
      from,
      to,
    });
  }

  if ("checklist" in patch) {
    const checklistChange = summarizeChecklistChange(before.checklist, patch.checklist);
    if (checklistChange) changes.push(checklistChange);
  }

  if ("actionItems" in patch) {
    const actionChange = summarizeActionItemsChange(before.actionItems, patch.actionItems);
    if (actionChange) changes.push(actionChange);
  }

  return changes;
}

export function buildWorkItemAuditEntries(before = {}, patch = {}, actorId = "system") {
  if (patch.isDeleted === true && !before.isDeleted) {
    return [
      buildAuditEntry({
        action: "Deleted",
        actorId,
        detail: "Work item marked as deleted",
      }),
    ];
  }

  const changes = buildFieldChanges(before, patch);
  if (!changes.length) return [];

  return [
    buildAuditEntry({
      action: "Updated",
      actorId,
      detail: `${changes.length} field(s) updated`,
      changes,
    }),
  ];
}

export function buildCreateAuditEntry(actorId, title) {
  return buildAuditEntry({
    action: "Created",
    actorId,
    detail: title ? `Work item created: ${formatValue(title)}` : "Work item created",
  });
}
