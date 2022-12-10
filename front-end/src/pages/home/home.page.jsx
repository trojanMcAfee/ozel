import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useLocalStorage from "../../hooks/useLocalStorage";
import {
  getAUMValue,
  getTotalVolumeInETH,
  getTotalVolumeInUSD,
} from "../../services/web3Service";
import { useStateValue } from "../../stateManagement/stateProvider.state";

import "./home.styles.scss";

function Home() {
  const [] = useLocalStorage("login");

  const [{ address }] = useStateValue();

  const [aumVol, setaumVol] = useState(0);
  const [usdVol, setusdVol] = useState(0);
  const [ethVol, setethVol] = useState(0);

  async function callWeb3Service() {
    let usdVol = await getTotalVolumeInUSD();
    let ethVol = await getTotalVolumeInETH();
    let aum = await getAUMValue();

    if (aum.includes(".")) {
      aum = aum.split(".")[0] + "."+ aum.split(".")[1].slice(0, 2);
    }
    if (ethVol.includes(".")) {
      ethVol = ethVol.split(".")[0] + "."+ ethVol.split(".")[1].slice(0, 2);
    }
    if (usdVol.includes(".")) {
      usdVol = usdVol.split(".")[0] + "."+ usdVol.split(".")[1].slice(0, 2);
    }

    setaumVol(aum);
    setusdVol(ethVol);
    setethVol(usdVol);
  }

  useEffect(() => {
    callWeb3Service();
  }, []);

  return (
    <div className="home">
      <Link to="/app" className="launch_btn">
        Launch App
      </Link>
      <div className="home_logo"></div>
      <div className="home_vol">
        <div className="vol">
          <h1>AUM (USD)</h1>
          <h2>{aumVol ? aumVol : "Loading..."}</h2>
        </div>
        <div className="vol">
          <h1>TOTAL VOLUME ($) - (ETH)</h1>
          <h2>{usdVol && ethVol ? `${usdVol}-${ethVol}` : "Loading..."}</h2>
        </div>
      </div>
    </div>
  );
}

export default Home;
