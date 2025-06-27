import * as admin from "firebase-admin";
import { Request, Response } from "express";
import { verifyIdToken } from "../auth";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface QueryParams {
  state?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

interface ResultsType {
  wompiPaymentDate: string;
  wompiTransactionNumber: string;
  paymentMethod: string;
  cardNumber: string;
  cardHolder: string;
  email: string;
  amount: number;
  status: string;
  service: string;
  matchId: string;
  matchDate: Date;
  clientDni: string;
  clientName: string;
  installments: number;
}

export const getSalesReport = async (req: Request, res: Response) => {
  try {
    const accessToken = req.get("Authorization");
    const decodedIdToken = await verifyIdToken(accessToken);

    if (!decodedIdToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { state, startDate, endDate, search = "" }: QueryParams = req.query;

    const lowerSearch = search.toLowerCase();
    const parsedStartDate = startDate ? new Date(startDate) : null;
    const parsedEndDate = endDate ? new Date(endDate) : null;

    const meetsRef = db.collection("meets");

    let query: FirebaseFirestore.Query = meetsRef.where(
      "paymentResult",
      "!=",
      ""
    );

    if (state) {
      query = query.where("paymentResult.status", "==", state);
    }

    const meetsSnapshot = await query.get();

    const results: ResultsType[] = [];

    for (const doc of meetsSnapshot.docs) {
      const meetData = doc.data();
      const wompi = meetData.paymentResult;

      const matchSnap = await db.doc(`matches/${meetData.chatRef.id}`).get();
      const match = matchSnap.data();
      if (!match) continue;

      const clientSnap = await db.doc(`users/${meetData.author.id}`).get();
      const client = clientSnap.data();
      if (!client) continue;

      const fullName =
        // eslint-disable-next-line max-len
        `${meetData.author.firstName} ${meetData.author.lastName}`.toLowerCase();
      const clientDni = String(client.id);
      const idMatch = matchSnap.id;
      const email = wompi.customer_email?.toLowerCase() ?? "";

      const wompiDate = new Date(wompi.created_at);

      const isInDateRange =
        (!parsedStartDate || wompiDate >= parsedStartDate) &&
        (!parsedEndDate || wompiDate <= parsedEndDate);

      const matchFound =
        fullName.includes(lowerSearch) ||
        clientDni.includes(lowerSearch) ||
        idMatch.includes(lowerSearch) ||
        email.includes(lowerSearch);

      if ((matchFound || lowerSearch === "") && isInDateRange) {
        results.push({
          wompiPaymentDate: wompi.created_at,
          wompiTransactionNumber: wompi.id,
          paymentMethod: wompi.payment_method.extra.brand,
          cardNumber: wompi.payment_method.extra.last_four,
          cardHolder: wompi.payment_method.extra.card_holder,
          email: wompi.customer_email,
          amount: wompi.amount_in_cents / 100,
          status: wompi.status,
          service: match.service.title,
          matchId: matchSnap.id,
          matchDate: match.createdAt.toDate(),
          clientDni: client.id,
          clientName: fullName,
          installments: wompi.payment_method.installments,
        });
      }
    }

    results.sort((a, b) => {
      return (
        new Date(b.wompiPaymentDate).getTime() -
        new Date(a.wompiPaymentDate).getTime()
      );
    });

    return res.status(200).json({
      success: true,
      data: results,
      total: results.length,
    });
  } catch (error) {
    console.error("Error getting reports:", error);
    return res.status(500).json({ success: false, error: error });
  }
};
