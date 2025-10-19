// 可移动悬浮窗口实现
class FloatingWindow {
  constructor() {
    this.isDragging = false;
    this.currentX = 0;
    this.currentY = 0;
    this.initialX = 0;
    this.initialY = 0;
    this.xOffset = 0;
    this.yOffset = 0;

    // 处理状态变量
    this.isProcessing = false;
    this.shouldStop = false;
    this.referenceFiles = [];
    this.referenceLookup = this.buildReferenceLookup([]);

    this.createFloatingWindow();
    this.loadSettings();
  }

  createFloatingWindow() {
    // 创建悬浮窗口容器
    this.window = document.createElement("div");
    this.window.id = "kling-floating-window";
    this.window.innerHTML = `
            <div class="floating-header">
                <span class="floating-title">即梦批量文生图工具</span>
                <div class="floating-controls">
                    <button class="floating-minimize" title="最小化" id="minimize-btn">−</button>
                    <button class="floating-close" title="关闭" id="close-btn">×</button>
                </div>
            </div>
            <div class="floating-content">
                <div class="form-group">
                    <label>选择参考图文件夹:</label>
                    <input type="file" id="floating-folder-input" webkitdirectory directory multiple accept="image/*" style="display: none;">
                    <button id="floating-folder-btn" class="folder-btn">选择文件夹</button>
                    <div id="selected-folder" class="folder-info">未选择文件夹</div>
                    <div id="folder-preview" class="folder-preview">
                        <div class="preview-placeholder">选择文件夹后将展示前3张参考图预览</div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>等待时间 (秒):</label>
                    <input type="number" id="floating-wait-time" value="3" min="3" max="30" class="wait-input">
                    <div class="speed-hint">建议设置3-15秒，避免操作过快导致网站提示</div>
                </div>
                
                <div class="form-group">
                    <label>提示词 (每行一个):</label>
                    <textarea id="floating-prompts" placeholder="每行输入一个提示词，可在行首写参考图名称，例如：001|提示词内容" class="prompt-textarea"></textarea>
                </div>
                
                <div class="floating-actions">
                    <button id="floating-start-btn" class="action-btn primary">开始自动提交</button>
                    <button id="floating-clear-btn" class="action-btn secondary">清空</button>
                </div>
                
                <div id="floating-steps" class="steps-display"></div>
                <div id="floating-status" class="status-message"></div>
            </div>
        `;

    // 添加样式
    this.addStyles();
    document.body.appendChild(this.window);

    // 绑定事件
    this.bindEvents();

    // 初始化最小化状态
    this.isMinimized = false;
  }

