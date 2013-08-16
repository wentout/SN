
var show = function () {
	chrome.tabs.create({
		url : './index.html',
		selected : true
	}, function (tab) {});
};

chrome.browserAction.onClicked.addListener(function(tab) {
	show();
});
