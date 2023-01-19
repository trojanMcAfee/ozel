// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '../interfaces/ethereum/IStorageBeacon.sol';
import '../libraries/LibCommon.sol';
import './ozUpgradeableBeacon.sol';
import '../Errors.sol';

import '@rari-capital/solmate/src/utils/SSTORE2.sol';
import 'hardhat/console.sol';
/**
 * @title Main storage contract for the L1 side of the system.
 * @notice It acts as a separate centralized beacon that functions query for state
 * variables. It can be upgraded into different versions while keeping the older ones.
 */
contract StorageBeacon is IStorageBeacon, Initializable, Ownable {

    EmergencyMode eMode;

    // mapping(address => bytes32) taskIDs;
    mapping(address => bool) tokenDatabase;
    // mapping(address => bool) userDatabase;


    //-----
    mapping(address => address[]) public userToPointers;
    mapping(address => bytes[]) public userToPointers2;
    //-----

    mapping(bytes4 => bool) authorizedSelectors;

    address[] tokenDatabaseArray;

    uint gasPriceBid;

    ozUpgradeableBeacon beacon;

    bool isEmitter;

    event L2GasPriceChanged(uint newGasPriceBid);
    event NewToken(address token);
    event TokenRemoved(address token);

    /*///////////////////////////////////////////////////////////////
                            Modifiers
    //////////////////////////////////////////////////////////////*/

    /// @dev Checks -using RolesAuthority- if the sender can call certain method
    modifier hasRole(bytes4 functionSig_) {
        require(beacon.canCall(msg.sender, address(this), functionSig_));
        _;
    }


    constructor(
        EmergencyMode memory eMode_,
        address[] memory tokens_,
        bytes4[] memory selectors_,
        uint gasPriceBid_
    ) {
        eMode = EmergencyMode({
            swapRouter: ISwapRouter(eMode_.swapRouter),
            priceFeed: AggregatorV3Interface(eMode_.priceFeed),
            poolFee: eMode_.poolFee,
            tokenIn: eMode_.tokenIn,
            tokenOut: eMode_.tokenOut
        });

        uint length = tokens_.length;
        for (uint i=0; i < length;) {
            tokenDatabase[tokens_[i]] = true;
            tokenDatabaseArray.push(tokens_[i]);
            unchecked { ++i; }
        }

        for (uint i=0; i < selectors_.length;) {
            authorizedSelectors[selectors_[i]] = true;
            unchecked { ++i; }
        }

        gasPriceBid = gasPriceBid_;
    }


    /*///////////////////////////////////////////////////////////////
                        State-changing functions
    //////////////////////////////////////////////////////////////*/

    function multiSave2(
        bytes20 account_,
        AccountConfig calldata acc_,
        bytes32 taskId_
    ) external hasRole(0x0854b85f) {
        // bytes16 user = bytes16(bytes20(acc_.user));
        // bytes32 user_account = bytes32(bytes.concat(user, account_));
        // string memory name = acc_.name;
        // bytes memory nameBytes;

        // assembly {
        //     nameBytes := mload(add(name, 32))
        // }

        // bytes memory bytesData = bytes.concat(user_account, nameBytes);

        //-------
        bytes32 acc_name = bytes32(bytes.concat(account_, acc_.name));
        console.logBytes32(acc_name);
        console.log('acc_name: '. acc_name);
        // bytes memory acc_name_id = bytes.concat(acc_name, taskId_);
        // userToPointers2[acc_.user].push(acc_name_id);
        


    }

    function multiSave(
        bytes16 account_, 
        AccountConfig calldata acc_, 
        bytes32 taskId_
    ) external hasRole(0x0854b85f) {
        bytes16 user = bytes16(bytes20(acc_.user));
        bytes32 merge = bytes32(bytes.concat(user, account_)); //bytes32(uint256(uint128(user)) << 128 | uint128(account_))
        bytes32 nameBytes; //bytes32(bytes.concat(user, account_))
        string memory name = acc_.name;
        console.log('string name: ', name);
        bytes memory nameBytes2 = bytes(name);
        console.logBytes(nameBytes2);
        // console.log('converting...');
        // (string memory str2) = abi.decode
        console.log('nameBytes2 length:^ ****', nameBytes2.length);
        console.log('merge length: ', merge.length);
        
        assembly {
            nameBytes := mload(add(name, 32))
        }

        console.logBytes32(nameBytes);
        console.log('nameBytes length:^ ', nameBytes.length);

        bytes memory accData = bytes.concat(merge, nameBytes);
        console.logBytes(accData);
        console.log('lenth accData: ', accData.length);

        //---------
        console.log('.');
        // uint midpoint = accData2.length / 2;
        // bytes memory nameStr = new bytes(midpoint);
        // for (uint i=0; i < midpoint; i++) {
        //     nameStr[i] = accData2[i];
        // }
        // console.logBytes(nameStr);
        // console.log('^');
        //---------
        bytes32 noLengthData;
        assembly {
            noLengthData := mload(add(accData, 64))
        }
        console.logBytes32(noLengthData);
        console.log('^^ ****');
        string memory str3 = string(bytes.concat(noLengthData));
        console.log('str3: ', str3);
        //-----------
        // bytes memory result;
        //     assembly {
        //         result := mload(add(noLengthData,0x00))
        //         mstore(add(noLengthData,0x00), and(result, 0xffffffff))
        //     }

        // console.logBytes(result);
        // console.log('^^^^^');
        //---- all i have to do is removing the padding ******
        // bytes memory num = hex'6d79206163636f756e74';
        // string memory str = string(num);
        // console.log('str: ', str);

        //---------
        bytes memory data = abi.encode(account_, taskId_, acc_);
        userToPointers[acc_.user].push(SSTORE2.write(data));
    }

    function changeGasPriceBid(uint newGasPriceBid_) external onlyOwner {
        gasPriceBid = newGasPriceBid_;
        emit L2GasPriceChanged(newGasPriceBid_);
    }

    function addTokenToDatabase(address newToken_) external onlyOwner {
        if (queryTokenDatabase(newToken_)) revert TokenAlreadyInDatabase(newToken_);
        tokenDatabase[newToken_] = true;
        tokenDatabaseArray.push(newToken_);
        emit NewToken(newToken_);
    }

    function removeTokenFromDatabase(address toRemove_) external onlyOwner {
        if (!queryTokenDatabase(toRemove_)) revert TokenNotInDatabase(toRemove_);
        tokenDatabase[toRemove_] = false;
        LibCommon.remove(tokenDatabaseArray, toRemove_);
        emit TokenRemoved(toRemove_);
    }

    function storeBeacon(address beacon_) external initializer { 
        beacon = ozUpgradeableBeacon(beacon_);
    }

    function changeEmergencyMode(EmergencyMode calldata newEmode_) external onlyOwner {
        eMode = newEmode_;
    }

    function changeEmitterStatus(bool newStatus_) external onlyOwner {
        isEmitter = newStatus_;
    }

    function addAuthorizedSelector(bytes4 selector_) external onlyOwner {
        authorizedSelectors[selector_] = true;
    }


    /*///////////////////////////////////////////////////////////////
                            View functions
    //////////////////////////////////////////////////////////////*/

    function isSelectorAuthorized(bytes4 selector_) external view returns(bool) {
        return authorizedSelectors[selector_];
    }

    function getGasPriceBid() external view returns(uint) {
        return gasPriceBid; 
    }
    
    function getEmergencyMode() external view returns(EmergencyMode memory) {
        return eMode;
    }

    function getAccountsByUser(
        address user_
    ) external view returns(address[] memory, string[] memory)  {
        address[] memory pointers = userToPointers[user_];
        address[] memory accounts = new address[](pointers.length);
        string[] memory names = new string[](pointers.length);

        for (uint i=0; i < pointers.length;) {
            (address account,,string memory name) = _extractData(pointers[i]);

            accounts[i] = account;
            names[i] = name;
            unchecked { ++i; }
        }
        return (accounts, names);
    }

    function _extractData(address pointer_) private view returns(address, bytes32, string memory) {
        bytes memory data = SSTORE2.read(pointer_);
        (address account, bytes32 taskId, AccountConfig memory acc) = 
            abi.decode(data, (address, bytes32, AccountConfig));

        return (account, taskId, acc.name);
    }

    function getTaskID(address account_, address owner_) external view returns(bytes32) {
        address[] memory pointers = userToPointers[owner_];

        for (uint i=0; i < pointers.length;) {
            (address account, bytes32 taskId, ) = _extractData(pointers[i]);
            if (account == account_) return taskId;
            unchecked { ++i; }
        }
        revert NoTaskId();
    }

    /// @dev If token_ exists in L1 database
    function queryTokenDatabase(address token_) public view returns(bool) {
        return tokenDatabase[token_];
    }
    
    function isUser(address user_) external view returns(bool) {
        return userToPointers[user_].length > 0;
    }

    function getEmitterStatus() external view returns(bool) {
        return isEmitter;
    }

    function getTokenDatabase() external view returns(address[] memory) {
        return tokenDatabaseArray;
    }

    function getPointers(address user_) external view returns(address[] memory) {
        return userToPointers[user_];
    }
}




