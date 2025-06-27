import { firestore } from "../../adminInit";
import Collections from "../collections";
import { UpdateMovementProps } from "./movements";

const updateMovement = async ({
  meetDocument,
  userDocument,
  serviceCommission,
  subtotal,
  total,
  titular,
  description,
  currentType,
  type,
  basetimeCommission,
  wompiCommission,
}: UpdateMovementProps) => {
  const snapshot = await Collections.movements
    .where("meetId", "==", meetDocument)
    .where("userId", "==", userDocument)
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
      basetimeCommission: number | null;
      wompiCommission: number | null;
    } = {
      type,
      subtotal: subtotal ?? null,
      serviceCommission: serviceCommission ?? null,
      description,
      total,
      basetimeCommission: basetimeCommission ?? null,
      wompiCommission: wompiCommission ?? null,
    };
    if (titular !== null) {
      json.titular = titular ?? null;
    }
    await movement.ref.update({
      ...json,
      createdAt: firestore.Timestamp.now(),
    });
  }
};

export default updateMovement;
