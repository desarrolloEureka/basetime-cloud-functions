import { firestore } from "../adminInit";
import { DocumentData, Timestamp } from "firebase-admin/firestore";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";

const onPaySessionMeet = onDocumentUpdated(
  "/meets/{documentId}",
  async (event) => {
    const commissions = await getCommissions();
    const servicePersentage =
      (commissions.data()?.basetime + commissions.data()?.wompi) / 100;
    const newValue = event.data?.after.data();
    const currentValue = event.data?.before.data();
    // prettier-ignore
    switch (newValue?.status) {
    case "aceptPayed":
      if (currentValue?.status !== "aceptPayed") {
        await onAceptPayed({
          newValue,
          documentId: event.params.documentId,
          servicePersentage,
        });
      }
      break;
    case "complete":
      if (currentValue?.status !== "complete") {
        await onComplete({
          newValue,
          documentId: event.params.documentId,
          servicePersentage,
        });
      }
      break;
    case "cancel":
      if (currentValue?.status !== "cancel") {
        await onCancel({
          newValue,
          documentId: event.params.documentId,
          servicePersentage,
        });
      }
      break;
    }
  }
);

interface Props {
  newValue?: DocumentData;
  documentId: string;
  servicePersentage: number;
}

const onAceptPayed = async ({
  newValue,
  documentId,
  servicePersentage,
}: Props) => {
  const service = await getService(newValue?.service);

  const subtotal = newValue?.amount;
  let total = newValue?.amount;
  let commission = servicePersentage * total;

  const commissions = await getCommissions();

  const supplier = await getUser(service.data()?.userID);

  await newMovement({
    meetId: documentId,
    userId: newValue?.author.id,
    type: "payment",
    titular: `${supplier.data()?.firstName} ${supplier.data()?.lastName}`,
    total: total,
    description: "Pago por servicio",
  });

  if (supplier.data()?.promoterId != null && supplier.data()?.promoterId > 0) {
    const promoterAmount = (commissions.data()?.referrals / 100) * total;

    commission += promoterAmount;
  }

  total -= commission;

  await newMovement({
    meetId: documentId,
    userId: supplier.id,
    type: "pending",
    serviceCommission: commission,
    titular: `${newValue?.author.firstName} ${newValue?.author.lastName}`,
    subtotal,
    total,
    description: "Cobro por servicio",
  });
};

const onComplete = async ({
  newValue,
  documentId,
  servicePersentage,
}: Props) => {
  const service = await firestore()
    .collection("skills")
    .doc(newValue?.service)
    .get();

  const subtotal = newValue?.amount;
  let total = newValue?.amount;

  const commissions = await getCommissions();

  const supplier = await getUser(service.data()?.userID);

  let serviceCommission = servicePersentage * total;

  if (supplier.data()?.promoterId != null && supplier.data()?.promoterId > 0) {
    const promoter = (
      await firestore()
        .collection("users")
        .where("id", "==", supplier.data()?.promoterId)
        .get()
    ).docs[0];

    const promoterAmount = (commissions.data()?.referrals / 100) * total;
    await newMovement({
      meetId: documentId,
      userId: promoter.id,
      type: "paymentReferral",
      total: promoterAmount,
      titular: `${promoter.data()?.firstName} ${promoter.data()?.lastName}`,
      description: "Pago de referido",
    });

    await addBalanseAmount(promoterAmount, promoter.id);

    serviceCommission += promoterAmount;
  }

  total -= serviceCommission;

  await updateMovement({
    meetId: documentId,
    userId: supplier.id,
    subtotal,
    serviceCommission,
    total,
    description: "Cobro por servicio",
    type: "charged",
    currentType: "pending",
  });
};

const onCancel = async ({ newValue, documentId, servicePersentage }: Props) => {
  const service = await getService(newValue?.service);

  const total = newValue?.amount;

  const serviceCommission = servicePersentage * total;

  const supplier = await getUser(service.data()?.userID);

  await newMovement({
    meetId: documentId,
    userId: newValue?.author.id,
    type: "refund",
    titular: "Sistema",
    total: total,
    description: "Reembolso por cancelación",
  });

  await addRefundAmount(total, newValue?.author.id);

  await updateMovement({
    meetId: documentId,
    userId: supplier.id,
    serviceCommission,
    total,
    titular: "Sistema",
    type: "payment",
    currentType: "pending",
    description: "Reembolsado",
  });
};

const getUser = async (uid: string) => {
  return await firestore().collection("users").doc(uid).get();
};

const getService = async (id: string) => {
  return await firestore().collection("skills").doc(id).get();
};

const getCommissions = async () => {
  return await firestore().collection("settings").doc("commissions").get();
};

const addBalanseAmount = async (amount: number, userId: string) => {
  await firestore()
    .collection("wallets")
    .doc(userId)
    .update({
      balance: firestore.FieldValue.increment(amount),
    });
};
const addRefundAmount = async (amount: number, userId: string) => {
  await firestore()
    .collection("wallets")
    .doc(userId)
    .update({
      refund: firestore.FieldValue.increment(amount),
    });
};

const newMovement = async ({
  meetId,
  userId,
  total,
  serviceCommission,
  subtotal,
  titular,
  description,
  type,
}: {
  meetId: string;
  userId: string;
  total: number;
  serviceCommission?: number;
  subtotal?: number;
  titular: string;
  description: string;
  type:
    | "payment"
    | "paymentReferral"
    | "withdrawal"
    | "refund"
    | "pending"
    | "charged";
}) => {
  await firestore()
    .collection("movements")
    .add({
      meetId,
      userId,
      type,
      titular,
      total,
      subtotal: subtotal ?? null,
      serviceCommission: serviceCommission ?? null,
      description,
      createdAt: firestore.Timestamp.now(),
    });
};

const updateMovement = async ({
  meetId,
  userId,
  subtotal,
  serviceCommission,
  total,
  titular,
  description,
  currentType,
  type,
}: {
  meetId: string;
  userId: string;
  serviceCommission?: number;
  subtotal?: number;
  total: number;
  titular?: string;
  description: string;
  currentType:
    | "payment"
    | "paymentReferral"
    | "withdrawal"
    | "refund"
    | "pending"
    | "charged";
  type:
    | "payment"
    | "paymentReferral"
    | "withdrawal"
    | "refund"
    | "pending"
    | "charged";
}) => {
  const snapshot = await firestore()
    .collection("movements")
    .where("meetId", "==", meetId)
    .where("userId", "==", userId)
    .where("type", "==", currentType)
    .get();

  for (const movement of snapshot.docs) {
    const json: {
      type:
        | "payment"
        | "paymentReferral"
        | "withdrawal"
        | "refund"
        | "pending"
        | "charged";
      subtotal: number | null;
      titular?: string | null;
      serviceCommission: number | null;
      description: string;
      total: number;
    } = {
      type,
      subtotal: subtotal ?? null,
      serviceCommission: serviceCommission ?? null,
      description,
      total,
    };
    if (titular !== null) {
      json.titular = titular ?? null;
    }
    await movement.ref.update({ ...json, createdAt: Timestamp.now() });

    if (type === "charged") {
      await addBalanseAmount(total, userId);
    }
  }
};

export default onPaySessionMeet;
