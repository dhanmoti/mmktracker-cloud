const functions = require("firebase-functions");
const https = require("https");
const Firestore = require("@google-cloud/firestore");
const PROJECTID = "mmk-tracker-1d212";
const COLLECTION_NAME = "central-bank-mm";

const firestore = new Firestore({
  projectId: PROJECTID,
  timestampsInSnapshots: true,
});


exports.onUpdateTrigger = functions.firestore
    .document("/central-bank-mm/latest-rates")
    .onUpdate((change, eventContext) => {
      // Data before update and after update
      const newValue = change.after.data();
      console.log(newValue);
      updateDecoratedJson(newValue);
      fetchCurrenciesCodeMap();
      return null;
    });

exports.scheduledFetch = functions.pubsub.schedule("every 5 minutes")
    .onRun((context) => {
      fetch();
      return null;
    });


/**
 * fetch MMK rates using central bank API
 * https://forex.cbm.gov.mm/index.php/fxrate
 **/
function fetch() {
  https.get("https://forex.cbm.gov.mm/api/latest", (res) => {
    const data = [];
    console.log("Status Code:", res.statusCode);

    res.on("data", (chunk) => {
      data.push(chunk);
    });

    res.on("end", () => {
      console.log("Response ended: ");
      const rates = JSON.parse(Buffer.concat(data).toString());
      console.log("Rates");
      console.log(rates);
      updateLatestRates(rates);
    });
  }).on("error", (err) => {
    console.log("Error: ", err.message);
  });
}


/**
 * Save to firestore collection
 * @Param {object} rates
 **/
function updateLatestRates(rates) {
  firestore.collection(COLLECTION_NAME)
      .doc("latest-rates")
      .update(rates)
      .then((doc) => {
        console.info("stored new doc");
      }).catch((err) => {
        console.error(err);
      });
}

/**
 * Decorate json for mobile clients
 * @Param {object} newRates
 **/
function updateDecoratedJson(newRates) {
  firestore.collection(COLLECTION_NAME)
      .doc("decorated-currencies-rates")
      .update(newRates)
      .then((doc) => {
        console.info("stored new doc");
      }).catch((err) => {
        console.error(err);
      });
}

/**
 * fetch MMK rates using central bank API
 * https://forex.cbm.gov.mm/index.php/fxrate
 **/
function fetchCurrenciesCodeMap() {
  https.get("https://forex.cbm.gov.mm/api/currencies", (res) => {
    const data = [];
    console.log("Status Code:", res.statusCode);
    res.on("data", (chunk) => {
      data.push(chunk);
    });

    res.on("end", () => {
      console.log("Response ended: ");
      const currenciesMap = JSON.parse(Buffer.concat(data).toString());
      updateFirestoreCollectionCurrenciesMap(currenciesMap["currencies"]);
    });
  }).on("error", (err) => {
    console.log("Error: ", err.message);
  });
}


/**
 * Save to firestore collection
 * @Param {object} map
 **/
function updateFirestoreCollectionCurrenciesMap(map) {
  firestore.collection(COLLECTION_NAME)
      .doc("currency-code-map")
      .update(map)
      .then((doc) => {
        console.info("stored new doc");
      }).catch((err) => {
        console.error(err);
      });
}
