/// <reference types="vite/client" />
/// <reference types="node" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_WS_BASE_URL: string
  readonly VITE_TOGETHER_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare namespace NodeJS {
  interface ProcessEnv {
    API_BASE_URL?: string
    WS_BASE_URL?: string
  }
}

declare const __API_BASE_URL__: string | null | undefined
declare const __API_WS_BASE_URL__: string | null | undefined
