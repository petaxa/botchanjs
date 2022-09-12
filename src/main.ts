import { Client, GatewayIntentBits, REST, SlashCommandBuilder, Routes, VoiceState, CacheType, ChatInputCommandInteraction, EmbedBuilder, TextChannel } from 'discord.js'
import dotenv from 'dotenv'

dotenv.config()

// clientインスタンス作成
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates],
})

// metainfo
const clientId = process.env.BOTCHAN_CLIENTID // botchan
const guildIDs = [process.env.MAKESENSE_GUILDID, process.env.OHEYA_GUILDID] // makeSense, oheya

// 起動時処理
client.once('ready', () => {
    console.log('Ready!')
    console.log(client.user?.tag)
})

// slash commandでメッセージを返信
const replyMsg = async(interaction: ChatInputCommandInteraction<CacheType>, msg: string) => {
    await interaction.reply(msg)
}

// slash commandで設定の確認
const replyCurrentSettings = async(interaction: ChatInputCommandInteraction<CacheType>) => {
    const channel = interaction.guild?.channels.cache.find(channel => channel.name === 'settings') as TextChannel
    if(!channel) {
        console.log('channel cant be get')
        return
    }
    const settings = await getSettings(channel)
    const settingEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('settings')
        .setDescription('現在の設定を表示します')
        .addFields(
            {name: 'secretChannel', value: settings.secretChannel.join('\n')}
        )
    interaction.reply({embeds: [settingEmbed]})
}

// slash commandの一覧を見られると嬉しいので配列化
// コマンドと返答のリストの型
interface commandsList {
    name: string // setNameの引数
    discription: string // setDescriptionの引数
    func: Function // 実行する関数
}
const commandsInfoList: commandsList[] = [
    {
        name: 'ping',
        discription: 'Replies with pong!',
        func: async(interaction: ChatInputCommandInteraction<CacheType>) => await replyMsg(interaction, 'pong')
    },
    {
        name: 'hoge',
        discription: 'hogehogeを返すよ',
        func: async(interaction: ChatInputCommandInteraction<CacheType>) => await replyMsg(interaction, 'hogehoge')
    },
    {
        name: 'setting',
        discription: '設定の確認',
        func: async(interaction: ChatInputCommandInteraction<CacheType>) => replyCurrentSettings(interaction)
    }
]

// コマンドビルダを配列化
const commands = commandsInfoList.map(info => new SlashCommandBuilder().setName(info.name).setDescription(info.discription).toJSON())

// slash commandを何回も登録してしまうのを防ぐためにRESTを使う
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN ?? '')
// guildIDsのサーバーにslash commandを実装
guildIDs.forEach(guildId => {
    if (!clientId || !guildId) {
        console.error
        return
    }
    rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
        .then((data) => console.log(`Successfully registered ${data.length} application commands.`))
        .catch(console.error)
})

// slash commandが送信されたら発火
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return

    const { commandName } = interaction

    commandsInfoList.forEach(async (info) => {
        if (commandName === info.name) {
            info.func(interaction)
        }
    })
})

// 入出ログ出力メソッド
const sendInOutMsg = (oldState: VoiceState, newState: VoiceState, secretVC:string[]) => {
    // vc-noticeのチャンネルIDを取得
    const VcNoticeID = oldState.guild.channels.cache.find(channel => channel.name === 'vc-notice')?.id ?? ''
    console.log(VcNoticeID)

    // secretVCのIDリスト
    const secretVcIdsList = [process.env.OHEYA_SECRET, ...secretVC]

    // log送信チャンネルを取得
    const channel = client.channels.cache.get(VcNoticeID)
    if (!channel) return

    // 現在日時を取得
    const date = new Date(Date.now() + ((new Date().getTimezoneOffset() + (9 * 60)) * 60 * 1000));
    const nowmmddHHMM = `${date.getMonth() + 1}/${date.getDate()}-${date.getHours()}:${date.getMinutes()}`

    // メッセージを送信
    // newStateが入室、oldStateが退室
    if (oldState.channel?.name) {
        // 送信メッセージ
        const outMsg = `${nowmmddHHMM} に ${oldState.member?.displayName} が ${oldState.channel.name} から退室しました`

        // secretVCに登録したVCの退室はsecretチャンネルにログを出力
        if (secretVcIdsList.includes(oldState.channel?.id)) {
            const secretChannel = oldState.guild.channels.cache.find(channel => channel.name === 'secret')
            if (!secretChannel) return
            secretChannel.send(outMsg)
        } else {
            channel.send(outMsg)
        }
    }
    if (newState.channel?.name) {
        // 送信メッセージ
        const intoMsg = `${nowmmddHHMM} に ${newState.member?.displayName} が ${newState.channel.name} に入室しました`

        // secretVCに登録したVCの入室はsecretチャンネルにログを出力
        if (secretVcIdsList.includes(newState.channel?.id)) {
            const secretChannel = newState.guild.channels.cache.find(channel => channel.name === 'secret')
            if (!secretChannel) return
            secretChannel.send(intoMsg)
        } else {
            channel.send(intoMsg)
        }
    }
}

// vcの状態変化で発火
client.on('voiceStateUpdate', async(oldState, newState) => {
    console.log(`oldState: ${oldState.channel?.name}`)
    console.log(`newState: ${newState.channel?.name}`)
    const settingChannel = oldState.guild.channels.cache.find(channel => channel.name === 'settings') as TextChannel
    const settings = await getSettings(settingChannel)
    // oldStateのチャンネルとnewStateのチャンネルが異なるとき、人が移動。
    if (oldState.channel?.name !== newState.channel?.name) {
        console.log('vcnotice')
        console.log(settings.hideVC)
        console.log(oldState.channel?.id, newState.channel?.id)
        // ログ非表示のVCの場合はログを送信しない
        if (!(settings.hideVC.includes((oldState.channel?.id ?? '') || (newState.channel?.id ?? '')))) {
            sendInOutMsg(oldState, newState, settings.secretChannel)
        }
    }
})

// 設定メッセージから設定を抽出
// 設定をオブジェクトで返却
// 設定オブジェクトの型を定義 追加する場合は型とsettingを編集
interface settingType {
    secretChannel: string[]
    hideVC: string[]
}
const getSettings = async(channel: TextChannel): Promise<settingType> => {
    // 設定チャンネルのメッセージを取得
    const msgs = await channel?.messages.fetch()

    // 設定の初期値を決定
    const settings: settingType = {
        secretChannel: [],
        hideVC: []
    }

    // 取得したメッセージから設定部分を検出、settingにセット
    msgs.forEach(msg => {
        // ":"が含まれていない場合はreturn
        if(!msg.content.includes(':')) return
        // ":"を区切り文字として分割
        const settingAry = msg.content.split(':')
        if(settingAry[0] === 'secretChannel') {
            settings.secretChannel.push(...settingAry[1].split(' '))
        }
        if(settingAry[0] === 'hideVC') {
            settings.hideVC.push(...settingAry[1].split(' '))
        }
    })
    return settings
}


client.login(process.env.TOKEN)