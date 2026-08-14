# Sticker Market 正式MVP要件 × 現在実装 受入マトリクス

基準: 「Sticker Market MVP正式差分改修案 Ver.1.0」＋現行v2 / scenario-fit / commercial MVP

判定:
- ○ = 実装済みかつコード/DB/既存回帰または対象STAGING E2Eで確認済み
- △ = 実装はあるがSTAGING End-to-End受入、実機、または外部設定が未完了
- × = 必須受入環境または実機検証が未実施

> 原則: 既存UI・URL・ナビ・既存追加機能は変更せず、不足差分のみを修正する。

## A. 最上位原則

| ID | 要件 | 判定 | 根拠 / 残件 |
|---|---|---:|---|
| GOV-01 | 現行UI/URL/ナビ/検索/Checkout等を正本として維持 | ○ | v2系を残し、commercial MVP / formal delta / acceptance fixを末尾追加する構成。DEMO回帰あり。 |
| GOV-02 | 同目的機能を作り直さず既存機能を拡張 | ○ | Product/Order/Support等は既存正本を再利用。 |
| GOV-03 | DB加算型・既存ID維持 | ○ | sm_*へカラム/関連/RPC追加。商品p1等の既存ID維持。 |

## B. MVP中核6フロー

| ID | 要件 | 判定 | 根拠 / 残件 |
|---|---|---:|---|
| FLOW-01 | 一般ユーザー→Creator申請→承認→商品登録→入稿→審査→公開 | ○ | STAGING実ブラウザ E2E-02 / E2E-03 PASS。受入Run 31836345016。 |
| FLOW-02 | 検索→商品→仕様→Cart→配送先→決済→Order | △ | 実装済み。Stripe Test Mode資格情報未設定のためE2E-01完走待ち。 |
| FLOW-03 | Order→ManufacturingOrder→割当→製造→検品→発送→受取 | △ | 実装済み。実決済起点のE2E-04/05はStripe Test Mode待ち。 |
| FLOW-04 | 売上予定→配送完了→報酬確定→支払予定→支払済み | △ | DB/RPC実装済み。配送完了でphysical payout確定。実決済起点のE2E-05最終受入待ち。 |
| FLOW-05 | 不良等→運営→再製造/返金→案件完了 | △ | 再製造/Refund実装済み。E2E-07/08はStripe Test Mode待ち。 |
| FLOW-06 | 製造不能→保留→修正→再確認→製造再開 | △ | unable/revision_requested/印刷元履歴実装済み。E2E-06はStripe Test Mode待ち。 |

## C. 要件別実装

