import sendMessage, { sendMessageInterface } from "./send_message";

export default class PushNotification {
  static send = (params: sendMessageInterface) => sendMessage(params);
}
