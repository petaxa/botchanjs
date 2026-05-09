import type { VoiceState } from "discord.js";

export type VoiceChannelTransition =
  | { status: "none" }
  | { status: "join" | "leave"; memberName: string; channelName: string; channelId: string };

export function getVoiceChannelTransition(
  oldState: VoiceState,
  newState: VoiceState,
): VoiceChannelTransition[] {
  // oldStateのチャンネルとnewStateのチャンネルが異なるとき、人が移動。
  // 移動があった場合、oldは退出したvc、newは入室したvc
  const isMoved = oldState.channel?.name !== newState.channel?.name;

  const isCheckIn = isMoved && !!newState.channel?.name;
  const isCheckOut = isMoved && !!oldState.channel?.name;

  const status = ((isCheckIn: boolean, isCheckOut: boolean) => {
    if (isCheckIn && isCheckOut) {
      return "move";
    } else if (isCheckIn) {
      return "join";
    } else if (isCheckOut) {
      return "leave";
    } else {
      return "none";
    }
  })(isCheckIn, isCheckOut);

  const { channelNameCheckIn, channelNameCheckOut, channelIdCheckIn, channelIdCheckOut } =
    getMovedChannelInfo(oldState, newState, isCheckIn, isCheckOut);

  const memberName = isCheckIn || isCheckOut ? newState.member?.displayName : undefined;

  switch (status) {
    case "move":
      return [
        {
          status: "join",
          memberName: memberName!,
          channelName: channelNameCheckIn!,
          channelId: channelIdCheckIn!,
        },
        {
          status: "leave",
          memberName: memberName!,
          channelName: channelNameCheckOut!,
          channelId: channelIdCheckOut!,
        },
      ];
    case "join":
      return [
        {
          status,
          memberName: memberName!,
          channelName: channelNameCheckIn!,
          channelId: channelIdCheckIn!,
        },
      ];
    case "leave":
      return [
        {
          status,
          memberName: memberName!,
          channelName: channelNameCheckOut!,
          channelId: channelIdCheckOut!,
        },
      ];
    case "none":
    default:
      return [{ status }];
  }

  function getMovedChannelInfo(
    oldState: VoiceState,
    newState: VoiceState,
    isCheckIn: boolean,
    isCheckOut: boolean,
  ): {
    channelNameCheckIn?: string;
    channelNameCheckOut?: string;
    channelIdCheckIn?: string;
    channelIdCheckOut?: string;
  } {
    const from = oldState.channel;
    const to = newState.channel;
    return {
      channelNameCheckIn: isCheckIn ? to?.name : undefined,
      channelIdCheckIn: isCheckIn ? to?.id : undefined,
      channelNameCheckOut: isCheckOut ? from?.name : undefined,
      channelIdCheckOut: isCheckOut ? from?.id : undefined,
    };
  }
}
