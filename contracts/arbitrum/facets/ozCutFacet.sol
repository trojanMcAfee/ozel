// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import { LibDiamond } from "../../libraries/LibDiamond.sol";
import './DiamondCutFacet.sol';
import '../AppStorage.sol';



contract ozCutFacet is DiamondCutFacet {

    AppStorage s;


    function changeDappFee(uint baseUnits_) external {
        LibDiamond.enforceIsContractOwner();
        s.dappFee = baseUnits_;
    }

    function changeDefaultSlippage(uint baseUnits_) external {
        LibDiamond.enforceIsContractOwner();
        s.defaultSlippage = baseUnits_;
    }

    function enableWithdrawals(bool state_) external {
        LibDiamond.enforceIsContractOwner();
        s.isEnabled = state_;
    }

    function changeRevenueToken(address newToken_) external {
        LibDiamond.enforceIsContractOwner();
        s.revenueToken = newToken_;
    }

    function changeUniPoolFee(uint24 newPoolFee_) external {
        LibDiamond.enforceIsContractOwner();
        s.poolFee = newPoolFee_;
    }
}