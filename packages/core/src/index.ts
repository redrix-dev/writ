/**
 * @redrixx/projectname — a substrate-agnostic ownership and entity-lifecycle contract.
 *
 * projectname creates separate writer and reader capabilities. Code holding only a
 * reader has no projectname mutation method; sharing a writer shares its authority.
 */

export { createCell, type Reader, type Writer } from "./store.js";
export {
  createEntityStore,
  type EntityStore,
  type EntityReader,
  type EntityStoreOptions,
} from "./entities.js";
export { createRegistry, type Registry } from "./registry.js";
export { createMemoryPersistence, type Persistence } from "./persistence.js";
