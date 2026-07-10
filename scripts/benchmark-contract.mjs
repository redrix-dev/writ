import { performance } from "node:perf_hooks";
import {
  createEntityStore,
  createMemoryPersistence,
} from "../packages/core/dist/index.js";

const sizes = [100, 1_000, 10_000];

const time = (operation) => {
  const started = performance.now();
  operation();
  return performance.now() - started;
};

console.log("Nexus contract benchmark (milliseconds)");
console.log("size\t100 in-memory updates\t20 persisted updates");

for (const size of sizes) {
  const memoryOnly = createEntityStore();
  for (let index = 0; index < size; index++) {
    memoryOnly.spawn(String(index), { value: index });
  }
  const memoryMs = time(() => {
    for (let index = 0; index < 100; index++) {
      memoryOnly.update(String(index % size), { value: index });
    }
  });

  const persisted = createEntityStore({
    persistence: createMemoryPersistence(),
    key: `size-${size}`,
  });
  for (let index = 0; index < size; index++) {
    persisted.spawn(String(index), { value: index });
  }
  const persistedMs = time(() => {
    for (let index = 0; index < 20; index++) {
      persisted.update(String(index % size), { value: index });
    }
  });

  console.log(`${size}\t${memoryMs.toFixed(2)}\t${persistedMs.toFixed(2)}`);
}
