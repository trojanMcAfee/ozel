import React, { useEffect, useState } from "react";
import { useStateValue } from "../../stateManagement/stateProvider.state";
import ChangeTab from "../changeTab/changeTab.component";
import CreateTab from "../createTab/createTab.component";
import StatsTab from "../statsTab/statsTab.component";

import "./controlModule.styles.scss";

function ControlModule() {
  const [{ address }] = useStateValue();

  const [createSelected, setcreateSelected] = useState(true);
  const [changeSelected, setchangeSelected] = useState(false);
  const [statsSelected, setstatsSelected] = useState(false);


  function selectCreate() {
    setcreateSelected(true);
    setchangeSelected(false);
    setstatsSelected(false);
  }

  function selectChange() {
    setcreateSelected(false);
    setchangeSelected(true);
    setstatsSelected(false);
  }

  function selectStats() {
    setcreateSelected(false);
    setchangeSelected(false);
    setstatsSelected(true);
  }

  return (
    <div className={`controlModule ${!address && "disable"}`}>
      <div className="moduleContainer">
        <div className="moduleTabs">
          <div
            className={`tab ${createSelected ? "activeTab" : ""}`}
            onClick={selectCreate}
          >
            Create
          </div>
          <div
            className={`tab ${changeSelected ? "activeTab" : ""}`}
            onClick={selectChange}
          >
            Change
          </div>
          <div
            className={`tab ${statsSelected ? "activeTab" : ""}`}
            onClick={selectStats}
          >
            Stats
          </div>
        </div>
        <div className="moduleBody">
          {createSelected && <CreateTab/>}
          {changeSelected && <ChangeTab/>}
          {statsSelected && <StatsTab/>}
        </div>
      </div>
    </div>
  );
}

export default ControlModule;
