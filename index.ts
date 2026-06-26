// index.ts
console.log("📦 index.ts is loading");
// 🔥 CRITICAL: Import Firebase INIT FIRST - before anything else!
import "./services/firebaseInit";
console.log("📦 Firebase init imported, continuing...");
// Polyfill DOMException for React Native (RTK Query needs it)
if (typeof globalThis.DOMException === "undefined") {
  globalThis.DOMException = class DOMException extends Error {
    constructor(message?: string, name?: string) {
      super(message);
      this.name = name || "DOMException";
    }
  } as any;
}

import { registerRootComponent } from "expo";
import App from "./App";

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
registerRootComponent(App);
