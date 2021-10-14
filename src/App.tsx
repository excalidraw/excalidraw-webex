import Excalidraw from "@excalidraw/excalidraw";
import {
  AppState,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types/types";
import { useContext, useEffect, useRef, useState } from "react";

import CollabWrapper, {
  CollabAPI,
  CollabContext,
  CollabContextConsumer,
} from "./collab/CollabWrapper";
import { useCallbackRefState } from "./hooks/useCallbackRefState";

import "./App.css";
import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import { ImportedDataState } from "@excalidraw/excalidraw/types/data/types";
import { getCollaborationLinkData } from "./data";
import { ResolvablePromise } from "@excalidraw/excalidraw/types/utils";
import { loadScript, resolvablePromise } from "./utils";
import { WEBEX_URL } from "./constants";

const ExcalidrawWrapper = () => {
  const [excalidrawAPI, excalidrawRefCallback] =
    useCallbackRefState<ExcalidrawImperativeAPI>();
  const collabAPI = useContext(CollabContext)?.api;

  const initialStatePromiseRef = useRef<{
    promise: ResolvablePromise<ImportedDataState | null>;
  }>({ promise: null! });

  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState({});
  const [theme, setTheme] = useState<"light" | "dark">("light");

  if (!initialStatePromiseRef.current.promise) {
    initialStatePromiseRef.current.promise =
      resolvablePromise<ImportedDataState | null>();
  }

  useEffect(() => {
    loadScript(WEBEX_URL).then(() => {
      initializeWebex();
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!collabAPI || !excalidrawAPI) {
      return;
    }

    initializeScene({ collabAPI }).then((scene) => {
      initialStatePromiseRef.current.promise.resolve(scene);
    });
  }, [collabAPI, excalidrawAPI]);

  const initializeWebex = () => {
    window.webexInstance = new window.Webex.Application();
    const webexApp = window.webexInstance;
    const currentUserTheme = webexApp.theme;
    if (currentUserTheme !== theme) {
      setTheme(currentUserTheme);
    }
    webexApp.onReady().then(() => {
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
          setTheme(theme.toLowerCase() as "light" | "dark");
        });
      });
    });
  };

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
  if (!loaded) {
    return null;
  }
  return (
    <div className="excalidraw-wrapper">
      <Excalidraw
        ref={excalidrawRefCallback}
        onChange={onChange}
        onCollabButtonClick={collabAPI?.onCollabButtonClick}
        isCollaborating={collabAPI?.isCollaborating()}
        initialData={initialStatePromiseRef.current.promise}
        onPointerUpdate={collabAPI?.onPointerUpdate}
        theme={theme}
      />
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
