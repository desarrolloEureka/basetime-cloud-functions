

import { messaging } from "../adminInit";
import { Timestamp } from "firebase-admin/firestore";
import Collections from "../firestore/collections";

export interface sendMessageInterface {
  uid: string;
  fcm: string;
  title: string;
  body: string;
  fromUid: string;
  shouldSave?: boolean;
}

const sendMessage = async ({ uid, fcm, title, body, fromUid, shouldSave }
  : sendMessageInterface) => {
  await messaging().send({
    token: fcm,
    notification: {
      title,
      body,
    },
  });

  if (shouldSave) {
    await Collections.notifications.add({
      content: body,
      createdAt: Timestamp.now(),
      read: false,
      to: uid,
      from: fromUid ?? "",
    });
  }
};

export default sendMessage;
