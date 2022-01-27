# Liquidrium Subgraph

This subgraph aims to provides data for HiyperLiquidrium.

## HyperLiquidrium
These HyperLiquidrium are used to actively manage LP positions on Uniswap V3.  Entities that relate these HyperLiquidrium are named beginning with UniswapV3. E.g. UniswapV3HyperLiquidrium.

## Hosted Service
The subgraph is currently hosted on The Graph Hosted Service and can be accessed at: https://thegraph.com/hosted-service/subgraph/liquidrium/hyperliqidrium-ethereum

## Build and Deploy
To deploy full subgraph to the hosted service at liquidrium/hyperliqidrium-ethereum:
1. Generate the full subgraph.yaml file with ```yarn prepare:v3only-mainnet```.
2. Run ```yarn codegen```  to prepare the TypeScript sources for the GraphQL and ABIs.
3. Deploy via ```yarn deploy --access-token <ACCESS_TOKEN>```

The access token can alternatively be added via ```graph auth https://api.thegraph.com/deploy/ <ACCESS_TOKEN>```
