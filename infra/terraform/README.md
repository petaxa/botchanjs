# 株ゲームのインフラ（PR01）

[Issue #10](https://github.com/petaxa/botchanjs/issues/10)で使う Cloudflare D1 を Terraform で管理します。このPRではデータベースと自動実行の仕組みだけを追加します。Worker、Access、口座のスキーマは後続のPRで追加します。

## 初回だけ行う準備

リポジトリの管理者が次を行ってください。**秘密値をこのチャットやIssueに送る必要はありません。**

1. 対象のCloudflareアカウントで、Terraform state専用の非公開R2バケットを作る。バケット名と32桁のCloudflareアカウントIDを控える。このバケット自体はこのTerraform定義からは作れません。
2. そのバケットだけに **Object Read & Write** 権限を持つR2 APIトークンを作り、表示されたAccess Key IDとSecret Access Keyを控える。
3. 対象アカウントの **D1 Read** と **D1 Write** 権限を持つCloudflare APIトークンを作る。後続PRでWorkerやAccessの権限が必要になったときに追加します。
4. GitHubの本リポジトリで **Settings → Secrets and variables → Actions → Repository secrets** を開き、以下の5つを手動で登録する。

   | Secret名                   | 登録する値                    |
   | -------------------------- | ----------------------------- |
   | `TF_CLOUDFLARE_ACCOUNT_ID` | CloudflareアカウントID        |
   | `TF_CLOUDFLARE_API_TOKEN`  | 手順3のCloudflare APIトークン |
   | `TF_R2_BUCKET`             | 手順1のR2バケット名           |
   | `TF_R2_ACCESS_KEY_ID`      | 手順2のR2 Access Key ID       |
   | `TF_R2_SECRET_ACCESS_KEY`  | 手順2のR2 Secret Access Key   |

R2用とCloudflare API用のトークンは別です。Access Service TokenとGrok Bot専用トークンも後続PRで別途用意します。秘密値をソース、tfvars、PR本文、Actionsログに書かないでください。

## PR02: Worker と Access の追加準備

PR02を適用する前に、Cloudflare Zero TrustでBot専用の[Access Service Token](https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/)を**手動発行**してください。`Client ID`、`Client Secret`、トークンのUUID形式のIDを控えます。IDは[Service Token一覧API](https://developers.cloudflare.com/api/resources/zero_trust/subresources/access/subresources/service_tokens/methods/list/)でも確認できます。GitHub ActionsのRepository secretに `TF_ACCESS_SERVICE_TOKEN_ID` として**IDだけ**を登録します。`Client ID` と `Client Secret` はPR03でBotのRailway環境変数へ登録します。Access Service TokenをTerraformで生成しないため、秘密値はTerraform stateに入りません。

PR01で作った `TF_CLOUDFLARE_API_TOKEN` の権限には、D1 Read/Writeに加えて、対象アカウントの **Workers Scripts Read/Write** と **Access: Apps and Policies Read/Write** が必要です。権限を追加した新しいトークンにGitHub Secretを更新してください。Cloudflare Zero Trustの初期設定が済んでいない場合は先に完了してください。

Workerは `botchan-stocks-api` としてデプロイします。Workerの`/internal/health`はD1への読取接続を確認し、成功時に `{"ok":true,"database":"connected"}` を返します。Cloudflare AccessはWorker全体を保護し、指定したService Tokenだけを許可します。デプロイ後、CloudflareダッシュボードでWorkerのURLを確認し、次を検証します。

```bash
curl -i "$WORKER_URL/internal/health"
curl -i "$WORKER_URL/internal/health" \
  -H "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID" \
  -H "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET"
```

1回目はAccessで拒否され、2回目はHTTP 200と上記のJSONが返ることを確認します。Tokenが未登録ならPRのPlanは実行されず、静的検証だけ通ります。

## Plan / Apply

[Terraformワークフロー](../../.github/workflows/terraform.yml)は全PRで `fmt`、バックエンドを使わない `init`、`validate` を実行します。同じリポジトリ内のPRだけ、上記の準備が済んだ後にR2のstateを使ったPlanも実行します。PlanはActionsのログで確認できます。秘密値を含み得るPlanのバイナリは成果物として公開しません。

レビュー済みPRが `main` にマージされると、ワークフローがPlanを作り、**同じ実行で作ったPlanだけ**をApplyします。`workflow_dispatch` はPlanまでで、Applyしません。GitHub Actionsで同時実行を直列化し、TerraformもR2上の `.tflock` によるロックを要求します。最初の実環境Planとロック動作は、上記の準備後に確認します。

stateは非公開バケット内の `botchan/terraform.tfstate` に保存します。通常運用でバケットを削除しないでください。D1には `prevent_destroy` を設定しています。stateを変更する場合やリソース削除前には、D1とstateをバックアップしてください。

バックエンドには[Cloudflare公式のR2手順](https://developers.cloudflare.com/terraform/advanced-topics/remote-backend/)を使います。資格情報はGitHub Actionsの環境変数から渡し、Terraformファイルには書きません。生成される `backend.auto.hcl`、ローカルstate、PlanファイルはGitの追跡対象外です。
