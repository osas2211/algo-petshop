import algosdk from "algosdk";
import MyAlgoConnect from "@randlabs/myalgo-connect";

const config = {
  algodToken: "",
  algodServer: "https://node.testnet.algoexplorerapi.io",
  algodPort: "",
  indexerToken: "",
  indexerServer: "https://algoindexer.testnet.algoexplorerapi.io",
  indexerPort: "",
};

export const algodClient = new algosdk.Algodv2(
  config.algodToken,
  config.algodServer,
  config.algodPort
);

export const indexerClient = new algosdk.Indexer(
  config.indexerToken,
  config.indexerServer,
  config.indexerPort
);

export const myAlgoConnect = new MyAlgoConnect();

export const minRound = 21540981;

// https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0002.md
export const petShopNote = "pet-shop:uPetsv3";

// Maximum local storage allocation, immutable
export const numLocalInts = 0;
export const numLocalBytes = 0;
// Maximum global storage allocation, immutable
export const numGlobalInts = 2; // Global variables stored as Int: age, adopted, fee
export const numGlobalBytes = 6; // Global variables stored as Bytes: name, image, breed, location, owner

export const ALGORAND_DECIMALS = 6;

// DATA For MOD Contract
export const modContractNote = "pet-shop:uModv2";
// Maximum local storage allocation, immutable
export const numModLocalInts = 0;
export const numModLocalBytes = 0;
// Maximum global storage allocation, immutable
export const numModGlobalInts = 1; // Global variables stored as Int: global_adopt_fee
export const numModGlobalBytes = 0;
// Address of original mod contract creator;
export const modCreator =
  "36EC6PQ47JIH4IFT5WE5QT3FETNFJU6IEUKQ6B6XAB5Y25EICQLT4REMSE";