| ID | 要件 | 判定 | 根拠 / 残件 |
|---|---|---:|---|
| MVP-01-01 | DEMOを維持しSTAGING/PRODUCTIONのみBackend切替 | ○ | SM_MVP mode adapter。 |
| MVP-01-02 | 既存Checkout UI維持 | ○ | shipping/payment/confirmルート維持。 |
| MVP-01-03 | Provider成功→署名Webhook→Order確定 | ○ | sm-checkout + sm-stripe-webhook。 |
| MVP-01-04 | 同一決済の二重Order防止 | ○ | checkout session / idempotency / webhook event重複防止。 |
| MVP-01-05 | 購入時価格・仕様・Creator・原価・手数料・報酬・配送先・決済IDを固定 | ○ | checkout snapshot→sm_order_items / sm_ordersへ固定保存。 |
| MVP-02-01 | physical購入時にManufacturingOrder自動生成 | ○ | sm_finalize_paid_checkout。 |
| MVP-02-02 | 対応素材/サイズ/activeで製造先選定 | ○ | sm_choose_manufacturer_for_order。 |
| MVP-02-03 | default/priorityで単純優先割当 | ○ | sm_manufacturers.is_default / priority。 |
| MVP-02-04 | 対応工場なし時は保留・運営通知 | ○ | ManufacturingOrder unable + Order on_hold。 |
| MVP-03-01 | unable / revision_requested状態 | ○ | DB/RPC/UI実装。 |
| MVP-03-02 | 製造不能時の問題分類・説明必須 | ○ | sm_mark_manufacturing_unableで検証。 |
| MVP-03-03 | 問題資料添付 | ○ | manufacturing_issue private file。sm_files制約も対応済み。 |
| MVP-03-04 | 運営・Creator・購入者への通知 | ○ | sm_mark_manufacturing_unable。 |
| MVP-03-05 | 修正版→製造担当通知→再開 | ○ | sm_submit_manufacturing_revision / sm_set_manufacturing_status。 |
| MVP-03-06 | 旧/新印刷元を履歴管理し注文使用版を特定 | ○ | sm_manufacturing_sources + revision_no/is_current。 |
| MVP-04-01 | ManufacturingOrderを工程正本とする | ○ | Order表示状態を製造工程から同期。 |
| MVP-04-02 | 不正な工程遷移を禁止 | ○ | sm_set_manufacturing_status許可遷移制御。 |
| MVP-04-03 | 発送時carrier/tracking必須 | ○ | SHIPPING_INFO_REQUIRED。 |
| MVP-04-04 | shipped/deliveredをShipment/Orderへ同期 | ○ | 同一RPC内トランザクション。 |
| MVP-05-01 | 購入者受取記録 | ○ | sm_confirm_order_received。 |
| MVP-05-02 | 内容確認後の取引完了 | ○ | sm_complete_order。 |
| MVP-05-03 | 永久未完了防止 | ○ | 管理者による配送完了7日超の完了処理。 |
| MVP-05-04 | Reviewは任意で取引完了を阻害しない | ○ | completed後レビュー導線。 |
| MVP-06-01 | 製造開始前キャンセル→返金 | ○ | sm_admin_cancellation_decision + sm-refund。 |
| MVP-06-02 | 製造開始後キャンセル→相談 | ○ | status_historyまで確認し、一度でも製造開始後なら相談扱い。 |
| MVP-06-03 | 返金成功前にOrderだけ閉じない | ○ | Provider refund / webhookまたは成功レスポンス後にDB反映。 |
| MVP-07-01 | 遅延/未着/不良/破損/誤配送/返金SupportCase | ○ | 既存Support機構を継続利用。 |
| MVP-07-02 | 不良時の写真添付 | ○ | private support file登録。 |
| MVP-07-03 | 再製造/再発送/案件完了 | ○ | reproduction ManufacturingOrder + support_case_id。 |
| MVP-08-01 | 再製造は新規通常Orderを作らない | ○ | 元Order→SupportCase→reproduction_of。 |
| MVP-08-02 | 再製造で売上/販売件数を二重計上しない | ○ | Order/OrderItemを再生成せずManufacturingOrderのみ生成。 |
| MVP-08-03 | 再製造追加原価を区別可能 | ○ | reproduction ManufacturingOrderとして追跡可能。 |
| MVP-09-01 | RefundをPayment/Order/Payoutから独立管理 | ○ | sm_refunds。 |
| MVP-09-02 | full/partial refundデータモデル | ○ | kind + amount。 |
| MVP-09-03 | 返金時CreatorPayout調整 | ○ | sm_payout_adjustments + adjusted。 |
| MVP-09-04 | 支払済み履歴を削除しない | ○ | status_history / PayoutAdjustmentで履歴保持。 |
| MVP-10-01 | payout: unconfirmed→confirmed→scheduled→paid | ○ | fulfillment確定＋管理者支払操作。逆行/早期確定をサーバーで禁止。 |
| MVP-10-02 | physicalは配送完了後に報酬確定 | ○ | sm_confirm_physical_payouts。 |
| MVP-10-03 | digitalは決済確定後に報酬確定 | ○ | sm_finalize_paid_checkout。 |
| MVP-10-04 | 自動振込を必須にしない | ○ | 管理者がscheduled/paidを記録。 |
| MVP-11-01 | Creatorに売価/原価/手数料/予定/確定/支払状態表示 | ○ | sm_creator_sales_detail + sales enhancement。 |
| MVP-11-02 | Creatorへ配送先/決済詳細を見せない | ○ | Creator専用sales/order RPC。Order本体RLS分離。 |
| MVP-12-01 | ファイル形式/サイズ検証 | ○ | sm-file-register。 |
| MVP-12-02 | 解像度/印刷サイズ検証 | ○ | sm_validate_product_submission。300dpi換算の必要pxを提示。 |
| MVP-12-03 | PNG透過確認 | ○ | alpha metadataをwarning表示。 |
| MVP-12-04 | 必須印刷元ファイル確認 | ○ | private_print_key必須。 |
| MVP-12-05 | エラー時に修正内容を具体表示 | ○ | 必要px・不足仕様・製造不可条件など具体メッセージ。 |
| MVP-13-01 | 商品情報/入稿/権利/製造可能性を公開前確認 | ○ | sm_validate_product_submission + admin publish guard。STAGING E2E-03でも確認。 |
| MVP-13-02 | 承認/差し戻し/非公開 | ○ | 既存UIをserver moderation RPCへ接続。公開はSTAGING E2E-03 PASS。 |
| MVP-14-01 | buyer + creator両権限維持 | ○ | capability model。E2E-02でbuyer→creator申請/承認を実確認。 |
| MVP-14-02 | Manufacturerは担当製造情報のみ | ○ | RLS/RPC/private-fileで制限。 |
| MVP-14-03 | Manufacturerに決済/Creator報酬を見せない | ○ | payment/payout RLS。 |
| MVP-15-BUY | Buyer必須通知 | ○ | order/shipping/support/refund通知。 |
| MVP-15-CRE | Creator必須通知 | ○ | moderation/sale/manufacturing revision/payout通知。 |
| MVP-15-MFG | Manufacturer必須通知 | ○ | 新規製造注文/修正版通知。 |
| MVP-15-ADM | Admin必須通知 | ○ | review/manufacturing/support/refund系。 |
| MVP-16-01 | 未完了注文/問い合わせ/返金/再製造/報酬で退会阻止 | ○ | sm_account_closure_check。 |
| MVP-16-02 | Creatorの公開商品/未完了販売注文を確認 | ○ | 同RPC。 |

