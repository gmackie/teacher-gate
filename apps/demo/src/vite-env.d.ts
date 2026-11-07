/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** A `product` bearer token, when the service is not in insecure dev mode. */
  readonly VITE_TEACHER_GATE_TOKEN?: string;
}
