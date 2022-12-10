import React, { useEffect, useState } from "react";
import {
  createNewProxy,
  getAccountsByUser,
  getTokenDatabase,
} from "../../services/web3Service";
import { useStateValue } from "../../stateManagement/stateProvider.state";

import { v4 as uuidv4 } from "uuid";
import PopUp from "../popUp/popUp.component";
import { ADDRESS_TO_TOKEN } from "../../utils/constants";
import { isValidAccountName } from "../../utils/commonFunctions";

function CreateTab() {
  const [{ address }] = useStateValue();

  const [tokenAddresses, settokenAddresses] = useState([]);
  const [userAddresses, setuserAddresses] = useState([]);
  const [userAddressNames, setuserAddressNames] = useState([]);

  const [slippage, setslippage] = useState("");
  const [accountName, setaccountName] = useState("");
  const [selectedToken, setselectedToken] = useState("");
  const [selectedAddress, setselectedAddress] = useState("");
  const [selectedAddressName, setselectedAddressName] = useState("");

  const [invalidSlippage, setinvalidSlippage] = useState(false);
  const [invalidName, setinvalidName] = useState(false);

  const [newProxyAddress, setnewProxyAddress] = useState("");

  const [showPopUp, setshowPopUp] = useState(false);

  const [sendingTx, setsendingTx] = useState(false);

  useEffect(() => {
    if (!address) return;
    callWeb3Service();
  }, [address]);

  async function callWeb3Service() {
    const tokens = await getTokenDatabase(address);
    settokenAddresses([...tokens]);

    const { 0: userAddresses, 1: userAddressNames } = await getAccountsByUser(
      address
    );

    setuserAddresses([...userAddresses]);
    if (userAddresses.length) setselectedAddress(userAddresses[0]);

    setuserAddressNames([...userAddressNames]);
    if (userAddressNames.length) setselectedAddressName(userAddressNames[0]);
  }

  function handleTokenChange(e) {
    setselectedToken(e.target.value);
  }
  function handleUserAddressChange(e) {
    const addressIndex = userAddressNames.indexOf(e.target.value);

    setselectedAddress(userAddresses[addressIndex]);
    setselectedAddressName(userAddressNames[addressIndex]);
  }

  function disablePopUp() {
    setshowPopUp(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (sendingTx) return;

    setsendingTx(true);

    try {
      const tx = await createNewProxy(
        address,
        selectedToken,
        slippage,
        accountName
      );

      const newProxyAddress = tx.events[0].address;

      setnewProxyAddress(newProxyAddress);

      // for fetching the latest accounts
      callWeb3Service();

      setshowPopUp(true);
    } catch (err) {
      console.log(err.message);
    }

    setsendingTx(false);
  }

  function validateSlippageInput(e) {
    setslippage(e.target.value);

    const input = parseFloat(e.target.value);

    if (!e.target.value && e.target.value != 0) return;

    if (input < 0.01 || input > 5) {
      setinvalidSlippage(true);
    } else {
      setinvalidSlippage(false);
    }

    // check number of digits after decimals
    if (e.target.value.split(".")[1]?.length > 2) setinvalidSlippage(true);
  }

  function validateNameInput(e) {
    const input = e.target.value;

    setaccountName(input);

    if (isValidAccountName(input)) {
      setinvalidName(false);
    } else {
      setinvalidName(true);
    }

    // check number of digits after decimals
    if (e.target.value.length > 18)
      setinvalidName(true);
  }

  return (
    <>
      {showPopUp && (
        <PopUp
          message={"Account successfully created!"}
          message2={accountName && `Name: ${accountName}`}
          subMessage={newProxyAddress}
          closePopUp={disablePopUp}
        />
      )}
      <div className="form">
        <div className="field">
          <label>Select Token:</label>
          {tokenAddresses.length ? (
            <select
              name="tokens"
              id="tokens"
              className="defaultInput-Black limitWidth"
              value={selectedToken}
              onChange={handleTokenChange}
            >
              <option value="" disabled>
                - - Choose - -
              </option>
              {tokenAddresses.map((token) => (
                <option key={uuidv4()} readOnly value={token}>
                  {ADDRESS_TO_TOKEN[token] ? ADDRESS_TO_TOKEN[token] : token}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="defaultInput-Black"
              readOnly
              type="select"
              value="No account created"
            />
          )}
        </div>
        <div className="field">
          <label>Select Slippage (%):</label>
          <input
            className={`defaultInput-Black ${
              invalidSlippage && "invalid-input"
            }`}
            onChange={validateSlippageInput}
            type="number"
            placeholder="0.01-5%"
            value={slippage}
          />
        </div>
        <div className="field">
          <label>Name the Account:</label>
          <input
            className={`defaultInput-Black ${invalidName && "invalid-input"}`}
            onChange={validateNameInput}
            type="text"
            placeholder="Enter Name"
            value={accountName}
          />
        </div>
        <div className="field">
          <label>List of Accounts:</label>
          {userAddresses.length ? (
            <select
              name="tokens"
              id="tokens"
              className="defaultInput-Black limitWidth"
              value={selectedAddressName}
              onChange={handleUserAddressChange}
            >
              {userAddressNames.map((token) => (
                <option key={uuidv4()} readOnly value={token}>
                  {token}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="defaultInput-Black"
              readOnly
              type="select"
              value="No account created"
            />
          )}
        </div>
        <input
          className={`defaultInput-Black submitBtn 
          ${invalidSlippage && "disable"} 
          ${invalidName && "disable"} 
          ${!slippage && "disable"}
          ${!accountName && "disable"}
          ${!selectedToken && "disable"}`}
          readOnly
          type="submit"
          onClick={handleSubmit}
          value={sendingTx ? "Sending Transaction..." : "Create new account"}
        />
      </div>
    </>
  );
}

export default CreateTab;
