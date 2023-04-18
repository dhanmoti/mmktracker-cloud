const functions = require("firebase-functions");
const https = require("https");
const Firestore = require("@google-cloud/firestore");
const PROJECTID = "mmk-tracker-1d212";
const COLLECTION_NAME = "central-bank-mm";

const firestore = new Firestore({
	projectId: PROJECTID,
	timestampsInSnapshots: true,
});

// Test decorate the value of "/latest-rates" 
exports.mmkRates = functions.https.onRequest(async (req, res) => {
	//TODO: create separate func for below func
	//fetchCurrenciesCodeMap();
	try {
		const latestRatesRef = firestore.collection(COLLECTION_NAME).doc('latest-rates');
		const latestRates = await latestRatesRef.get();
		const result = await decorateObj(latestRates.data());
		const jsonObj = JSON.stringify(result)
		res.send(jsonObj);
	} catch (e) {
		console.log(e);
		res.json({
			"error": "Fail to fetch latest-rates"
		});
	}

});

exports.onUpdateTrigger = functions.firestore
	.document("/central-bank-mm/latest-rates")
	.onUpdate(async (change, eventContext) => {
		// Data before update and after update
		const newValue = change.after.data();
		console.log(newValue);
		try {
			const decoratedValue = await decorateObj(newValue);
			console.log(decoratedValue);
			updateDecoratedValue(decoratedValue);
			return null;
		}
		catch(e){
			console.log(e);
			return null;
		}
		
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
	* Return decorated json for mobile clients
	* @Param {object} latestRates
	**/
async function decorateObj(latestRates) {
	//get curren

	const currenciesRef = firestore.collection(COLLECTION_NAME).doc('currency-code-map');
	const currenciesValueRef = firestore.collection(COLLECTION_NAME).doc('currency-value-map');
	//	const latestRatesRef = firestore.collection(COLLECTION_NAME).doc('latest-rates');

	const currenciesMap = await currenciesRef.get();
	const currenciesValueMap = await currenciesValueRef.get();
	//const latestRates = await latestRatesRef.get();

	var array = []
	var rates = latestRates["rates"]
	
	var map = currenciesMap.data()
	var valueMap = currenciesValueMap.data()
	for (const [key, value] of Object.entries(rates)) {
		var base = "1";
		if (key in valueMap) {
			base = valueMap[key];
		}

		var obj = {
			"code": key,
			"rate": value,
			"title": map[key],
			"base": base
		}
		array.push(obj);
	}

	var fetchedTime = new Date();
	var finalObj = {
		"rates": array,
		"lastUpdate": fetchedTime
	}

	
	return finalObj;

}

/**
	* Update decorated json for mobile clients
	* @Param {object} newRates
	**/
function updateDecoratedValue(newRates) {
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
