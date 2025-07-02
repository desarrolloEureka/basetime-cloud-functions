import { onDocumentCreated } from "firebase-functions/firestore";
import PushNotification from "../../push_notifications/push_notifications";
import Collections from "../collections";

// On Document Created in Matches Collection
const onMatchCreated = onDocumentCreated(
  "matches/{documentId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log("No data associated with the event");
      return;
    }

    const data = snapshot.data();

    const supplierSnapshot = await Collections.users
      .doc(data.supplier.id)
      .get();

    const supplierData = supplierSnapshot.data();

    await PushNotification.send({
      title: "¡Tienes un nuevo Match!",
      body: `${data.client.firstName} ${data.client.lastName} ha hecho match`,
      fcm: supplierData?.fcm ?? "",
      uid: supplierSnapshot.id,
      fromUid: data.client.id ?? "",
      shouldSave: true,
    });
  }
);

export default onMatchCreated;
