var apis = {
  toneAnalyzer: {
	// Enter your Watson Tone Analyzer API credentials here.
	auth: { username: "{user-name}", password: "{password}" },
	mainURI: "gateway.watsonplatform.net/tone-analyzer/api/v3/tone"
  },
};
MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

apis.toneAnalyzer.auth.cred = btoa(apis.toneAnalyzer.auth.username + ":" + apis.toneAnalyzer.auth.password);

function callWatsonAPI(options, successCallback, errorCallback) {
	fetch(options.uri, {
		method: options.method,
		headers: {
			"Authorization": "Basic " + options.cred,
			"Content-Type" : options.reqType,
			"Accept": options.respType
		},
		body: options.body
	}).then(function (response) {
		if (response.status === 200 || response.status === 206) {
			if (options.respType === "application/json") {
				response.json().then(successCallback);
			}
			else {
				response.text().then(successCallback);
			}
		}
		else if (response.status === 403) {
			errorCallback("FORBIDDEN");
		}
		else if (response.status === 404) {
			errorCallback("NOT_FOUND");
		}
		else {
			errorCallback("FAILED");
		}
	});
}

function analyzeTone(options, successCallback, errorCallback) {
	var jsonData = {
		"text": options.text
	}
	options.method = "POST";
	options.reqType = "application/json",
	options.respType = "application/json";
	options.body = JSON.stringify(jsonData);
	options.uri = "https://" + apis.toneAnalyzer.mainURI + "?version=2016-05-19";
	options.cred = apis.toneAnalyzer.auth.cred;
	callWatsonAPI(options, function (resp) {
		var tones = resp.document_tone.tone_categories[0].tones;
		// Sort descending by score.
		tones.sort(function (a, b) {
			return b.score - a.score;
		});
		successCallback(tones);
	}, errorCallback);
}

function addToHTML(options) {
	var div = document.createElement("div");
	div.id = "emotion";
	div.style.height = "20px;";
	div.style.padding = "10px";
	div.style['font-family'] = "helvetica";
	div.style['font-size'] = "0.9em";
	div.style['align-items'] = "baseline";
	div.style["text-align"] = "center";
	div.style["font-weight"] = "700";
	var title = document.createElement("span");
	title.innerHTML = "Emotional Analysis: ";
	div.appendChild(title);
	
	if (options.text instanceof Array) {
		options.text.forEach(function (text, index, array) {
			var emotionName = document.createElement("span");
			var color = "#000000";
			switch (text.tone_name) {
				case "Joy":
					color = "#FFCE00";
					break;
				case "Sadness":
					color = "#086DB2";
					break;
				case "Anger":
					color = "#E80521";
					break;
				case "Fear":
					color = "#325E2B";
					break;
				case "Disgust":
					color = "#592684";
					break;
			}
			emotionName.style["color"] = color;
			emotionName.innerHTML = text.tone_name;
			div.appendChild(emotionName);
			var emotionScore = document.createElement("span");
			emotionScore.innerHTML = " (" + (text.score * 100).toFixed(0) + "%)";
			if (index != array.length - 1) {
				emotionScore.innerHTML += ",";
			}
			emotionScore.innerHTML += " ";
			div.appendChild(emotionScore);
		});
	}
	else {
		var error = document.createElement("span");
		error.style["color"] = "#cd0a0a";
		error.innerHTML = options.error;
		div.appendChild(error);
	}
	options.node.appendChild(div);
}

function addToneToMail(options) {
	analyzeTone(options, function (texts) {
		options.text = texts;
		addToHTML(options);
	}, function (error) {
		options.text = "Unexpected Error";
		addToHTML(options);
	})
	
}

function findAncestor(currNode, classLookup) {
	if (currNode.className == classLookup) {
		return currNode;
	}
	else {
		var foundNode = undefined;
		currNode.childNodes.forEach(function (childNode) {
			if (foundNode === undefined) {
				foundNode = findAncestor(childNode, classLookup);
			}
		});
		return foundNode;
	}
}

var listeners = new Array();

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    if (msg.type && msg.type === 'url-update' &&
		!listeners.some(function (elem) { return elem == msg.tabId })) {
	    // Don't listen to the same tab twice.
		listeners.push(msg.tabId);
		// Listen for changes in webpage.
		var observer = new MutationObserver(function(mutations, observer) {
			var foundNode = undefined;
			mutations.forEach(function(mutation) {
				var currNode = mutation.target;
				// Get the element of the opened email.
				if (currNode.nodeName.toLowerCase() === "div" &&
					currNode.classList.contains("pA") &&
					// Emotion analysis wasn't already added.
					(!currNode.lastChild || currNode.lastChild.id !== "emotion")) {
					// Either an element wasn't already found or 
					// the current element is the selected email in a conversation chain.
					if (foundNode === undefined ||
						(currNode.parentNode && currNode.parentNode.classList.contains("eg"))) {
						foundNode = currNode;
					}
				}
			});
			if (foundNode) {
				// Find email's text.
				var textNode = findAncestor(foundNode, "gmail_msg");
				if (textNode) {
					console.dir({ parent: foundNode, text: textNode.innerText });
					addToneToMail({ text: textNode.innerText, node: foundNode });
				}
			}
		});
		// Define what element should be observed by the observer
		// and what types of mutations trigger the callback.
		observer.observe(document.body, {
		  subtree: true,
		  attributes: true
		});
    }
});
