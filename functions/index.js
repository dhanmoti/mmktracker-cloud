const functions = require("firebase-functions");
const https = require("https");
const Firestore = require("@google-cloud/firestore");
const PROJECTID = "mmk-tracker-1d212";
const COLLECTION_NAME = "latest";

const firestore = new Firestore({
  projectId: PROJECTID,
  timestampsInSnapshots: true,
});


exports.scheduledFetch = functions.pubsub.schedule("every 5 minutes")
    .onRun((context) => {
      fetch();
      return null;
    });


/**
 * fetch MMK rates using central bank API
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
      updateFirestoreCollection(rates);
    });
  }).on("error", (err) => {
    console.log("Error: ", err.message);
  });
}


/**
 * Save to firestore collection
 * @Param {object} rates
 **/
function updateFirestoreCollection(rates) {
  firestore.collection(COLLECTION_NAME)
      .doc("DUfouoDfgdutuOZs4opA")
      .update({rates})
      .then((doc) => {
        console.info("stored new doc");
      }).catch((err) => {
        console.error(err);
      });
}
