# 籌碼 Q 線 Skill｜用你自己的 AI 做出來

麥可鄧（鄧哥）課程教學用。把這個 skill 交給你的 AI，它會一步步帶你做出一個只在自己電腦上執行的**籌碼 Q 線選股工作台**：

- 左側用外資、投信、主力連買、突破前 20 日高點選股
- 右側 K 線加 8 個同步籌碼副圖，一起縮放、拖曳、看同一天的數字
- 內建「教學示範」模擬資料，沒連上資料也能練習畫面

## 開始前準備

1. 電腦安裝 **Python 3.12**
2. **雪鴞（snowyowl）帳號與安裝檔**：請依課程說明取得（本專案不附雪鴞套件）
3. 一個能寫程式的 AI（Claude Code、Codex、Cursor 等）

## 安裝方式

**Claude Code**：把 `skills/chip-qline` 整個資料夾複製到 `C:\Users\你的名字\.claude\skills\`，重開 Claude Code，對它說「幫我用 chip-qline skill 做籌碼 Q 線」。

**其他 AI**：把 `skills/chip-qline/SKILL.md` 的內容貼給 AI，再把 `reference/` 資料夾交給它參考，說「照這份說明帶我做出籌碼 Q 線」。

## 重要提醒

- 帳號密碼**只放在自己電腦**（`~/.snowyowl/chip-qline.credentials`），不要貼給 AI、不要上傳 GitHub、不要分享。
- 工具只綁定 `127.0.0.1`，僅供本機使用。
- 本工具用於課程學習與規則示範，訊號代表條件成立，**不代表未來報酬，不是投資建議**。
- 圖表使用 [TradingView Lightweight Charts](https://www.tradingview.com/) 5.2.1（Apache-2.0），請保留頁面上的版權署名。

## 內容

```
skills/chip-qline/
  SKILL.md              給 AI 的完整指引
  references/spec.md    資料欄位與 API 規格
  reference/            可執行的參考實作（後端與前端）
```

課程與日報：見麥可鄧 [YouTube](https://www.youtube.com/@CbfunTeng)、[Facebook](https://www.facebook.com/cbfunfree)、[PressPlay 日報](https://www.pressplay.cc/project/C40071FB56014068C98C9B5CE05DD03B/articles)。
