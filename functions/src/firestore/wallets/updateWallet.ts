import { firestore } from "../../adminInit";
import { FieldValue } from "firebase-admin/firestore";
import Collections from "../collections";
import { UpdateWalletProps } from "./wallets";

const updateWallet = async ({
  document,
  balance,
  refund,
}: UpdateWalletProps) => {
  const json: {
    balance?: FieldValue;
    refund?: FieldValue;
  } = {};
  if (balance) {
    json.balance = firestore.FieldValue.increment(balance);
  }
  if (refund) {
    json.refund = firestore.FieldValue.increment(refund);
  }
  Collections.wallets.doc(document).update({
    ...json,
    updatedAt: firestore.Timestamp.now(),
  });
};

export default updateWallet;
