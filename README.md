# project-titan

Discord Bot のリプレイス用リポジトリです。方針は [houshin.md](./houshin.md) にまとめています。

現在は最初の土台として、Discord Gateway への接続、終了時の切断、動作確認用の `ping` 応答を実装しています。通知や設定の仕様は未確定のため、まだ実装していません。機能は `src/features/index.ts` の一覧に追加します。

## 開発

Node.js 24.22.0 と pnpm 12.11.2 を使用します。`pnpm dev` はソースを直接起動します。

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm format:check
pnpm build
```

Discord Developer Portal で取得した Bot Token を `.env` の `DISCORD_TOKEN` に設定して `pnpm dev` を実行します。`pnpm dev` は `.env` を読み込みます。

```sh
cp .env.example .env
# .env に Bot Token を設定する
pnpm dev
```

ビルド後は `pnpm start` で起動できます。現在要求する Gateway Intent は Guilds と GuildMessages です。VC 機能を追加するときに GuildVoiceStates を有効化します。Bot をサーバーに導入するときは、動作確認用のチャンネルで View Channel と Send Messages の権限を付けます。

デプロイ後はサーバー内のチャンネルで Bot にメンションして `ping` と送ると、同じチャンネルに `pong` を返します（例: `@Bot ping`）。

## Morning report webhook

`MORNING_REPORT_WEBHOOK_TOKEN` を設定すると、Bot は `PORT`（未設定なら `3000`）で HTTP を受け付けます。Railway の `botchan` サービスでは `PORT=3000` とし、公開ドメインの Target Port も `3000` に設定します。トークンには十分長いランダムな値を設定してください。トークンが未設定なら HTTP サーバーは起動しません。

Grok Bot から `POST /morning-report` に JSON を送ると、`MAKE_SENSE.CURRENT_EVENTS` に Components V2 のレポートを投稿します。成功時は `204`、認証失敗は `401`、本文が不正なら `400` を返します。受信するデータと投稿処理は `src/features/morning-report/index.ts`、HTTP の起動・認証・JSON 読み取りは `src/service/http/index.ts` にあります。投稿先チャンネルIDは `src/config/channels.ts` にあります。

```sh
curl -X POST "https://botchan-production-92e6.up.railway.app/morning-report" \
  -H "Authorization: Bearer $MORNING_REPORT_WEBHOOK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-10-18","overview":"今朝の概要","events":["今日の注目事項"]}'
```

## 次の小さな段階

1. VC 状態変化の解釈を `features` に追加する
2. 通知先の設定方法と保存先を決める
3. VC 通知の投稿を追加する
4. MCP の読み取り範囲と認証方式を決める
5. Railway の IaC を Plan してから適用する

CI は pull request と main の変更で型チェック・フォーマット・ビルドを実行します。GitHub の main にこのワークフローを反映した後、Railway の `production` 環境にある `botchan` サービスの Source を `petaxa/botchanjs` の `main` に接続し、Service Settings で **Wait for CI** を有効にします。Railway の GitHub App にこのリポジトリへのアクセスが必要です。これにより、Railway は main の更新を検知し、GitHub Actions の検証が成功したコミットをデプロイします。GitHub Actions に Railway の認証 token は不要です。Bot の `DISCORD_TOKEN` は引き続き Railway Variables で管理します。

`.railway/railway.ts` は単一 Bot サービスの最小定義です。Railway への Plan・Apply はまだ行っていません。GitHub 連携はアプリケーションのソースとデプロイトリガーを設定します。

## 手動デプロイ

最初のリリースや緊急時には `pnpm deploy:manual` を使います。事前に Railway 側に `botchan` サービスを用意し、`DISCORD_TOKEN` を Railway Variables に設定してください。Railway CLI は開発依存関係に含まれています。一度だけログインして、このディレクトリを対象のプロジェクトにリンクします。

```sh
pnpm install --frozen-lockfile
pnpm exec railway login
pnpm exec railway link --project c9506210-650d-46d8-ad81-c8064d34b458 --environment production --service botchan
pnpm deploy:manual
```

script はリンク先の状態を表示してから、ローカルの現在のファイルを `production` の `botchan` サービスへアップロードし、デプロイ結果まで待ちます。コミットしていない変更も含まれ得るため、実行前に `git status` で内容を確認してください。このコマンドは IaC の Plan・Apply を実行しません。
