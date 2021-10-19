import React from "react";

import "./Spinner.scss";

const Spinner = ({
  size = "2em",
  circleWidth = 12,
}: {
  size?: string | number;
  circleWidth?: number;
}) => {
  return (
    <div className="excalidraw Spinner">
      <svg viewBox="0 0 100 100" style={{ width: size, height: size }}>
        <circle
          cx="50"
          cy="50"
          r={50 - circleWidth / 2}
          strokeWidth={circleWidth}
          fill="none"
          strokeMiterlimit="10"
        />
      </svg>
    </div>
  );
};

export default Spinner;