  addStyles() {
    const style = document.createElement("style");
    style.textContent = `
            #kling-floating-window {
                position: fixed;
                top: 100px;
                right: 20px;
                width: 380px;
                background: #ffffff;
                border: none;
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                font-size: 14px;
                cursor: move;
                backdrop-filter: blur(10px);
                overflow: hidden;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .floating-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 16px 20px;
                border-radius: 16px 16px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
                min-height: 48px;
                box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
            }

            .floating-title {
                font-weight: 600;
                cursor: move;
                font-size: 15px;
                letter-spacing: 0.3px;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            }

            .floating-controls {
                display: flex;
                gap: 8px;
                align-items: center;
            }

            .floating-minimize, .floating-close {
                background: rgba(255, 255, 255, 0.15);
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.2s ease;
                backdrop-filter: blur(10px);
            }

            .floating-minimize:hover, .floating-close:hover {
                background: rgba(255, 255, 255, 0.25);
                transform: scale(1.1);
            }

            .floating-close:hover {
                background: rgba(239, 68, 68, 0.9);
            }

            #kling-floating-window.minimized {
                height: auto !important;
                width: 280px !important;
            }

            #kling-floating-window.minimized .floating-content {
                display: none !important;
            }

            #kling-floating-window.minimized .floating-header {
                border-radius: 16px !important;
            }

            #kling-floating-window.minimized .floating-controls {
                margin-left: auto;
            }

            .floating-content {
                padding: 20px;
                cursor: default;
                background: #ffffff;
            }

            .form-group {
                margin-bottom: 20px;
            }

            .form-group label {
                display: block;
                margin-bottom: 8px;
                font-weight: 600;
                color: #374151;
                font-size: 13px;
                letter-spacing: 0.3px;
            }

            .folder-btn, .action-btn {
                width: 100%;
                padding: 12px 16px;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s ease;
                letter-spacing: 0.3px;
            }

            .folder-btn {
                background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
                color: #374151;
                border: 2px solid #e5e7eb;
            }

            .folder-btn:hover {
                background: linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%);
                border-color: #d1d5db;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }

            .action-btn.primary {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            }

            .action-btn.primary:hover {
                background: linear-gradient(135deg, #059669 0%, #047857 100%);
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
            }

            .action-btn.secondary {
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                color: white;
                margin-top: 8px;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            }

            .action-btn.secondary:hover {
                background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
            }

            .wait-input, .prompt-textarea {
                width: 100%;
                padding: 10px 14px;
                border: 2px solid #e5e7eb;
                border-radius: 10px;
                font-size: 14px;
                box-sizing: border-box;
                color: #1f2937;
                transition: all 0.2s ease;
                font-family: inherit;
            }

            .wait-input:focus, .prompt-textarea:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }

            .speed-hint {
                font-size: 12px;
                color: #6b7280;
                margin-top: 6px;
                line-height: 1.5;
            }

            .wait-input {
                height: 40px;
            }

            .prompt-textarea {
                height: 90px;
                resize: vertical;
                line-height: 1.5;
            }

            .folder-info {
                margin-top: 8px;
                font-size: 12px;
                color: #6b7280;
                word-break: break-all;
                padding: 8px 12px;
                background: #f9fafb;
                border-radius: 8px;
                border-left: 3px solid #667eea;
            }

            .folder-preview {
                margin-top: 10px;
                padding: 12px;
                background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
                border: 2px dashed #d1d5db;
                border-radius: 10px;
                transition: all 0.2s ease;
            }

            .folder-preview-title {
                font-size: 12px;
                color: #374151;
                margin-bottom: 8px;
                font-weight: 600;
                letter-spacing: 0.3px;
            }

            .preview-placeholder {
                font-size: 12px;
                color: #9ca3af;
                text-align: center;
                padding: 8px;
            }

            .preview-list {
                display: flex;
                gap: 10px;
                justify-content: center;
            }

            .preview-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                width: 75px;
                font-size: 11px;
                color: #6b7280;
                text-align: center;
                gap: 6px;
            }

            .preview-item img {
                width: 100%;
                height: 55px;
                object-fit: cover;
                border-radius: 8px;
                border: 2px solid #e5e7eb;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .preview-name {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                width: 100%;
                font-weight: 500;
            }

            .floating-actions {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .status-message {
                margin-top: 12px;
                padding: 12px 16px;
                border-radius: 10px;
                font-size: 13px;
                display: none;
                white-space: pre-line;
                line-height: 1.6;
                border-left: 4px solid;
            }

            .status-message.success {
                background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
                color: #065f46;
                border-color: #10b981;
            }

            .status-message.error {
                background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
                color: #991b1b;
                border-color: #ef4444;
            }

            .status-message.info {
                background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
                color: #1e40af;
                border-color: #3b82f6;
            }

            .steps-display {
                margin-top: 12px;
                padding: 12px;
                background: #f9fafb;
                border: 2px solid #f3f4f6;
                border-radius: 10px;
                font-size: 12px;
                display: none;
                max-height: 120px;
                overflow-y: auto;
            }

            .steps-display::-webkit-scrollbar {
                width: 6px;
            }

            .steps-display::-webkit-scrollbar-track {
                background: #f3f4f6;
                border-radius: 3px;
            }

            .steps-display::-webkit-scrollbar-thumb {
                background: #d1d5db;
                border-radius: 3px;
            }

            .steps-display::-webkit-scrollbar-thumb:hover {
                background: #9ca3af;
            }

            .steps-display.show {
                display: block;
            }

            .step-item {
                margin: 4px 0;
                padding: 6px 12px;
                border-left: 3px solid #e5e7eb;
                background: white;
                border-radius: 6px;
                transition: all 0.2s ease;
            }

            .step-item.pending {
                border-left-color: #d1d5db;
                color: #9ca3af;
            }

            .step-item.current {
                border-left-color: #10b981;
                font-weight: 600;
                color: #059669;
                background: #ecfdf5;
                box-shadow: 0 2px 4px rgba(16, 185, 129, 0.1);
            }

            .step-item.completed {
                border-left-color: #10b981;
                color: #059669;
                font-weight: 500;
            }

            .step-item.error {
                border-left-color: #ef4444;
                color: #dc2626;
                font-weight: 600;
                background: #fef2f2;
            }
        `;

    if (!document.querySelector("#kling-floating-styles")) {
      style.id = "kling-floating-styles";
      document.head.appendChild(style);
    }
  }

