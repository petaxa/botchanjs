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

## Plan / Apply

[Terraformワークフロー](../../.github/workflows/terraform.yml)は全PRで `fmt`、バックエンドを使わない `init`、`validate` を実行します。同じリポジトリ内のPRだけ、上記の準備が済んだ後にR2のstateを使ったPlanも実行します。PlanはActionsのログで確認できます。秘密値を含み得るPlanのバイナリは成果物として公開しません。

レビュー済みPRが `main` にマージされると、ワークフローがPlanを作り、**同じ実行で作ったPlanだけ**をApplyします。`workflow_dispatch` はPlanまでで、Applyしません。GitHub Actionsで同時実行を直列化し、TerraformもR2上の `.tflock` によるロックを要求します。最初の実環境Planとロック動作は、上記の準備後に確認します。

stateは非公開バケット内の `botchan/terraform.tfstate` に保存します。通常運用でバケットを削除しないでください。D1には `prevent_destroy` を設定しています。stateを変更する場合やリソース削除前には、D1とstateをバックアップしてください。

バックエンドには[Cloudflare公式のR2手順](https://developers.cloudflare.com/terraform/advanced-topics/remote-backend/)を使います。資格情報はGitHub Actionsの環境変数から渡し、Terraformファイルには書きません。生成される `backend.auto.hcl`、ローカルstate、PlanファイルはGitの追跡対象外です。
