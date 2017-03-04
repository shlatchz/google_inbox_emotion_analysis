// Filter to page: https://inbox.google.com/?pli=1
var rxLookfor = /^https\:\/\/inbox\.google\.com\/\?pli=1$/;
// Listen for tab updates.
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === "complete" && 
	    rxLookfor.test(tab.url)) {
		console.log({ action: "onUpdated" , tabId: tabId, url: tab.url });
        chrome.tabs.sendMessage(tabId, { type: 'url-update', tabId: tabId });
    }
});
// Listen for tab switches.
chrome.tabs.onActivated.addListener(function(changeInfo) {
	var tab = chrome.tabs.get(changeInfo.tabId, function(tab) {
		var tabId = changeInfo.tabId;
        if (rxLookfor.test(tab.url)) {
			console.log({ action: "onActivated" , tabId: tabId, url: tab.url });
			chrome.tabs.sendMessage(tabId, { type: 'url-update', tabId: tabId });
		}
    });
});


