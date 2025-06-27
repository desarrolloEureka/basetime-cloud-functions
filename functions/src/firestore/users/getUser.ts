import Collections from "../collections";
import { UserInterface } from "./users";

const getUser = async (uid: string) => {
  const snapshot = await Collections.users.doc(uid).get();
  return { ...snapshot.data(), id: uid } as UserInterface;
};

export default getUser;
