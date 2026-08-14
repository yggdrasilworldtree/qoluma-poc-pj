# Sticker Market 商用MVP v1.0 — 実装・運用正本

## 1. 最上位原則

- 現行v2 UI、既存URL、主要ナビ、3-step Checkout、D-01〜D-24を維持する。
- DEMO / STAGING / PRODUCTIONを同一フロントから切替可能にする。
- DEMOでは従来のブラウザ内データを残す。
- STAGING / PRODUCTIONでは注文、決済、商品、権限、製造、配送、返金、報酬、監査をSupabase側の永続データを正本とする。
- ProductとOrderを役割ごとに複製しない。
- 金銭レコードを上書きで消さない。Order / Refund / CreatorPayout / Adjustmentを関連付けて保持する。

## 2. Backend

Supabase project ref: `oodalamuvycoajdrdszi`

Sticker Market専用の `sm_*` 名前空間を使用し、既存Qoluma用テーブルをSticker Marketの業務データとして再利用しない。

主な正本テーブル:

- User: `sm_user_profiles`, `sm_user_capabilities`
- Creator: `sm_creators`, `sm_creator_applications`
- Product: `sm_products`, `sm_product_variants`, `sm_product_series`
- Buyer: `sm_favorites`, `sm_follows`, `sm_carts`, `sm_cart_items`, `sm_addresses`
- Checkout/Payment: `sm_checkout_sessions`, `sm_payments`
- Order: `sm_orders`, `sm_order_items`
- Fulfillment: `sm_manufacturers`, `sm_manufacturing_orders`, `sm_shipments`
- Post purchase: `sm_reviews`, `sm_support_cases`, `sm_support_messages`
- Money: `sm_refunds`, `sm_creator_payouts`, `sm_payout_adjustments`
- Existing D flows: `sm_reports`, `sm_rights_cases`, `sm_custom_orders`, `sm_custom_order_messages`, `sm_demand_requests`
- Common: `sm_notifications`, `sm_audit_logs`, `sm_analytics_events`, `sm_files`
- Infrastructure: `sm_webhook_events`, `sm_rate_limits`, `sm_email_outbox`, `sm_legal_documents`, `sm_backup_runs`

重要テーブルはRLS有効。管理者・製造・Creatorの業務操作はサーバーRPCでも権限を再確認する。

## 3. Auth / RBAC

Supabase Authを利用する。

権限は単一role上書きではなくCapabilityとして保持する。

- buyer
- creator
- manufacturer
- admin

新規Auth userには `buyer` を付与しCartを作成する。
Creator申請承認時には同一Userへ `creator` Capabilityを追加する。購入者履歴は失わない。

Creatorは自分の商品を含む注文でもOrder本体・配送先・支払情報を閲覧しない。Creator専用sales summaryから自分の商品明細だけを取得する。

## 4. Product / File Storage

Buckets:

- `sm-product-public`: 公開画像。PNG/JPEG/WebPのみ。
- `sm-product-private`: デジタル納品・印刷元。PNG/JPEG/WebP/PDF/ZIP。
- `sm-user-private`: Review、権利資料、問い合わせ、案件資料。
- `sm-backups`: 業務Snapshot。

アップロード後は `sm-file-register` が先頭バイトとサイズを検査し、DBへFile metadataを登録する。

公開画像と購入後ファイルを同じ公開URLにしない。
MVPでは公開SVG直配信を許可せず、必要なvectorデータはprivate ZIP等として扱う。

商品審査申請/承認時に以下をサーバー確認する。

- digital sale: digital asset required
- physical sale: print source required
- physical sale: manufacturing cost required
- rights declaration required

## 5. Checkout / Payment

既存UI:

`配送先 → 支払い → 確認 → 注文完了`

を維持する。

STAGING / PRODUCTION:

1. CartはDB同期。
2. `sm_prepare_checkout` が現在商品価格、数量、送料、税、原価、手数料、Creator報酬をサーバー再計算。
3. `checkoutSessionId / idempotencyKey` を固定。
4. `sm-checkout` がStripe PaymentIntentを生成または再利用。
5. BrowserはStripe.jsでPaymentMethod/PaymentIntentをconfirmする。
6. Browser成功だけではOrderを作成しない。
7. Stripe署名付き `payment_intent.succeeded` Webhookを受信した場合のみ `sm_finalize_paid_checkout` がOrderを生成。
8. 同じCheckoutSessionは1 Orderしか生成できない。

MVP実決済はカードを正本とする。コンビニ/PayPay/あと払いの既存表示は削除せず、live modeでは未対応と明示する。

## 6. Fulfillment

Payment確定時、physical OrderにはManufacturingOrderとShipmentを生成する。

内部状態:

- confirmed
- manufacturing
- inspection
- ready_to_ship
- shipped
- delivered
- unable
- cancelled

製造状態からOrder表示状態を導出し、OrderとManufacturingOrderを別々に任意更新しない。

MVPでは工場APIは利用しない。製造会社用Auth account + 管理画面を基本とする。

製造担当に表示するのは対象注文の以下のみ。

- 印刷仕様
- 数量
- 権限付き印刷元ファイル
- 対象配送先
- 製造/配送ステータス

