/**
 * @redrixx/writ-react — the React binding for writ.
 *
 * Deliberately thin: components subscribe as *readers*. There is no way to
 * mutate a writ store from here — writes live on the owner, which is wired at
 * your composition root, not reached through a hook.
 */
export { useReader, useEntities, useEntity } from "./hooks.js";
