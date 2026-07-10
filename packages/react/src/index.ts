/**
 * @redrixx/nexus-react — the React binding for Nexus.
 *
 * Deliberately thin: components subscribe as *readers*. There is no way to
 * mutate a Nexus store from here — writes live on the owner, which is wired at
 * your composition root, not reached through a hook.
 */
export { useReader, useEntities, useEntity } from "./hooks.js";
