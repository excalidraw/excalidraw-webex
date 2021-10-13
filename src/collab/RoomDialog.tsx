import { AppState } from "@excalidraw/excalidraw/types/types";
import React, { useRef } from "react";
import { start, stop } from "../components/icons";
import { ToolButton } from "../components/ToolButton";
import { Dialog } from "../components/Dialog";
import "./RoomDialog.scss";

const RoomDialog = ({
  handleClose,
  activeRoomLink,
  onRoomCreate,
  onRoomDestroy,
  setErrorMessage,
  theme,
}: {
  handleClose: () => void;
  activeRoomLink: string;
  onRoomCreate: () => void;
  onRoomDestroy: () => void;
  setErrorMessage: (message: string) => void;
  theme: AppState["theme"];
}) => {
  const roomLinkInput = useRef<HTMLInputElement>(null);

  const selectInput = (event: React.MouseEvent<HTMLInputElement>) => {
    if (event.target !== document.activeElement) {
      event.preventDefault();
      (event.target as HTMLInputElement).select();
    }
  };

  const renderRoomDialog = () => {
    return (
      <div className="RoomDialog-modal">
        {!activeRoomLink && (
          <>
            <p>
              You can invite people to your current scene to collaborate with
              you
            </p>
            <p>
              🔒 Don't worry, the session uses end-to-end encryption, so
              whatever you draw will stay private. Not even our server will be
              able to see what you come up with
            </p>
            <div className="RoomDialog-sessionStartButtonContainer">
              <ToolButton
                className="RoomDialog-startSession"
                type="button"
                icon={start}
                title="Start Session"
                aria-label="Start Session"
                showAriaLabel={true}
                onClick={onRoomCreate}
              />
            </div>
          </>
        )}
        {activeRoomLink && (
          <>
            <p>Live-collaboration session is now in progress</p>
            <p>Share this link with anyone you want to collaborate with:</p>
            <div className="RoomDialog-linkContainer">
              <input
                value={activeRoomLink}
                readOnly={true}
                className="RoomDialog-link"
                ref={roomLinkInput}
                onPointerDown={selectInput}
              />
            </div>
            <p>
              <span role="img" aria-hidden="true" className="RoomDialog-emoji">
                {"🔒"}
              </span>
              Don't worry, the session uses end-to-end encryption, so whatever
              you draw will stay private. Not even our server will be able to
              see what you come up with
            </p>
            <p>
              Stopping the session will disconnect you from the room, but you'll
              be able to continue working with the scene, locally. Note that
              this won't affect other people, and they'll still be able to
              collaborate on their version.
            </p>
            <div className="RoomDialog-sessionStartButtonContainer">
              <ToolButton
                className="RoomDialog-stopSession"
                type="button"
                icon={stop}
                title="Stop session"
                aria-label="Stop session"
                showAriaLabel={true}
                onClick={onRoomDestroy}
              />
            </div>
          </>
        )}
      </div>
    );
  };
  return (
    <Dialog
      small
      onCloseRequest={handleClose}
      title="Live collaboration"
      theme={theme}
    >
      {renderRoomDialog()}
    </Dialog>
  );
};

export default RoomDialog;
