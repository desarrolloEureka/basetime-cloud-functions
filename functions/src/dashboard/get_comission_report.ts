import { Request, Response } from "express";
import * as admin from "firebase-admin";

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

interface CommissionsReport {
  wompiPaymentDate: Date;
  matchDate: Date;
  categories: string;
  service: string;
  supplierDNI: string;
  supplierUser: string;
  supplierEmail: string;
  clientDNI: string;
  clientUser: string;
  referralDNI?: number;
  referralUser?: string;
  amount: number;
  supplierAmount: number;
  referralAmount: number;
  baseTimeAmount: number;
  wompiAmount: number;
  status: string;
}

export const getCommissionsReport = async (req: Request, res: Response) => {
  try {
    const {
      state,
      category,
      search = "",
      startDate,
      endDate,
    }: QueryParams = req.query;

    const lowerSearch = search.toLowerCase();
    const parsedStartDate = startDate ? new Date(startDate) : null;
    const parsedEndDate = endDate ? new Date(endDate) : null;

    const movementsSnapshot = await db
      .collection("movements")
      .where("type", "==", "charged")
      .get();

    const results: CommissionsReport[] = [];

    for (const movementDoc of movementsSnapshot.docs) {
      const movement = movementDoc.data();
      const meetId = movement.meetId;
      if (!meetId) continue;

      const meetDoc = await db.collection("meets").doc(meetId).get();
      if (!meetDoc.exists) continue;

      const meetData = meetDoc.data();
      const paymentResult = meetData?.paymentResult;
      if (!paymentResult || paymentResult === "") continue;

      const chatRef = meetData.chatRef;
      if (!chatRef) continue;

      const matchId = chatRef.id;

      const matchDoc = await db.collection("matches").doc(matchId).get();
      if (!matchDoc) continue;

      const matchData = matchDoc.data();
      if (!matchData) continue;

      const serviceCategories = matchData.service?.categories ?? [];

      const hasCategory = category ?
        serviceCategories.some((c: any) => c.id?.includes(category)) :
        true;

      if (!hasCategory) continue;

      const wompiDate = new Date(paymentResult.created_at);
      const isInDateRange =
        (!parsedStartDate || wompiDate >= parsedStartDate) &&
        (!parsedEndDate || wompiDate <= parsedEndDate);

      if (!isInDateRange) continue;

      const supplierDoc = await db.doc(`users/${matchData.supplier.id}`).get();
      const clientDoc = await db.doc(`users/${matchData.client.id}`).get();

      const supplier = supplierDoc.data();
      const client = clientDoc.data();

      if (!supplier || !client) continue;

      let referral: any = null;
      if (client.promoterId && client.promoterId > 0) {
        const referralSnapshot = await db
          .collection("users")
          .where("id", "==", client.promoterId)
          .get();
        if (!referralSnapshot.empty) {
          referral = referralSnapshot.docs[0].data();
        }
      }

      const fullSupplierName =
        `${supplier.firstName} ${supplier.lastName}`.toLowerCase();
      const fullClientName =
        `${client.firstName} ${client.lastName}`.toLowerCase();
      const supplierDni = String(supplier.id);
      const clientDni = String(client.id);
      const supplierEmail = supplier.email?.toLowerCase() ?? "";
      const service = matchData.service.title.toLowerCase();

      const matchFound =
        fullSupplierName.includes(lowerSearch) ||
        supplierDni.includes(lowerSearch) ||
        supplierEmail.includes(lowerSearch) ||
        fullClientName.includes(lowerSearch) ||
        clientDni.includes(lowerSearch) ||
        service.includes(lowerSearch);

      if (search && !matchFound) continue;
      if (state && paymentResult.status !== state) continue;

      const totalAmount = matchData.service.pricePerHour * matchData.hours;
      const vendorAmount = movement.total;

      const baseTimeCommission = movement.basetimeCommission ?? 0;
      const wompiCommission = movement.wompiCommission ?? 0;
      const referralCommission = movement.refferralCommission ?? 0;

      const baseTimeAmount = (totalAmount / 100) * baseTimeCommission;
      const wompiAmount = (totalAmount / 100) * wompiCommission;
      const referralAmount = (totalAmount / 100) * referralCommission;

      const categoryEs = (matchData.service.categories ?? [])
        .map((c: any) => c.nameEs)
        .join(", ");

      results.push({
        wompiPaymentDate: wompiDate,
        matchDate: matchData.createdAt.toDate(),
        categories: categoryEs,
        service: matchData.service.title,
        supplierDNI: supplier.id,
        supplierUser: `${supplier.firstName} ${supplier.lastName}`,
        supplierEmail: supplier.email,
        clientDNI: client.id,
        clientUser: `${client.firstName} ${client.lastName}`,
        referralDNI: referral?.id,
        referralUser: referral ?
          `${referral.firstName} ${referral.lastName}` :
          undefined,
        amount: totalAmount,
        supplierAmount: vendorAmount,
        referralAmount,
        baseTimeAmount,
        wompiAmount,
        status: paymentResult.status,
      });
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
    console.error("Error getting commissions report:", error);
    return res.status(500).json({ success: false, error });
  }
};
