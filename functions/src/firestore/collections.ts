import { firestore } from "../adminInit";

export default class Collections {
  // C
  static chats = firestore().collection("chats");
  // M
  static matches = firestore().collection("matches");
  static meets = firestore().collection("meets");
  static movements = firestore().collection("movements");
  // N
  static notifications = firestore().collection("notifications");
  // S
  static settings = firestore().collection("settings");
  static skills = firestore().collection("skills");
  // U
  static users = firestore().collection("users");
  // V
  static verifications = firestore().collection("verifications");
  // W
  static wallets = firestore().collection("wallets");
}
