import { Button } from "@/components/ui/button";
import { useAgentPermissions } from "@/hooks/useAgentPermissions";
import { Plus, Edit, Trash2, FileUp, Download } from "lucide-react";

interface PermissionControlledActionsProps {
  onEdit?: (item: any) => void;
  onDelete?: (id: number) => void;
  onCreate?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  item?: any;
  showCreate?: boolean;
  showImport?: boolean;
  showExport?: boolean;
  createLabel?: string;
  importLabel?: string;
  exportLabel?: string;
}

export function PermissionControlledActions({
  onEdit,
  onDelete,
  onCreate,
  onImport,
  onExport,
  item,
  showCreate = true,
  showImport = true,
  showExport = true,
  createLabel = "New",
  importLabel = "Import from Excel",
  exportLabel = "Export"
}: PermissionControlledActionsProps) {
  const permissions = useAgentPermissions();

  // Header action buttons (Create, Import, Export)
  const HeaderActions = () => (
    <div className="flex items-center gap-2">
      {permissions.hasDataModificationRights ? (
        <>
          {showImport && onImport && permissions.canImport && (
            <Button variant="outline" onClick={onImport}>
              <FileUp className="mr-2 h-4 w-4" />
              {importLabel}
            </Button>
          )}
          {showCreate && onCreate && permissions.canCreate && (
            <Button onClick={onCreate}>
              <Plus className="mr-2 h-4 w-4" />
              {createLabel}
            </Button>
          )}
        </>
      ) : (
        <div className="text-sm text-gray-500 px-3 py-2 bg-gray-50 rounded">
          {permissions.getRestrictedMessage()}
        </div>
      )}
      {showExport && onExport && permissions.canExport && (
        <Button variant="outline" onClick={onExport}>
          <Download className="mr-2 h-4 w-4" />
          {exportLabel}
        </Button>
      )}
    </div>
  );

  // Table row action buttons (Edit, Delete)
  const RowActions = () => (
    <div className="flex justify-end gap-2">
      {permissions.hasDataModificationRights ? (
        <>
          {onEdit && permissions.canEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(item)}
              title="Edit"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {onDelete && permissions.canDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(item?.id)}
              className="text-red-500 hover:text-red-700"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </>
      ) : (
        <span className="text-xs text-gray-500 px-2 py-1">
          {permissions.label}
        </span>
      )}
    </div>
  );

  return {
    HeaderActions,
    RowActions,
    permissions
  };
}