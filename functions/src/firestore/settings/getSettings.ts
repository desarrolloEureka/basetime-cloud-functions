import Collections from "../collections";

export interface Commissions {
  basetime: number;
  wompi: number;
  referrals: number;
}

export const getCommissions = async (): Promise<Commissions> => {
  const commissionsSnapshot = await Collections.settings
    .doc("commissions")
    .get();

  return commissionsSnapshot.data() as Commissions;
};

export default class Settings {
  static getCommissions: Promise<Commissions> = getCommissions();
}
