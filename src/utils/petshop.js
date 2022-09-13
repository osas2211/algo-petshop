import algosdk, { getApplicationAddress } from "algosdk";
import * as contractParams from "./constants";
/* eslint import/no-webpack-loader-syntax: off */
import petApprovalProgram from "!!raw-loader!../contracts/marketplace_approval.teal";
import petClearProgram from "!!raw-loader!../contracts/marketplace_clear.teal";
import modApprovalProgram from "!!raw-loader!../contracts/mod_approval.teal";
import modClearProgram from "!!raw-loader!../contracts/mod_clear.teal";
import { base64ToUTF8String, utf8ToBase64String } from "./conversions";

class ModContract {
  constructor(appId, adoptFee) {
    this.appId = appId;
    this.adoptFee = adoptFee;
  }
}
class Pet {
  constructor(
    appId,
    name,
    image,
    age,
    breed,
    location,
    adopted,
    owner,
    fee,
    appCreator
  ) {
    this.appId = appId;
    this.name = name;
    this.image = image;
    this.age = age;
    this.breed = breed;
    this.location = location;
    this.adopted = adopted; // 0 means false, 1 means true
    this.owner = owner;
    this.fee = fee;
    this.appCreator = appCreator;
  }
}

// Compile smart contract in .teal format to program
const compileProgram = async (programSource) => {
  let encoder = new TextDecoder();
  let programBytes = encoder.encode(programSource);
  let compileResponse = await contractParams.algodClient
    .compile(programBytes)
    .do();
  return new Uint8Array(Buffer.from(compileResponse.result, "base64"));
};

// INITIALIZE MOD CONTRACT
export const createModContract = async (senderAddress, fee) => {
  console.log("Adding Pet...");

  let params = await contractParams.algodClient.getTransactionParams().do();

  // Compile Programs
  const compiledApprovalProgram = await compileProgram(modApprovalProgram);
  const compiledClearProgram = await compileProgram(modClearProgram);

  // Build note to identify transaction later and required app args as Uint8Array
  let note = new TextEncoder.encode(contractParams.modContractNote);
  let fee_arg = new TextEncoder.encode(fee);

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
export const updateFeeAction = async (senderAddress, modContract, newPrice) => {
  console.log("Updating Price....");

  let params = await contractParams.algodClient.getTransactionParams().do();

  // Build required app args as Uint8Array
  let price = algosdk.encodeUint64(newPrice);
  let feeArg = new TextEncoder().encode("newFee");
  let appArgs = [feeArg, price];

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
export const getModContract = async (address) => {
  console.log("Fetching Pets...");
  let note = new TextEncoder().encode(contractParams.modContractNote);
  let encodedNote = Buffer.from(note).toString("base64");

  // Step 1: Get all transactions by notePrefix (+ minRound filter for performance)
  let transactionInfo = await contractParams.indexerClient
    .searchForTransactions()
    .notePrefix(encodedNote)
    .txType("appl")
    .minRound(contractParams.minRound)
    .address(address)
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
      adoptFee = getField("FEE", globalState).value.int;
    }

    return new ModContract(appId, adoptFee);
  } catch {}
};

//======================================================PET SECTION============================================================//

