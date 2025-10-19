if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}

function initialize() {
  console.log("即梦批量文生图工具已加载");

  if (typeof window.shouldStopProcessing === "undefined") {
    window.shouldStopProcessing = false;
  }

  window.addEventListener("beforeunload", () => {
    window.shouldStopProcessing = true;
  });

  window.addEventListener("error", (event) => {
    if (event.message?.includes?.("Extension context invalidated")) {
      console.warn("检测到扩展上下文失效，忽略此次报错");
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (
      event.reason &&
      event.reason.message &&
      event.reason.message.includes("Extension context invalidated")
    ) {
      console.warn("忽略扩展上下文失效的未处理Promise错误");
      event.preventDefault();
    }
  });

  if (chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
      if (request.action === "processPrompt") {
        try {
          await processPromptWithReferences(request);
          sendResponse({ success: true });
        } catch (error) {
          console.error("处理提示词失败:", error);
          sendResponse({ success: false, error: error.message });
        }
      }
    });
  }

  document.addEventListener("processJimengPrompt", async (event) => {
    const detail = event.detail || {};
    try {
      await processPromptWithReferences(detail);
      document.dispatchEvent(
        new CustomEvent("jimengPromptProcessed", {
          detail: { index: detail.index, success: true },
        })
      );
    } catch (error) {
      console.error(`第${detail.index}个提示词处理失败:`, error);
      document.dispatchEvent(
        new CustomEvent("jimengPromptProcessed", {
          detail: { index: detail.index, success: false, error: error.message },
        })
      );
    }
  });
}

async function processPromptWithReferences(detail = {}) {
  const {
    referenceImages = [],
    prompt = "",
    rawPrompt = "",
    index = 0,
    total = 0,
    waitTime = 5000,
  } = detail;

  const promptText = prompt || rawPrompt || "";
  console.log(
    `[Jimeng] 开始处理第${index}/${total}个提示词`,
    promptText,
    referenceImages.map((item) => item?.name).filter(Boolean)
  );

  if (window.shouldStopProcessing) {
    console.log("检测到停止信号，跳过处理");
    return;
  }

  await waitForDocumentReady();

  if (!window.location.href.includes("jimeng.jianying.com/ai-tool/generate")) {
    throw new Error(
      "当前页面不是即梦文生图页面，请打开 https://jimeng.jianying.com/ai-tool/generate"
    );
  }

  await delay(200);

  updateStepStatus(0, "completed");
  updateStepStatus(1, "current");
  await clearExistingReferences();
  updateStepStatus(1, "completed");

  if (window.shouldStopProcessing) {
    console.log("检测到停止信号，已在清理阶段停止");
    return;
  }

  if (referenceImages.length > 0) {
    updateStepStatus(2, "current");
    await uploadReferenceImages(referenceImages);
    updateStepStatus(2, "completed");
  } else {
    console.log("本次提示词没有匹配到参考图，跳过上传");
    updateStepStatus(2, "completed");
  }

  if (window.shouldStopProcessing) {
    console.log("检测到停止信号，已在上传后停止");
    return;
  }

  updateStepStatus(3, "current");
  await enterPrompt(promptText);
  updateStepStatus(3, "completed");

  if (window.shouldStopProcessing) {
    console.log("检测到停止信号，已在输入阶段停止");
    return;
  }

  updateStepStatus(4, "current");
  await clickSubmitButton();
  updateStepStatus(4, "completed");

  if (window.shouldStopProcessing) {
    console.log("检测到停止信号，已在提交阶段停止");
    return;
  }

  updateStepStatus(5, "current");
  await delay(Math.max(waitTime || 0, 500));
  updateStepStatus(5, "completed");

  console.log(`[Jimeng] 第${index}/${total}个提示词处理完成`);
}

function updateStepStatus(stepIndex, status) {
  document.dispatchEvent(
    new CustomEvent("updateStep", {
      detail: { stepIndex, status },
    })
  );
}

async function waitForDocumentReady() {
  if (document.readyState === "complete") {
    return;
  }

  await new Promise((resolve) => {
    window.addEventListener("load", resolve, { once: true });
  });
}

