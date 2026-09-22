(function () {
  "use strict";

  const panels = document.getElementById("panels");
  const input = document.getElementById("input");
  const outputText = document.getElementById("outputText");
  const outputRich = document.getElementById("outputRich");
  const outputPreview = document.getElementById("outputPreview");
  const formatSelect = document.getElementById("formatSelect");
  const watermarkToggle = document.getElementById("watermarkToggle");
  const pasteBtn = document.getElementById("pasteBtn");
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const fullscreenBtn = document.getElementById("fullscreenBtn");
  const newTabBtn = document.getElementById("newTabBtn");
  const statusEl = document.getElementById("status");
  const modeButtons = document.querySelectorAll(".mode-btn");

  let mode = "md2text"; // 'md2text' | 'text2md' | 'htmlpreview'

  const PLACEHOLDERS = {
    md2text: "Enter your Markdown text here...",
    text2md: "Enter your plain text here...",
    htmlpreview: "Paste your HTML here...",
  };

  function setStatus(msg) {
    statusEl.textContent = msg;
    if (msg) setTimeout(() => { if (statusEl.textContent === msg) statusEl.textContent = ""; }, 2000);
  }

  function currentSource() {
    let src = input.value;
    if (watermarkToggle.checked) src = MdConverter.removeAiWatermarks(src);
    return src;
  }

  function showOutput(which) {
    outputText.hidden = which !== "text";
    outputRich.hidden = which !== "rich";
    outputPreview.hidden = which !== "preview";
  }

  function render() {
    const src = currentSource();

    if (mode === "htmlpreview") {
      showOutput("preview");
      outputPreview.srcdoc = src;
      return;
    }

    if (mode === "text2md") {
      showOutput("text");
      outputText.value = MdConverter.textToMarkdown(src);
      return;
    }

    const format = formatSelect.value;
    if (format === "plain") {
      showOutput("text");
      outputText.value = MdConverter.markdownToPlainText(src);
    } else if (format === "html") {
      showOutput("text");
      outputText.value = MdConverter.markdownToHtml(src);
    } else {
      showOutput("rich");
      outputRich.innerHTML = MdConverter.markdownToHtml(src);
    }
  }

  function outputPlainString() {
    if (mode === "htmlpreview") return currentSource();
    if (mode === "text2md" || formatSelect.value !== "rich") return outputText.value;
    return outputRich.innerText;
  }

  input.addEventListener("input", render);
  watermarkToggle.addEventListener("change", render);
  formatSelect.addEventListener("change", render);

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      mode = btn.dataset.mode;
      modeButtons.forEach((b) => {
        b.classList.toggle("active", b === btn);
        b.setAttribute("aria-selected", b === btn ? "true" : "false");
      });

      formatSelect.hidden = mode !== "md2text";
      fullscreenBtn.hidden = mode !== "htmlpreview";
      newTabBtn.hidden = mode !== "htmlpreview";
      panels.classList.toggle("stacked", mode === "htmlpreview");
      input.placeholder = PLACEHOLDERS[mode];

      render();
    });
  });

  pasteBtn.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      input.value = text;
      render();
      setStatus("Pasted from clipboard");
    } catch (err) {
      setStatus("Clipboard access denied");
    }
  });

  copyBtn.addEventListener("click", async () => {
    const format = mode === "md2text" ? formatSelect.value : "plain";
    try {
      if (format === "rich") {
        const html = outputRich.innerHTML;
        const plain = outputRich.innerText;
        if (navigator.clipboard.write && window.ClipboardItem) {
          await navigator.clipboard.write([
            new ClipboardItem({
              "text/html": new Blob([html], { type: "text/html" }),
              "text/plain": new Blob([plain], { type: "text/plain" }),
            }),
          ]);
        } else {
          await navigator.clipboard.writeText(plain);
        }
      } else {
        await navigator.clipboard.writeText(outputPlainString());
      }
      setStatus("Copied to clipboard");
    } catch (err) {
      setStatus("Copy failed — select and copy manually");
    }
  });

  downloadBtn.addEventListener("click", () => {
    const format = mode === "md2text" ? formatSelect.value : "plain";
    let ext = "txt";
    let mime = "text/plain";
    let content = outputPlainString();
    if (mode === "htmlpreview") {
      ext = "html";
      mime = "text/html";
    } else if (mode === "md2text" && format === "html") {
      ext = "html";
      mime = "text/html";
    } else if (mode === "text2md") {
      ext = "md";
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `converted.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  fullscreenBtn.addEventListener("click", () => {
    if (outputPreview.requestFullscreen) {
      outputPreview.requestFullscreen().catch(() => setStatus("Fullscreen not available"));
    } else {
      setStatus("Fullscreen not supported in this browser");
    }
  });

  newTabBtn.addEventListener("click", () => {
    const win = window.open("", "_blank");
    if (!win) {
      setStatus("Popup blocked — allow popups to open in a new tab");
      return;
    }
    win.document.open();
    win.document.write(currentSource());
    win.document.close();
  });

  render();
})();
