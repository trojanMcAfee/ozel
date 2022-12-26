// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.14;


import '@rari-capital/solmate/src/utils/FixedPointMathLib.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import { LibDiamond } from "../../libraries/LibDiamond.sol";
import { ModifiersARB } from '../Modifiers.sol';
import '../../Errors.sol';
import './oz20Facet.sol';


/**
 * @title Custom implementation of Solmate's ERC4626 (https://github.com/Rari-Capital/solmate/blob/main/src/mixins/ERC4626.sol)
 * @notice As with oz20Facet, a new version was created to fit the architecture
 * of the system.
 */
contract oz4626Facet is ModifiersARB { 

    using FixedPointMathLib for uint256;
    using Address for address;
    

    event Deposit(address indexed caller, address indexed owner, uint256 assets);

    event Withdraw(
        address indexed caller,
        address indexed receiver,
        address indexed owner,
        uint256 assets,
        uint256 shares
    );


    /*///////////////////////////////////////////////////////////////
                            Funding logic
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Forwards the amount transferred and the user to the methods in charge of
     * the OZL rebase.
     * @param assets ETH transferred to the account (which is actually WETH)
     * @param receiver User
     * @param lockNum_ Index of the bit which authorizes the function call
     */
    function deposit(
        uint assets, 
        address receiver,
        uint lockNum_
    ) external payable isAuthorized(lockNum_) noReentrancy(1) {
        //Mutex bitmap lock
        _toggleBit(1, 1); 

        bytes memory data = abi.encodeWithSignature(
            'updateExecutorState(uint256,address,uint256)', 
            assets, receiver, 1
        );

        LibDiamond.callFacet(data);

        emit Deposit(msg.sender, receiver, assets);
    }


    /**
     * @notice Redeemption of AUM
     * @dev Calls for the calculations of how much funds the user will receive in
     * regards to the amount of OZL tokens held.
     * @param shares Amount of OZL tokens
     * @param receiver Receiver of assets
     * @param owner Address that holds shares
     * @param lockNum_ Index of the bit which authorizes the function call
     * @return assets (Redeemed) Funds from AUM for the receiver
     */
    function redeem(
        uint shares,
        address receiver,
        address owner,
        uint lockNum_
    ) external isAuthorized(lockNum_) noReentrancy(6) returns (uint256 assets) {
        require((assets = previewRedeem(shares)) != 0, "ZERO_ASSETS");

        //Mutex bitmap lock
        _toggleBit(1, 4);

        bytes memory data = abi.encodeWithSignature(
            'burn(address,uint256,uint256)', 
            owner, shares, 4
        );

        LibDiamond.callFacet(data);

        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    /*///////////////////////////////////////////////////////////////
                           Accounting Logic
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Calculates the amount of assets to receive based on an OZL balance
     * @param shares OZL balance
     * @return assets (Redeemed) Funds to receive
     */
    function convertToAssets(uint256 shares) public view returns (uint256) { 
        uint vaultBalance = IERC20(s.yTriPool).balanceOf(address(this));
        uint assets = shares.mulDivDown(vaultBalance, 100 * 1 ether); 
        return assets;
    }

    /// @dev Previews the amount of funds from AUM to receive
    function previewRedeem(uint256 shares) public view returns (uint256) {
        return convertToAssets(shares);
    }

    /*///////////////////////////////////////////////////////////////
                        Funding limit logic
    //////////////////////////////////////////////////////////////*/

    function maxDeposit() public pure returns (uint256) { 
        return type(uint256).max;
    }

    function maxWithdraw(address owner) public view returns (uint256) {
        return convertToAssets(maxRedeem(owner));
    }

    function maxRedeem(address owner) public view returns (uint256) {
        return oz20Facet(s.oz20).balanceOf(owner);
    }
}