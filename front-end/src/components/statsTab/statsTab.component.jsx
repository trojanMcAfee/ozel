import React, { useEffect, useState } from "react";
import {
  getAccountsByUser,
  getAccountPayments,
  getAccountDetails,
} from "../../services/web3Service";
import { useStateValue } from "../../stateManagement/stateProvider.state";

import { v4 as uuidv4 } from "uuid";
import { ADDRESS_TO_TOKEN } from "../../utils/constants";
import Clipboard from "../clipboard/clipboard.component";

function StatsTab() {
  const [{ address }] = useStateValue();

  const [userAddresses, setuserAddresses] = useState([]);
  const [userAddressNames, setuserAddressNames] = useState([]);

  const [slippage, setslippage] = useState("");
  const [selectedAddress, setselectedAddress] = useState("");
  const [selectedAddressName, setselectedAddressName] = useState("");
  const [token, setuserToken] = useState("");
  const [totalPayment, settotalPayment] = useState("");

  useEffect(() => {
    if (!address) return;
    callWeb3Service();
  }, [address]);

  useEffect(() => {
    if (!selectedAddress) return;
    onAddressChange();
  }, [selectedAddress]);

  async function callWeb3Service() {
    let { 0: userAddresses, 1: userAddressNames } = await getAccountsByUser(
      address
    );

    setuserAddresses([...userAddresses]);
    if (userAddresses.length) setselectedAddress(userAddresses[0]);

    // to prevent same name;
    userAddressNames = userAddressNames.map((item,i )=> item + `_${i}`);

    setuserAddressNames([...userAddressNames]);
    if (userAddressNames.length) setselectedAddressName(userAddressNames[0]);
  }

  async function onAddressChange() {
    let payment = await getAccountPayments(selectedAddress);
   
    if (payment.includes(".")) {
      payment = payment.split(".")[0] + "." + payment.split(".")[1].slice(0, 5);
    }
    
    settotalPayment(payment);

    const userDetials = await getAccountDetails(selectedAddress);

    setslippage(userDetials.slippage / 100);
    setuserToken(userDetials.token);
  }

  function handleUserAddressChange(e) {
    const addressIndex =  userAddressNames.indexOf(e.target.value);

    setselectedAddress(userAddresses[addressIndex]);
    setselectedAddressName(userAddressNames[addressIndex]);
  }

  return (
    <div className="form">
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
                {token.split("_")[0]}
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
      {selectedAddress && (
        <div className="field">
          <label>Raw Account:</label>
          <Clipboard textToCopy={selectedAddress} />
        </div>
      )}
      <div className="field">
        <label>Total Payments (ETH):</label>
        <input
          className={`defaultInput-Black`}
          readOnly
          type="number"
          placeholder="Payment will appear here"
          value={totalPayment}
        />
      </div>
      <div className="field">
        <label>Token Of Account:</label>
        <input
          className="defaultInput-Black"
          readOnly
          type="text"
          placeholder="User token will appear here"
          value={
            ADDRESS_TO_TOKEN[token]
              ? ADDRESS_TO_TOKEN[token]
              : token
          }
        />
      </div>
      <div className="field">
        <label>Slippage of Account (%):</label>
        <input
          className="defaultInput-Black"
          placeholder="Slippage will appear here"
          readOnly
          type="text"
          value={slippage}
        />
      </div>
    </div>
  );
}

export default StatsTab;
