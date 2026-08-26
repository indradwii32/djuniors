/// <reference types="vite/client" />

interface ImportMetaEnv {
    /**
     * Base URL for the Workers API endpoint in production builds.
     * Set at build time, e.g.:
     *   VITE_API_BASE=https://api.djuniors.id npm run build
     * Leave empty (default) when dashboard + API share an origin.
     */
    readonly VITE_API_BASE?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
