# 籌碼 Q 線：資料欄位與規格

## 雪鴞矩陣欄位（`api.MSMP.get(表, 欄位)`）

| 前端鍵 | 表 | 欄位 | 用途 |
|---|---|---|---|
| open / high / low / close | 日_K | Open / High / Low / Close | K 線、均線（原始價，未還原） |
| volume | 日_K | Volume | 成交量（張） |
| foreign | 日_三大法人 | 外資買賣超張數 | 外資副圖、連買條件 |
| trust | 日_三大法人 | 投信買賣超張數 | 投信副圖、連買條件 |
| dealer | 日_三大法人 | 自營買賣超張數 | 籌碼快照 |
| main | 日_三大法人 | 主力買賣超張數 | 主力副圖、連買條件 |
| margin | 日_融資券 | 融資增減_張 | 融資副圖 |
| short | 日_融資券 | 融券增減_張 | 融券副圖 |
| borrow | 日_融資券 | 借券賣出餘額_張 | 借券副圖（折線） |
| concentration | 其他_籌碼集中 | 籌碼集中度_20日 | 籌碼快照 |

股票名稱：`api.Data.get('上市櫃/ETF清單(含當沖限制)')`，取「股票代號」「股票名稱」兩欄。
矩陣回傳為 DataFrame：索引是日期、欄是股票代號。

## 後端 API

| 端點 | 說明 |
|---|---|
| `GET /api/status` | `ready`、`message`、`date`（最新交易日）、`version` |
| `POST /api/reconnect` | 清快取並重連 |
| `GET /api/stock/{code}?mode=live\|demo` | 近 250 個交易日，每列含 date 與上表所有鍵；缺值為 `null`；`warnings` 列出沒取到的欄位 |
| `GET /api/screen?mode&rules&days&min_volume&asof` | `rules` 為 `foreign,trust,main,breakout` 的逗號組合；`days` 1–20；回傳 `stocks`、`date`、`scanned` |

## 副圖順序與高度比

K 線 240、成交量 75、外資 80、投信 80、主力 80、融資 75、融券 75、借券 75。
均線 MA5／MA20／MA60 用原始收盤價；缺值不補 0。

## 驗收範例

- 外資連買 3 日、最新交易日：應有數十到上百檔。
- 外資＋投信同時連買 3 日：結果明顯較少。
- 休市日當觀察日：自動採前一交易日。
- 每種情況抽查 3～4 檔，對照雪鴞原始日資料。