  bindEvents() {
    const header = this.window.querySelector(".floating-header");
    const closeBtn = this.window.querySelector("#close-btn");
    const minimizeBtn = this.window.querySelector("#minimize-btn");
    const folderBtn = this.window.querySelector("#floating-folder-btn");
    const folderInput = this.window.querySelector("#floating-folder-input");
    const startBtn = this.window.querySelector("#floating-start-btn");
    const clearBtn = this.window.querySelector("#floating-clear-btn");

    // 拖拽功能
    header.addEventListener("mousedown", this.dragStart.bind(this));
    document.addEventListener("mousemove", this.drag.bind(this));
    document.addEventListener("mouseup", this.dragEnd.bind(this));

    // 最小化按钮
    minimizeBtn.addEventListener("click", () => {
      this.toggleMinimize();
    });

    // 关闭按钮
    closeBtn.addEventListener("click", () => {
      this.hide();
    });

    // 文件夹选择
    folderBtn.addEventListener("click", () => {
      folderInput.click();
    });

    folderInput.addEventListener("change", (e) => {
      this.handleFolderSelection(e.target.files);
    });

    // 开始按钮
    startBtn.addEventListener("click", () => {
      if (this.isProcessing) {
        // 如果正在处理，则停止
        this.shouldStop = true;
        window.shouldStopProcessing = true; // 设置全局停止信号
        this.showStatus("正在停止处理...", "info");
      } else {
        // 如果未在处理，则开始处理
        window.shouldStopProcessing = false; // 清除停止信号
        this.startProcessing();
      }
    });

    // 清空按钮
    clearBtn.addEventListener("click", () => {
      this.clearAll();
    });

    // 保存设置
    this.window
      .querySelector("#floating-wait-time")
      .addEventListener("change", () => {
        this.saveSettings();
      });

    this.window
      .querySelector("#floating-prompts")
      .addEventListener("input", () => {
        this.saveSettings();
      });

    // 监听步骤更新事件
    document.addEventListener("updateStep", (e) => {
      if (this.isProcessing) {
        this.updateStep(e.detail.stepIndex, e.detail.status);
      }
    });
  }

  dragStart(e) {
    if (e.target.classList.contains("floating-close")) return;

    this.initialX = e.clientX - this.xOffset;
    this.initialY = e.clientY - this.yOffset;

    if (e.target.closest(".floating-header")) {
      this.isDragging = true;
    }
  }

  drag(e) {
    if (this.isDragging) {
      e.preventDefault();
      this.currentX = e.clientX - this.initialX;
      this.currentY = e.clientY - this.initialY;

      this.xOffset = this.currentX;
      this.yOffset = this.currentY;

      this.window.style.transform = `translate3d(${this.currentX}px, ${this.currentY}px, 0)`;
    }
  }

  dragEnd(e) {
    this.initialX = this.currentX;
    this.initialY = this.currentY;
    this.isDragging = false;
  }

  async handleFolderSelection(files) {
    // 筛选图片文件
    const imageFiles = Array.from(files).filter(
      (file) =>
        file.type.startsWith("image/") &&
        /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file.name)
    );

