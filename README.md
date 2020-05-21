# ewasm-jsvm

ewasm virtual machine for javascript

Specs: https://github.com/ewasm/design/blob/master/eth_interface.md.

## Browser

A limited (Ethereum interface methods with args of type `i64` are not supported by browsers), but easier to use version of the ewasm-jsvm can be found at https://observablehq.com/@loredanacirstea/ewasmjsvm. 

## Development

```
cd ewasm-jsvm
yarn
```

### Run Tests

```
npm run test
```

To test a contract:

- add the source in `./tests/contracts` for Yul or `./tests/sol` for Solidity
- in `./tests/jsvm.test.js`:
  - add the abi, like https://github.com/loredanacirstea/ewasm-jsvm/blob/54c3599cd8ab67ffad1e2172e67083977cd25e66/tests/jsvm.test.js#L86-L90
  - write a new test

For contracts that only need to execute the constructor, check out the `c1` contract, abi & test:
```
const ewmodule = ewasmjsvm.runtimeSim(contracts.c1.bin, c1Abi);
const answ = await ewmodule.main(DEFAULT_TX_INFO);
```

For contracts where the constructor returns a runtime wasm to be deployed (that only has a fallback/default function), check out `c2` contract, abi & test:
```
const runtime = await ewasmjsvm.deploy(contracts.c2.bin, c2Abi)(DEFAULT_TX_INFO);
const answ = await runtime.main(DEFAULT_TX_INFO);
```

For contracts with functions, check out the `c10` contract, abi & test:
```
const runtime = await ewasmjsvm.deploy(contracts.c10.bin, c10Abi)(DEFAULT_TX_INFO);
let answ = await runtime.sum('0x08', '0x02', DEFAULT_TX_INFO);
```
