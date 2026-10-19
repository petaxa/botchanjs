# project-titan

Discord Bot のリプレイス用リポジトリです。方針は [houshin.md](./houshin.md) にまとめています。

Discord Gateway への接続、終了時の切断、動作確認用の `ping` 応答、VC 入退出通知を実装しています。機能は `src/features/index.ts` の一覧に追加します。

## 開発

Node.js 24.22.0 と pnpm 12.11.2 を使用します。`pnpm dev` はソースを直接起動します。

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm format:check
pnpm build
```

Discord Developer Portal で取得した Bot Token を `.env` の `DISCORD_TOKEN` に設定して `pnpm dev` を実行します。`pnpm dev` は `.env` を読み込みます。

```sh
cp .env.example .env
# .env に Bot Token を設定する
pnpm dev
```

ビルド後は `pnpm start` で起動できます。Gateway Intent は Guilds、GuildMessages、GuildVoiceStates、MessageContent を使用します。Discord Developer Portal の Bot 設定でも **Message Content Intent** を有効にしてください。Bot には `settings` チャンネルの View Channel と Read Message History、通知先チャンネルの View Channel と Send Messages 権限が必要です。

デプロイ後はサーバー内のチャンネルで Bot にメンションして `ping` と送ると、同じチャンネルに `pong` を返します（例: `@Bot ping`）。

## VC 入退出通知

ユーザーが VC に入室・退出すると、`MM/dd hh:mm に <表示名> が <VC名> に入室しました`、または `MM/dd hh:mm に <表示名> が <VC名> から退出しました` を投稿します。時刻は日本時間です。VC 間の移動では退出と入室をそれぞれ通知します。Bot 起動時に既に VC にいるユーザーについては通知しません。

通常の通知先は `vc-notice` という名前のテキストチャンネルです。サーバーに `settings` という名前のテキストチャンネルがある場合、その全メッセージを `キー名:値` の形式で読み取ります。書式が違うメッセージは無視し、同じキーが複数あれば新しい有効な設定を使います。次の設定を利用できます。

```text
noticeChannel:123456789012345678
secretChannel:234567890123456789
secretNoticeChannel:345678901234567890
```

`noticeChannel` は通常の通知先テキストチャンネルの ID です。設定すると `vc-notice` より優先します。設定先が存在しない場合は通知しません。`secretChannel` は秘匿する VC の ID です。この VC の入退出は `secretNoticeChannel` に設定したテキストチャンネルへだけ通知します。`secretNoticeChannel` がない場合、その VC の通知は行いません。設定に使う ID は同じサーバー内のチャンネルを指定してください。

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

1. MCP の読み取り範囲と認証方式を決める
2. Railway の IaC を Plan してから適用する

CI は pull request と main の変更で型チェック・テスト・フォーマット・ビルドを実行します。Railway は main の更新を検知し、GitHub Actions の検証が成功したコミットをデプロイします。GitHub Actions に Railway の認証 token は不要です。Bot の `DISCORD_TOKEN` は引き続き Railway Variables で管理します。

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
