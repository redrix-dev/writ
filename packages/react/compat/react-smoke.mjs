import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { createCell } from "../../core/dist/index.js";
import { useReader } from "../dist/index.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const originalConsoleError = console.error;
console.error = (...args) => {
  if (String(args[0]).includes("react-test-renderer is deprecated")) return;
  originalConsoleError(...args);
};

const count = createCell(0);

function Counter() {
  return React.createElement("span", null, String(useReader(count.reader)));
}

let renderer;
await act(async () => {
  renderer = TestRenderer.create(React.createElement(Counter));
});

if (renderer.toJSON()?.children?.[0] !== "0") {
  throw new Error("initial React reader snapshot was not rendered");
}

await act(async () => {
  count.set(1);
});

if (renderer.toJSON()?.children?.[0] !== "1") {
  throw new Error("React reader subscription did not render the update");
}

await act(async () => {
  renderer.unmount();
});
console.error = originalConsoleError;
console.log(`React ${React.version}: adapter smoke test passed`);
