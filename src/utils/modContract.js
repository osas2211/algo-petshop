import algosdk from "algosdk";
import * as contractParams from "./constants";
/* eslint import/no-webpack-loader-syntax: off */
import modApprovalProgram from "!!raw-loader!../contracts/mod_approval.teal";
import modClearProgram from "!!raw-loader!../contracts/mod_clear.teal";
import { utf8ToBase64String } from "./conversions";

class ModContract {
  constructor(appId, adoptFee) {
    this.appId = appId;
    this.adoptFee = adoptFee;
  }
}

// Compile smart contract in .teal format to program
const compileProgram = async (programSource) => {
  let encoder = new TextEncoder();
  let programBytes = encoder.encode(programSource);
  let compileResponse = await contractParams.algodClient
    .compile(programBytes)
    .do();
  return new Uint8Array(Buffer.from(compileResponse.result, "base64"));
};

// INITIALIZE MOD CONTRACT
export const createModContract = async (senderAddress, fee) => {
  console.log("Creating Mod Contract...");

  let params = await contractParams.algodClient.getTransactionParams().do();

  // Compile Programs
  const compiledApprovalProgram = await compileProgram(modApprovalProgram);
  const compiledClearProgram = await compileProgram(modClearProgram);

  // Build note to identify transaction later and required app args as Uint8Array
  let note = new TextEncoder().encode(contractParams.modContractNote);
  let fee_arg = algosdk.encodeUint64(fee);

  let appArgs = [fee_arg];

  let txn = algosdk.makeApplicationCreateTxnFromObject({
    from: senderAddress,
    suggestedParams: params,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    approvalProgram: compiledApprovalProgram,
    clearProgram: compiledClearProgram,
    numLocalInts: contractParams.numModLocalInts,
    numLocalByteSlices: contractParams.numModLocalBytes,
    numGlobalInts: contractParams.numModGlobalInts,
    numGlobalByteSlices: contractParams.numModGlobalBytes,
    note: note,
    appArgs: appArgs,
  });

  // Get transaction ID
  let txId = txn.txID().toString();

  // Sign & submit the transaction
  let signedTxn = await contractParams.myAlgoConnect.signTransaction(
    txn.toByte()
  );
  console.log("Signed transaction with txID: %s", txId);
  await contractParams.algodClient.sendRawTransaction(signedTxn.blob).do();

  // Wait for transaction to be confirmed
  let confirmedTxn = await algosdk.waitForConfirmation(
    contractParams.algodClient,
    txId,
    4
  );

  // Get the completed Transaction
  console.log(
    "Transaction " +
      txId +
      " confirmed in round " +
      confirmedTxn["confirmed-round"]
  );

  // Get created application id and notify about completion
  let transactionResponse = await contractParams.algodClient
    .pendingTransactionInformation(txId)
    .do();
  let appId = transactionResponse["application-index"];
  console.log("Created new app-id: ", appId);
  return appId;
};

// UPDATE FEE
export const updateFeeAction = async (senderAddress, modContract, newFee) => {
  console.log("Updating Price....");

  let params = await contractParams.algodClient.getTransactionParams().do();

  // Build required app args as Uint8Array
  let newFeeArg = algosdk.encodeUint64(newFee);
  let feeArg = new TextEncoder().encode("newFee");
  let appArgs = [feeArg, newFeeArg];

  // Create ApplicationCallTxn
  let txn = algosdk.makeApplicationCallTxnFromObject({
    from: senderAddress,
    appIndex: modContract.appId,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    suggestedParams: params,
    appArgs: appArgs,
  });

  // Get transaction ID
  let txId = txn.txID().toString();

  // Sign & submit the transaction
  let signedTxn = await contractParams.myAlgoConnect.signTransaction(
    txn.toByte()
  );
  console.log("Signed transaction with txID: %s", txId);
  await contractParams.algodClient.sendRawTransaction(signedTxn.blob).do();

  // Wait for transaction to be confirmed
  let confirmedTxn = await algosdk.waitForConfirmation(
    contractParams.algodClient,
    txId,
    4
  );

  // Get the completed Transaction
  console.log(
    "Transaction " +
      txId +
      " confirmed in round " +
      confirmedTxn["confirmed-round"]
  );
};

// DELETE MOD CONTRACT
export const deleteModContract = async (senderAddress, modContract) => {
  console.log("Deleting Mod Contract...");

  let params = await contractParams.algodClient.getTransactionParams().do();

  // Create ApplicationDeleteTxn
  let txn = algosdk.makeApplicationDeleteTxnFromObject({
    from: senderAddress,
    suggestedParams: params,
    appIndex: modContract.appId,
  });

  // Get transaction ID
  let txId = txn.txID().toString();

  // Sign & submit the transaction
  let signedTxn = await contractParams.myAlgoConnect.signTransaction(
    txn.toByte()
  );
  console.log("Signed transaction with txID: %s", txId);
  await contractParams.algodClient.sendRawTransaction(signedTxn.blob).do();

  // Wait for transaction to be confirmed
  const confirmedTxn = await algosdk.waitForConfirmation(
    contractParams.algodClient,
    txId,
    4
  );

  // Get the completed Transaction
  console.log(
    "Transaction " +
      txId +
      " confirmed in round " +
      confirmedTxn["confirmed-round"]
  );

  // Get application id of deleted application and notify about completion
  let transactionResponse = await contractParams.algodClient
    .pendingTransactionInformation(txId)
    .do();
  let appId = transactionResponse["txn"]["txn"].apid;
  console.log("Deleted app-id: ", appId);
};

//GET MOD CONTRACT
export const getModContract = async () => {
  console.log("Fetching Mod Contract...");
  let note = new TextEncoder().encode(contractParams.modContractNote);
  let encodedNote = Buffer.from(note).toString("base64");

  // Step 1: Get all transactions by notePrefix (+ minRound filter for performance)
  let transactionInfo = await contractParams.indexerClient
    .searchForTransactions()
    .notePrefix(encodedNote)
    .txType("appl")
    .minRound(contractParams.minRound)
    .address(contractParams.modCreator)
    .do();

  // NOTE: Adding the address tag in the indexerClient returns transactions from newest to oldest.
  // Hence after the first valid mod account, we break out of the loop
  // Only getting most recent modContract
  let modContract;
  for (const transaction of transactionInfo.transactions) {
    let appId = transaction["created-application-index"];
    if (appId) {
      // Step 2: Get application by application id
      let _modContract = await getModApplication(appId);
      if (_modContract) {
        modContract = _modContract;
        break;
      }
    }
  }
  console.log("Mod contract fetched..");
  return modContract;
};

const getModApplication = async (appId) => {
  try {
    let response = await contractParams.indexerClient
      .lookupApplications(appId)
      .includeAll(true)
      .do();

    if (response.application.deleted) {
      return null;
    }

    let globalState = response.application.params["global-state"];

    // Parse field of response and return contract
    let adoptFee = 0;

    if (getField("FEE", globalState) !== undefined) {
      adoptFee = getField("FEE", globalState).value.uint;
    }

    return new ModContract(appId, adoptFee);
  } catch {}
};

const getField = (fieldName, globalState) => {
  return globalState.find((state) => {
    return state.key === utf8ToBase64String(fieldName);
  });
};
