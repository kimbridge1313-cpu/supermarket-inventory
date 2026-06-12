# 超市庫存管理｜React + Vite 測試版

## Current Stage
Build

## Prototype Goal
將 Canvas 原型整理為可部署到 Vercel 的 React + Vite 前端測試版。此版本不串接 Firebase，所有資料暫時保存在前端 state。

## Included UI / Interactions
- 商品主檔：新增、修改、刪除、搜尋商品。
- 進退貨：手動輸入條碼模擬掃碼，支援進貨 / 退貨，輸入數量與單價，自動計算小計與總額。
- 批次紀錄：儲存本次進退貨並建立前端示意紀錄。
- 貨卡列印：選擇商品、預覽貨卡、產生 barcode、使用 `window.print()` 測試列印流程。

## Dependency Check
已配置：

- React
- Vite
- TypeScript
- lucide-react
- framer-motion
- react-barcode
- clsx
- tailwind-merge
- class-variance-authority
- shadcn/ui 相依元件替代版：`src/components/ui/*`

## Local Commands

```bash
npm install
npm run build
npm run dev
```

## Vercel Deploy Settings

- Framework Preset: Vite
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

## Not Connected Yet

- Firebase Auth
- Firestore
- Firebase Storage
- 真實手機相機掃碼
- 真實印表機 API / 飛鵝雲 API
- 權限與角色

## Deployment Checklist

- [x] `package.json` 可安裝依賴
- [x] `vite.config.ts` 已建立
- [x] `src/main.tsx` 已建立
- [x] `src/App.tsx` 已建立
- [x] `npm install` 已測試通過
- [x] `npm run build` 已測試通過
- [x] 不接 Firebase
- [x] 前端 state 示意資料
- [x] 可部署至 Vercel 測試版
- [ ] Vercel 建立 Project
- [ ] 匯入 GitHub Repo
- [ ] 確認 Production Build 成功
- [ ] 手機檢查進退貨表格可輸入數量 / 單價
- [ ] 手機檢查貨卡列印預覽

## Build Notes

Canvas 內不適合直接部署的部分已替換為前端可運行版本：

1. `@/components/ui/*` alias 依賴改成 `src/components/ui/*` 本地元件。
2. Tailwind / shadcn class 依賴改為 `src/styles.css`，避免缺少 Tailwind 設定造成 Vercel build failure。
3. 掃碼按鈕暫時以條碼輸入欄模擬。
4. 標籤機列印暫時以瀏覽器列印預覽模擬。
5. 所有資料寫入前端 state，重新整理後還原。
