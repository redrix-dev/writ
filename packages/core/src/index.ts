/**
 * @redrixx/nexus — an authority-oriented entity-lifecycle state runtime.
 *
 * State libraries manage storage. Nexus manages authority: every piece of
 * state has exactly one writer, and that is enforced structurally, not by
 * convention.
 */

export { createCell, type Reader, type Writer } from "./store.js";
export {
  createMemoryPersistence,
  type Persistence,
} from "./persistence.js";
