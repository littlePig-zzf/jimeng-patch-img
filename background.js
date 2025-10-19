// background.js - 后台脚本
chrome.runtime.onInstalled.addListener(() => {
  console.log("即梦批量文生图工具 v1.0.0 已安装");
});

// 点击插件图标时打开悬浮窗口
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url && tab.url.includes("jimeng.jianying.com/ai-tool/generate")) {
    // 在当前标签页执行脚本打开悬浮窗口
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        if (window.floatingWindow) {
          window.floatingWindow.show();
        } else if (window.initFloatingWindow) {
          window.initFloatingWindow().show();
        } else {
          // 如果悬浮窗口未初始化，重新创建
          const event = new Event("reinitFloatingWindow");
          document.dispatchEvent(event);
        }
      },
    });
  } else {
    // 如果不是即梦文生图页面，打开新标签页
    chrome.tabs.create({ url: "https://jimeng.jianying.com/ai-tool/generate" });
  }
});
