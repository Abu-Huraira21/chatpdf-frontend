/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_WS_BASE_URL: string
  readonly VITE_TOGETHER_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*?url' {
  const assetUrl: string
  export default assetUrl
}