## D. STAGING / 品質保証

| ID | 要件 | 判定 | 根拠 / 残件 |
|---|---|---:|---|
| MVP-17-01 | Supabase Auth | ○ | 商用Backend実装済み。 |
| MVP-17-02 | 実DB | ○ | sm_* PostgreSQL。 |
| MVP-17-03 | Stripe Test Mode | △ | Adapter/Edge Function実装済み。現在public configはpaymentConfigured=false。Test資格情報設定が必要。 |
| MVP-17-04 | テスト購入者 | ○ | GitHub OIDCでrun単位の隔離fixtureを自動生成。 |
| MVP-17-05 | テストCreator申請者 | ○ | 同上。E2E-02 PASS。 |
| MVP-17-06 | テスト管理者 | ○ | OIDC fixtureでadmin capabilityを付与。実ユーザーには付与しない。 |
| MVP-17-07 | テスト製造事業者 | ○ | OIDC fixtureでmanufacturer capability＋Manufacturer紐付け。 |
| MVP-17-08 | 販売可能テスト商品 | ○ | OIDC fixtureでprivate print source＋原価＋対応variant付き物理商品を生成。 |
| E2E-01 | 購入 | △ | Playwright実装済み。Stripe Test Mode未設定で決済実走不可。 |
| E2E-02 | Creator申請/出品 | ○ | STAGING Chromium Mobile PASS。Run 31836345016。 |
| E2E-03 | 商品審査/公開 | ○ | STAGING Chromium Mobile PASS。原価設定→server承認→buyer公開確認。Run 31836345016。 |
| E2E-04 | 製造/検品/発送 | △ | Playwright実装済み。実決済起点のOrder生成待ち。 |
| E2E-05 | 配送/受取/報酬確定 | △ | Playwright実装済み。実決済起点のE2E待ち。 |
| E2E-06 | 製造不能/修正版/再開 | △ | Playwright実装済み。実決済起点のE2E待ち。 |
| E2E-07 | 不良/再製造/再発送 | △ | Playwright実装済み。実決済起点のE2E待ち。 |
| E2E-08 | Refund/Payout調整/通知 | △ | Playwright実装済み。Stripe Test Mode待ち。 |
| REG-01 | LP/Home/Search/Product等既存Buyer回帰 | ○ | demo-regression.spec.mjs成功済み。 |
| REG-02 | Creator商品/注文/売上/AI等回帰 | ○ | demo-regression.spec.mjs成功済み。 |
| REG-03 | Admin審査/注文/User/監査/製造等回帰 | ○ | demo-regression.spec.mjs成功済み。 |
| REG-04 | 390px mobile navigation / horizontal overflow | ○ | Chromium mobile regression成功済み。 |
| REG-05 | iPhone Safari実機 | × | 実機受入未実施。 |
| REG-06 | Android Chrome実機 | × | 実機受入未実施。 |

## E. リリース判定

| ID | 判定群 | 判定 | 状態 |
|---|---|---:|---|
| REL-01 | 商品販売 | ○ | FLOW-01をSTAGING実ブラウザで完走。 |
| REL-02 | 購入 | △ | コード成立。Stripe Test E2E待ち。 |
| REL-03 | 製造 | △ | コード成立。実決済起点E2E待ち。 |
| REL-04 | 配送 | △ | コード成立。実決済起点E2E待ち。 |
| REL-05 | 報酬 | △ | コード成立。配送完了→確定→scheduled/paidのSTAGING受入待ち。 |
| REL-06 | トラブル復旧 | △ | コード成立。E2E-06/07/08待ち。 |
| REL-07 | 既存回帰 | ○ | DEMO自動回帰成功。 |
| REL-08 | Runtime Error | ○ | 現自動回帰範囲で重大pageerrorなし。 |
| REL-09 | モバイル実機 | × | iPhone/Android実機受入待ち。 |
| REL-10 | 正式MVP総合 | △ | 商品販売フローは正式受入済み。残リリースゲートはStripe Test全取引E2Eと実機確認。 |

