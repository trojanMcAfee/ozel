// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import { ModifiersARB } from '../../Modifiers.sol';
import '../../../libraries/LibDiamond.sol';
import '../../../libraries/LibCommon.sol';
import '../../../Errors.sol';


/**
 * @title Upgraded OZLFacet for account methods
 * @notice It adds the ability to add/remove tokens from the token database array,
 * which is used in the front end. 
 */
contract OZLFacetV1_2 is ModifiersARB {

    event NewToken(address token);
    event TokenRemoved(address token);

    
    function addTokenToDatabase(
        TradeOps calldata newSwap_, 
        LibDiamond.Token calldata token_
    ) external { 
        LibDiamond.enforceIsContractOwner();
        address l2Address = token_.l2Address;
        address l1Address = token_.l1Address;

        if (s.tokenDatabase[l2Address]) revert TokenAlreadyInDatabase(l2Address);
        if (!s.l1Check && l1Address != s.nullAddress) revert L1TokenDisabled(l1Address);

        s.tokenDatabase[l2Address] = true;
        s.tokenL1ToTokenL2[l1Address] = l2Address;
        s.swaps.push(newSwap_);
        s.tokenDatabaseArray.push(l2Address);

        emit NewToken(l2Address);
    }

    function removeTokenFromDatabase(
        TradeOps calldata swapToRemove_, 
        LibDiamond.Token calldata token_
    ) external {
        LibDiamond.enforceIsContractOwner();
        address l2Address = token_.l2Address;
        if(!s.tokenDatabase[l2Address] && _l1TokenCheck(l2Address)) revert TokenNotInDatabase(l2Address);

        s.tokenDatabase[l2Address] = false;
        s.tokenL1ToTokenL2[token_.l1Address] = s.nullAddress;
        LibCommon.remove(s.swaps, swapToRemove_);
        _removeFromArr(l2Address);

        emit TokenRemoved(l2Address);
    }


    function _removeFromArr(address l2Address_) private {
        for (uint i=0; i < s.tokenDatabaseArray.length; i++) {
            if (s.tokenDatabaseArray[i] == l2Address_) {
                s.tokenDatabaseArray[i];
                s.tokenDatabaseArray[i] = s.tokenDatabaseArray[s.tokenDatabaseArray.length - 1];
                delete s.tokenDatabaseArray[s.tokenDatabaseArray.length - 1];
                s.tokenDatabaseArray.pop();
            }
        }
    }
}