import updateWallet from "./updateWallet";

export interface UpdateWalletProps {
  document: string;
  balance?: number;
  refund?: number;
}

export default class Wallets {
  static update = (props: UpdateWalletProps) => updateWallet(props);
}