// CREATE PET: ApplicationCreateTxn
export const createPetAction = async (senderAddress, pet) => {
  console.log("Adding Pet...");

  let params = await contractParams.algodClient.getTransactionParams().do();

  // Compile Programs
  const compiledApprovalProgram = await compileProgram(petApprovalProgram);
  const compiledClearProgram = await compileProgram(petClearProgram);

  // Build note to identify transaction later and required app args as Uint8Array
  let note = new TextEncoder().encode(contractParams.petShopNote);
  let name = new TextEncoder().encode(pet.name);
  let image = new TextEncoder().encode(pet.image);
  let age = algosdk.encodeUint64(pet.age);
  let breed = new TextEncoder().encode(pet.breed);
  let location = new TextEncoder().encode(pet.location);

  let appArgs = [name, image, age, breed, location];

  let txn = algosdk.makeApplicationCreateTxnFromObject({
    from: senderAddress,
    suggestedParams: params,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    approvalProgram: compiledApprovalProgram,
    clearProgram: compiledClearProgram,
    numLocalInts: contractParams.numLocalInts,
    numLocalByteSlices: contractParams.numLocalBytes,
    numGlobalInts: contractParams.numGlobalInts,
    numGlobalByteSlices: contractParams.numGlobalBytes,
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

// ADOPT PET:
export const adoptPetAction = async (senderAddress, pet, modContract) => {
  console.log("Adopting pet...");

  let params = await contractParams.algodClient.getTransactionParams().do();

  // Build required app args as Uint8Array
  let adoptArg = new TextEncoder().encode("adopt");
  let appArgs = [adoptArg];

  // Create ApplicationCallTxn
  let appCallTxn = algosdk.makeApplicationCallTxnFromObject({
    from: senderAddress,
    appIndex: pet.appId,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    suggestedParams: params,
    appArgs: appArgs,
    foreignApps: modContract.appId,
  });

  // Create PaymentTxn
  let paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: senderAddress,
    to: pet.owner,
    amount: modContract.adoptFee,
    suggestedParams: params,
  });

  let txnArray = [appCallTxn, paymentTxn];

  // Create group transaction out of previously build transactions
  let groupID = algosdk.computeGroupID(txnArray);
  for (let i = 0; i < 2; i++) txnArray[i].group = groupID;

  // Sign & submit the group transaction
  let signedTxn = await contractParams.myAlgoConnect.signTransaction(
    txnArray.map((txn) => txn.toByte())
  );
  console.log("Signed group transaction");
  let tx = await contractParams.algodClient
    .sendRawTransaction(signedTxn.map((txn) => txn.blob))
    .do();

  // Wait for group transaction to be confirmed
  let confirmedTxn = await algosdk.waitForConfirmation(
    contractParams.algodClient,
    tx.txId,
    4
  );

  // Notify about completion
  console.log(
    "Group transaction " +
      tx.txId +
      " confirmed in round " +
      confirmedTxn["confirmed-round"]
  );
};

// DELETE PET
export const deletePetAction = async (senderAddress, index) => {
  console.log("Deleting application");

  let params = await contractParams.algodClient.getTransactionParams().do();

  // Create ApplicationDeleteTxn
  let txn = algosdk.makeApplicationDeleteTxnFromObject({
    from: senderAddress,
    suggestedParams: params,
    appIndex: index,
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

// GET PETS: Using Indexer
export const getPetsAction = async () => {
  console.log("Fetching Pets...");
  let note = new TextEncoder().encode(contractParams.petShopNote);
  let encodedNote = Buffer.from(note).toString("base64");

  // Step 1: Get all transactions by notePrefix (+ minRound filter for performance)
  let transactionInfo = await contractParams.indexerClient
    .searchForTransactions()
    .notePrefix(encodedNote)
    .txType("appl")
    .minRound(contractParams.minRound)
    .do();

  let pets = [];
  for (const transaction of transactionInfo.transactions) {
    let appId = transaction["created-application-index"];
    if (appId) {
      // Step 2: Get each application by application id
      let pet = await getApplication(appId);
      if (pet) {
        pets.push(pet);
      }
    }
  }
  console.log("Pets Fetched...");
  return pets;
};

const getApplication = async (appId) => {
  try {
    // 1. Get application by appId
    let response = await contractParams.indexerClient
      .lookupApplications(appId)
      .includeAll(true)
      .do();
    if (response.application.deleted) {
      return null;
    }

    let globalState = response.application.params["global-state"];

    // 2. Parse fields of response and return product
    let appCreator = response.application.params.creator;
    let name = "";
    let image = "";
    let age = 0;
    let breed = "";
    let location = "";
    let adopted = 0;
    let owner = "";
    let fee = 0;

    if (getField("NAME", globalState) !== undefined) {
      let field = getField("NAME", globalState).value.bytes;
      name = base64ToUTF8String(field);
    }

    if (getField("IMAGE", globalState) !== undefined) {
      let field = getField("IMAGE", globalState).value.bytes;
      image = base64ToUTF8String(field);
    }

    if (getField("AGE", globalState) !== undefined) {
      age = getField("AGE", globalState).value.int;
    }

    if (getField("BREED", globalState) !== undefined) {
      let field = getField("BREED", globalState).value.bytes;
      breed = base64ToUTF8String(field);
    }

    if (getField("LOCATION", globalState) !== undefined) {
      let field = getField("LOCATION", globalState).value.bytes;
      location = base64ToUTF8String(field);
    }

    if (getField("ADOPTED", globalState) !== undefined) {
      adopted = getField("ADOPTED", globalState).value.int;
    }

    if (getField("OWNER", globalState) !== undefined) {
      let field = getField("OWNER", globalState).value.bytes;
      owner = base64ToUTF8String(field);
    }

    if (getField("ADOPT_FEE", globalState) !== undefined) {
      fee = getField("ADOPT_FEE", globalState).value.int;
    }

    return new Pet(
      appId,
      name,
      image,
      age,
      breed,
      location,
      adopted,
      owner,
      fee,
      appCreator
    );
  } catch (err) {
    return null;
  }
};

const getField = (fieldName, globalState) => {
  return globalState.find((state) => {
    return state.key === utf8ToBase64String(fieldName);
  });
};
