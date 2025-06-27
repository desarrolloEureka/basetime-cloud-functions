import { Request, Response } from "express";
import { checkRoles, verifyIdToken } from "./auth";
import { auth, firestore } from "./adminInit";
import { GetUsersResult } from "firebase-admin/auth";

export const getUsers = async (req: Request, res: Response) => {
  try {
    const accessToken = req.get("Authorization");
    const pageSize: string =
      (req.query.pageSize as string | undefined) ?? "100";
    const filterRole = req.query.filterRole as string | undefined;
    const lastDocId = req.query.nextPageToken as string | undefined;

    if (!filterRole) {
      return res.status(400).json({ error: "Missing filterRole parameter" });
    }

    const maxResults = parseInt(pageSize);

    const decodedIdToken = await verifyIdToken(accessToken);

    if (!decodedIdToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const isAuthorized = await checkRoles(decodedIdToken.uid, [
      "admin",
      "super-admin",
    ]);

    if (!isAuthorized) {
      return res.status(403).json({ error: "Forbidden" });
    }

    let usersQuery = firestore()
      .collection("users")
      .where("roles", "array-contains", filterRole)
      .limit(maxResults);

    if (lastDocId) {
      usersQuery = usersQuery.startAfter(lastDocId);
    }

    const usersResult = await usersQuery.get();

    const usersCount = await firestore()
      .collection("users")
      .where("roles", "array-contains", filterRole)
      .count()
      .get();

    const users = usersResult.docs.filter(
      (doc) => doc.id !== decodedIdToken.uid
    );

    let authUsersResults: object = { users: [] };

    if (users.length > 0) {
      authUsersResults = await auth().getUsers(
        usersResult.docs.map((doc) => {
          return { uid: doc.id };
        })
      );
    }

    return res.status(200).json({
      users: (authUsersResults as GetUsersResult).users.map((user) => {
        return {
          ...user,
          ...usersResult.docs.find((doc) => doc.id === user.uid)?.data(),
        };
      }),
      lastDocId: users.length > 0 ? users[users.length - 1].id : null,
      totalUsers: usersCount.data().count,
      usersPerPage: maxResults,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ error });
  }
};

export const addUser = async (req: Request, res: Response) => {
  try {
    const accessToken = req.get("Authorization");

    const decodedIdToken = await verifyIdToken(accessToken);

    if (!decodedIdToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const isAuthorized = await checkRoles(decodedIdToken.uid, [
      "admin",
      "users-admin",
    ]);

    if (!isAuthorized) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const userRecord = await auth().createUser(req.body);

    await firestore()
      .collection("users")
      .doc(userRecord.uid)
      .set({
        roles: req.body.roles,
        userName: "user" + Date.now().toString(),
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        id: req.body.id,
        promoterId: req.body.promoterId ?? null,
        instagram: req.body.instagram ?? null,
        tiktok: req.body.tiktok ?? null,
        nequi: req.body.nequi ?? null,
        verifiedId: req.body.verifiedId,
      });

    for (const category of req.body.categories ?? []) {
      const json = category;
      delete json.id;
      await firestore()
        .collection("users")
        .doc(userRecord.uid)
        .collection("categories")
        .doc(category.id)
        .set(json);
    }

    for (const subCategory of req.body.subCategories ?? []) {
      const json = subCategory;
      delete json.id;
      await firestore()
        .collection("users")
        .doc(userRecord.uid)
        .collection("categories")
        .doc(subCategory.category.id)
        .collection("subCategories")
        .doc(subCategory.id)
        .set(json);
    }

    return res
      .status(201)
      .json({ user: { ...userRecord, roles: req.body.roles } });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const accessToken = req.get("Authorization");

    const decodedIdToken = await verifyIdToken(accessToken);

    if (!decodedIdToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const isAuthorized = await checkRoles(decodedIdToken.uid, [
      "admin",
      "users-admin",
    ]);

    if (!isAuthorized) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await auth().updateUser(req.params.uid, req.body);

    const json = req.body;

    await firestore().collection("users").doc(req.params.uid).update(json);

    const document = await firestore()
      .collection("users")
      .doc(req.params.uid)
      .get();

    const data = document.data();
    const displayName = (data?.firstName ?? "") + (data?.lastName ?? "");

    await auth().updateUser(req.params.uid, {
      displayName,
    });

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error });
  }
};

export const disabledUser = async (req: Request, res: Response) => {
  try {
    const accessToken = req.get("Authorization");

    const decodedIdToken = await verifyIdToken(accessToken);

    if (!decodedIdToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const isAuthorized = await checkRoles(decodedIdToken.uid, [
      "admin",
      "users-admin",
    ]);

    if (!isAuthorized) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await auth().updateUser(req.params.uid, req.body);

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const uid = req.params.uid;

    const accessToken = req.get("Authorization");

    const decodedIdToken = await verifyIdToken(accessToken);

    if (!decodedIdToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const isAuthorized = await checkRoles(decodedIdToken.uid, [
      "admin",
      "users-admin",
    ]);

    if (!isAuthorized) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await auth().deleteUser(uid);

    await firestore().collection("users").doc(uid).delete();

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error });
  }
};

export const searchUser = async (req: Request, res: Response) => {
  try {
    const accessToken = req.get("Authorization");

    const decodedIdToken = await verifyIdToken(accessToken);

    if (!decodedIdToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { uids }: { uids: string[] } = req.body;

    if (!uids) {
      res.status(404).json({ error: "Not found" });
    }

    const result: GetUsersResult = await auth().getUsers(
      uids.map((e) => ({ uid: e }))
    );

    return res.status(200).json({ users: result.users });
  } catch (error) {
    return res.status(400).json({ error });
  }
};
