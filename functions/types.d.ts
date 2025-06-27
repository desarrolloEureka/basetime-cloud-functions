declare module "@google-cloud/storage" {
  import { Storage } from "@google-cloud/storage";

  /**
   * Interfaz que representa un bucket de Google Cloud Storage
   */
  export interface Bucket {
    name: string;
    storage: Storage;
  }

  export { Storage };
}

declare module "@google-cloud/storage/build/cjs/src/crc32c" {
  /**
   * Tabla de extensión CRC32C
   */
  export const CRC32C_EXTENSION_TABLE: Int32Array;

  /**
   * Clase que implementa el algoritmo CRC32C
   */
  export class CRC32C {
    static readonly CRC32C_EXTENSION_TABLE: Int32Array;
  }
}
