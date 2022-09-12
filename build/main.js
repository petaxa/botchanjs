"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// clientインスタンス作成
const client = new discord_js_1.Client({
    intents: [discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.GuildMessages, discord_js_1.GatewayIntentBits.MessageContent, discord_js_1.GatewayIntentBits.GuildVoiceStates],
});
// metainfo
const clientId = process.env.BOTCHAN_CLIENTID; // botchan
const guildIDs = [process.env.MAKESENSE_GUILDID, process.env.OHEYA_GUILDID]; // makeSense, oheya
// 起動時処理
client.once('ready', () => {
    var _a;
    console.log('Ready!');
    console.log((_a = client.user) === null || _a === void 0 ? void 0 : _a.tag);
});
// slash commandでメッセージを返信
const replyMsg = (interaction, msg) => __awaiter(void 0, void 0, void 0, function* () {
    yield interaction.reply(msg);
});
// slash commandで設定の確認
const replyCurrentSettings = (interaction) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    const channel = (_b = interaction.guild) === null || _b === void 0 ? void 0 : _b.channels.cache.find(channel => channel.name === 'settings');
    if (!channel) {
        console.log('channel cant be get');
        return;
    }
    const settings = yield getSettings(channel);
    const settingEmbed = new discord_js_1.EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('settings')
        .setDescription('現在の設定を表示します')
        .addFields({ name: 'secretChannel', value: settings.secretChannel.join('\n') });
    interaction.reply({ embeds: [settingEmbed] });
});
const commandsInfoList = [
    {
        name: 'ping',
        discription: 'Replies with pong!',
        func: (interaction) => __awaiter(void 0, void 0, void 0, function* () { return yield replyMsg(interaction, 'pong'); })
    },
    {
        name: 'hoge',
        discription: 'hogehogeを返すよ',
        func: (interaction) => __awaiter(void 0, void 0, void 0, function* () { return yield replyMsg(interaction, 'hogehoge'); })
    },
    {
        name: 'setting',
        discription: '設定の確認',
        func: (interaction) => __awaiter(void 0, void 0, void 0, function* () { return replyCurrentSettings(interaction); })
    }
];
// コマンドビルダを配列化
const commands = commandsInfoList.map(info => new discord_js_1.SlashCommandBuilder().setName(info.name).setDescription(info.discription).toJSON());
// slash commandを何回も登録してしまうのを防ぐためにRESTを使う
const rest = new discord_js_1.REST({ version: '10' }).setToken((_a = process.env.TOKEN) !== null && _a !== void 0 ? _a : '');
// guildIDsのサーバーにslash commandを実装
guildIDs.forEach(guildId => {
    if (!clientId || !guildId) {
        console.error;
        return;
    }
    rest.put(discord_js_1.Routes.applicationGuildCommands(clientId, guildId), { body: commands })
        .then((data) => console.log(`Successfully registered ${data.length} application commands.`))
        .catch(console.error);
});
// slash commandが送信されたら発火
client.on('interactionCreate', (interaction) => __awaiter(void 0, void 0, void 0, function* () {
    if (!interaction.isChatInputCommand())
        return;
    const { commandName } = interaction;
    commandsInfoList.forEach((info) => __awaiter(void 0, void 0, void 0, function* () {
        if (commandName === info.name) {
            info.func(interaction);
        }
    }));
}));
// 入出ログ出力メソッド
const sendInOutMsg = (oldState, newState, secretVC) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    // vc-noticeのチャンネルIDを取得
    const VcNoticeID = (_b = (_a = oldState.guild.channels.cache.find(channel => channel.name === 'vc-notice')) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : '';
    console.log(VcNoticeID);
    // secretVCのIDリスト
    const secretVcIdsList = [process.env.OHEYA_SECRET, ...secretVC];
    // log送信チャンネルを取得
    const channel = client.channels.cache.get(VcNoticeID);
    if (!channel)
        return;
    // 現在日時を取得
    const date = new Date(Date.now() + ((new Date().getTimezoneOffset() + (9 * 60)) * 60 * 1000));
    const nowmmddHHMM = `${date.getMonth() + 1}/${date.getDate()}-${date.getHours()}:${date.getMinutes()}`;
    // メッセージを送信
    // newStateが入室、oldStateが退室
    if ((_c = oldState.channel) === null || _c === void 0 ? void 0 : _c.name) {
        // 送信メッセージ
        const outMsg = `${nowmmddHHMM} に ${(_d = oldState.member) === null || _d === void 0 ? void 0 : _d.displayName} が ${oldState.channel.name} から退室しました`;
        // secretVCに登録したVCの退室はsecretチャンネルにログを出力
        if (secretVcIdsList.includes((_e = oldState.channel) === null || _e === void 0 ? void 0 : _e.id)) {
            const secretChannel = oldState.guild.channels.cache.find(channel => channel.name === 'secret');
            if (!secretChannel)
                return;
            secretChannel.send(outMsg);
        }
        else {
            channel.send(outMsg);
        }
    }
    if ((_f = newState.channel) === null || _f === void 0 ? void 0 : _f.name) {
        // 送信メッセージ
        const intoMsg = `${nowmmddHHMM} に ${(_g = newState.member) === null || _g === void 0 ? void 0 : _g.displayName} が ${newState.channel.name} に入室しました`;
        // secretVCに登録したVCの入室はsecretチャンネルにログを出力
        if (secretVcIdsList.includes((_h = newState.channel) === null || _h === void 0 ? void 0 : _h.id)) {
            const secretChannel = newState.guild.channels.cache.find(channel => channel.name === 'secret');
            if (!secretChannel)
                return;
            secretChannel.send(intoMsg);
        }
        else {
            channel.send(intoMsg);
        }
    }
};
// vcの状態変化で発火
client.on('voiceStateUpdate', (oldState, newState) => __awaiter(void 0, void 0, void 0, function* () {
    var _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    console.log(`oldState: ${(_c = oldState.channel) === null || _c === void 0 ? void 0 : _c.name}`);
    console.log(`newState: ${(_d = newState.channel) === null || _d === void 0 ? void 0 : _d.name}`);
    const settingChannel = oldState.guild.channels.cache.find(channel => channel.name === 'settings');
    const settings = yield getSettings(settingChannel);
    // oldStateのチャンネルとnewStateのチャンネルが異なるとき、人が移動。
    if (((_e = oldState.channel) === null || _e === void 0 ? void 0 : _e.name) !== ((_f = newState.channel) === null || _f === void 0 ? void 0 : _f.name)) {
        console.log('vcnotice');
        console.log(settings.hideVC);
        console.log((_g = oldState.channel) === null || _g === void 0 ? void 0 : _g.id, (_h = newState.channel) === null || _h === void 0 ? void 0 : _h.id);
        // ログ非表示のVCの場合はログを送信しない
        if (!(settings.hideVC.includes(((_k = (_j = oldState.channel) === null || _j === void 0 ? void 0 : _j.id) !== null && _k !== void 0 ? _k : '') || ((_m = (_l = newState.channel) === null || _l === void 0 ? void 0 : _l.id) !== null && _m !== void 0 ? _m : '')))) {
            sendInOutMsg(oldState, newState, settings.secretChannel);
        }
    }
}));
const getSettings = (channel) => __awaiter(void 0, void 0, void 0, function* () {
    // 設定チャンネルのメッセージを取得
    const msgs = yield (channel === null || channel === void 0 ? void 0 : channel.messages.fetch());
    // 設定の初期値を決定
    const settings = {
        secretChannel: [],
        hideVC: []
    };
    // 取得したメッセージから設定部分を検出、settingにセット
    msgs.forEach(msg => {
        // ":"が含まれていない場合はreturn
        if (!msg.content.includes(':'))
            return;
        // ":"を区切り文字として分割
        const settingAry = msg.content.split(':');
        if (settingAry[0] === 'secretChannel') {
            settings.secretChannel.push(...settingAry[1].split(' '));
        }
        if (settingAry[0] === 'hideVC') {
            settings.hideVC.push(...settingAry[1].split(' '));
        }
    });
    return settings;
});
client.login(process.env.TOKEN);
