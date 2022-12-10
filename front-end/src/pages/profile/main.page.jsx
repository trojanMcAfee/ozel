import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ControlModule from "../../components/controlModule/controlModule.component";
import MetamaskWalletBtn from "../../components/metamaskWalletBtn/connectMetamask.component";
// import useLocalStorage from "../../hooks/useLocalStorage";
import { balanceOf, getOzelBalances } from "../../services/web3Service";
import { useStateValue } from "../../stateManagement/stateProvider.state";

import { v4 as uuidv4 } from "uuid";

import "./main.styles.scss";
import PopUp from "../../components/popUp/popUp.component";
import { GOERLI_CHAIN_ID, MAINNET_CHAIND_ID } from "../../utils/constants";

function Main() {
  const [{ address }] = useStateValue();
  const [ozelBalance, setozelBalance] = useState(0);
  const [ozelBalanceUsd, setozelBalanceUsd] = useState(0);
  const [ozelBalanceWeth, setozelBalanceWeth] = useState(0);

  const [showPopUp, setshowPopUp] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    callWeb3Service();
  }, [address]);

  useEffect(() => {
    setTimeout(()=>{
         if (
           window.ethereum.chainId != MAINNET_CHAIND_ID &&
           window.ethereum.chainId != GOERLI_CHAIN_ID
         ) {
           setshowPopUp(true);
         }

         window.ethereum.on("chainChanged", (chain) => {
           if (chain != MAINNET_CHAIND_ID && chain != GOERLI_CHAIN_ID) {
             setshowPopUp(true);
           } else {
             setshowPopUp(false);
           }
         });
    },500)
  }, []);

  async function callWeb3Service() {
    if (!address){
      setozelBalance(0)
      setozelBalanceUsd(0)
      setozelBalanceWeth(0)
      return
    };

    const ozelBalance = await balanceOf(address);
    setozelBalance(ozelBalance);

    const [ozelBalanceWeth, ozelBalanceUsd] = await getOzelBalances(address);
    setozelBalanceWeth(ozelBalanceWeth);
    setozelBalanceUsd(ozelBalanceUsd);
  }

  function handleHamChange(e) {
    const event = e.target.value;

    if (event == "Home") {
      navigate("/");
    }

    if (event == "Docs") {
      window.open("https://www.google.com", "_blank", "noopener,noreferrer");
      //  navigate("https://www.google.com");
    }
  }

  return (
    <div className="mainPage">
      {showPopUp && (
        <PopUp
          message="Please connect through Ethereum Mainnet or Goerli"
          showClosePopUp={false}
        />
      )}
      <div className="metamask_ham">
        <MetamaskWalletBtn />
        <select
          name="tokens"
          id="tokens"
          className="defaultInput"
          onChange={handleHamChange}
        >
          <option key={uuidv4()} value={"..."}>
            &#8226;&#8226;&#8226;
          </option>
          <option key={uuidv4()} value={"Docs"}>
            Docs
          </option>
          <option key={uuidv4()} value={"Home"}>
            Home
          </option>
        </select>
      </div>
      <div className="info">
        <div className="field">
          <input
            disabled
            className="defaultInput"
            type="text"
            value={ozelBalance ? ozelBalance : ""}
          />
          <label className="defaultBtn">OZL Balance</label>
        </div>
        <div className="field">
          <input
            disabled
            className="defaultInput"
            type="text"
            value={ozelBalanceUsd ? ozelBalanceUsd : ""}
          />
          <label className="defaultBtn">in USD</label>
        </div>
        <div className="field">
          <input
            disabled
            className="defaultInput"
            type="text"
            value={ozelBalanceWeth ? ozelBalanceWeth : ""}
          />
          <label className="defaultBtn">In ETH</label>
        </div>
      </div>
      <ControlModule />
    </div>
  );
}

export default Main;
