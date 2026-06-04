/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Path the browser POSTs Sheets proxy requests to. Defaults to /api/sheets. */
  readonly VITE_SHEETS_API_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
