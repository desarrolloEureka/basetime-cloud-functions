import { auth, firestore } from "./adminInit";
import { DecodedIdToken } from "firebase-admin/auth";

export const verifyIdToken = async (
  accessToken?: string
): Promise<DecodedIdToken | null> => {
  if (!accessToken) {
    return null;
  }
  try {
    const decodedToken = await auth().verifyIdToken(accessToken.split(" ")[1]);
    return decodedToken;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
};

export const checkRoles = async (
  uid: string,
  [...roles]: string[]
): Promise<boolean> => {
  console.log(roles, uid);
  try {
    const document = await firestore().collection("users").doc(uid).get();
    console.log("document exists", document.exists);
    if (!document.exists) {
      return false;
    }

    const userData = document.data();

    console.log("user data", userData);

    if (!userData) {
      return false;
    }

    for (const role of userData["roles"]) {
      console.log("roles", role);
      console.log("roles includes", roles.includes(role));
      if (roles.includes(role)) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error(error);
    return false;
  }
};
