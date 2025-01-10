/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_BOOTSTRAP_PEERS: string;
	readonly VITE_DISCOVERY_INTERVAL: number;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
