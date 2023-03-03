// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import { TradeOps } from '../../arbitrum/AppStorage.sol';
import '../../libraries/LibDiamond.sol';


interface IOZLFacetV1_2 {

    /**
     * @dev Adds a new token to be swapped into to the token database
     * @param newSwap_ Swap Curve config -as infra- that will allow swapping into the new token
     * @param token_ L1 & L2 addresses of the token to add
     */
    function addTokenToDatabase(
        TradeOps calldata newSwap_, 
        LibDiamond.Token calldata token_
    ) external;


    /**
     * @dev Removes a token from the token database
     * @param swapToRemove_ Remove the swap Curve config that allows swapping into
     * the soon-to-be-removed token.
     * @param token_ L1 & L2 addresses of the token to add
     */
    function removeTokenFromDatabase(
        TradeOps calldata swapToRemove_, 
        LibDiamond.Token calldata token_
    ) external;
}