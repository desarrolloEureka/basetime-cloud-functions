/* eslint-disable max-len */
import { onDocumentCreated } from "firebase-functions/firestore";
import PushNotification from "../../push_notifications/push_notifications";
import Users from "../users/users";
import Skills from "../skills/skills";

interface DataInterface {
  service: string;
  supplier?: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    imageUrl?: string;
  };
  dynamicCode: number;
  seconds: number;
  date: FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.Timestamp;
  status: string;
  initAt: FirebaseFirestore.Timestamp | null;
  cancellationAuthor: string | null;
}

const onMeetCreated = onDocumentCreated("meets/{documentId}", async (event) => {
  const eventData = event.data;

  if (!eventData) {
    return;
  }

  const data = eventData.data() as DataInterface;

  let supplier;

  if (data.supplier) {
    supplier = await Users.getByUid(data.supplier);
  } else {
    const skill = await Skills.getByDocument(data.service);
    supplier = await Users.getByUid(skill.userID);
  }

  await PushNotification.send({
    title: "Tienes una nueva solicitud",
    body: `${data.author.firstName} ha solicitado una nueva reunión.`,
    fcm: supplier.fcm ?? "",
    uid: supplier.id ?? "",
    fromUid: data.author.id ?? "",
    shouldSave: true,
  });
});

export default onMeetCreated;
