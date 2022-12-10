import React, { useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { AiOutlineCopy } from "react-icons/ai";

import "./clipboard.styles.scss";

function Clipboard({ textToCopy = "" }) {
  const [showCopied, setshowCopied] = useState(false);

  function showit() {
    setshowCopied(true);
    setTimeout(() => {
      setshowCopied(false);
    }, 500);
  }

  if (!textToCopy) return;

  return (
    <CopyToClipboard text={textToCopy} onCopy={showit}>
      <div className="clipboard defaultInput-Black">
        <span>
          {textToCopy.slice(0, 6)}...{textToCopy.slice(-6)}
        </span>
        <AiOutlineCopy size={25} />
       { showCopied && <h3>Copied!</h3>}
      </div>
    </CopyToClipboard>
  );
}

export default Clipboard;
