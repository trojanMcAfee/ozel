// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import { LibDiamond } from "../../libraries/LibDiamond.sol";
import '../../libraries/AddressAliasHelper.sol';
import './DiamondCutFacet.sol';
import '../AppStorage.sol';

import 'hardhat/console.sol';
/**
 * @title Changer of general system config
 * @notice Changes key functional parameters, on addition to the default
 * removal/addition/replacement of functions from a Diamond system.
 */
contract ozCutFacet is DiamondCutFacet {

    AppStorage s;

    event newDappFee(uint newFee);
    event newDefaultSlippage(uint newSlippage);
    event newWithdrawalStatus(bool status);
    event newRevenueToken(address newToken);
    event newUniPoolFee(uint24 newPoolFee);
    event l1CheckChanged(bool newState);

    /// @dev Changes the fee that the system charges per usage
    function changeProtocolFee(uint bps_) external {
        LibDiamond.enforceIsContractOwner();
        s.protocolFee = bps_;
        emit newDappFee(bps_);
    }

    /// @dev Changes the default slippage that the system uses on non-user swaps
    function changeDefaultSlippage(uint bps_) external {
        LibDiamond.enforceIsContractOwner();
        s.defaultSlippage = bps_;
        emit newDefaultSlippage(bps_);
    }

    /// @dev Allows/Disallows redeeming OZL tokens for AUM (aka withdrawing funds)
    function enableWithdrawals(bool state_) external {
        LibDiamond.enforceIsContractOwner();
        s.isEnabled = state_;
        emit newWithdrawalStatus(state_);
    }

    /// @dev Changes the token used for the distribution of revenue to the owner
    function changeRevenueToken(address newToken_) external {
        LibDiamond.enforceIsContractOwner();
        s.revenueToken = newToken_;
        emit newRevenueToken(newToken_);
    }

    /// @dev Changes the fee tier of the pool used on the Uniswap swaps
    function changeUniPoolFee(uint24 newPoolFee_) external {
        LibDiamond.enforceIsContractOwner();
        s.poolFee = newPoolFee_;
        emit newUniPoolFee(newPoolFee_);
    }

    /**
     * @dev Enables/disables the check for an L1 account token in
     *      the entry call on exchangeToAccountToken of OZLFacet
     */
    function changeL1Check(bool newState_) external {
        LibDiamond.enforceIsContractOwner();
        s.l1Check = newState_;
        emit l1CheckChanged(newState_);
    }

    /**
     * @dev Enables/disables if caller_ can call exchangeToAccountToken
     */
    function setAuthorizedCaller(address caller_, bool newStatus_) external {
        LibDiamond.enforceIsContractOwner();
        address aliasAddr = AddressAliasHelper.applyL1ToL2Alias(caller_);
        console.log('.');
        console.log('caller: ', caller_);
        console.log('alias: ', aliasAddr);
        address x = AddressAliasHelper.undoL1ToL2Alias(aliasAddr);
        console.log('should be like caller: ', x);
        s.isAuthorized[aliasAddr] = newStatus_;
        console.log('should be true: ', s.isAuthorized[aliasAddr]);
        console.log('.');
    }
}