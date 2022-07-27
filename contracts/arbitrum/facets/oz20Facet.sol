// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/Context.sol';
import '@openzeppelin/contracts/utils/Address.sol';

import 'hardhat/console.sol';

import '../AppStorage.sol';
import './ExecutorFacet.sol';
import '../../libraries/FixedPointMathLib.sol';
import '../Modifiers.sol';
import '../../Errors.sol';

/**
 * @dev Implementation of the {IERC20} interface.
 * @author Original author: OpenZeppelin
 */
contract oz20Facet is Modifiers, Context, IERC20, IERC20Metadata {
    
    using FixedPointMathLib for uint;
    using Address for address;

    /**
     * @dev Sets the values for {name} and {symbol}.
     *
     * The default value of {decimals} is 18. To select a different value for
     * {decimals} you should overload it.
     *
     * All two of these values are immutable: they can only be set once during
     * construction.
     */

    /**
     * @dev Returns the name of the token.
     */
    function name() public view virtual override returns (string memory) {
        return s.oz.name;
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name.
     */
    function symbol() public view virtual override returns (string memory) {
        return s.oz.symbol; 
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     * For example, if `decimals` equals `2`, a balance of `505` tokens should
     * be displayed to a user as `5.05` (`505 / 10 ** 2`).
     *
     * Tokens usually opt for a value of 18, imitating the relationship between
     * Ether and Wei. This is the value {ERC20} uses, unless this function is
     * overridden;
     *
     * NOTE: This information is only used for _display_ purposes: it in
     * no way affects any of the arithmetic of the contract, including
     * {IERC20-balanceOf} and {IERC20-transfer}.
     */
    function decimals() public view virtual override returns (uint8) {
        return 18;
    }

    /**
     * @dev See {IERC20-totalSupply}.
     */
    function totalSupply() public view virtual override returns (uint256) { 
        return 100;
    }

    /**
     * @dev See {IERC20-balanceOf}.
     */
    function balanceOf(address account) public view virtual override returns (uint256) { 
        uint stableMod = s.indexFlag ? 1 : s.stabilizer; 
        return (s.ozelIndex.mulDivDown(s.usersPayments[account] * 100, 10 ** 22) / 4 ** s.indexRegulator) / stableMod;
    }

    /**
     * @dev See {IERC20-transfer}.
     *
     * Requirements:
     *
     * - `recipient` cannot be the zero address.
     * - the caller must have a balance of at least `amount`.
     */
    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    /**
     * @dev See {IERC20-allowance}.
     */
    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return s.oz.allowances[owner][spender];
    }

    /**
     * @dev See {IERC20-approve}.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    /**
     * @dev See {IERC20-transferFrom}.
     *
     * Emits an {Approval} event indicating the updated allowance. This is not
     * required by the EIP. See the note at the beginning of {ERC20}.
     *
     * Requirements:
     *
     * - `sender` and `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     * - the caller must have allowance for ``sender``'s tokens of at least
     * `amount`.
     */
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public virtual override returns (bool) {
        _transfer(sender, recipient, amount);

        uint256 currentAllowance = s.oz.allowances[sender][_msgSender()];
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        unchecked {
            _approve(sender, _msgSender(), currentAllowance - amount);
        }

        return true;
    }

    /**
     * @dev Atomically increases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
        _approve(_msgSender(), spender, s.oz.allowances[_msgSender()][spender] + addedValue);
        return true;
    }

    /**
     * @dev Atomically decreases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     * - `spender` must have allowance for the caller of at least
     * `subtractedValue`.
     */
    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        uint256 currentAllowance = s.oz.allowances[_msgSender()][spender];
        require(currentAllowance >= subtractedValue, "ERC20: decreased allowance below zero");
        unchecked {
            _approve(_msgSender(), spender, currentAllowance - subtractedValue);
        }

        return true;
    }

    /**
     * @dev Moves `amount` of tokens from `sender` to `recipient`.
     *
     * This internal function is equivalent to {transfer}, and can be used to
     * e.g. implement automatic token fees, slashing mechanisms, etc.
     *
     * Emits a {Transfer} event.
     *
     * Requirements:
     *
     * - `sender` cannot be the zero address.
     * - `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     */
    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal virtual {
        require(sender != address(0), "oz20Facet: transfer from the zero address");
        require(recipient != address(0), "oz20Facet: transfer to the zero address");

        uint256 senderBalance = balanceOf(sender);
        require(senderBalance >= amount, "oz20Facet: transfer amount exceeds balance");

        s.isAuth[6] = true;

        bytes memory data = abi.encodeWithSelector(
            ExecutorFacet(s.executor).transferUserAllocation.selector, 
            sender, recipient, amount, senderBalance, 6
        );

        s.executor.functionDelegateCall(data);

        emit Transfer(sender, recipient, amount);
    }


    function burn(
        address account, 
        uint amount,
        uint lockNum_
    ) external isAuthorized(lockNum_) noReentrancy(4) { 
        if(account == address(0)) revert CantBeZero('oz4626Facet: address');

        uint256 accountBalance = balanceOf(account); 
        if(!(accountBalance >= amount)) revert ConditionNotMet("oz20Facet: burn amount exceeds balance");

        uint userBalanceOZL = balanceOf(account);
        if(!(userBalanceOZL > 0)) revert ConditionNotMet("oz20Facet: userBalanceOZL cannot be 0");

        uint allocationPercentage = (amount.mulDivDown(10000, userBalanceOZL)).mulDivDown(1 ether, 100);
        uint amountToReduce = allocationPercentage.mulDivDown(s.usersPayments[account], 100 * 1 ether);

        s.isAuth[5] = true;

        bytes memory data = abi.encodeWithSelector(
            ExecutorFacet(s.executor).modifyPaymentsAndVolumeExternally.selector, 
            account, amountToReduce, 5
        );

        s.executor.functionDelegateCall(data);

        emit Transfer(account, address(0), amount);
    }

    /**
     * @dev Sets `amount` as the allowance of `spender` over the `owner` s tokens.
     *
     * This internal function is equivalent to `approve`, and can be used to
     * e.g. set automatic allowances for certain subsystems, etc.
     *
     * Emits an {Approval} event.
     *
     * Requirements:
     *
     * - `owner` cannot be the zero address.
     * - `spender` cannot be the zero address.
     */
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
}
