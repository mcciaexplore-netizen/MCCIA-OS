/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Shared key sent to the data API as `x-app-key` (basic gate, ships in the bundle). */
  readonly VITE_APP_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