async function clearExistingReferences(maxRounds = 5) {
  for (let round = 0; round < maxRounds; round++) {
    if (window.shouldStopProcessing) {
      return;
    }

    let containers = getRemoveButtonContainers();

    if (!containers.length) {
      const referenceItems = Array.from(
        document.querySelectorAll(
          'div[class^="reference-item-"], div[class*=" reference-item-"]'
        )
      );
      if (referenceItems.length) {
        referenceItems.forEach((item) => hoverElement(item));
        await delay(120);
        containers = getRemoveButtonContainers();
      }
    }

    if (!containers.length) {
      if (round === 0) {
        console.log("未检测到参考图，无需清理");
      }
      return;
    }

    console.log(`检测到 ${containers.length} 个参考图，将逐个移除`);
    for (const container of containers) {
      if (window.shouldStopProcessing) {
        return;
      }

      const referenceItem = container.closest?.(
        'div[class^="reference-item-"], div[class*=" reference-item-"]'
      );
      if (referenceItem) {
        hoverElement(referenceItem);
        await delay(80);
      }

      await triggerClick(container);

      const innerTarget =
        container.querySelector("button, [role='button']") ||
        container.querySelector('[class^="remove-button-"]') ||
        container.firstElementChild;

      if (innerTarget) {
        await triggerClick(innerTarget);
      }

      await waitForCondition(
        () =>
          !container.isConnected ||
          !document.body.contains(container) ||
          container.offsetParent === null,
        1500,
        100
      ).catch(() => {});

      await delay(300);
    }

    await delay(400);
  }

  if (getRemoveButtonContainers().length > 0) {
    console.warn("仍有参考图未移除，可能需要手动确认");
  }
}

function getRemoveButtonContainers() {
  return Array.from(
    document.querySelectorAll(
      'div[class^="remove-button-container-"], div[class*=" remove-button-container-"]'
    )
  );
}

async function uploadReferenceImages(referenceImages = []) {
  if (!referenceImages.length) {
    return;
  }

  const uploadBox = await waitForVisibleElement(
    "div.reference-upload-eclumn",
    5000
  );

  if (!uploadBox) {
    throw new Error("未找到参考图上传区域");
  }

  const input = await findNearestFileInput(uploadBox, 4000);
  if (!input) {
    throw new Error("未找到参考图上传控件");
  }

  const dataTransfer = new DataTransfer();
  referenceImages.forEach((item, index) => {
    if (!item?.dataUrl) {
      console.warn(`参考图数据缺失，已跳过第 ${index + 1} 张`);
      return;
    }
    const filename = item.name || `reference-${index + 1}.png`;
    try {
      const file = dataURLtoFile(item.dataUrl, filename);
      dataTransfer.items.add(file);
    } catch (error) {
      console.warn(`参考图 ${filename} 转换失败，已跳过`, error);
    }
  });

  if (!dataTransfer.files.length) {
    console.warn("没有有效的参考图需要上传");
    return;
  }

  input.files = dataTransfer.files;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));

  await waitForCondition(
    () => getRemoveButtonContainers().length >= dataTransfer.files.length,
    8000,
    300
  ).catch(() => {
    console.warn("参考图上传状态未能确认，将继续后续流程");
  });
}

async function enterPrompt(promptText) {
  const textarea =
    (await waitForVisibleElement("textarea.lv-textarea", 5000)) ||
    (await waitForVisibleElement(
      'textarea, div[contenteditable="true"], input[type="text"]',
      5000
    ));

  if (!textarea) {
    throw new Error("未找到提示词输入框");
  }

  focusElement(textarea);

  if (textarea instanceof HTMLTextAreaElement || textarea instanceof HTMLInputElement) {
    setNativeValue(textarea, "");
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
    await delay(100);
    setNativeValue(textarea, promptText);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
  } else if (textarea.isContentEditable) {
    textarea.textContent = "";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await delay(100);
    textarea.textContent = promptText;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
  } else {
    textarea.value = promptText;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

async function clickSubmitButton() {
  const selectors = [
    'button[class^="submit-button-"]',
    'button[class*=" submit-button-"]',
    '[class^="submit-button-"] button',
    '[class*=" submit-button-"] button',
    '[class^="submit-button-"][role="button"]',
    '[class*=" submit-button-"][role="button"]',
  ];

  let button = null;

  for (const selector of selectors) {
    const found = await waitForVisibleElement(selector, 2000);
    if (!found) {
      continue;
    }

    if (found.matches?.("button") || found.matches?.('[role="button"]')) {
      button = found;
      break;
    }

    const inner = found.querySelector?.("button, [role='button']");
    if (inner) {
      button = inner;
      break;
    }
  }

  if (!button) {
    const fallback = await findElementByText(
      ["button", '[role="button"]', "span", "div"],
      "生成",
      2000
    );
    if (fallback) {
      button =
        fallback.closest?.("button, [role='button']") ||
        fallback;
    }
  }

  if (!button) {
    throw new Error("未找到提交按钮");
  }

  await triggerClick(button);
  await delay(300);
}

async function waitForVisibleElement(selector, timeout = 5000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (window.shouldStopProcessing) {
      return null;
    }

    const elements = Array.from(document.querySelectorAll(selector)).filter(
      isVisibleElement
    );
    if (elements.length) {
      return elements[0];
    }

    await delay(100);
  }

  return null;
}

async function waitForCondition(predicate, timeout = 5000, interval = 200) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (window.shouldStopProcessing) {
      return false;
    }

    if (predicate()) {
      return true;
    }
    await delay(interval);
  }

  throw new Error("等待状态变化超时");
}