購入履歴、決済情報、Creator報酬は表示しない。

## 7. Refund / CreatorPayout

RefundはOrder status上書きだけで表現しない。

`Order + Payment + Refund + CreatorPayout + PayoutAdjustment`

として記録する。

- partial/full refundの両方を保持可能。
- Provider refundはIdempotency付き。
- 同一Refundを二重に報酬調整しない。
- digital payout: payment確定後confirmed。
- physical payout: delivery完了後confirmed。
- 振込自体はMVPでは運営手動。状態はunconfirmed/confirmed/scheduled/paid/adjusted。

## 8. Notifications / Email

アプリ内通知は `sm_notifications` を正本とする。

主なserver event:

- Order成立
- 商品販売
- 製造/発送/配送完了
- Review
- Creator審査
- 商品審査
- 問い合わせ
- Refund
- Payout確定

Emailは `sm_email_outbox` に格納し、`sm-email-dispatch` がProvider設定時に送信する。

MVP minimum email:

- Order confirmed
- Shipment
- Important support reply
- Refund succeeded

## 9. Audit / Security

重要操作は `sm_audit_logs` へ記録する。

例:

- product moderation
- capability change
- manufacturer assignment
- manufacturing status
- refund
- payout status
- account close

実装済みの基本対策:

- Supabase Auth
- RLS
- server RPC RBAC
- column-level grants
- Storage private/public separation
- magic-byte upload validation
- size limits
- Edge Function rate limits
- Stripe webhook signature verification
- Payment/Refund idempotency
- service-role / Stripe secretをbrowser buildへ含めないCI
- closed account capability removal and business RPC rejection

## 10. Legal

Legal Footerは既存UIを維持する。

`sm_legal_documents` に以下10文書のslotを作成済みだが、現時点ではDRAFTである。

- terms
- privacy
- security
- commerce
- refund
- ip
- ai
- community
- contact
- about

PRODUCTION公開前に実事業情報に基づく正式文書を公開する。

## 11. Backup

`sm-backup` Edge Functionはadmin限定で、主要Sticker Market業務テーブルのSnapshotをprivate `sm-backups` bucketへ保存し `sm_backup_runs` に記録する。

現時点では定期スケジュール資格情報が設定されていないため、自動定期実行は未有効。

## 12. Edge Functions

- `sm-public-config`: 公開可能Runtime configのみ返す
- `sm-checkout`: authenticated buyer PaymentIntent preparation
- `sm-stripe-webhook`: Stripe signature validated webhook
- `sm-refund`: admin-only provider refund
- `sm-private-file`: signed private file authorization
- `sm-file-register`: server-side file signature validation/registration
- `sm-readiness`: admin-only production readiness check
- `sm-backup`: admin-only business data snapshot
- `sm-email-dispatch`: admin-only email outbox worker

## 13. Frontend Adapter

商用MVP追加レイヤー:

- `commercial_mvp_core.js`
- `commercial_mvp_checkout.js`
- `commercial_mvp_ops.js`
- `commercial_mvp_existing_flows.js`
- `commercial_mvp_finalize.js`
- `commercial_mvp_hotfix.js`
- `commercial_mvp.css`

既存v2/scenario filesを削除せず、最後にlive-mode adapterを重ねる。

Mode:

- DEMO: existing browser demo
- STAGING: real backend + test provider configuration
- PRODUCTION: real backend + production provider configuration

公開Vercelのdefaultは意図的にDEMO。Production readinessを満たす前に既存公開デモを停止させない。

## 14. CI

GitHub Actionsで以下を必須チェックする。

- single HTML build
- `node --check`
- existing scenario/UI markers
- commercial MVP adapter markers
- Stripe secret leak prevention
- Supabase service-role leak prevention
- official Stripe.js origin
- deployed public catalog reachability
- deployed authenticated Edge Function anon rejection
- anonymous checkout RPC rejection
- public runtime config must not expose `sk_*`

## 15. 現在のPRODUCTION Blocker

商用MVPのコード/DB基盤とserver boundaryは実装済みだが、実取引を開始する前に実世界の設定・データが必要。

1. `STRIPE_SECRET_KEY`
2. `STRIPE_WEBHOOK_SECRET`
3. `STRIPE_PUBLISHABLE_KEY`
4. Stripe Webhook endpoint registration
5. real Supabase Auth admin account + admin capability
6. real manufacturer Auth account + `mfg_manual_001` or actual manufacturer row linkage
7. at least one product with real public image + digital asset and/or print source
8. physical variant manufacturing cost confirmation
9. all 10 legal documents published with real operator/business details
10. optional but recommended: `RESEND_API_KEY`, `SM_EMAIL_FROM`
11. backup execution schedule
12. live browser/device E2E

These are intentionally not fabricated with dummy production credentials/files/legal statements.

## 16. Production readiness

Admin can call `sm-readiness` to verify server-side blockers. Readiness must not be inferred from UI appearance.

現時点では、PRODUCTIONへ切り替えずDEMOを公開継続する。STAGING/PRODUCTIONを利用する場合はRuntime Modeを明示して検証する。
