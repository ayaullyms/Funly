/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TON_TESTNET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}