import { messaging } from "../adminInit";
import { Timestamp } from "firebase-admin/firestore";
import Collections from "../firestore/collections";

export interface sendMessageInterface {
  uid: string;
  fcm: string;
  title: string;
  body: string;
}

const sendMessage = async ({ uid, fcm, title, body }: sendMessageInterface) => {
  await messaging().send({
    token: fcm,
    notification: {
      title,
      body,
    },
  });

  await Collections.notifications.add({
    title: title,
    content: body,
    createdAt: Timestamp.now(),
    image: "https://via.placeholder.com/512",
    read: false,
    to: uid,
  });
};

export default sendMessage;