    if (imageFiles.length > 0) {
      const folderName = files[0].webkitRelativePath.split("/")[0];
      this.window.querySelector(
        "#selected-folder"
      ).textContent = `已选择: ${folderName} (${imageFiles.length}张参考图, 共${files.length}个文件)`;

      // 保存筛选后的参考图片文件
      this.referenceFiles = imageFiles;
      this.referenceLookup = this.buildReferenceLookup(imageFiles);
      await this.renderFolderPreview(imageFiles);
      this.saveSettings();
    } else {
      this.window.querySelector("#selected-folder").textContent =
        "未找到参考图文件";
      this.referenceFiles = [];
      this.referenceLookup = this.buildReferenceLookup([]);
      this.renderFolderPreview([]);
    }
  }

  async renderFolderPreview(imageFiles = []) {
    const previewContainer = this.window.querySelector("#folder-preview");
    if (!previewContainer) {
      return;
    }

    if (!imageFiles || imageFiles.length === 0) {
      previewContainer.innerHTML =
        '<div class="preview-placeholder">选择文件夹后将展示前3张参考图预览</div>';
      return;
    }

    previewContainer.innerHTML =
      '<div class="preview-placeholder">正在加载预览...</div>';
    const fragment = document.createDocumentFragment();

    const title = document.createElement("div");
    title.className = "folder-preview-title";
    title.textContent = "参考图预览（前3张）";
    fragment.appendChild(title);

    const list = document.createElement("div");
    list.className = "preview-list";

    const previewFiles = imageFiles.slice(0, 3);
    const previews = await Promise.all(
      previewFiles.map(async (file) => {
        try {
          const dataUrl = await this.fileToDataURL(file);
          return { file, dataUrl };
        } catch (error) {
          console.warn(`加载预览失败: ${file.name}`, error);
          return null;
        }
      })
    );

    let hasPreview = false;
    previews.forEach((preview) => {
      if (!preview) return;
      hasPreview = true;
      const item = document.createElement("div");
      item.className = "preview-item";

      const img = document.createElement("img");
      img.src = preview.dataUrl;
      img.alt = preview.file.name;

      const caption = document.createElement("div");
      caption.className = "preview-name";
      caption.textContent = preview.file.name;

      item.appendChild(img);
      item.appendChild(caption);
      list.appendChild(item);
    });

    if (!hasPreview) {
      previewContainer.innerHTML =
        '<div class="preview-placeholder">参考图预览加载失败，请检查文件格式</div>';
      return;
    }

    fragment.appendChild(list);
    previewContainer.innerHTML = "";
    previewContainer.appendChild(fragment);
  }

  async startProcessing() {
    const referenceFiles = this.referenceFiles || [];
    const waitTimeSeconds =
      parseInt(this.window.querySelector("#floating-wait-time").value) || 3;

    const promptsTextarea = this.window.querySelector("#floating-prompts");
    console.log("开始处理时的提示词框内容:", promptsTextarea.value);

    const promptLines = promptsTextarea.value
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (promptLines.length === 0) {
      this.showStatus("请输入提示词", "error");
      return;
    }

    if (!referenceFiles.length) {
      this.showStatus("未选择参考图文件夹，将仅提交提示词。", "info");
    }

    this.isProcessing = true;
    this.shouldStop = false;
    window.shouldStopProcessing = false;

    const processingSteps = [
      { text: "准备处理", status: "pending" },
      { text: "清理参考图", status: "pending" },
      { text: "上传参考图", status: "pending" },
      { text: "输入提示词", status: "pending" },
      { text: "提交任务", status: "pending" },
      { text: "等待下一次", status: "pending" },
    ];
    this.showSteps(processingSteps);

    const startBtn = this.window.querySelector("#floating-start-btn");
    startBtn.disabled = false;
    startBtn.textContent = "停止处理";
    startBtn.className = "action-btn secondary";

    this.referenceLookup = this.buildReferenceLookup(referenceFiles);

    const jobs = promptLines.map((line, index) =>
      this.preparePromptJob(line, index, referenceFiles)
    );

    let completedCount = 0;
    const totalCount = jobs.length;

    try {
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];

        this.resetSteps();
        this.updateStep(0, "current");

        if (this.shouldStop) {
          this.showStatus("处理已停止", "info");
          break;
        }

        const referenceNames = job.referenceFiles.map((file) => file.name);
        const referenceSummary = referenceNames.length
          ? referenceNames.join(", ")
          : "无";

        this.showStatus(
          `正在处理第${i + 1}个提示词:\n${job.promptText}\n参考图: ${referenceSummary}`,
          "info"
        );

        try {
          await this.processPrompt(
            job,
            i + 1,
            totalCount,
            waitTimeSeconds * 1000
          );
          console.log(`第${i + 1}个提示词处理成功`);
          completedCount++;
        } catch (error) {
          console.error(`第${i + 1}个提示词处理失败:`, error);
          this.showStatus(
            `第${i + 1}个提示词处理失败: ${error.message}`,
            "error"
          );
          if (
            error?.message &&
            (error.message.includes("上传超时") ||
              error.message.includes("网络异常"))
          ) {
            this.shouldStop = true;
            window.shouldStopProcessing = true;
            this.showNetworkErrorNotification(error.message);
            break;
          }
        }

        if (this.shouldStop) {
          this.showStatus("处理已停止", "info");
          break;
        }

        console.log(`等待${waitTimeSeconds}秒后处理下一个提示词...`);
        await new Promise((resolve) =>
          setTimeout(resolve, waitTimeSeconds * 1000)
        );
      }

      if (!this.shouldStop) {
        this.showStatus("等待所有任务完成...", "info");
        await new Promise((resolve) =>
          setTimeout(resolve, waitTimeSeconds * 1000)
        );
        this.showStatus(
          `全部提示词处理完成！已提交 ${completedCount}/${totalCount} 个任务`,
          "success"
        );
        this.showCompleteNotification(completedCount);
      }
    } catch (error) {
      console.error("处理错误:", error);
      this.showStatus(`处理失败: ${error.message}`, "error");
    } finally {
      const promptsAfter = this.window.querySelector("#floating-prompts");
      console.log("处理完成后的提示词框内容:", promptsAfter.value);

      startBtn.disabled = false;
      startBtn.textContent = "开始自动提交";
      startBtn.className = "action-btn primary";
      this.isProcessing = false;
      this.shouldStop = false;
      window.shouldStopProcessing = false;

      this.hideSteps();
    }
  }

  async processPrompt(job, index, total, waitTime) {
    const referencePayload = [];

    for (const file of job.referenceFiles) {
      try {
        const dataUrl = await this.fileToDataURL(file);
        referencePayload.push({ name: file.name, dataUrl });
      } catch (error) {
        console.warn(`参考图 ${file.name} 转换失败:`, error);
      }
    }

    return new Promise((resolve, reject) => {
      if (this.shouldStop) {
        resolve();
        return;
      }

      const event = new CustomEvent("processJimengPrompt", {
        detail: {
          prompt: job.promptText,
          rawPrompt: job.rawPrompt,
          index,
          total,
          waitTime,
          referenceImages: referencePayload,
        },
      });

      document.dispatchEvent(event);

      let timeoutId;

      const handler = (e) => {
        if (e.detail.index === index) {
          clearTimeout(timeoutId);
          document.removeEventListener("jimengPromptProcessed", handler);
          if (e.detail.success) {
            resolve();
          } else {
            reject(new Error(e.detail.error || "提示词处理失败"));
          }
        }
      };

      document.addEventListener("jimengPromptProcessed", handler);

      timeoutId = setTimeout(() => {
        document.removeEventListener("jimengPromptProcessed", handler);
        reject(new Error(`第${index}个提示词处理超时，可能是网络异常`));
      }, waitTime + 180000);
    });
  }

  preparePromptJob(rawLine, index, referenceFiles) {
    const promptText = rawLine.trim();
    const referenceFilesMatched = this.matchReferenceFiles(
      promptText,
      referenceFiles
    );

    return {
      order: index,
      rawPrompt: rawLine,
      promptText: promptText || rawLine,
      referenceFiles: referenceFilesMatched,
    };
  }

  matchReferenceFiles(promptText = "", referenceFiles = []) {
    if (!referenceFiles || referenceFiles.length === 0) {
      return [];
    }

    if (!promptText || !referenceFiles.length) {
      return [];
    }

    const normalizedPrompt = promptText.toLowerCase();
    const matched = new Set();

    referenceFiles.forEach((file) => {
      const baseName = this.stripExtension(file.name).toLowerCase();
      if (!baseName) return;
      if (normalizedPrompt.includes(baseName)) {
        matched.add(file);
        return;
      }

      const withoutSpaces = baseName.replace(/\s+/g, "");
      if (withoutSpaces && normalizedPrompt.replace(/\s+/g, "").includes(withoutSpaces)) {
        matched.add(file);
      }
    });

    return Array.from(matched);
  }

  buildReferenceLookup(files = []) {
    const lookup = new Map();

    const addToMap = (map, key, file) => {
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(file);
    };

    files.forEach((file) => {
      const baseName = this.stripExtension(file.name).trim().toLowerCase();
      addToMap(lookup, baseName, file);
    });

    return lookup;
  }

  stripExtension(name = "") {
    return name.replace(/\.[^.]+$/, "");
  }

  fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  showCompleteNotification(totalImages) {
    this.ensureNotificationStyles();

    // 避免重复弹窗
    const existing = document.querySelector("#kling-complete-notification");
    if (existing) {
      existing.remove();
    }

    const notification = document.createElement("div");
    notification.id = "kling-complete-notification";
    notification.innerHTML = `
            <div class="notification-overlay">
                <div class="notification-content success">
                    <div class="notification-icon">🎉</div>
                    <div class="notification-title">任务完成！</div>
                    <div class="notification-message">
                        已成功提交 ${totalImages} 个文生图生成任务
                        <br>
                        请在即梦文生图页面查看生成结果
                        <br>
                        <small>注意：任务可能需要几分钟时间才能完全处理完成</small>
                    </div>
                    <button class="notification-close" onclick="this.parentElement.parentElement.remove()">知道了</button>
                </div>
            </div>
        `;

    document.body.appendChild(notification);

    // 播放完成音效
    this.playCompleteSound();

    // 3秒后自动关闭
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }

  showNetworkErrorNotification(message = "检测到网络异常，请检查后重试") {
    // 若已有错误通知，先移除避免堆叠
    const existing = document.querySelector("#kling-error-notification");
    if (existing) {
      existing.remove();
    }

    this.ensureNotificationStyles();

    const notification = document.createElement("div");
    notification.id = "kling-error-notification";
    notification.innerHTML = `
            <div class="notification-overlay">
                <div class="notification-content error">
                    <div class="notification-icon">⚠️</div>
                    <div class="notification-title">网络可能异常</div>
                    <div class="notification-message">
                        ${message || "请检查网络连接状态后重新尝试"}
                    </div>
                    <button class="notification-close" onclick="this.parentElement.parentElement.remove()">知道了</button>
                </div>
            </div>
        `;

    document.body.appendChild(notification);
  }

  ensureNotificationStyles() {
    if (document.querySelector("#kling-notification-styles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "kling-notification-styles";
    style.textContent = `
            #kling-complete-notification,
            #kling-error-notification {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 100000;
                font-family: Arial, sans-serif;
            }

            .notification-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .notification-content {
                background: white;
                padding: 30px;
                border-radius: 10px;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                max-width: 400px;
                margin: 20px;
                animation: notificationPop 0.3s ease-out;
            }

            .notification-content.error {
                border: 2px solid #f97316;
            }

            .notification-content.success {
                border: 2px solid transparent;
            }

            @keyframes notificationPop {
                0% { transform: scale(0.7); opacity: 0; }
                100% { transform: scale(1); opacity: 1; }
            }

            .notification-icon {
                font-size: 48px;
                margin-bottom: 15px;
            }

            .notification-title {
                font-size: 24px;
                font-weight: bold;
                color: #16a34a;
                margin-bottom: 10px;
            }

            .notification-content.error .notification-title {
                color: #dc2626;
            }

            .notification-message {
                font-size: 16px;
                color: #666;
                margin-bottom: 20px;
                line-height: 1.5;
            }

            .notification-close {
                background: #22c55e;
                color: white;
                border: none;
                padding: 10px 30px;
                border-radius: 5px;
                font-size: 16px;
                cursor: pointer;
                transition: background-color 0.3s;
            }

            .notification-content.error .notification-close {
                background: #dc2626;
            }

            .notification-close:hover {
                background: #15803d;
            }

            .notification-content.error .notification-close:hover {
                background: #b91c1c;
            }
        `;

    document.head.appendChild(style);
  }

  playCompleteSound() {
    // 创建音频上下文和音效
    try {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();

      // 创建成功提示音效
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5音符
      oscillator.frequency.setValueAtTime(
        659.25,
        audioContext.currentTime + 0.1
      ); // E5音符
      oscillator.frequency.setValueAtTime(
        783.99,
        audioContext.currentTime + 0.2
      ); // G5音符

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.5
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log("无法播放音效:", error);
      // 备用：使用系统提示音
      const audio = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmFgU7k9n1unEiBC13yO/eizEIHWq+8+OWT"
      );
      audio.play().catch(() => {});
    }
  }

  clearAll() {
    // 只清空提示词输入框
    this.window.querySelector("#floating-prompts").value = "";
    this.hideStatus();
    this.saveSettings();
  }

  showStatus(message, type) {
    const status = this.window.querySelector("#floating-status");
    status.textContent = message;
    status.className = `status-message ${type}`;
    status.style.display = "block";

    if (type === "success") {
      setTimeout(() => this.hideStatus(), 3000);
    }
  }

  hideStatus() {
    const status = this.window.querySelector("#floating-status");
    status.style.display = "none";
  }

  showSteps(steps) {
    const stepsContainer = this.window.querySelector("#floating-steps");
    if (!steps || steps.length === 0) {
      stepsContainer.style.display = "none";
      return;
    }

    stepsContainer.innerHTML = steps
      .map((step) => {
        let className = "step-item";
        if (step.status) {
          className += ` ${step.status}`;
        }
        return `<div class="${className}">${step.text}</div>`;
      })
      .join("");

    stepsContainer.style.display = "block";
    stepsContainer.classList.add("show");
  }

  hideSteps() {
    const stepsContainer = this.window.querySelector("#floating-steps");
    stepsContainer.style.display = "none";
    stepsContainer.classList.remove("show");
  }

  resetSteps(preserveFirst = false) {
    const stepsContainer = this.window.querySelector("#floating-steps");
    if (!stepsContainer) return;

    const stepItems = stepsContainer.querySelectorAll(".step-item");
    stepItems.forEach((item, index) => {
      if (preserveFirst && index === 0) {
        return;
      }
      item.className = "step-item pending";
    });
  }

  updateStep(stepIndex, status) {
    const stepsContainer = this.window.querySelector("#floating-steps");
    const stepItems = stepsContainer.querySelectorAll(".step-item");

    if (stepItems[stepIndex]) {
      stepItems[stepIndex].className = `step-item ${status}`;
    }
  }

  saveSettings() {
    const settings = {
      waitTime: this.window.querySelector("#floating-wait-time").value,
      prompts: this.window.querySelector("#floating-prompts").value,
    };
    localStorage.setItem("jimengAutoSettings", JSON.stringify(settings));
  }

  loadSettings() {
    const saved = localStorage.getItem("jimengAutoSettings");
    if (saved) {
      const settings = JSON.parse(saved);
      this.window.querySelector("#floating-wait-time").value =
        settings.waitTime || "3";
      this.window.querySelector("#floating-prompts").value =
        settings.prompts || "";
    }
  }

  show() {
    this.window.style.display = "block";
  }

  hide() {
    this.window.style.display = "none";
  }

  toggle() {
    if (this.window.style.display === "none" || !this.window.style.display) {
      this.show();
    } else {
      this.hide();
    }
  }

  toggleMinimize() {
    console.log("切换最小化状态，当前:", this.isMinimized);
    this.isMinimized = !this.isMinimized;

    const minimizeBtn = this.window.querySelector("#minimize-btn");
    if (!minimizeBtn) {
      console.error("找不到最小化按钮");
      return;
    }

    if (this.isMinimized) {
      this.window.classList.add("minimized");
      minimizeBtn.textContent = "□";
      minimizeBtn.title = "还原";
      console.log("已最小化");
    } else {
      this.window.classList.remove("minimized");
      minimizeBtn.textContent = "−";
      minimizeBtn.title = "最小化";
      console.log("已还原");
    }
  }
}

