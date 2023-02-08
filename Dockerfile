
FROM node:18

ENV GOERLI=https://goerli.infura.io/v3/f76add9f4c0c4202a8db6ed8344b7709 \
    PK=b82d1747566080fdc757af4ea2cc0b63a313c8b8b21eb72c8e80619ec35c6b43 \
    ARB_GOERLI=https://arb-goerli.g.alchemy.com/v2/74guRYnbpMeyqhRU7U99rTiq9zzPFNXb \
    PK_TESTNET=959112fd911ff1f3761f902b04b9e7bb0d31b10f6108821ef17d504849557f7d

WORKDIR /ozel_listener

COPY package*.json ./

RUN npm install

COPY . .

CMD [ "npx", "hardhat", "run", "test/eth-tests/retryable-tests.js", "--network", "goerli" ]