## F. 正式受入工程で発見・修正した差分

1. **Payout状態逆行/早期確定**
   - 旧: 管理者がunconfirmed→paid等を任意設定可能。
   - 修正: fulfillmentによるconfirmedを正本とし、管理者操作はconfirmed→scheduled→paidの前進のみ。

2. **製造開始後→unable時のキャンセル誤判定**
   - 旧: 現在statusがunableなら製造前扱いになる余地。
   - 修正: ManufacturingOrder.status_historyまで参照し、一度でもmanufacturing以降へ進んだ注文は製造後キャンセル相談へ送る。

3. **製造不能/修正版ファイルpurpose制約不足**
   - 旧: UI/RPCはmanufacturing_issue/manufacturing_revisionを使用するがDB CHECKが未許可。
   - 修正: sm_files purpose制約へ両用途を追加。

4. **匿名公開カタログの内部参照値露出**
   - 旧: anon SELECTとselect=*によりprivate_print_key / digital_asset_key / variant cost / internal user_id等を取得可能。
   - 修正: 公開カタログ列を明示し、anon column privilegesも必要列だけへ縮小。CI契約テスト追加。

5. **商品審査申請後の作品詳細遷移**
   - 旧: 全アカウント再同期がユーザー遷移完了の前提になり、サーバー保存成功後も画面が止まるケース。
   - 修正: server persistence/review submissionを確定点にし、最小ローカル表示→作品詳細→全体同期の順に変更。

6. **古いhash/popstate Router固定参照**
   - 旧: 初期v2のrenderがイベントlistenerに固定され、後付けのwork/admin-work等が古いRouterへ入る。
   - 修正: stale listenerを解除し最終Routerへ再バインド。URL/ナビ構造は変更なし。

7. **管理者公開前チェックの二重挿入**
   - 旧: 複数非同期enhancerが同時にsectionを追加可能。
   - 修正: await前にplaceholderを予約し冪等化。

8. **管理者審査ボタンのDEMO処理へのフォールバック**
   - 旧: 公開前チェック修正時にlive-mode moderation wrapperが欠落。
   - 修正: 既存「承認/差し戻し/非公開」をsm_admin_decide_productへ再接続。サーバー側で入稿/原価を再検証。

9. **STAGING fixtureの安全な自動生成**
   - 固定パスワードSecrets依存を廃止。
   - GitHub Actions OIDCをSupabase Edge Functionで検証し、workflow_dispatch / exact repo / main / staging environment限定でrun単位テストユーザー・工場・商品を生成。
   - 実ユーザーへadmin/manufacturer権限を付与しない。

## G. 受入証跡

### STAGING 商品販売フロー

- GitHub Actions Run: `31836345016`
- E2E-02: PASS（23.4s）
- E2E-03: PASS（10.4s）
- 合計: `2 passed (34.5s)`
- Workflow全体がfailureなのは、最後の正式リリースゲートがStripe Test Mode未設定を意図的に検知したため。

### 通常CI

- JS構文
- commercial MVP契約
- formal delta契約
- deployed server boundary
- 匿名private-field読取拒否
- build marker

を継続検査する。

## H. 残る△/×を潰す順序

1. Supabase Edge Function SecretsへStripe **Test Mode**の `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PUBLISHABLE_KEY (pk_test_*)` を設定。
2. STAGING Workflowを手動実行しE2E-01〜08を全件完走。
3. 失敗があれば当該差分だけ修正し再実走。
4. iPhone Safari実機で主要購入/Creator/Admin操作を確認。
5. Android Chrome実機で主要購入/Creator/Admin操作を確認。
6. 上記完了後、REL-02〜06 / E2E-01,04〜08 / REG-05,06を○へ更新し、REL-10を○にする。

## I. 外部本番リリースゲート（MVP機能受入とは別）

Commercial MVPを実際に一般公開し課金開始する前には、以下を実値で確定する。架空値で○判定しない。

- 正式Legal本文・事業者情報
- Stripe本番資格情報
- 実製造事業者契約・運用情報
- 実販売商品/印刷元データ
- 必要なメール送信設定

現在Legal 10文書のレコードは存在するがdraft・本文未設定のため、本番公開ゲートとして残す。
