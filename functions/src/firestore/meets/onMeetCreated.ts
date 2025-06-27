import { onDocumentCreated } from "firebase-functions/firestore";
import PushNotification from "../../push_notifications/push_notifications";
import Users from "../users/users";
import Skills from "../skills/skills";

interface DataInterface {
  service: string;
  author: {
    id: string;
  };
}

const onMeetCreated = onDocumentCreated("meets/{documentId}", async (event) => {
  const eventData = event.data;

  if (!eventData) {
    return;
  }

  const data = eventData.data() as DataInterface;

  const skill = await Skills.getByDocument(data.service);
  const supplier = await Users.getByUid(skill.userID);

  await PushNotification.send({
    title: "Tienes una nueva solicitud",
    body: `${data.author.id} ha solicitado una neuva reunión.`,
    fcm: supplier.fcm,
    uid: supplier.id,
  });
});

export default onMeetCreated;
