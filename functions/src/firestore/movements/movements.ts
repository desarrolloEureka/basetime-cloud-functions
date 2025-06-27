import createMovement from "./createMovement";
import updateMovement from "./updateMovement";

export type MovementType =
  | "payment"
  | "paymentReferral"
  | "withdrawal"
  | "refund"
  | "pending"
  | "charged";

export interface MovementInterface {
  type: MovementType;
}

export interface CreateMovementProps {
  meetDocument: string;
  userDocument: string;
  type: MovementType;
  serviceCommission?: number;
  titular: string;
  subtotal?: number;
  total: number;
  description: string;
  basetimeCommission?: number;
  wompiCommission?: number;
  refferralCommission?: number;
}

export interface UpdateMovementProps {
  meetDocument: string;
  userDocument: string;
  currentType: MovementType;
  type: MovementType;
  serviceCommission?: number;
  titular?: string;
  subtotal?: number;
  total: number;
  description: string;
  basetimeCommission?: number;
  wompiCommission?: number;
  refferralCommission?: number;
}

export default class Movements {
  static create = (props: CreateMovementProps) => createMovement(props);
  static update = (props: UpdateMovementProps) => updateMovement(props);
}
