export type PermissionProfile = {
  allowed_node_types?: string[] | null;
  risk_level?: "low" | "medium" | "high";
};

export function parsePermissionProfile(raw: unknown): PermissionProfile {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const o = raw as Record<string, unknown>;
  const allowed = o.allowed_node_types;
  return {
    allowed_node_types: Array.isArray(allowed)
      ? allowed.filter((x): x is string => typeof x === "string")
      : null,
    risk_level:
      o.risk_level === "low" || o.risk_level === "medium" || o.risk_level === "high"
        ? o.risk_level
        : undefined,
  };
}

export function isNodeTypeAllowed(nodeType: string, profile: PermissionProfile): boolean {
  const allowed = profile.allowed_node_types;
  if (!allowed || allowed.length === 0) return true;
  return allowed.includes(nodeType);
}
