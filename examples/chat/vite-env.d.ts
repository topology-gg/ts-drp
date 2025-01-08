/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_BOOTSTRAP_PEERS: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
