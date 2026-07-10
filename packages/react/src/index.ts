/**
 * @redrixx/projectname-react — the React binding for projectname.
 *
 * Deliberately thin: components subscribe as *readers*. There is no way to
 * mutate a projectname store from here — writes live on the owner, which is wired at
 * your composition root, not reached through a hook.
 */
export { useReader, useEntities, useEntity } from "./hooks.js";
