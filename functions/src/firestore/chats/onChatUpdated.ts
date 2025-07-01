/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable max-len */
import { onDocumentUpdated } from "firebase-functions/firestore";
import Users from "../users/users";
import { SkillInterface } from "../skills/skills";
import PushNotification from "../../push_notifications/push_notifications";

interface DataInterface {
  client: {
    id: string;
  };
  messages: {
    author: {
      id: string;
    };
    text: string;
  }[];
  service: SkillInterface;
}

const onChatUpdated = onDocumentUpdated("chats/{documentId}", async (event) => {
  const currentData = event.data?.before.data() as DataInterface | undefined;
  const updatedData = event.data?.after.data() as DataInterface | undefined;

  if (!currentData || !updatedData) {
    return;
  }

  const supplier = await Users.getByUid(updatedData.service.userID);
  const client = await Users.getByUid(updatedData.client.id);

  const haveNewMessages = updatedData.messages.length > currentData.messages.length;

  if (haveNewMessages) {
    const message = updatedData.messages[updatedData.messages.length - 1];
    const authorIsSupplier = message.author.id == supplier.id;
    const author = authorIsSupplier ? supplier : client;
    const to = authorIsSupplier ? client : supplier;

    await PushNotification.send({
      title: author.firstName,
      body: message.text,
      fcm: to.fcm,
      uid: to.id,
      fromUid: author.id ?? "",
    });
  }
});

export default onChatUpdated;
