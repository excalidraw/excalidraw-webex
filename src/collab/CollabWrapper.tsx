import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import { PureComponent } from "react";
import throttle from "lodash.throttle";

import { createInverseContext } from "../CreateInverseContext";
import Portal from "./Portal";
import {
  Collaborator,
  ExcalidrawImperativeAPI,
  Gesture,
} from "@excalidraw/excalidraw/types/types";
import { EVENT } from "../constants";
import RoomDialog from "./RoomDialog";
import {
  getElementMap,
  getSceneVersion,
  isInvisiblySmallElement,
} from "@excalidraw/excalidraw";
import {
  decryptAESGEM,
  generateCollaborationLinkData,
  getCollaborationLink,
  SocketUpdateDataSource,
  SOCKET_SERVER,
} from "../data";
import { ImportedDataState } from "@excalidraw/excalidraw/types/data/types";
import {
  APP_NAME,
  INITIAL_SCENE_UPDATE_TIMEOUT,
  SCENE,
  SYNC_FULL_SCENE_INTERVAL_MS,
} from "../app_constants";
import { resolvablePromise } from "../utils";

interface CollabState {
  modalIsShown: boolean;
  activeRoomLink: string;
  errorMessage: string;
  username: string;
}

type CollabInstance = InstanceType<typeof CollabWrapper>;

export interface CollabAPI {
  isCollaborating: () => boolean;
  username: CollabState["username"];
  initializeSocketClient: CollabInstance["initializeSocketClient"];
  onCollabButtonClick: CollabInstance["onCollabButtonClick"];
  broadcastElements: CollabInstance["broadcastElements"];
  onPointerUpdate: CollabInstance["onPointerUpdate"];
}

type ReconciledElements = readonly ExcalidrawElement[] & {
  _brand: "reconciledElements";
};

type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

interface Props {
  excalidrawAPI: ExcalidrawImperativeAPI;
}

const {
  Context: CollabContext,
  Consumer: CollabContextConsumer,
  Provider: CollabContextProvider,
} = createInverseContext<{ api: CollabAPI | null }>({ api: null });

export { CollabContext, CollabContextConsumer };

class CollabWrapper extends PureComponent<Props, CollabState> {
  portal: Portal;
  excalidrawAPI: Props["excalidrawAPI"];
  isCollaborating: boolean = false;

  private socketInitializationTimer?: NodeJS.Timeout;
  private lastBroadcastedOrReceivedSceneVersion: number = -1;
  private collaborators = new Map<string, Collaborator>();

  constructor(props: Props) {
    super(props);
    this.state = {
      modalIsShown: false,
      activeRoomLink: "",
      errorMessage: "",
      username: "",
    };

    this.portal = new Portal(this);
    this.excalidrawAPI = props.excalidrawAPI;
  }

  componentDidMount() {
    window.addEventListener(EVENT.UNLOAD, this.onUnload);
  }

  componentWillUnmount() {
    window.removeEventListener(EVENT.UNLOAD, this.onUnload);
  }

  private onUnload = () => {
    this.destroySocketClient({ isUnload: true });
  };

  onCollabButtonClick = () => {
    this.setState({
      modalIsShown: true,
    });
  };

  broadcastElements = (elements: readonly ExcalidrawElement[]) => {
    if (
      getSceneVersion(elements) >
      this.getLastBroadcastedOrReceivedSceneVersion()
    ) {
      this.portal.broadcastScene(
        SCENE.UPDATE,
        this.getSyncableElements(elements),
        false,
      );
      this.lastBroadcastedOrReceivedSceneVersion = getSceneVersion(elements);
      this.queueBroadcastAllElements();
    }
  };

  queueBroadcastAllElements = throttle(() => {
    this.portal.broadcastScene(
      SCENE.UPDATE,
      this.getSyncableElements(
        this.excalidrawAPI.getSceneElementsIncludingDeleted(),
      ),
      true,
    );
    const currentVersion = this.getLastBroadcastedOrReceivedSceneVersion();
    const newVersion = Math.max(
      currentVersion,
      getSceneVersion(this.getSceneElementsIncludingDeleted()),
    );
    this.setLastBroadcastedOrReceivedSceneVersion(newVersion);
  }, SYNC_FULL_SCENE_INTERVAL_MS);

  private destroySocketClient = (opts?: { isUnload: boolean }) => {
    if (!opts?.isUnload) {
      this.collaborators = new Map();
      this.excalidrawAPI.updateScene({
        collaborators: this.collaborators,
      });
      this.setState({
        activeRoomLink: "",
      });
      window.webexInstance.clearShareUrl();
      this.isCollaborating = false;
    }
    this.portal.close();
  };

