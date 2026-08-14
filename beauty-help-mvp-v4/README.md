# SALON LINK 正式MVP

## 公開先

- Production: https://beauty-help-mvp-test.vercel.app/
- Frontend: Vercel
- Backend/Auth/DB/Storage: Supabase `salon-link-mvp`
- Supabase project ref: `cpmmqqznrqeodlesyfgg`

## 正式MVP構成

SALON LINKはローカルブラウザ保存ではなく、Supabase Auth + PostgreSQL + private Storage + Edge Functionsを共通バックエンドとして利用する。美容室・美容師・アシスタントが別アカウント、別端末から同じ募集・応募・オファー・マッチング・チャット・勤務・レビュー情報を利用する。

主要バックエンドは `salon-link-help`, `salon-link-apply`, `salon-link-offer`, `salon-link-accept`, `salon-link-work-status`, `salon-link-review`, `sl-chat-safe`, `salon-link-safety`, `sl-member-safe`, `sl-verify`, `sl-doc`, `salon-link-admin`, `salon-link-reminder`, `sl-dispute`, `sl-audit`, `sl-salon-safe`。

## 重要な業務制御

- 美容師募集とアシスタント募集を `target_role` で分離。
- 応募者ロール不一致をバックエンドで拒否。
- 美容師個人のアシスタント募集は所属店舗承認後に公開。
- 有償の公開募集は確認済み店舗に限定。
- 応募・オファー成立時に募集枠、アカウント状態、ブロック、日程重複を再検証。
- 成立後は match/work/conversation を共通生成し、空き枠を予定ありに変更。
- 勤務完了者だけレビュー可能。1勤務1レビュー、自分自身へのレビューは禁止。
- 本人・免許・店舗確認資料は非公開Storageへ保存し、管理者のみ一時署名URLで閲覧。
- 店舗プロフィール編集は店舗オーナー専用RPCを使用。
- 管理操作は監査ログへ記録。

## Safari対応

以前のHTMLPreview方式のブラウザ内Base64/gzip復元は廃止した。Vercelのサーバー側でUIバンドルを復元し、Safariには通常の `text/html` をHTTP 200で返す。下部ナビゲーションはホーム・日程・探す・連絡・設定の5項目を常時操作可能にし、絞り込みシートはiOS Safariで縦スクロール可能な専用領域を持つ。

## 費用方針

MVPはVercel / Supabaseの無料利用範囲を前提とし、決済、SMS、外部有料API、AI推薦等は導入していない。
