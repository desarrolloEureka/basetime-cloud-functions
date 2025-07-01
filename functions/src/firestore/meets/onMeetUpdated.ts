import { onDocumentUpdated } from "firebase-functions/firestore";
import Collections from "../collections";
import { getCommissions } from "../settings/getSettings";
import Skills from "../skills/skills";
import Users, { UserInterface } from "../users/users";
import Movements from "../movements/movements";
import Wallets from "../wallets/wallets";
import PushNotification from "../../push_notifications/push_notifications";

interface DataInterface {
  status: "request" | "aceptNotPayed" | "aceptPayed" | "complete" | "cancel";
  service: string;
  amount: number;
  author: {
    id: string;
    firstName: string;
    lastName: string;
  };
  cancellationAuthor?: string | null;
  initAt?: string | null;
}

// On Meet Document Updated
const onMeetUpdated = onDocumentUpdated("meets/{documentId}", async (event) => {
  const document = event.params.documentId;
  const currentData = event.data?.before.data() as DataInterface;
  const updatedData = event.data?.after.data() as DataInterface;

  if (!currentData || !updatedData) {
    return;
  }

  const commissions = await getCommissions();
  const comBaseTime = commissions.basetime;
  const comWompi = commissions.wompi;
  const comReferrals = commissions.referrals;
  const skill = await Skills.getByDocument(updatedData.service);
  const supplier = await Users.getByUid(skill.userID);

  // prettier-ignore
  switch (updatedData.status) {
  case "aceptNotPayed":
    if (currentData.status !== "aceptNotPayed") {
      const authorData = await Users.getByUid(updatedData.author.id);
      await PushNotification.send({
        fcm: authorData.fcm,
        uid: updatedData.author.id,
        title: "Solicitud de Meet Aceptada",
        body: `${supplier.firstName} ha aceptado tu solicitud.`,
      });
    }
    break;
  case "aceptPayed":
    if (currentData.status !== "aceptPayed") {
      await onAceptPayed({
        meetDocument: document,
        updatedData,
        comBaseTime,
        comWompi,
        comReferrals,
        supplier,
      });

      await PushNotification.send({
        fcm: supplier.fcm,
        title: "Nuevo pago en reserva",
        body: `${updatedData.author.firstName} ha reservado la sesión.`,
        uid: supplier.id,
      });
    }
    break;
  case "complete":
    if (currentData.status !== "complete") {
      onComplete({
        meetDocument: document,
        updatedData,
        comBaseTime,
        comWompi,
        comReferrals,
        supplier,
      });
    }
    break;
  case "cancel":
    if (currentData.status !== "cancel") {
      onCancel({
        meetDocument: document,
        updatedData,
        comBaseTime,
        comWompi,
        supplier,
      });
    }
    break;
  }
  if (updatedData.initAt != null && currentData.initAt == null) {
    await onStartMeet({
      updatedData,
      supplier,
    });
  }
});

const onAceptPayed = async ({
  meetDocument,
  updatedData,
  comBaseTime,
  comWompi,
  comReferrals,
  supplier,
}: {
  meetDocument: string;
  updatedData: DataInterface;
  comBaseTime: number;
  comWompi: number;
  comReferrals: number;
  supplier: UserInterface;
}) => {
  let commission = ((comBaseTime + comWompi) / 100) * updatedData.amount;
  await Movements.create({
    meetDocument,
    userDocument: updatedData.author.id,
    type: "payment",
    titular: `${supplier.firstName} ${supplier.lastName}`,
    total: updatedData.amount,
    description: "Pago por servicio",
  });

  let refferralCommission: number | undefined;

  if (supplier.promoterId != null && supplier.promoterId > 0) {
    const promoterAmount = (comReferrals / 100) * updatedData.amount;
    commission += promoterAmount;

    refferralCommission = comReferrals;
  }

  const total = updatedData.amount - commission;

  await Movements.create({
    meetDocument,
    userDocument: supplier.id,
    type: "pending",
    serviceCommission: commission,
    titular: `${updatedData.author.firstName} ${updatedData.author.lastName}`,
    subtotal: updatedData.amount,
    total,
    description: "Cobro por servicio",
    basetimeCommission: comBaseTime,
    wompiCommission: comWompi,
    refferralCommission,
  });
};

