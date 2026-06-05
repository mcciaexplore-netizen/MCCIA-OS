import { ImportDrawer } from './import/ImportDrawer';
import { consultationImportKind } from './import/consultationKind';

/** Consultations bulk-import drawer (thin wrapper over the generic ImportDrawer). */
export function BulkImportDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <ImportDrawer open={open} onClose={onClose} kind={consultationImportKind} />;
}