  private handleRemoteSceneUpdate = (
    elements: ReconciledElements,
    { init = false }: { init?: boolean } = {},
  ) => {
    this.excalidrawAPI.updateScene({
      elements,
      commitToHistory: !!init,
    });

    // We haven't yet implemented multiplayer undo functionality, so we clear the undo stack
    // when we receive any messages from another peer. This UX can be pretty rough -- if you
    // undo, a user makes a change, and then try to redo, your element(s) will be lost. However,
    // right now we think this is the right tradeoff.
    this.excalidrawAPI.history.clear();
  };

  private initializeSocketClient = async (
    existingRoomLinkData: null | { roomId: string; roomKey: string },
  ): Promise<ImportedDataState | null> => {
    if (this.portal.socket) {
      return null;
    }

    let roomId;
    let roomKey;

    if (existingRoomLinkData) {
      ({ roomId, roomKey } = existingRoomLinkData);
    } else {
      ({ roomId, roomKey } = await generateCollaborationLinkData());
      window.history.pushState(
        {},
        APP_NAME,
        getCollaborationLink({ roomId, roomKey }),
      );
    }
    const scenePromise = resolvablePromise<ImportedDataState | null>();

    this.isCollaborating = true;

    const { default: socketIOClient }: any = await import(
      /* webpackChunkName: "socketIoClient" */ "socket.io-client"
    );

    this.portal.open(socketIOClient(SOCKET_SERVER), roomId, roomKey);

    if (existingRoomLinkData) {
      this.excalidrawAPI.resetScene();
    } else {
      const elements = this.excalidrawAPI.getSceneElements();
      // remove deleted elements from elements array & history to ensure we don't
      // expose potentially sensitive user data in case user manually deletes
      // existing elements (or clears scene), which would otherwise be persisted
      // to database even if deleted before creating the room.
      this.excalidrawAPI.history.clear();
      this.excalidrawAPI.updateScene({
        elements,
        commitToHistory: true,
      });
    }

    // fallback in case you're not alone in the room but still don't receive
    // initial SCENE_UPDATE message
    this.socketInitializationTimer = setTimeout(() => {
      this.initializeSocket();
      scenePromise.resolve(null);
    }, INITIAL_SCENE_UPDATE_TIMEOUT);

    // All socket listeners are moving to Portal
    this.portal.socket!.on(
      "client-broadcast",
      async (encryptedData: ArrayBuffer, iv: Uint8Array) => {
        if (!this.portal.roomKey) {
          return;
        }
        const decryptedData = await decryptAESGEM(
          encryptedData,
          this.portal.roomKey,
          iv,
        );

        switch (decryptedData.type) {
          case "INVALID_RESPONSE":
            return;
          case SCENE.INIT: {
            if (!this.portal.socketInitialized) {
              this.initializeSocket();
              const remoteElements = decryptedData.payload.elements;
              const reconciledElements = this.reconcileElements(remoteElements);
              this.handleRemoteSceneUpdate(reconciledElements, {
                init: true,
              });
              // noop if already resolved via init from firebase
              scenePromise.resolve({
                elements: reconciledElements,
                scrollToContent: true,
              });
            }
            break;
          }
          case SCENE.UPDATE:
            this.handleRemoteSceneUpdate(
              this.reconcileElements(decryptedData.payload.elements),
            );
            break;
          case "MOUSE_LOCATION": {
            const { pointer, button, username, selectedElementIds } =
              decryptedData.payload;
            const socketId: SocketUpdateDataSource["MOUSE_LOCATION"]["payload"]["socketId"] =
              decryptedData.payload.socketId ||
              // @ts-ignore legacy, see #2094 (#2097)
              decryptedData.payload.socketID;

            const collaborators = new Map(this.collaborators);
            const user = collaborators.get(socketId) || {}!;
            user.pointer = pointer;
            user.button = button;
            user.selectedElementIds = selectedElementIds;
            user.username = username;
            collaborators.set(socketId, user);
            this.excalidrawAPI.updateScene({
              collaborators,
            });
            break;
          }
          case "IDLE_STATUS": {
            const { userState, socketId, username } = decryptedData.payload;
            const collaborators = new Map(this.collaborators);
            const user = collaborators.get(socketId) || {}!;
            user.userState = userState;
            user.username = username;
            this.excalidrawAPI.updateScene({
              collaborators,
            });
            break;
          }
        }
      },
    );

    this.portal.socket!.on("first-in-room", () => {
      if (this.portal.socket) {
        this.portal.socket.off("first-in-room");
      }
      this.initializeSocket();
      scenePromise.resolve(null);
    });

    this.setState(
      {
        activeRoomLink: window.location.href,
      },
      () => {
        window.webexInstance.setShareUrl(this.state.activeRoomLink);
      },
    );

    return scenePromise;
  };

  private initializeSocket = () => {
    this.portal.socketInitialized = true;
    clearTimeout(this.socketInitializationTimer!);
  };

