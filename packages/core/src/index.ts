/**
 * @redrixx/nexus — an authority-oriented entity-lifecycle state runtime.
 *
 * State libraries manage storage. Nexus manages authority: every piece of
 * state has exactly one writer, and that is enforced structurally, not by
 * convention.
 */

export { createCell, type Reader, type Writer } from "./store.js";
export {
  createEntityStore,
  type EntityStore,
  type EntityReader,
  type EntityStoreOptions,
} from "./entities.js";
export { createRegistry, type Registry } from "./registry.js";
export {
  createMemoryPersistence,
  type Persistence,
} from "./persistence.js";
