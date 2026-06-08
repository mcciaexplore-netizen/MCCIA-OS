import { ImportDrawer } from './import/ImportDrawer';
import { companyImportKind } from './import/companyKind';

/** Companies bulk-import drawer (wrapper over the generic ImportDrawer). */
export function CompanyImportDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <ImportDrawer open={open} onClose={onClose} kind={companyImportKind} />;
}
