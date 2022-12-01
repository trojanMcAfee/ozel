// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import '@rari-capital/solmate/src/utils/FixedPointMathLib.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/Context.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import { LibDiamond } from "../../libraries/LibDiamond.sol";
import { ModifiersARB } from '../../Modifiers.sol';
import '../../Errors.sol';


/**
 * @title Custom implementation of OpenZeppelin's ERC20 contract.
 * @notice A new version was made, instead of inheriting from the original 
 * and overriding methods, since a new storage layout was needed in order  
 * to fit the architecture of the whole system. 
 */
contract oz20Facet is ModifiersARB, Context, IERC20, IERC20Metadata {
    
    using FixedPointMathLib for uint;
    using Address for address;


    /*///////////////////////////////////////////////////////////////
                            Unchanged methods
    //////////////////////////////////////////////////////////////*/

    function decimals() external pure returns (uint8) {
        return 18;
    }

    function totalSupply() external pure returns (uint256) { //<---- this has to be done as a merkle tree to determine that the total supply is always 100
        return 100;
    }

    function transfer(address recipient, uint256 amount) external returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    /*///////////////////////////////////////////////////////////////
                    Methods with different storage layout
    //////////////////////////////////////////////////////////////*/

    function name() external view returns (string memory) {
        return s.oz.name;
    }

    function symbol() external view returns (string memory) {
        return s.oz.symbol; 
    }

    function allowance(address owner, address spender) external view returns (uint256) {
        return s.oz.allowances[owner][spender];
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool) {
        _transfer(sender, recipient, amount);

        uint256 currentAllowance = s.oz.allowances[sender][_msgSender()];
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        unchecked {
            _approve(sender, _msgSender(), currentAllowance - amount);
        }

        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue) external returns (bool) {
        _approve(_msgSender(), spender, s.oz.allowances[_msgSender()][spender] + addedValue);
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool) {
        uint256 currentAllowance = s.oz.allowances[_msgSender()][spender];
        require(currentAllowance >= subtractedValue, "ERC20: decreased allowance below zero");
        unchecked {
            _approve(_msgSender(), spender, currentAllowance - subtractedValue);
        }

        return true;
    }

    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) internal virtual {
        require(owner != address(0), "oz20Facet: approve from the zero address");
        require(spender != address(0), "oz20Facet: approve to the zero address");

        s.oz.allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    /*///////////////////////////////////////////////////////////////
                        Methods with custom logic
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Queries OZL balance
     * @dev Rebase mechanism, pegged to the token's total supply (100)  
     * @param user_ account to be queried
     * @return uint OZL balance of user_
     */
    function balanceOf(address user_) public view returns (uint256) { 
        uint stableMod = s.indexFlag ? 1 : s.stabilizer; 
        return (s.ozelIndex.mulDivDown(s.usersPayments[user_] * 100, 10 ** 22) / 4 ** s.indexRegulator) / stableMod;
    }

    /**
     * @dev The transfer of OZL is done by modifying the sender and recipient's payments
     *      done in the system instead of updating a balances mapping.
     */
    function _transfer( 
        address sender,
        address recipient,
        uint256 amount
    ) internal {
        require(sender != address(0), "oz20Facet: transfer from the zero address");
        require(recipient != address(0), "oz20Facet: transfer to the zero address");

        uint256 senderBalance = balanceOf(sender);
        require(senderBalance >= amount, "oz20Facet: transfer amount exceeds balance");

        //Mutex bitmap lock
        _toggleBit(1, 6);

        bytes memory data = abi.encodeWithSignature(
            'transferUserAllocation(address,address,uint256,uint256,uint256)', 
            sender, recipient, amount, senderBalance, 6
        );

        LibDiamond.callFacet(data);

        emit Transfer(sender, recipient, amount);
    }

    /**
     * @dev Modifies several values, at the moment of withdrawing fees, that are 
     * used for the calculations of the rebase of OZL.
     * @param user_ User where the withdrawn fees will be redirected to
     * @param amount_ OZL balance to redeem
     * @param lockNum_ Index of the bit which authorizes the function call 
     */
    function burn(
        address user_, 
        uint amount_,
        uint lockNum_
    ) external isAuthorized(lockNum_) noReentrancy(4) { 
        if(user_ == address(0)) revert CantBeZero('oz4626Facet: address');

        uint256 accountBalance = balanceOf(user_); 
        if(!(accountBalance >= amount_)) revert ConditionNotMet("oz20Facet: burn amount exceeds balance");

        uint userBalanceOZL = balanceOf(user_);
        if(!(userBalanceOZL > 0)) revert ConditionNotMet("oz20Facet: userBalanceOZL cannot be 0");

        uint allocationPercentage = (amount_.mulDivDown(10000, userBalanceOZL)).mulDivDown(1 ether, 100);
        uint amountToReduce = allocationPercentage.mulDivDown(s.usersPayments[user_], 100 * 1 ether);

        //Mutex bitmap lock
        _toggleBit(1, 5);

        bytes memory data = abi.encodeWithSignature(
            'modifyPaymentsAndVolumeExternally(address,uint256,uint256)', 
            user_, amountToReduce, 5
        );

        LibDiamond.callFacet(data);

        emit Transfer(user_, address(0), amount_);
    }
}
