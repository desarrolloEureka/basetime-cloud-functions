import { firestore } from "../../adminInit";
import Collections from "../collections";
import { CreateMovementProps } from "./movements";

const createMovement = async ({
  meetDocument,
  userDocument,
  type,
  serviceCommission,
  titular,
  subtotal,
  total,
  description,
  basetimeCommission,
  wompiCommission,
  refferralCommission,
}: CreateMovementProps): Promise<void> => {
  await Collections.movements.add({
    meetId: meetDocument,
    userId: userDocument,
    type,
    titular,
    subtotal: subtotal ?? null,
    total,
    serviceCommission: serviceCommission ?? null,
    description,
    createdAt: firestore.Timestamp.now(),
    basetimeCommission: basetimeCommission ?? null,
    wompiCommission: wompiCommission ?? null,
    refferralCommission: refferralCommission ?? null,
  });
};

export default createMovement;
