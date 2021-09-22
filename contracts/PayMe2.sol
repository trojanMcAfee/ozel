//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import './interfaces/IGatewayRegistry.sol';
import './interfaces/IGateway.sol';
import {IRenPool, ITricrypto} from './interfaces/ICurve.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

import 'hardhat/console.sol';


contract PayMe2 {

    using SafeERC20 for IERC20;

    IGatewayRegistry public registry;
    IRenPool renPool = IRenPool(0x93054188d876f558f4a66B2EF1d97d16eDf0895B); // arb: 0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb
    ITricrypto tricrypto2 = ITricrypto(0xD51a44d3FaE010294C616388b506AcdA1bfAAE46); //arb: 0x960ea3e3C7FB317332d990873d354E18d7645590
    IERC20 renBTC = IERC20(0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D); //arb: 0xdbf31df14b66535af65aac99c32e9ea844e14501
    IERC20 WBTC = IERC20(0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599);
    IERC20 USDT = IERC20(0xdAC17F958D2ee523a2206206994597C13D831ec7);
    IERC20 WETH = IERC20(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
    address ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    mapping(address => bool) private users; //can private variables be accesed from outside?
    mapping(address => uint) private pendingWithdrawal;

    event Deposit(uint amount, bytes msg);
    // event Withdrawal(bytes _to, uint256 _amount, bytes _msg);

    constructor(address _registry) {
        registry = IGatewayRegistry(_registry);
    }


    receive() external payable {}

    function _calculateSlippage(uint _amount) private pure returns(uint slippage) {
        uint basisPoint = 5; //0.05%;
        slippage = _amount - ( (_amount * basisPoint) / 10000);
    }

    function addUser(address _user) external {
        require(users[_user] == false, 'User was already added');
        users[_user] = true;
    }

    function isUser(address _user) external view returns(bool) {
        return users[_user];
    }

    function _preSending(address _user) private {
        pendingWithdrawal[_user] = address(this).balance;
    }

    function _sendEtherToUser(address _user) private {
        _preSending(_user);
        uint amount = pendingWithdrawal[_user];
        pendingWithdrawal[_user] = 0;
        payable(_user).transfer(amount);
    }

    /**
        1 = wbtc
        2 = eth
        0 = usdt
    */
    function exchangeToUserToken(uint _amount, address _user, address _userToken) public {
        uint tokenOut = _userToken == address(USDT) ? 0 : 2;
        bool useEth = _userToken == address(WETH) ? false : true;
        IERC20 userToken;
        if (_userToken != ETH) {
            userToken = IERC20(_userToken);
        }

        renBTC.approve(address(renPool), _amount); 
        renPool.exchange(0, 1, _amount, _calculateSlippage(_amount));
        uint wbtcToConvert = WBTC.balanceOf(address(this));
        console.log('WBTC balance on PayMe: ', wbtcToConvert);

        WBTC.approve(address(tricrypto2), wbtcToConvert);
        uint minOut = tricrypto2.get_dy(1, tokenOut, wbtcToConvert);
        tricrypto2.exchange(1, tokenOut, wbtcToConvert, _calculateSlippage(minOut), useEth);

        if (_userToken != ETH) {
            uint ToUser = userToken.balanceOf(address(this));
            userToken.safeTransfer(_user, ToUser);
        } else {
            _sendEtherToUser(_user);
        }
        console.log('USDT balance on user: ', USDT.balanceOf(_user) / 10 ** 6);
        console.log('ETH balance on user: ', _user.balance / 1 ether);
        console.log('WETH balance on user: ', WETH.balanceOf(_user) / 1 ether);


    }


    function deposit(
        bytes calldata _msg, //use this param to indicate the caller and where the final tokens will be sent - exchangeToUserToken()
        uint _amount,
        bytes32 _nHash,
        bytes calldata _sig
    ) external {
        bytes32 pHash = keccak256(abi.encode(_msg));
        IGateway BTCGateway = registry.getGatewayBySymbol('BTC');
        BTCGateway.mint(pHash, _amount, _nHash, _sig);

        // exchangeToUserToken(uint _amount, address _user); *** from _msg

        emit Deposit(_amount, _msg);
    }

    // function withdraw(bytes calldata _msg, bytes calldata _to, uint256 _amount) external {
    //     uint256 burnedAmount = registry.getGatewayBySymbol("BTC").burn(_to, _amount);
    //     emit Withdrawal(_to, burnedAmount, _msg);
    // }

    
} 