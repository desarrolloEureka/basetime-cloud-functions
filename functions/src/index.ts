/**
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// [START v2import]

import { onRequest } from "firebase-functions/v2/https";
import * as express from "express";
import { disabledUser, getUsers, searchUser, updateUser } from "./users";
import * as cors from "cors";
import { reviewMeets } from "./review_meets";
import * as onMatchCreated from "./firestore/matches/onMatchCreated";
import * as onMeetCreated from "./firestore/meets/onMeetCreated";
import * as onMeetUpdated from "./firestore/meets/onMeetUpdated";
import * as onChatUpdated from "./firestore/chats/onChatUpdated";
import * as onVerificationUpdated from "./firestore/verifications/onVUpdated";
import { getSalesReport } from "./dashboard/get_sales_report";
import { getMatchReport } from "./dashboard/get_match_meets_report";
import { getCommissionsReport } from "./dashboard/get_comission_report";

const app = express();

app.use(cors({ origin: true }));

// Meets
app.post("/review-meets", reviewMeets);

// Users
app.get("/users", getUsers);
app.post("/search-user", searchUser);
app.patch("/users/disbaled/:uid", disabledUser);
app.patch("/users/:uid", updateUser);

// Dashboard
app.get("/sales-report", getSalesReport);
app.get("/match-report", getMatchReport);
app.get("/commission-report", getCommissionsReport);

exports.api = onRequest(app);

// Chats
exports.onChatUpdated = onChatUpdated;
// Matches
exports.onMatchCreated = onMatchCreated;
// Meets
exports.onMeetCreated = onMeetCreated;
exports.onMeetUpdated = onMeetUpdated;
// Verifications
exports.onVerificationUpdated = onVerificationUpdated;
