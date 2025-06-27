import * as admin from "firebase-admin";
import { Request, Response } from "express";
import { verifyIdToken } from "../auth";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface QueryParams {
  state?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

interface MatchReport {
  matchDate: Date;
  meetDate: Date;
  supplierDNI: string;
  supplierUser: string;
  supplierEmail: string;
  clientDNI: string;
  clientUser: string;
  clientEmail: string;
  amount: number;
  status: string;
  category: string;
  service: string;
  hours: number;
}

export const getMatchReport = async (req: Request, res: Response) => {
  try {
    const {
      state,
      category,
      search = "",
      startDate,
      endDate,
    }: QueryParams = req.query;

    const accessToken = req.get("Authorization");
    const decodedIdToken = await verifyIdToken(accessToken);

    if (!decodedIdToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const lowerSearch = search.toLowerCase();
    const parsedStartDate = startDate ? new Date(startDate) : null;
    const parsedEndDate = endDate ? new Date(endDate) : null;

    const matchesRef = db.collection("matches");
    const matchesSnapshot = await matchesRef.get();

    const results: MatchReport[] = [];

    for (const doc of matchesSnapshot.docs) {
      const matchData = doc.data();

      const matchId = doc.id;

      const serviceCategories = matchData.service?.categories ?? [];

      const hasCategory = category ?
        serviceCategories.some((c: any) => c.id?.includes(category)) :
        true;

      if (!hasCategory) continue;

      const meetRef = db.collection("meets");

      let query: FirebaseFirestore.Query = meetRef.where(
        "chatRef",
        "==",
        db.doc(`chats/${matchId}`)
      );

      if (state) {
        query = query.where("status", "==", state);
      }

      const meetsSnapshot = await query.get();

      if (meetsSnapshot.empty) continue;

      const supplierDoc = await db.doc(`users/${matchData.supplier.id}`).get();
      const clientDoc = await db.doc(`users/${matchData.client.id}`).get();
      const supplier = supplierDoc.data();
      const client = clientDoc.data();

      if (!supplier || !client) continue;

      const fullSupplierName =
        `${supplier.firstName} ${supplier.lastName}`.toLowerCase();
      const fullClientName =
        `${client.firstName} ${client.lastName}`.toLowerCase();
      const supplierDni = String(supplier.id);
      const clientDni = String(client.id);
      const supplierEmail = supplier.email?.toLowerCase() ?? "";
      const clientEmail = client.email?.toLowerCase() ?? "";
      const service = matchData.service.title.toLowerCase();

      for (const meetDoc of meetsSnapshot.docs) {
        const meetData = meetDoc.data();

        const matchDate = matchData.createdAt.toDate();
        const meetDate = meetData.createdAt.toDate();
        const meetStatus = meetData.status;

        const isInDateRange =
          (!parsedStartDate || meetDate >= parsedStartDate) &&
          (!parsedEndDate || meetDate <= parsedEndDate);

        const matchFound =
          fullSupplierName.includes(lowerSearch) ||
          supplierDni.includes(lowerSearch) ||
          supplierEmail.includes(lowerSearch) ||
          fullClientName.includes(lowerSearch) ||
          clientDni.includes(lowerSearch) ||
          clientEmail.includes(lowerSearch) ||
          service.includes(lowerSearch);

        if (
          isInDateRange &&
          (matchFound || lowerSearch === "") &&
          hasCategory
        ) {
          const amount = matchData.service.pricePerHour * matchData.hours;

          const categoryString = serviceCategories
            .map((c: any) => c.nameEs)
            .join(", ");

          results.push({
            matchDate,
            meetDate,
            supplierDNI: supplier.id,
            supplierUser: `${supplier.firstName} ${supplier.lastName}`,
            supplierEmail: supplier.email,
            clientDNI: client.id,
            clientUser: `${client.firstName} ${client.lastName}`,
            clientEmail: client.email,
            amount,
            status: meetStatus,
            category: categoryString,
            service: matchData.service.title,
            hours: matchData.hours,
          });
        }
      }
    }

    results.sort((a, b) => {
      return new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime();
    });

    return res.status(200).json({
      success: true,
      data: results,
      total: results.length,
    });
  } catch (error) {
    console.error("Error getting match report:", error);
    return res.status(500).json({ success: false, error });
  }
};
