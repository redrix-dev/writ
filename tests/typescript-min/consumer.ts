import {
  createCell,
  createEntityStore,
  createMemoryPersistence,
  createRegistry,
  type EntityReader,
  type Reader,
} from "../../packages/core/dist/index.js";
import {
  useEntities,
  useEntity,
  useReader,
} from "../../packages/react/dist/index.js";

type User = Readonly<{ name: string }>;

const count = createCell(0);
const users = createEntityStore<User>({
  persistence: createMemoryPersistence(),
  key: "users",
});
const registry = createRegistry<Readonly<{ users: EntityReader<User> }>>("App");
registry.register({ users: users.reader });

const countReader: Reader<number> = count.reader;
const entityReader: EntityReader<User> = registry.require().users;

void [useReader, useEntities, useEntity, countReader, entityReader];
