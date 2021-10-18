export enum EVENT {
  BEFORE_UNLOAD = "beforeunload",
  UNLOAD = "unload",
  VISIBILITY_CHANGE = "visibilitychange",
  POINTER_MOVE = "pointermove",
}

export const WEBEX_URL =
  "https://binaries.webex.com/static-content-pipeline/webex-embedded-app/v1/webex-embedded-app-sdk.js";

export const ENV = {
  DEVELOPMENT: "development",
};

// Report a user inactive after IDLE_THRESHOLD milliseconds
export const IDLE_THRESHOLD = 60_000;
// Report a user active each ACTIVE_THRESHOLD milliseconds
export const ACTIVE_THRESHOLD = 3_000;

export const SYNC_FULL_SCENE_INTERVAL_MS = 20000;
export const INITIAL_SCENE_UPDATE_TIMEOUT = 5000;

export const BROADCAST = {
  SERVER_VOLATILE: "server-volatile-broadcast",
  SERVER: "server-broadcast",
};

export enum SCENE {
  INIT = "SCENE_INIT",
  UPDATE = "SCENE_UPDATE",
}

export const APP_NAME = "Excalidraw";

export const isDarwin = /Mac|iPod|iPhone|iPad/.test(window.navigator.platform);
