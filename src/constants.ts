import { AppState } from "@excalidraw/excalidraw/types/types";

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

/**
 * Config containing all AppState keys. Used to determine whether given state
 *  prop should be stripped when exporting to given storage type.
 */
export const APP_STATE_STORAGE_CONF = (<
  Values extends {
    /** whether to keep when storing to browser storage (localStorage/IDB) */
    browser: boolean;
    /** whether to keep when exporting to file/database */
    export: boolean;
  },
  T extends Record<keyof AppState, Values>,
>(config: { [K in keyof T]: K extends keyof AppState ? T[K] : never }) =>
  config)({
  theme: { browser: true, export: false },
  collaborators: { browser: false, export: false },
  currentChartType: { browser: true, export: false },
  currentItemBackgroundColor: { browser: true, export: false },
  currentItemEndArrowhead: { browser: true, export: false },
  currentItemFillStyle: { browser: true, export: false },
  currentItemFontFamily: { browser: true, export: false },
  currentItemFontSize: { browser: true, export: false },
  currentItemLinearStrokeSharpness: { browser: true, export: false },
  currentItemOpacity: { browser: true, export: false },
  currentItemRoughness: { browser: true, export: false },
  currentItemStartArrowhead: { browser: true, export: false },
  currentItemStrokeColor: { browser: true, export: false },
  currentItemStrokeSharpness: { browser: true, export: false },
  currentItemStrokeStyle: { browser: true, export: false },
  currentItemStrokeWidth: { browser: true, export: false },
  currentItemTextAlign: { browser: true, export: false },
  cursorButton: { browser: true, export: false },
  draggingElement: { browser: false, export: false },
  editingElement: { browser: false, export: false },
  editingGroupId: { browser: true, export: false },
  editingLinearElement: { browser: false, export: false },
  elementLocked: { browser: true, export: false },
  elementType: { browser: true, export: false },
  errorMessage: { browser: false, export: false },
  exportBackground: { browser: true, export: false },
  exportEmbedScene: { browser: true, export: false },
  exportScale: { browser: true, export: false },
  exportWithDarkMode: { browser: true, export: false },
  fileHandle: { browser: false, export: false },
  gridSize: { browser: true, export: true },
  height: { browser: false, export: false },
  isBindingEnabled: { browser: false, export: false },
  isLibraryOpen: { browser: false, export: false },
  isLoading: { browser: false, export: false },
  isResizing: { browser: false, export: false },
  isRotating: { browser: false, export: false },
  lastPointerDownWith: { browser: true, export: false },
  multiElement: { browser: false, export: false },
  name: { browser: true, export: false },
  offsetLeft: { browser: false, export: false },
  offsetTop: { browser: false, export: false },
  openMenu: { browser: true, export: false },
  openPopup: { browser: false, export: false },
  pasteDialog: { browser: false, export: false },
  previousSelectedElementIds: { browser: true, export: false },
  resizingElement: { browser: false, export: false },
  scrolledOutside: { browser: true, export: false },
  scrollX: { browser: true, export: false },
  scrollY: { browser: true, export: false },
  selectedElementIds: { browser: true, export: false },
  selectedGroupIds: { browser: true, export: false },
  selectionElement: { browser: false, export: false },
  shouldCacheIgnoreZoom: { browser: true, export: false },
  showHelpDialog: { browser: false, export: false },
  showStats: { browser: true, export: false },
  startBoundElement: { browser: false, export: false },
  suggestedBindings: { browser: false, export: false },
  toastMessage: { browser: false, export: false },
  viewBackgroundColor: { browser: true, export: true },
  width: { browser: false, export: false },
  zenModeEnabled: { browser: true, export: false },
  zoom: { browser: true, export: false },
  viewModeEnabled: { browser: false, export: false },
});