const onComplete = async ({
  meetDocument,
  updatedData,
  comBaseTime,
  comWompi,
  comReferrals,
  supplier,
}: {
  meetDocument: string;
  updatedData: DataInterface;
  comBaseTime: number;
  comWompi: number;
  comReferrals: number;
  supplier: UserInterface;
}) => {
  let commission = ((comBaseTime + comWompi) / 100) * updatedData.amount;

  if (supplier.promoterId != null && supplier.promoterId > 0) {
    const promoterSnapshot = (
      await Collections.users.where("id", "==", supplier.promoterId).get()
    ).docs[0];

    const promoter = {
      ...promoterSnapshot.data(),
      id: promoterSnapshot.id,
    } as UserInterface;

    const promoterAmount = (comReferrals / 100) * updatedData.amount;

    await Movements.create({
      meetDocument,
      userDocument: promoter.id,
      type: "paymentReferral",
      total: promoterAmount,
      titular: `${promoter.firstName} ${promoter.lastName}`,
      description: "Pago de referido",
    });

    await Wallets.update({
      document: promoter.id,
      balance: promoterAmount,
    });

    await PushNotification.send({
      title: "¡Felicidades!",
      body: "Has recibido un pago por tu referido.",
      fcm: promoter.fcm,
      uid: promoter.id,
    });

    commission += promoterAmount;
  }

  const total = updatedData.amount - commission;

  await Wallets.update({
    document: supplier.id,
    balance: total,
  });

  await Movements.update({
    meetDocument,
    userDocument: supplier.id,
    subtotal: updatedData.amount,
    serviceCommission: commission,
    total,
    description: "Cobro por servicio",
    type: "charged",
    currentType: "pending",
    basetimeCommission: comBaseTime,
    wompiCommission: comWompi,
  });

  await PushNotification.send({
    title: "¡Nueva calificación!",
    body: `${updatedData.author.firstName} ha calificado la sesión.`,
    uid: supplier.id,
    fcm: supplier.fcm,
  });
};

const onCancel = async ({
  meetDocument,
  updatedData,
  comBaseTime,
  comWompi,
  supplier,
}: {
  meetDocument: string;
  updatedData: DataInterface;
  comBaseTime: number;
  comWompi: number;
  supplier: UserInterface;
}) => {
  const commission = ((comBaseTime + comWompi) / 100) * updatedData.amount;

  await Movements.create({
    meetDocument,
    userDocument: updatedData.author.id,
    type: "refund",
    titular: "Sistema",
    total: updatedData.amount,
    description: "Reembolso por cancelación",
  });

  await Wallets.update({
    document: updatedData.author.id,
    refund: updatedData.amount,
  });

  await Movements.update({
    meetDocument,
    userDocument: supplier.id,
    serviceCommission: commission,
    total: updatedData.amount,
    titular: "Sistema",
    type: "payment",
    currentType: "pending",
    description: "Reembolsado",
    basetimeCommission: comBaseTime,
    wompiCommission: comWompi,
  });

  const supplierCancelled = updatedData.cancellationAuthor === supplier.id;
  const authorCancelled =
    updatedData.author.id === updatedData.cancellationAuthor;
  const authorData = await Users.getByUid(updatedData.author.id);

  // Si el proveedor canceló -> notificar al cliente
  if (supplierCancelled) {
    await PushNotification.send({
      uid: updatedData.author.id,
      fcm: authorData.fcm,
      title: "Tu sesión fue cancelada",
      body:
        `${supplier.firstName} ha cancelado la sesión. ` +
        "El dinero ha sido reembolsado.",
    });
  }

  // Si el cliente canceló -> notificar al proveedor
  if (authorCancelled) {
    await PushNotification.send({
      uid: supplier.id,
      fcm: supplier.fcm,
      title: "Tu sesión fue cancelada",
      body: `${updatedData.author.firstName} ha cancelado la sesión.`,
    });
  }

  // Si el sistema canceló -> notificar a ambos
  if (!supplierCancelled && !authorCancelled) {
    await PushNotification.send({
      uid: supplier.id,
      fcm: supplier.fcm,
      title: "Tu sesión fue cancelada",
      body: "El sistema ha cancelado la sesión.",
    });

    await PushNotification.send({
      uid: updatedData.author.id,
      fcm: authorData.fcm,
      title: "Tu sesión fue cancelada",
      body: "El sistema ha cancelado la sesión. El dinero ha sido reembolsado.",
    });
  }
};

const onStartMeet = async ({
  updatedData,
  supplier,
}: {
  updatedData: DataInterface;
  supplier: UserInterface;
}) => {
  const authorData = await Users.getByUid(updatedData.author.id);
  await PushNotification.send({
    uid: supplier.id,
    fcm: supplier.fcm,
    title: "Tu sesión ha comenzado",
    body: `Has validado la clave de ${updatedData.author.firstName}.`,
  });

  await PushNotification.send({
    uid: updatedData.author.id,
    fcm: authorData.fcm,
    title: "Tu sesión ha comenzado",
    body: `${supplier.firstName} ha validado tu clave.`,
  });
};

export default onMeetUpdated;
