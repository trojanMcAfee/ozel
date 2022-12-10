import React from "react";

import "./popUp.styes.scss";

function PopUp({
  message = "",
  message2 = "",
  subMessage = "",
  closePopUp,
  showClosePopUp = true,
}) {
  return (
    <div className="popUp">
      <h2>{message ? message : "This is the default message"}</h2>
      <h2>{message2}</h2>
      <h3>{subMessage}</h3>
      {showClosePopUp && (
        <button className="defaultInput" onClick={closePopUp}>
          Close
        </button>
      )}
    </div>
  );
}

export default PopUp;
