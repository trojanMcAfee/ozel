//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
pragma abicoder v2;

import './interfaces/IGatewayRegistry.sol';
import './interfaces/IGateway.sol';
import {IRenPool, ITricrypto} from './interfaces/ICurve.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import './Vault.sol';

import 'hardhat/console.sol';


contract PayMe2 {

    using SafeERC20 for IERC20;

    IGatewayRegistry registry;
    Vault vault;
    IRenPool renPool = IRenPool(0x93054188d876f558f4a66B2EF1d97d16eDf0895B); // arb: 0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb
    ITricrypto tricrypto2 = ITricrypto(0xD51a44d3FaE010294C616388b506AcdA1bfAAE46); //arb: 0x960ea3e3C7FB317332d990873d354E18d7645590
    IERC20 renBTC = IERC20(0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D); //arb: 0xdbf31df14b66535af65aac99c32e9ea844e14501
    IERC20 WBTC = IERC20(0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599);
    IERC20 USDT = IERC20(0xdAC17F958D2ee523a2206206994597C13D831ec7);
    IERC20 WETH = IERC20(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
    address ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    uint dappFee = 10;

    mapping(address => bool) users;
    mapping(address => uint) pendingWithdrawal;

    constructor(address _registry, address _vault) {
        registry = IGatewayRegistry(_registry);
        vault = Vault(_vault);
    }



    // event Deposit(bytes user, bytes userToken);

    //0x80ad03F5ce41A6DB208bAd7163709cba21ED83b8 / with user and userToken
    //0x3cd0DdCE7595d79743e3674EC30E77297866561E / empty
    //0x516365806F142B685397278016FED00F25Af2DBf / with logs
    //0x11EB9A18fE970cFaF079FeAfdfEd59623feCCaf7 / mix of logs and user and userToken
    //0xF95D54616c371f12c152E278FC4fCb47341bB0A8 - before mint()
    //0xcAc56604E56806E12CbaA14266C11fDEd1E2E277 - like docs but with log
    function deposit(
        bytes calldata _user, //use this param to indicate the caller and where the final tokens will be sent - exchangeToUserToken()
        bytes calldata _userToken,
        uint _amount,
        bytes32 _nHash,
        bytes calldata _sig
    ) external {
        console.log('hiii');
        bytes32 pHash = keccak256(abi.encode(_user, _userToken));
        console.logBytes32(pHash);
        // bytes32 pHash = keccak256(abi.encode(_user));
        IGateway BTCGateway = registry.getGatewayBySymbol('BTC');
        BTCGateway.mint(pHash, _amount, _nHash, _sig);

        // emit Deposit(_user, _userToken); //trying to get these params to call exchage...() --> try with listening to an event

        // console.logBytes(_user);
        // console.log('hi');
        // console.logBytes(_userToken);
        // if (mintedAmount > 0) {
        //     console.log('hi2');
        // }
        address user = _bytesToAddress(_user);
        address userToken = _bytesToAddress(_userToken);
        // console.log('user should be 0x715...: ', user);
        // console.log('user token should be USDT: ', userToken);
        // console.logBytes(_user);

        exchangeToUserToken(_amount, user, userToken);

    }

    // function toBuffer(bytes calldata _msg) external view {
    //     console.log('hi2');
    //     address x = _bytesToAddress(_msg);
    //     uint sup = IERC20(x).totalSupply();
    //     console.log('supply: ', sup);
    
    // }

    function _bytesToAddress(bytes memory bys) private pure returns (address addr) {
        assembly {
            addr := mload(add(bys,20))
        } 
    }


    receive() external payable {}

    function _calculatePercentage(uint _amount, uint _basisPoint) private pure returns(uint percentage) {
        percentage = _amount - ( (_amount * _basisPoint) / 10000 ); //5 -> 0.05%;
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

    function _sendsFeeToVault(uint _amount) private returns(uint, bool) {
        uint fee = _amount - _calculatePercentage(_amount, dappFee); //10 -> 0.1%
        uint netAmount = _amount - fee;
        bool isTransferred = renBTC.transfer(address(vault), fee);
        return (netAmount, isTransferred);
    }

    /**
        1 = wbtc
        2 = eth
        0 = usdt
    */
    function exchangeToUserToken(uint _amount, address _user, address _userToken) public {
        (uint netAmount, bool isTransferred) = _sendsFeeToVault(_amount);
        require(isTransferred, 'Fee transfer failed');
        vault.getBalanceVault();
        
        uint tokenOut = _userToken == address(USDT) ? 0 : 2;
        bool useEth = _userToken == address(WETH) ? false : true;
        IERC20 userToken;
        uint slippage;
        if (_userToken != ETH) {
            userToken = IERC20(_userToken);
        }

        //Swaps renBTC for WBTC
        renBTC.approve(address(renPool), netAmount); 
        slippage = _calculatePercentage(netAmount, 5);
        renPool.exchange(0, 1, netAmount, slippage);
        uint wbtcToConvert = WBTC.balanceOf(address(this));
        console.log('WBTC balance on PayMe: ', wbtcToConvert);

        //Swaps WBTC to userToken (USDT, WETH or ETH)
        WBTC.approve(address(tricrypto2), wbtcToConvert);
        uint minOut = tricrypto2.get_dy(1, tokenOut, wbtcToConvert);
        slippage = _calculatePercentage(minOut, 5);
        tricrypto2.exchange(1, tokenOut, wbtcToConvert, slippage, useEth);    

        //Sends userToken to user
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

    
} 