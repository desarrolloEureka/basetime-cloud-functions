import dayjs = require("dayjs");
import utc = require("dayjs/plugin/utc");
import timezone = require("dayjs/plugin/timezone");
import { Request, Response } from "express";
import { firestore } from "./adminInit";

// Extender Day.js con los plugins
dayjs.extend(utc);
dayjs.extend(timezone);

export const reviewMeets = async (req: Request, res: Response) => {
  const meets = await firestore()
    .collection("meets")
    .where("status", "in", ["aceptNotPayed", "aceptPayed", "request"])
    .get();

  for (const document of meets.docs) {
    const meet = document.data();
    const dateNow = dayjs().tz("America/Bogota");
    const meetDate = dayjs(meet.date.toDate()).tz("America/Bogota");
    if (dateNow.add(30, "days").isAfter(meetDate)) {
      await document.ref.update({
        status: "cancel",
      });
    }
  }

  return res.status(200).end();
};
