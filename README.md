<img width="1323" alt="image" src="https://user-images.githubusercontent.com/59457858/217074677-2cc7a464-3045-4a7a-ab8d-da44376d28b5.png">

# Main
- https://ozelprotocol.xyz/
- https://docs.ozelprotocol.xyz/

# Tests

This file explains how to run all the tests done to the contracts in both Mainnet and Arbitrum. The types that were applied are:
* Unit testing.
* Integration testing.
* Property based testing.
* Stateful testing.

Used tools:
* Slither. 
* Slither-check-erc.
* Slither-check-upgradeability.
* Slither-inheritance-graph.

# Dockerized

Tests are containerized in order to isolate specific environments for the correct functioning of each scenario, such as fork, block number, state variables, accounts, among others. These are divided as:
* ### Ethereum:
  * `ozel-test-mainnet:0.0.4` --> For optimistic and pessimistic (aka failing) scenarios.
* ### Arbitrum:
  V1
  * `ozel-test-arb-all-tests:0.0.2` --> Encompass all the Arbitrum tests from below in one file.
  * `ozel-test-arb-anti-slippage:0.0.2` --> For the anti-slippage strategy, using try/catch blocks, implemented on L2 swaps.
  * `ozel-test-arb-intr-testing:0.0.1` --> Optimistic scenario of the standard flow of usage in L2.
  * `ozel-test-arb-my-revenue:0.0.2` --> For the distribution of the owner's revenue.
  * `ozel-test-arb-ozel-index:0.0.1` --> Tests the profiency of the Ozel Index, its continuous calculation, equilibrium mechanism and rebalancing.
  * `ozel-test-arb-unit-testing:0.0.2` --> Unit tests for key functions.

  V1.1
  * `ozel-test-arb-v1.1-contracts:0.0.5` --> Unit tests of the main functions of this upgrade.
  * `ozel-test-arb-v1.1-ozel-balance:0.0.5` --> Tests that the OZL balance is being successfully re-calculated after the upgrade with L1 and L2 interactions.
  * `ozel-test-arb-v1.1-real-ozel:0.0.3` --> Tests integration of the upgrade with the deployed contracts in L2.

  V1.2
  * `ozel-test-arb-v1.2-real-ozel:0.0.2` --> Unit tests and tests the integration of the upgrade with the deployed contracts in L2

# Running them

For running each one, pull the image of the test you'd like to run from DockerHub -along my DockerHub username- and run a local container:
  ##### Commands:
  `docker pull [my_docker_user]/[image]`   
  
  `docker run -it [my_docker_user]/[image]`
  
  ##### Example:
  `docker pull dnyrm/ozel-test-arb-anti-slippage:0.0.1`  
  
  `docker run -it dnyrm/ozel-test-arb-anti-slippage:0.0.1`

The name of each image represents the JS file of the test. They can be found on the `tests` folder. 

# Goerli

It tests the purpose of the Akash deployments, by reviewing every transfer done to an Account and checking if they were auto-redeemed or not. 

When bridging ETH from L1 to L2, if the L2 gas price supplied -when creating a retryable ticket- is not enough, the transaction won't get auto-redeemed so a manual redeem is necessary in L2. 

The Akash deployments are in charge of that manual redeem in case it's necessary for a transaction. The Docker image `ozel-test-goerli-manual:0.0.2` has contracts that simulate this manual redemption. The same commands apply for running the test:

   `docker pull dnyrm/ozel-test-goerli-manual:0.0.2`
   
   `docker run -it dnyrm/ozel-test-goerli-manual:0.0.2`
   
Goerli could be unstable due to the fact that the chain sometimes doesn't have enough voters or they don't vote on time to make a block finalized, so there might be delays in the confirmation of a transaction, more specifically in these two logs of the test:
- `Waiting for the status of the message from Goerli...`
- `Waiting for funds on L2 (takes...  `

Moreover, for the test to run smoothly, there are two addresses that must have a specific amount of GoerliETH and Arbitrum-GoerliETH. In case this requirement is not met, a warning message will be logged. 




