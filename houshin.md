# Discord Bot 開発・インフラ構成方針

## 概要

Discord BotをTypeScriptで開発し、Railway上で運用する。

Discord公式APIが提供する機能を幅広く利用できる構成とし、アプリケーションの実装とインフラを分離する。

インフラは宣言的に管理し、Gitリポジトリ上の定義を正として構築・更新できる状態を目指す。

## 技術選定

### アプリケーション

- 言語：TypeScript
- ランタイム：Node.js 24
- Discord API：@discordjs/core
- REST通信：@discordjs/rest
- Gateway通信：@discordjs/ws
- Discord API型定義：discord-api-types
- パッケージマネージャー：pnpm

### 開発ツール

- トランスパイル・バンドル：tsdown
- Lint・型チェック：Oxlint + oxlint-tsgolint
- フォーマット：Oxfmt

### インフラ

- ホスティング：Railway
- プラン：Railway Hobby
- IaC：Railway公式IaC（TypeScript）
- ビルドシステム：Railpack
- コンテナ実行：Railway
- CI/CD：GitHub Actions + Railway
- シークレット管理：Railway Variables
- バージョン管理：GitHub

## 機能要件

Discord公式APIが提供するBot向けの機能を幅広く利用できる構成とする。

### 対応する機能

- メッセージの送信・編集・削除
- メッセージイベントの受信
- チャンネルの作成・編集・削除
- ロール・メンバー管理
- VCへの入室・退出・移動の検知
- ミュート状態などの音声状態変更の検知
- スラッシュコマンド
- ボタン・セレクトメニュー・モーダル
- リアクションなどのGatewayイベント
- その他、Discord REST APIおよびGateway APIが提供する機能

### 将来的な拡張

- Discord Activities
  - @discord/embedded-app-sdk を使用
  - VueなどによるWebアプリケーションとして実装
  - Botとは独立したホスティング環境での運用にも対応
- Discord Voice
  - @discordjs/voice などを利用した音声送受信
  - UDP通信に対応したインフラへの移行を含めて実装

## アーキテクチャ方針

### 1. Discord APIとの接続を分離する

Discord APIへのアクセスとBotのビジネスロジックを分離する。

- REST API操作は専用モジュールに集約する
- Gatewayイベントの受信とイベント処理を分離する
- Discord固有の型やオブジェクトがビジネスロジック全体に広がらないようにする
- Discord APIの追加機能を利用できる拡張性を維持する

### 2. インフラへの依存を最小化する

アプリケーションは一般的なNode.jsプロセスとして動作させる。

- 環境変数から設定を読み込む
- 標準的なNode.jsの起動コマンドで実行できるようにする
- Railway固有のSDKやAPIへの依存をアプリケーションロジックに持ち込まない
- Railway以外のVPS、VM、コンテナサービスでも起動できる構成にする

### 3. 状態管理を明確にする

- Gatewayイベントに必要な状態を明示的に管理する
- VC入退出の判定には、ユーザーごとの直前のVoice Stateを利用する
- Gateway再接続後の状態同期を考慮する
- 永続データが必要になった場合は、ストレージを独立したコンポーネントとして追加する

## ビルド方針

### TypeScript

tsdownを使用してTypeScriptをJavaScriptに変換・バンドルする。

- エントリーポイント：src/index.ts
- 出力先：dist/
- 実行形式：ES Modules
- 実行環境：Node.js 24

### コード品質

Oxcを使用してLint・型チェック・フォーマットを実施する。

- OxlintによるLint
- oxlint-tsgolintを利用した型情報ベースのLint・型チェック
- Oxfmtによるフォーマット
- 型チェックとビルドを独立した処理として実行する

### package.json

```json
{
  "type": "module",
  "scripts": {
    "dev": "node --watch src/index.ts",
    "build": "tsdown src/index.ts --platform node",
    "start": "node dist/index.js",
    "check": "oxlint --type-aware --type-check",
    "format": "oxfmt .",
    "format:check": "oxfmt --check ."
  }
}
```

### 開発依存関係

pnpm add -D tsdown oxlint oxlint-tsgolint oxfmt typescript @types/node

## インフラ方針

### Railway

Railway Hobbyプランを利用し、Discord Botを常時稼働するサービスとしてデプロイする。

初期設定は以下とする。

- Replicas：1
- サービスのスリープ：無効
- 再起動ポリシー：障害時に再起動
- Public Domain：必要に応じて設定
- 永続Volume：必要に応じて追加
- 環境変数：Railway Variablesで管理

CPU・メモリの利用状況を監視し、小規模なリソース構成で運用する。

月額費用はRailway Hobbyの最低料金である$5を基準とし、実際のリソース使用量に応じて評価する。

