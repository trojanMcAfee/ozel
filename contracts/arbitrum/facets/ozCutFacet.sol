// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import { LibDiamond } from "../../libraries/LibDiamond.sol";
import './DiamondCutFacet.sol';
import '../AppStorage.sol';


/**
 * @title Changer of general system config
 * @notice Changes key functional parameters, on addition to the default
 * removal/addition/replacement of functions from a Diamond system.
 */
contract ozCutFacet is DiamondCutFacet {

    AppStorage s;

    /// @dev Changes the fee that the system charges per usage
    function changeDappFee(uint baseUnits_) external {
        LibDiamond.enforceIsContractOwner();
        s.dappFee = baseUnits_;
    }

    /// @dev Changes the default slippage that the system uses on non-user swaps
    function changeDefaultSlippage(uint baseUnits_) external {
        LibDiamond.enforceIsContractOwner();
        s.defaultSlippage = baseUnits_;
    }

    /// @dev Allows/Disallows redeeming OZL tokens for AUM (aka withdrawing funds)
    function enableWithdrawals(bool state_) external {
        LibDiamond.enforceIsContractOwner();
        s.isEnabled = state_;
    }

    /// @dev Changes the token used for the distribution of revenue to the owner
    function changeRevenueToken(address newToken_) external {
        LibDiamond.enforceIsContractOwner();
        s.revenueToken = newToken_;
    }

    /// @dev Changes the fee tier of the pool used on the Uniswap swaps
    function changeUniPoolFee(uint24 newPoolFee_) external {
        LibDiamond.enforceIsContractOwner();
        s.poolFee = newPoolFee_;
    }
}