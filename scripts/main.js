// Filter to page: https://inbox.google.com/
var rxLookfor = /^https\:\/\/inbox\.google\.com\//;
// Listen for tab updates.
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === "complete" && 
	    rxLookfor.test(tab.url)) {
        chrome.tabs.sendMessage(tabId, { type: 'url-update', tabId: tabId });
    }
});
// Listen for tab switches.
chrome.tabs.onActivated.addListener(function(changeInfo) {
	var tab = chrome.tabs.get(changeInfo.tabId, function(tab) {
		var tabId = changeInfo.tabId;
        if (rxLookfor.test(tab.url)) {
			chrome.tabs.sendMessage(tabId, { type: 'url-update', tabId: tabId });
		}
    });
});


