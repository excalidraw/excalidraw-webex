import Excalidraw, { THEME } from "@excalidraw/excalidraw";
import {
  AppState,
  ExcalidrawImperativeAPI,
  UIOptions,
} from "@excalidraw/excalidraw/types/types";
import { useCallback, useContext, useEffect, useRef, useState } from "react";

import CollabWrapper, {
  CollabAPI,
  CollabContext,
  CollabContextConsumer,
} from "./collab/CollabWrapper";
import { useCallbackRefState } from "./hooks/useCallbackRefState";

import "./App.scss";
import {
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
  Theme,
} from "@excalidraw/excalidraw/types/element/types";
import { ImportedDataState } from "@excalidraw/excalidraw/types/data/types";
import { getCollaborationLinkData } from "./data";
import { ResolvablePromise } from "@excalidraw/excalidraw/types/utils";
import { isDev, loadScript, resolvablePromise } from "./utils";
import { isDarwin, WEBEX_URL } from "./constants";
import { ExportToExcalidrawPlus } from "./components/ExportToExcalidrawPlus";
import Spinner from "./components/Spinner";

const ExcalidrawWrapper = () => {
  const [excalidrawAPI, excalidrawRefCallback] =
    useCallbackRefState<ExcalidrawImperativeAPI>();
  const collabAPI = useContext(CollabContext)?.api;

  const initialStatePromiseRef = useRef<{
    promise: ResolvablePromise<ImportedDataState | null>;
  }>({ promise: null! });

  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState({});
  const [theme, setTheme] = useState<Theme>(THEME.LIGHT);

  if (!initialStatePromiseRef.current.promise) {
    initialStatePromiseRef.current.promise =
      resolvablePromise<ImportedDataState | null>();
  }

  useEffect(() => {
    const initializeWebex = () => {
      window.webexInstance = new window.Webex.Application();
      const webexApp = window.webexInstance;

      if (!collabAPI || !excalidrawAPI) {
        return;
      }

      const initiateCollab = () => {
        const roomLinkData = getCollaborationLinkData(window.location.href);
        if (!roomLinkData) {
          collabAPI?.initializeSocketClient(null);
        }
      };

      // Initial collab session manually as webex onReady will not be triggered in dev mode
      if (isDev()) {
        initiateCollab();
      }

      webexApp.onReady().then(() => {
        initiateCollab();
        const currentTheme = webexApp.theme.toLowerCase();
        if (currentTheme !== theme) {
          setTheme(currentTheme);
        }
        webexApp.context
          .getUser()
          .then((user: { displayName: string }) => {
            setUser(user);
          })
          .catch((error: Error) => {
            console.error(error.message);
          });
        webexApp.listen().then(() => {
          webexApp.on("application:themeChanged", (theme: "LIGHT" | "DARK") => {
            setTheme(theme.toLowerCase() as Theme);
          });

          webexApp.on("application:shareStateChanged", (isShared: boolean) => {
            // Open json export modal if sharing turned off
            if (!isShared) {
              let exportButton = document.querySelector(
                '[data-testid="json-export-button"]',
              ) as HTMLElement;

              // This will happen for mobile view
              if (exportButton === null) {
                // open mobile menu => click on export => close mobile menu
                const currentAppState = excalidrawAPI.getAppState();
                excalidrawAPI.updateScene({
                  appState: { ...currentAppState, openMenu: "canvas" },
                });
                exportButton = document.querySelector(
                  '[data-testid="json-export-button"]',
                ) as HTMLElement;
              }
              exportButton.click();
            }
          });
        });
      });
    };

    if (!window.webexInstance) {
      loadScript(WEBEX_URL).then(() => {
        initializeWebex();
        setLoaded(true);
      });
    } else {
      initializeWebex();
    }
  }, [theme, excalidrawAPI, collabAPI]);

  useEffect(() => {
    if (!collabAPI || !excalidrawAPI) {
      return;
    }

    initializeScene({ collabAPI }).then((scene) => {
      initialStatePromiseRef.current.promise.resolve(scene);
    });
  }, [collabAPI, excalidrawAPI]);

  const initializeScene = async (opts: {
    collabAPI: CollabAPI;
  }): Promise<ImportedDataState | null> => {
    const roomLinkData = getCollaborationLinkData(window.location.href);
    if (roomLinkData) {
      return opts.collabAPI.initializeSocketClient(roomLinkData);
    }
    return null;
  };
  const onChange = (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
  ) => {
    if (collabAPI?.isCollaborating) {
      collabAPI.broadcastElements(elements);
    }
  };

  const renderTopRightUI = useCallback((isMobile) => {
    return (
      <div className="logo">
        <a
          href="https://plus.excalidraw.com/?utm_source=excalidraw&utm_medium=banner&utm_campaign=launch"
          target="_blank"
          rel="noreferrer"
        >
          <img src="/logo.png" alt="excalidraw logo" />
        </a>
      </div>
    );
  }, []);

  const getCanvasOptions = () => {
    const isDarwinDesktop =
      window.webexInstance.deviceType === "DESKTOP" && isDarwin;
    const canvasActions: UIOptions["canvasActions"] = {
      loadScene: !isDarwinDesktop,
      saveAsImage: !isDarwinDesktop,
      export: {
        renderCustomUI: (
          elements: readonly NonDeletedExcalidrawElement[],
          appState: AppState,
        ) => {
          return (
            <ExportToExcalidrawPlus
              elements={elements}
              appState={appState}
              onError={(error) => {
                excalidrawAPI?.updateScene({
                  appState: { errorMessage: error.message },
                });
              }}
            />
          );
        },
        saveFileToDisk: !isDarwinDesktop,
      },
    };
    return canvasActions;
  };

  return (
    <div className="excalidraw-wrapper">
      {loaded ? (
        <Excalidraw
          ref={excalidrawRefCallback}
          onChange={onChange}
          isCollaborating={collabAPI?.isCollaborating()}
          initialData={initialStatePromiseRef.current.promise}
          onPointerUpdate={collabAPI?.onPointerUpdate}
          theme={theme}
          renderTopRightUI={renderTopRightUI}
          UIOptions={{
            canvasActions: getCanvasOptions(),
          }}
        />
      ) : (
        <Spinner />
      )}
      {excalidrawAPI && (
        <CollabWrapper excalidrawAPI={excalidrawAPI} user={user} />
      )}
    </div>
  );
};

declare global {
  interface Window {
    Webex: {
      Application: any;
    };
    webexInstance: any;
  }
}

const App = () => {
  return (
    <CollabContextConsumer>
      <ExcalidrawWrapper />
    </CollabContextConsumer>
  );
};
export default App;
