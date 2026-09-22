(function () {
  "use strict";

  const input = document.getElementById("input");
  const outputText = document.getElementById("outputText");
  const outputRich = document.getElementById("outputRich");
  const formatSelect = document.getElementById("formatSelect");
  const watermarkToggle = document.getElementById("watermarkToggle");
  const pasteBtn = document.getElementById("pasteBtn");
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const statusEl = document.getElementById("status");
  const modeButtons = document.querySelectorAll(".mode-btn");

  let mode = "md2text"; // 'md2text' | 'text2md'

  function setStatus(msg) {
    statusEl.textContent = msg;
    if (msg) setTimeout(() => { if (statusEl.textContent === msg) statusEl.textContent = ""; }, 2000);
  }

  function currentSource() {
    let src = input.value;
    if (watermarkToggle.checked) src = MdConverter.removeAiWatermarks(src);
    return src;
  }

  function render() {
    const src = currentSource();

    if (mode === "text2md") {
      const md = MdConverter.textToMarkdown(src);
      outputRich.hidden = true;
      outputText.hidden = false;
      outputText.value = md;
      return;
    }

    const format = formatSelect.value;
    if (format === "plain") {
      outputRich.hidden = true;
      outputText.hidden = false;
      outputText.value = MdConverter.markdownToPlainText(src);
    } else if (format === "html") {
      outputRich.hidden = true;
      outputText.hidden = false;
      outputText.value = MdConverter.markdownToHtml(src);
    } else {
      outputText.hidden = true;
      outputRich.hidden = false;
      outputRich.innerHTML = MdConverter.markdownToHtml(src);
    }
  }

  function outputPlainString() {
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
      formatSelect.parentElement && (formatSelect.hidden = mode === "text2md");
      input.placeholder = mode === "md2text"
        ? "Enter your Markdown text here..."
        : "Enter your plain text here...";
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
        await navigator.clipboard.writeText(outputText.value);
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
    if (mode === "md2text" && format === "html") {
      ext = "html";
      mime = "text/html";
      content = outputText.value;
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

  render();
})();
