import { ImportDrawer } from './import/ImportDrawer';
import { projectImportKind } from './import/projectKind';

/** App-development projects bulk-import drawer (wrapper over ImportDrawer). */
export function ProjectImportDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <ImportDrawer open={open} onClose={onClose} kind={projectImportKind} />;
}
