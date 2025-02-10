/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_GROQ_API_KEY: string;
	readonly VITE_ANTHROPIC_API_KEY: string;
	readonly VITE_STARKNET_RPC_URL: string;
	// more env variables...
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
