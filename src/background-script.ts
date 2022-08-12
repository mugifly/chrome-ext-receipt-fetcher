chrome.action.onClicked.addListener(() => {
  chrome.windows.create({
    url: 'index.html',
    width: 800,
    height: 600,
  });
});