// 初始化悬浮窗口
let floatingWindow;

function initFloatingWindow() {
  if (!floatingWindow) {
    floatingWindow = new FloatingWindow();
  }
  return floatingWindow;
}

// 创建浮动按钮来显示/隐藏窗口
function createFloatingButton() {
  const button = document.createElement("div");
  button.id = "kling-toggle-button";
  button.innerHTML = "即梦";
  button.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(34,197,94,0.4);
        z-index: 10001;
        user-select: none;
        transition: all 0.3s ease;
        border: 3px solid white;
        animation: pulse 2s infinite;
    `;

  // 添加悬停效果
  button.addEventListener("mouseenter", () => {
    button.style.transform = "scale(1.1)";
    button.style.boxShadow = "0 6px 20px rgba(34,197,94,0.6)";
  });

  button.addEventListener("mouseleave", () => {
    button.style.transform = "scale(1)";
    button.style.boxShadow = "0 4px 15px rgba(34,197,94,0.4)";
  });

  button.addEventListener("click", () => {
    initFloatingWindow().toggle();
  });

  // 添加脉冲动画
  const pulseStyle = document.createElement("style");
  pulseStyle.textContent = `
        @keyframes pulse {
            0% { box-shadow: 0 4px 15px rgba(34,197,94,0.4); }
            50% { box-shadow: 0 4px 25px rgba(34,197,94,0.8); }
            100% { box-shadow: 0 4px 15px rgba(34,197,94,0.4); }
        }
    `;

  if (!document.querySelector("#kling-pulse-style")) {
    pulseStyle.id = "kling-pulse-style";
    document.head.appendChild(pulseStyle);
  }

  document.body.appendChild(button);

  // 添加提示文字
  const tooltip = document.createElement("div");
  tooltip.id = "kling-button-tooltip";
  tooltip.textContent = "点击打开即梦批量文生图工具";
  tooltip.style.cssText = `
        position: fixed;
        bottom: 85px;
        right: 20px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 5px;
        font-size: 12px;
        white-space: nowrap;
        opacity: 0;
        transition: opacity 0.3s;
        z-index: 10000;
        pointer-events: none;
    `;

  button.addEventListener("mouseenter", () => {
    tooltip.style.opacity = "1";
  });

  button.addEventListener("mouseleave", () => {
    tooltip.style.opacity = "0";
  });

  document.body.appendChild(tooltip);
}

// 注入到页面
function initPlugin() {
  const isTargetPage = window.location.href.includes(
    "jimeng.jianying.com/ai-tool/generate"
  );
  if (!isTargetPage) {
    console.log("即梦批量文生图工具: 当前页面不是目标页面，跳过初始化");
    return;
  }

  createFloatingButton();
  // 初始化悬浮窗口但不显示
  initFloatingWindow();

  // 隐藏悬浮窗口
  if (floatingWindow) {
    floatingWindow.hide();
  }

  // 监听重新初始化事件
  document.addEventListener("reinitFloatingWindow", () => {
    if (floatingWindow) {
      floatingWindow.show();
    } else {
      initFloatingWindow().show();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPlugin);
} else {
  initPlugin();
}

// 暴露到全局
window.initFloatingWindow = initFloatingWindow;
