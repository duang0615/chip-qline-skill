---
name: chip-qline
description: 帶學生用自己的 AI 從零做出「籌碼 Q 線」本機選股與籌碼觀察工作台（Python FastAPI + TradingView Lightweight Charts + 雪鴞 snowyowl 資料）。當學生想建立籌碼 Q 線、外資投信主力連買選股、K 線加八個籌碼副圖、或提到麥可鄧籌碼 Q 線課程時使用。
---

# 籌碼 Q 線：用 AI 自己做出來

你要帶學生做出一個**只在自己電腦上執行**的網頁工具：左邊用籌碼條件選股，右邊看 K 線與籌碼副圖。
成品畫面：頂端連線狀態，左側選股策略，中間 K 線＋成交量＋外資／投信／主力／融資／融券／借券共 8 個同步副圖，右側籌碼快照。

本 skill 的 `reference/` 資料夾是完整可執行的參考實作；`references/spec.md` 是規則與資料欄位說明。

## 一、開始前先確認（逐項問學生，不要自己假設）

1. 作業系統與是否已安裝 **Python 3.12**（`python --version`）。沒有就先帶他安裝。
2. 是否已有**雪鴞（snowyowl）帳號**，以及課程提供的雪鴞安裝檔（`.whl`）。沒有就停下來，請他回課程取得；在那之前只能做「教學示範」模擬資料模式。
3. 想要「照參考實作直接建立」還是「一步步理解後自己做」。後者每一步先用白話說明再動手。

## 二、帳號密碼安全規則（最重要，必須遵守）

- **絕對不要請學生把帳號或密碼貼在對話裡**，也不要自己讀取、列印、記錄他的帳密。
- 帳密只放在學生**自己電腦的使用者資料夾**：`~/.snowyowl/chip-qline.credentials`（兩行：`帳號:值`、`密碼:值`），或環境變數 `SNOWYOWL_USER`、`SNOWYOWL_PASSWORD`。請學生自己用記事本建立檔案，你只告訴他格式。
- 帳密不可寫進程式碼、前端、README、log，也不可放進專案資料夾或 GitHub。專案的 `.gitignore` 要排除 `.env`、`*.credentials`、`.venv/`、`*.log`。
- 後端要把雪鴞套件的輸出吞掉（`contextlib.redirect_stdout/stderr`），因為它可能印出帳號資訊。
- 服務只綁 `127.0.0.1`，不要綁 `0.0.0.0`，也不要幫學生開放到網路上。

## 三、建置步驟

專案結構：

```
chip-qline/
  server.py            # FastAPI 後端
  requirements.txt     # fastapi uvicorn pandas numpy + 雪鴞 whl
  start.ps1            # 啟動腳本（綁 127.0.0.1:8766）
  vendor/              # 放雪鴞 .whl（不要上傳 GitHub）
  static/
    index.html  style.css  app.js  chip-chart.js
    vendor/lightweight-charts-5.2.1.js
```

1. **建專案與環境**：建立資料夾與 `.venv`（Python 3.12），安裝 `fastapi`、`uvicorn`、`pandas`、`numpy` 與課程提供的雪鴞 `.whl`。
2. **放帳密檔**：請學生自己依第二節建立；你不要碰內容。
3. **後端 `server.py`**（參考 `reference/server.py`）：
   - 背景執行緒登入雪鴞，`api.MSMP.get(表, 欄位)` 取得「日期 × 股票代號」矩陣，用 `lru_cache` 快取，欄位對照見 `references/spec.md`。
   - `GET /api/status`、`POST /api/reconnect`、`GET /api/stock/{code}`（最近 250 根）、`GET /api/screen`（選股）。
   - 同時提供 `mode=demo` 模擬資料，連線失敗時學生仍能練習畫面。
4. **前端**（參考 `reference/static/`）：
   - 原生 JavaScript，不需要建置工具。圖表用 **TradingView Lightweight Charts 5.2.1**：從 npm（`lightweight-charts@5.2.1`）下載 `dist/lightweight-charts.standalone.production.js` 存成 `static/vendor/lightweight-charts-5.2.1.js`，並**保留頁面上的 TradingView 版權署名**。
   - 8 個窗格共用同一條時間軸與十字游標；紅漲綠跌、紅買綠賣；缺值留空，不要用 0 冒充。
5. **啟動**：用 `start.ps1` 或 `python -m uvicorn server:app --host 127.0.0.1 --port 8766`；若 8766 被占用，換別的埠，不要停掉別的程式。
6. **驗證**（做完才能說完成）：
   - 狀態列顯示「雪鴞已連線」與最新交易日。
   - 勾「外資連續買超 3 日」按啟動，有結果；點個股後 K 線與 8 個副圖同步更新。
   - 隨機抽 3～4 檔，對照雪鴞原始日資料確認數字一致。
   - 空策略、無效代號、無效日期都要顯示清楚的錯誤訊息。
   - 切到「教學示範」能正常顯示並標示為模擬資料。

## 四、選股規則（必須照此定義，不可自行放寬）

- **連買**：設定天數內，每個交易日該欄買賣超都**嚴格大於 0**；缺資料不算成立。
- **突破**：當日收盤價**嚴格高於前 20 個交易日**的最高收盤價（不含當日）。
- **最低量**：當日成交量（張），不是期間均量。
- 多條件為 **AND**；休市日採前一交易日；結果依成交量由大到小。
- 股池：4 碼、非 0 開頭代號（正規式 `[1-9][0-9]{3}`）。這不是嚴格的現行上市櫃普通股名冊，也未處理存續股偏差，要在說明中誠實告知。
- 日 K 使用原始 OHLC，尚未還原權息。

## 五、常見的坑

- 雪鴞套件匯入或登入時會印訊息，務必吞掉輸出。
- 矩陣欄名要轉成字串、日期索引轉 `datetime`，並去除重複日期。
- `NaN` 不能直接回傳 JSON，要轉成 `null`。
- 圖表窗格的 DOM 在下一個動畫影格才建立，圖例要放在 `requestAnimationFrame` 內。
- 前端用 request id 避免舊請求覆蓋新結果。

## 六、結尾一定要提醒學生

- 這個工具用於**學習與規則示範**，訊號只代表條件成立，不代表未來報酬，**不是投資建議**。
- 帳號密碼只屬於自己，不要分享、不要上傳。
- 資料來自雪鴞，不是即時報價。