async function triggerClick(element) {
  if (!element || typeof element !== "object") {
    return;
  }

  try {
    if (typeof element.click === "function") {
      element.click();
    }
  } catch (error) {
    console.warn("元素 click() 调用失败，尝试派发事件", error);
  }

  element.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true })
  );
}

function focusElement(element) {
  if (!element || typeof element.focus !== "function") {
    return;
  }

  try {
    element.focus({ preventScroll: true });
  } catch (error) {
    try {
      element.focus();
    } catch (innerError) {
      console.warn("元素 focus() 调用失败:", innerError);
    }
  }
}

function hoverElement(element) {
  if (!element) {
    return;
  }

  const events = ["mouseover", "mouseenter"];
  events.forEach((type) => {
    element.dispatchEvent(
      new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
      })
    );
  });
}

async function findNearestFileInput(container, timeout = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const input = locateFileInput(container);
    if (input) {
      return input;
    }
    await delay(100);
  }
  return null;
}

function locateFileInput(container) {
  const scopes = [];
  if (container instanceof Element) {
    let current = container;
    while (current) {
      scopes.push(current);
      current = current.parentElement;
    }
  }
  scopes.push(document.body);

  for (const scope of scopes) {
    if (!scope) continue;
    const inputs = Array.from(scope.querySelectorAll('input[type="file"]')).filter(
      (input) =>
        !input.disabled && !input.closest("#kling-floating-window")
    );
    if (!inputs.length) {
      continue;
    }

    const preferred =
      inputs.find((input) => {
        const accept = (input.getAttribute("accept") || "").toLowerCase();
        return accept.includes("image");
      }) || inputs[0];

    if (preferred) {
      return preferred;
    }
  }
  return null;
}

function setNativeValue(element, value) {
  if (!element) {
    return;
  }

  const prototype = Object.getPrototypeOf(element);
  const descriptor =
    (prototype && Object.getOwnPropertyDescriptor(prototype, "value")) ||
    Object.getOwnPropertyDescriptor(element, "value");

  const setter = descriptor?.set;
  if (setter) {
    setter.call(element, value);
  } else {
    element.value = value;
  }
}

function delay(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isVisibleElement(element) {
  if (!element) {
    return false;
  }

  if (element.closest && element.closest("#kling-floating-window")) {
    return false;
  }

  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") {
    return false;
  }

  if (parseFloat(style.opacity) === 0) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 1 && rect.height > 1;
}

async function findElementByText(selectors, text, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const matches = findElementsByText(selectors, text).filter(isVisibleElement);
    if (matches.length > 0) {
      return matches[0];
    }
    await delay(100);
  }
  return null;
}

function findElementsByText(selectors, text) {
  if (!Array.isArray(selectors)) {
    selectors = [selectors];
  }

  const normalizedTarget = normalizeText(text);
  const results = [];

  selectors.forEach((selector) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((element) => {
      if (element.closest?.("#kling-floating-window")) {
        return;
      }
      const elementText = normalizeText(element.textContent || "");
      if (elementText.includes(normalizedTarget)) {
        results.push(element);
      }
    });
  });

  return results;
}

function normalizeText(text) {
  return (text || "").replace(/\s+/g, "");
}

function dataURLtoFile(dataurl, filename) {
  const [meta, content] = dataurl.split(",");
  const mimeMatch = meta.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const binary = atob(content);
  const array = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }

  return new File([array], filename, { type: mime });
}