### Infrastructure as Code

Railway公式IaCを使用し、TypeScriptでインフラ構成を宣言する。

管理対象は以下とする。

- Project
- Environment
- Service
- デプロイ設定
- リソース制限
- Replicas
- Restart Policy
- 必要な環境変数の定義
- 将来的に追加するサービスやリソース

IaCの定義はGitリポジトリに配置する。

変更時はPlanによって差分を確認し、Applyによって反映する。

シークレットの実値はソースコードに含めず、安全な経路でRailwayに設定する。

### Railpack

Railpackを使用して、ソースコードから実行用Container Imageを自動生成する。

ビルドの流れは以下とする。

1. RailwayがGitHubリポジトリのソースコードを取得する
2. RailpackがNode.jsとpnpmのプロジェクトを検出する
3. pnpmで依存関係をインストールする
4. pnpm buildを実行する
5. tsdownがJavaScriptを生成する
6. Railpackが実行用Container Imageを構築する
7. Railwayがコンテナを起動する
8. pnpm startによりBotを起動する

Node.jsおよびpnpmのバージョンを明示的に固定し、lockfileによって依存関係の再現性を確保する。

## CI/CD方針

GitHub ActionsとRailwayを使用してビルド・検証・デプロイを自動化する。

### CI

GitHub Actionsで以下を実行する。

1. pnpmによる依存関係のインストール
2. pnpm checkによるLint・型チェック
3. pnpm format:checkによるフォーマット検証
4. テスト
5. pnpm buildによるビルド検証

### CD

1. GitHub上でデプロイ対象の変更を確定する
2. CIが正常に完了したことを確認する
3. Railwayへデプロイを実行する
4. RailpackでContainer Imageをビルドする
5. Railwayで新しいコンテナを起動する
6. アプリケーションの正常起動を確認する

インフラ定義の変更はRailway公式IaCのPlan・Applyによって管理する。

アプリケーションのデプロイとインフラ構成の変更を分離する。

### デプロイ時の制御

- GatewayのGraceful Shutdownを実装する
- SIGTERMなどの終了シグナルを処理する
- Gateway接続を適切に切断する
- デプロイ時の旧・新プロセスの重複稼働を考慮する
- イベント処理の重複実行を防ぐ設計を行う
- 障害時に再起動できる構成とする

## セキュリティ方針

- Discord Bot Tokenは環境変数で管理する
- シークレットをGitリポジトリに含めない
- GitHub ActionsからRailwayへの認証情報を適切に管理する
- CI/CDの権限を必要最小限にする
- GitHub Actionsで利用する外部Actionのバージョンを固定する
- 依存関係を定期的に更新する
- DiscordのGateway IntentsとBot権限を用途に応じて設定する
- ログに認証情報や機密情報を出力しない

## 運用方針

### 可観測性

- 標準出力・標準エラーにログを出力する
- Railway Logsでログを確認できるようにする
- Gateway接続状態を監視する
- エラーやプロセス再起動を記録する
- CPU・メモリ使用量を確認できるようにする

### コスト管理

- Railway Hobbyプランを利用する
- CPU・メモリの実使用量を確認する
- 最初は単一Replicaで運用する
- 利用量の増加に応じてリソース設定を調整する
- 月額料金と利用量を定期的に確認する

### ポータビリティ

実行環境を変更する場合でも、アプリケーションコードを継続利用できる構成を維持する。

移行対象を以下に分離する。

- アプリケーションコード
- ビルド処理
- 環境変数・シークレット
- 永続データ
- インフラ定義

## 初期実装の完了条件

- [x] TypeScript + Node.js 24の開発環境が構築されている
- [x] pnpmで依存関係を管理できる
- [x] tsdownでTypeScriptをビルドできる
- [x] OxlintでLint・型チェックを実行できる
- [x] Oxfmtでフォーマットを検証できる
- [ ] @discordjs/coreを使用してDiscord APIに接続できる
- [ ] Gatewayイベントを受信できる
- [ ] VC入退出イベントを検知できる
- [ ] Discordへのメッセージ送信ができる
- [ ] スラッシュコマンドを利用できる
- [ ] Railpackでアプリケーションをビルドできる
- [ ] Railway上でBotを常時稼働できる
- [ ] Railway公式IaCでインフラ構成を管理できる
- [ ] GitHub Actionsからデプロイできる
- [ ] シークレットが安全に管理されている
- [ ] Gateway接続の切断・再接続に対応している
- [ ] デプロイ時の重複イベント処理を考慮した設計になっている
- [ ] Railway上でログとリソース使用量を確認できる
- [ ] Railway以外のNode.js実行環境でもアプリケーションを起動できる
