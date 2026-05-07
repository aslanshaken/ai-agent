"use client";

import { AgentMemoryPermissionsFields } from "@/components/agents/agent-memory-permissions-fields";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";

export function AgentMemoryPermissionsDrawer({
  open,
  onClose,
  memoryCategoriesText,
  allowedNodeTypesText,
  riskLevel,
  onChangeMemoryCategoriesText,
  onChangeAllowedNodeTypesText,
  onChangeRiskLevel,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  memoryCategoriesText: string;
  allowedNodeTypesText: string;
  riskLevel: string;
  onChangeMemoryCategoriesText: (v: string) => void;
  onChangeAllowedNodeTypesText: (v: string) => void;
  onChangeRiskLevel: (v: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Memory & Permissions"
      widthClassName="max-w-xl"
      footer={
        <Button type="button" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      }
    >
      <AgentMemoryPermissionsFields
        idPrefix="drawer"
        memoryCategoriesText={memoryCategoriesText}
        allowedNodeTypesText={allowedNodeTypesText}
        riskLevel={riskLevel}
        onChangeMemoryCategoriesText={onChangeMemoryCategoriesText}
        onChangeAllowedNodeTypesText={onChangeAllowedNodeTypesText}
        onChangeRiskLevel={onChangeRiskLevel}
        showIntro
      />
    </Drawer>
  );
}
