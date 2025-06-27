import getUser from "./getUser";

export interface UserInterface {
  id: string;
  firstName: string;
  lastName: string;
  promoterId: number | null;
  fcm: string;
}

export default class Users {
  static getByUid = (uid: string) => getUser(uid);
}