  private reconcileElements = (
    elements: readonly ExcalidrawElement[],
  ): ReconciledElements => {
    const currentElements = this.getSceneElementsIncludingDeleted();
    // create a map of ids so we don't have to iterate
    // over the array more than once.
    const localElementMap = getElementMap(currentElements);

    const appState = this.excalidrawAPI.getAppState();

    // Reconcile
    const newElements: readonly ExcalidrawElement[] = elements
      .reduce((elements, element) => {
        // if the remote element references one that's currently
        // edited on local, skip it (it'll be added in the next step)
        if (
          element.id === appState.editingElement?.id ||
          element.id === appState.resizingElement?.id ||
          element.id === appState.draggingElement?.id
        ) {
          return elements;
        }

        if (
          localElementMap.hasOwnProperty(element.id) &&
          localElementMap[element.id].version > element.version
        ) {
          elements.push(localElementMap[element.id]);
          delete localElementMap[element.id];
        } else if (
          localElementMap.hasOwnProperty(element.id) &&
          localElementMap[element.id].version === element.version &&
          localElementMap[element.id].versionNonce !== element.versionNonce
        ) {
          // resolve conflicting edits deterministically by taking the one with the lowest versionNonce
          if (localElementMap[element.id].versionNonce < element.versionNonce) {
            elements.push(localElementMap[element.id]);
          } else {
            // it should be highly unlikely that the two versionNonces are the same. if we are
            // really worried about this, we can replace the versionNonce with the socket id.
            elements.push(element);
          }
          delete localElementMap[element.id];
        } else {
          elements.push(element);
          delete localElementMap[element.id];
        }

        return elements;
      }, [] as Mutable<typeof elements>)
      // add local elements that weren't deleted or on remote
      .concat(...Object.values(localElementMap));

    // Avoid broadcasting to the rest of the collaborators the scene
    // we just received!
    // Note: this needs to be set before updating the scene as it
    // synchronously calls render.
    this.setLastBroadcastedOrReceivedSceneVersion(getSceneVersion(newElements));

    return newElements as ReconciledElements;
  };

  openPortal = async () => {
    return this.initializeSocketClient(null);
  };

  closePortal = () => {
    window.history.pushState({}, APP_NAME, window.location.origin);
    this.destroySocketClient();
  };

  getSyncableElements = (elements: readonly ExcalidrawElement[]) =>
    elements.filter((el) => el.isDeleted || !isInvisiblySmallElement(el));

  public setLastBroadcastedOrReceivedSceneVersion = (version: number) => {
    this.lastBroadcastedOrReceivedSceneVersion = version;
  };

  public getLastBroadcastedOrReceivedSceneVersion = () => {
    return this.lastBroadcastedOrReceivedSceneVersion;
  };

  public getSceneElementsIncludingDeleted = () => {
    return this.excalidrawAPI.getSceneElementsIncludingDeleted();
  };

  onPointerUpdate = (payload: {
    pointer: SocketUpdateDataSource["MOUSE_LOCATION"]["payload"]["pointer"];
    button: SocketUpdateDataSource["MOUSE_LOCATION"]["payload"]["button"];
    pointersMap: Gesture["pointers"];
  }) => {
    payload.pointersMap.size < 2 &&
      this.portal.socket &&
      this.portal.broadcastMouseLocation(payload);
  };

  setCollaborators(sockets: string[]) {
    this.setState((state) => {
      const collaborators: InstanceType<typeof CollabWrapper>["collaborators"] =
        new Map();
      for (const socketId of sockets) {
        if (this.collaborators.has(socketId)) {
          collaborators.set(socketId, this.collaborators.get(socketId)!);
        } else {
          collaborators.set(socketId, {});
        }
      }
      this.collaborators = collaborators;
      this.excalidrawAPI.updateScene({ collaborators });
    });
  }

  private contextValue: CollabAPI | null = null;

  getContextValue = (): CollabAPI => {
    if (!this.contextValue) {
      this.contextValue = {} as CollabAPI;
    }

    this.contextValue.isCollaborating = () => this.isCollaborating;
    this.contextValue.onPointerUpdate = this.onPointerUpdate;
    this.contextValue.initializeSocketClient = this.initializeSocketClient;
    this.contextValue.onCollabButtonClick = this.onCollabButtonClick;
    this.contextValue.broadcastElements = this.broadcastElements;
    return this.contextValue;
  };

  render() {
    const { activeRoomLink, modalIsShown } = this.state;

    return (
      <>
        {modalIsShown && (
          <RoomDialog
            handleClose={() => this.setState({ modalIsShown: false })}
            activeRoomLink={activeRoomLink}
            onRoomCreate={this.openPortal}
            onRoomDestroy={this.closePortal}
            setErrorMessage={(errorMessage: string) => {
              this.setState({ errorMessage });
            }}
            theme={this.excalidrawAPI.getAppState().theme}
          />
        )}
        <CollabContextProvider
          value={{
            api: this.getContextValue(),
          }}
        />
      </>
    );
  }
}

export default CollabWrapper;
