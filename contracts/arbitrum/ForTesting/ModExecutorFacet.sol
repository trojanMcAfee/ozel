//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '../facets/oz20Facet.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../AppStorage.sol';
import '../../libraries/FixedPointMathLib.sol';
import {IMulCurv, ITri} from '../../interfaces/ICurve.sol';
import '../Modifiers.sol';

import 'hardhat/console.sol';


contract ModExecutorFacet is Modifiers { 

    using FixedPointMathLib for uint;


    function calculateSlippage(
        uint amount_, 
        uint basisPoint_
    ) public pure returns(uint minAmountOut) {
        minAmountOut = amount_ - amount_.mulDivDown(basisPoint_, 10000);
    }


    function executeFinalTrade( 
        TradeOps memory swapDetails_, 
        uint userSlippage_,
        uint lockNum_
    ) external payable isAuthorized(lockNum_) noReentrancy(3) {
        address pool = swapDetails_.pool;
        uint inBalance = IERC20(swapDetails_.baseToken).balanceOf(address(this));
        uint minOut;
        uint slippage;

        if (pool != s.renPool) IERC20(s.USDT).approve(pool, inBalance);

        /**** 
            Exchanges the amount between the user's slippage (final swap)
            If it fails, it doubles the slippage, divides the amount between two and tries again.
            If none works, sends the baseToken instead to the user.
        ****/ 
        for (uint i=1; i <= 2; i++) {
            if (pool == s.renPool || pool == s.crv2Pool) {

                minOut = IMulCurv(pool).get_dy(
                    swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance / i
                );
                slippage = calculateSlippage(minOut, userSlippage_ * i);

                try IMulCurv(pool).exchange(
                    swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance / i, slippage
                ) {
                    if (i == 2) {
                        try IMulCurv(pool).exchange(
                            swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance / i, slippage
                        ) {
                            break;
                        } catch {
                            IERC20(swapDetails_.baseToken).transfer(msg.sender, inBalance / 2); //check if msg.sender should be moved to user
                        }
                    }
                    break;
                } catch {
                    if (i == 1) {
                        continue;
                    } else {
                        IERC20(swapDetails_.baseToken).transfer(msg.sender, inBalance); 
                    }
                }
            } else {
                minOut = IMulCurv(pool).get_dy_underlying(
                    swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance / i
                );
                slippage = calculateSlippage(minOut, userSlippage_ * i);
                
                try IMulCurv(pool).exchange_underlying(
                    swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance / i, slippage
                ) {
                    if (i == 2) {
                        try IMulCurv(pool).exchange_underlying(
                            swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance / i, slippage
                        ) {
                            break;
                        } catch {
                            IERC20(swapDetails_.baseToken).transfer(msg.sender, inBalance / 2);
                        }
                    }
                    break;
                } catch {
                    if (i == 1) {
                        continue;
                    } else {
                        IERC20(swapDetails_.baseToken).transfer(msg.sender, inBalance); 
                    }
                }
            }
        }
    }

   

    //****** Modifies manager's STATE *****/

    function updateExecutorState(
        uint amount_, 
        address user_,
        uint lockNum_
    ) external payable isAuthorized(lockNum_) noReentrancy(2) {
        s.usersPayments[user_] += amount_;
        s.totalVolume += amount_;
        _updateIndex();
    }

    function _updateIndex() private { 

        uint oneETH = 1 ether; //doesnt increase index
        // uint variant = 10 ** 14; //with the variants, you get 4x 100 of ozl
        // uint variant2 = 10 ** 8;
        if (s.totalVolume == 100 * oneETH) s.indexFlag = true;
        // s.indexVolume = s.totalVolume; 


        //indexVolume and distributionIndex (?)


        if (s.indexFlag) { 
            s.distributionIndex = 19984000000000000000;
            s.invariantRegulator = 8;
            s.indexRegulator = 3;
            // s.indexVolume = 128200000000000000000000;
            s.totalVolume = 128200000000000000000000;

            s.usersPayments[0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266] = 32100 * 1 ether;
            s.usersPayments[0x70997970C51812dc3A010C7d01b50e0d17dc79C8] = 32000 * 1 ether;
            s.usersPayments[0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC] = 32000 * 1 ether;
            s.usersPayments[0x90F79bf6EB2c4f870365E785982E1f101E93b906] = 32000 * 1 ether;
            s.indexFlag = false;
        }

        console.log('----- contract data -------');
        console.log('index in executorF: ', s.distributionIndex);
        console.log('invariantRegulator: ', s.invariantRegulator);
        console.log('indexRegulator: ', s.indexRegulator);
        console.log('totalVolume: ', s.totalVolume);
        console.log('----- contract data -------');

       if (s.distributionIndex < 23700 * oneETH && s.distributionIndex != 0) { // < 20 / 38
            console.log(1);

            if (s.invariantRegulator < 16) { //8 / 16 / 32 / s.invariantRegulator < 16
                console.log('there ^^^^^');
                s.invariantRegulator *= 2; //why can i do this * 2 in the if check from above??
                s.indexRegulator++;

                console.log('invariantRegulator after *= 2: ', s.invariantRegulator);
                console.log('indexRegulator after ++: ', s.indexRegulator);
            } else {
                console.log('here *******');
                s.invariantRegulator /= 8; // 4 / 8 / 16
                s.indexRegulator = 1; // 2 / 4 / s.indexRegulator - 2
                
                console.log('invariantRegulator after /=: ', s.invariantRegulator);
                console.log('indexRegulator after --: ', s.indexRegulator);

                s.indexFlag = s.indexFlag ? false : true;

                if (!s.indexFlag) console.log('s.indexFlag is false ############');
            }

        } 
        

        s.distributionIndex = 
            s.totalVolume != 0 ? 
            oneETH.mulDivDown((s.invariant2 * s.invariantRegulator), s.totalVolume) * (s.invariant * s.invariantRegulator) : 
            0; 

        s.distributionIndex = s.indexFlag ? s.distributionIndex : s.distributionIndex * s.stabilizer;


    }

    function modifyPaymentsAndVolumeExternally(
        address user_, 
        uint newAmount_,
        uint lockNum_
    ) external isAuthorized(lockNum_) noReentrancy(5) {
        s.usersPayments[user_] -= newAmount_;
        s.totalVolume -= newAmount_;
        _updateIndex();
    }

    function transferUserAllocation( //can someone modify s.isAuth?
        address sender_, 
        address receiver_, 
        uint amount_, 
        uint senderBalance_,
        uint lockNum_
    ) external isAuthorized(lockNum_) noReentrancy(7) { 
        uint percentageToTransfer = (amount_ * 10000) / senderBalance_;
        uint amountToTransfer = percentageToTransfer.mulDivDown(s.usersPayments[sender_] , 10000);

        s.usersPayments[sender_] -= amountToTransfer;
        s.usersPayments[receiver_] += amountToTransfer;
    }

}