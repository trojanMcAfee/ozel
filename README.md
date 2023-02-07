<img width="1323" alt="image" src="https://user-images.githubusercontent.com/59457858/217074677-2cc7a464-3045-4a7a-ab8d-da44376d28b5.png">

# Tests

This file explains how to run all the tests done to the contracts in both Mainnet and Arbitrum. The types that were applied:
* Unit testing.
* Integration testing.
* Property based testing.
* Stateful testing.

Used testing tools:
* Slither. 
* Slither-check-erc.
* Slither-check-upgradeability.

# Dockerized tests

Tests are containerized in order to isolate specific environments for the correct functioning of each scenario, such as Hardhat fork, block number, state variables, accounts, among others. These are divided as:
* ### Ethereum:
  * `ozel-test-mainnet:0.0.2` --> For optimistic and pessimistic (aka failing) scenarios.
* ### Arbitrum:
  * `ozel-testnet-arb-all:0.0.2` --> Encompass all Arbitrum tests.
  * `ozel-test-arb-anti-slippage:0.0.1` --> For the anti-slippage strategy implemented on certain L2 swaps.
  * `ozel-test-arb-intr-testing:0.0.1` --> Optimistic scenario of the standard flow of usage in L2.
  * `ozel-test-arb-my-revenue:0.0.2` --> For the distribution of the owner's revenue.
  * `ozel-test-arb-ozel-index:0.0.1` --> Tests the profiency of the Ozel Index, its continuous calculation, equilibrium mechanism and rebalancing.
  * `ozel-test-arb-unit-testing:0.0.1` --> Unit tests for key functions.

# Running them

For running each test, pull the image of the test you'd like to run from DockerHub -along my DockerHub username- and run a local container:
  *Command:*
  `docker pull [my_docker_user]/[image]`
  `docker run -it [my_docker_user]/[image]`
  
  *Example:*
  `docker pull dnyrm/ozel-test-arb-anti-slippage:0.0.1`
  `docker run -it dnyrm/ozel-test-arb-anti-slippage:0.0.1`

The name of each image represents the JS file of the test. They can be found on the `test` folder. 

