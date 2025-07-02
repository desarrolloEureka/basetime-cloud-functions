import { onDocumentUpdated } from "firebase-functions/firestore";
import PushNotification from "../../push_notifications/push_notifications";
import Users from "../users/users";

interface DataInterface {
  status: "pending" | "approved" | "rejected";
}

const onVerificationUpdated = onDocumentUpdated(
  "verifications/{documentId}",
  async (event) => {
    const eventData = event.data;

    if (!eventData) {
      return;
    }

    const updatedData = eventData.after.data() as DataInterface;

    if (updatedData.status !== "pending") {
      const user = await Users.getByUid(event.document);

      // prettier-ignore
      const body =
        updatedData.status === "approved" ?
          "¡Felicitades! estas verificado/a" :
          updatedData.status === "rejected" ?
            "Lamentablement tu solicitud ha sido rechazada" :
            "";

      await PushNotification.send({
        fcm: user.fcm,
        uid: user.id,
        title: "Verificación completada",
        body,
        fromUid: "",
        shouldSave: true,
      });
    }
  }
);

export default onVerificationUpdated;
