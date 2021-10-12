import Excalidraw from "aakansha-excalidraw";
import {
  AppState,
  ExcalidrawImperativeAPI,
} from "aakansha-excalidraw/types/types";
import { useContext, useEffect, useRef } from "react";

import CollabWrapper, {
  CollabAPI,
  CollabContext,
  CollabContextConsumer,
} from "./collab/CollabWrapper";
import { useCallbackRefState } from "./hooks/useCallbackRefState";

import "./App.css";
import { ExcalidrawElement } from "aakansha-excalidraw/types/element/types";
import { ImportedDataState } from "aakansha-excalidraw/types/data/types";
import { getCollaborationLinkData } from "./data";
import { ResolvablePromise } from "aakansha-excalidraw/types/utils";
import { resolvablePromise } from "./utils";

const ExcalidrawWrapper = () => {
  const [excalidrawAPI, excalidrawRefCallback] =
    useCallbackRefState<ExcalidrawImperativeAPI>();
  const collabAPI = useContext(CollabContext)?.api;

  const initialStatePromiseRef = useRef<{
    promise: ResolvablePromise<ImportedDataState | null>;
  }>({ promise: null! });
  if (!initialStatePromiseRef.current.promise) {
    initialStatePromiseRef.current.promise =
      resolvablePromise<ImportedDataState | null>();
  }

  useEffect(() => {
    if (!collabAPI || !excalidrawAPI) {
      return;
    }

    initializeScene({ collabAPI }).then((scene) => {
      initialStatePromiseRef.current.promise.resolve(scene);
    });
  });

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
  return (
    <div className="excalidraw-wrapper">
      <Excalidraw
        ref={excalidrawRefCallback}
        onChange={onChange}
        onCollabButtonClick={collabAPI?.onCollabButtonClick}
        isCollaborating={collabAPI?.isCollaborating()}
        initialData={initialStatePromiseRef.current.promise}
        onPointerUpdate={collabAPI?.onPointerUpdate}
      />
      {excalidrawAPI && <CollabWrapper excalidrawAPI={excalidrawAPI} />}
    </div>
  );
};

declare global {
  interface Window {
    Webex: {
      Application: any;
    };
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
