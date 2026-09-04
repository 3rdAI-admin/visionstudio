/// <reference types="vite/client" />

declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}

// Exposed by electron/preload.js via contextBridge — only present when
// running inside the packaged/dev Electron app, undefined on web and iOS.
interface Window {
  electronAPI?: {
    restartApp: () => void;
  };
}
