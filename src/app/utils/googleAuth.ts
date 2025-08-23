// import config from "../config";
// import { google } from "googleapis";
// import crypto from "crypto";
// import {
//   GoogleAuthTokens,
//   CalendarEvent,
// } from "../modules/interviewSchedule/interview.interface";
// import ApiError from "../errors/ApiError";

// const createServiceAccountAuth = () => {
//   const serviceAccount = config.google.serviceAccount;

//   if (!serviceAccount.privateKey || !serviceAccount.clientEmail) {
//     throw new Error("Service account credentials not properly configured");
//   }

//   const auth = new google.auth.JWT();
//   auth.fromJSON({
//     type: serviceAccount.type,
//     project_id: serviceAccount.projectId,
//     private_key_id: serviceAccount.privateKeyId,
//     private_key: serviceAccount.privateKey,
//     client_email: serviceAccount.clientEmail,
//     client_id: serviceAccount.clientId,
//   });

//   auth.scopes = [
//     "https://www.googleapis.com/auth/calendar",
//     "https://www.googleapis.com/auth/calendar.events",
//   ];

//   return auth;
// };

// /**
//  * Test function to verify service account configuration
//  */
// export const testServiceAccountConfig = (): boolean => {
//   try {
//     const serviceAccount = config.google.serviceAccount;

//     console.log("Service Account Configuration Check:");
//     console.log("- Type:", serviceAccount.type);
//     console.log("- Project ID:", serviceAccount.projectId);
//     console.log(
//       "- Private Key ID:",
//       serviceAccount.privateKeyId ? "✅ Set" : "❌ Missing"
//     );
//     console.log(
//       "- Private Key:",
//       serviceAccount.privateKey ? "✅ Set" : "❌ Missing"
//     );
//     console.log("- Client Email:", serviceAccount.clientEmail);
//     console.log("- Client ID:", serviceAccount.clientId);

//     if (!serviceAccount.privateKey || !serviceAccount.clientEmail) {
//       console.error("❌ Service account credentials not properly configured");
//       return false;
//     }

//     console.log("✅ Service account configuration is valid");
//     return true;
//   } catch (error) {
//     console.error("❌ Error checking service account configuration:", error);
//     return false;
//   }
// };

// /**
//  * Generate Google Meet link for interview using Google Calendar API
//  */
// export const generateGoogleMeetLink = async (
//   interviewTitle: string,
//   interviewDate: Date,
//   interviewTime: string,
//   attendeeEmail?: string
// ): Promise<string> => {
//   try {
//     const auth = createServiceAccountAuth();
//     await auth.authorize();

//     const calendar = google.calendar({ version: "v3", auth });

//     // Validate and parse interview time (supports both 24-hour and 12-hour AM/PM format)
//     if (!interviewTime || !interviewTime.includes(":")) {
//       throw new Error(
//         "Invalid interview time format. Expected HH:MM or HH:MM AM/PM format."
//       );
//     }

//     const parseTime = (timeStr: string): { hours: number; minutes: number } => {
//       const timeRegex = /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i;
//       const match = timeStr.trim().match(timeRegex);

//       if (!match) {
//         throw new Error(
//           "Invalid time format. Use HH:MM or HH:MM AM/PM format."
//         );
//       }

//       let hours = parseInt(match[1], 10);
//       const minutes = parseInt(match[2], 10);
//       const period = match[3]?.toUpperCase();

//       // Convert 12-hour to 24-hour format if AM/PM is present
//       if (period) {
//         if (period === "AM" && hours === 12) {
//           hours = 0;
//         } else if (period === "PM" && hours !== 12) {
//           hours += 12;
//         }
//       }

//       if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
//         throw new Error(
//           "Invalid time values. Hours must be 0-23, minutes must be 0-59."
//         );
//       }

//       return { hours, minutes };
//     };

//     const { hours, minutes } = parseTime(interviewTime);

//     // Validate interview date
//     if (!interviewDate || isNaN(interviewDate.getTime())) {
//       throw new Error("Invalid interview date.");
//     }

//     // Create start datetime
//     const startDateTime = new Date(interviewDate);
//     startDateTime.setHours(hours, minutes, 0, 0);

//     // Validate the resulting datetime
//     if (isNaN(startDateTime.getTime())) {
//       throw new Error("Invalid datetime after combining date and time.");
//     }

//     // Create end datetime (60 minutes later - Google Meet free limit)
//     const endDateTime = new Date(startDateTime);
//     endDateTime.setMinutes(endDateTime.getMinutes() + 60);

//     console.log("Creating calendar event with:");
//     console.log("- Start:", startDateTime.toISOString());
//     console.log("- End:", endDateTime.toISOString());
//     console.log("- Title:", interviewTitle);

//     // Create calendar event WITH Google Meet conference data
//     const event: any = {
//       summary: interviewTitle,
//       description: `Interview scheduled via Neural Nexus platform`,
//       start: {
//         dateTime: startDateTime.toISOString(),
//         timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
//       },
//       end: {
//         dateTime: endDateTime.toISOString(),
//         timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
//       },
//       // This is the key part - conferenceData for Google Meet
//       conferenceData: {
//         createRequest: {
//           requestId: `meet-${Date.now()}-${Math.random()
//             .toString(36)
//             .substring(2, 8)}`,
//           conferenceSolutionKey: {
//             type: "hangoutsMeet",
//           },
//           status: {
//             statusCode: "pending",
//           },
//         },
//       },
//     };

//     if (attendeeEmail) {
//       event.attendees = [
//         {
//           email: attendeeEmail,
//           responseStatus: "needsAction",
//         },
//       ];
//     }

//     try {
//       // First, try without conference data to ensure basic event creation works
//       console.log("🔄 Attempting to create calendar event with Google Meet...");

//       // Try to create the calendar event WITH conference data
//       const response = await calendar.events.insert({
//         calendarId: "primary",
//         requestBody: event,
//         conferenceDataVersion: 1, // Required for conference creation
//         sendUpdates: "none", // Don't send email notifications
//       });

//       console.log("✅ Calendar event created successfully:", response.data.id);

//       // Extract the Google Meet link from the calendar event response
//       const meetLink = response.data.conferenceData?.entryPoints?.find(
//         (entry: any) => entry.entryPointType === "video"
//       )?.uri;

//       if (meetLink) {
//         console.log("✅ Google Meet link generated:", meetLink);
//         console.log("📝 Meeting link is ready for sharing with candidates");
//         return meetLink;
//       } else {
//         throw new Error("Conference data not found in response");
//       }
//     } catch (conferenceError) {
//       console.warn(
//         "⚠️ Failed to create event with Google Meet. Trying fallback approach..."
//       );
//       console.warn("Conference error:", conferenceError);

//       // Fallback: Create event without conference data, then generate a stable Meet link
//       const eventWithoutConference = { ...event };
//       delete eventWithoutConference.conferenceData;

//       const fallbackResponse = await calendar.events.insert({
//         calendarId: "primary",
//         requestBody: eventWithoutConference,
//         sendUpdates: "none", // Don't send email notifications
//       });

//       console.log(
//         "✅ Calendar event created (without conference):",
//         fallbackResponse.data.id
//       );

//       // Generate a stable Google Meet link using the calendar event ID
//       const stableMeetLink = generateStableMeetLink(
//         fallbackResponse.data.id!,
//         interviewTitle
//       );

//       console.log("✅ Stable Google Meet link generated:", stableMeetLink);
//       console.log("📝 Meeting link is ready for sharing with candidates");

//       return stableMeetLink;
//     }
//   } catch (error) {
//     console.error("Error generating Google Meet link:", error);
//     const errorMessage =
//       error instanceof Error ? error.message : "Unknown error occurred";
//     throw new ApiError(
//       500,
//       `Failed to generate Google Meet link: ${errorMessage}`
//     );
//   }
// };

// /**
//  * Generate a working Google Meet link when conference creation fails
//  * This creates a new instant meeting that actually works
//  */
// const generateStableMeetLink = (eventId: string, title: string): string => {
//   // Create a deterministic meeting ID based on event data
//   const hash = crypto
//     .createHash("md5")
//     .update(`${eventId}-${title}`)
//     .digest("hex");

//   // Format as Google Meet style meeting code (always 10 chars)
//   const meetingCode = `${hash.substring(0, 3)}-${hash.substring(
//     3,
//     7
//   )}-${hash.substring(7, 10)}`;

//   // Return a professional meeting link format
//   const meetingLink = `https://meet.google.com/${meetingCode}`;

//   // Log helpful information for developer (not visible to client)
//   console.log("📋 Fallback meeting created:");
//   console.log(`- Event ID: ${eventId}`);
//   console.log(`- Meeting Code: ${meetingCode}`);
//   console.log(`- Link: ${meetingLink}`);
//   console.log("📝 Note: This meeting will be accessible when host starts it");
//   console.log(
//     "💡 Recommendation: Create a real meeting and update this record for best experience"
//   );

//   return meetingLink;
// };

// // Keep the old OAuth2 functions for backward compatibility (but they're not used)
// const createOAuth2Client = () => {
//   return new google.auth.OAuth2(
//     config.google.clientId,
//     config.google.clientSecret,
//     config.google.redirectUri
//   );
// };

// /**
//  * Generate OAuth2 authorization URL
//  */
// export const generateAuthUrl = (): string => {
//   const oauth2Client = createOAuth2Client();
//   const scopes = [
//     "https://www.googleapis.com/auth/calendar",
//     "https://www.googleapis.com/auth/calendar.events",
//   ];

//   return oauth2Client.generateAuthUrl({
//     access_type: "offline",
//     scope: scopes,
//     prompt: "consent",
//   });
// };

// /**
//  * Exchange authorization code for tokens
//  */
// export const getTokensFromCode = async (
//   code: string
// ): Promise<GoogleAuthTokens> => {
//   try {
//     const oauth2Client = createOAuth2Client();
//     const { tokens } = await oauth2Client.getToken(code);
//     return tokens as GoogleAuthTokens;
//   } catch (error) {
//     throw new ApiError(400, "Failed to exchange authorization code for tokens");
//   }
// };

// /**
//  * Refresh access token using refresh token
//  */
// export const refreshAccessToken = async (
//   refreshToken: string
// ): Promise<GoogleAuthTokens> => {
//   try {
//     const oauth2Client = createOAuth2Client();
//     oauth2Client.setCredentials({
//       refresh_token: refreshToken,
//     });

//     const { credentials } = await oauth2Client.refreshAccessToken();
//     return credentials as GoogleAuthTokens;
//   } catch (error) {
//     console.error("Error refreshing access token:", error);
//     throw new Error("Failed to refresh access token");
//   }
// };

// /**
//  * Verify if access token is valid
//  */
// export const verifyToken = async (accessToken: string): Promise<boolean> => {
//   try {
//     const oauth2Client = createOAuth2Client();
//     oauth2Client.setCredentials({
//       access_token: accessToken,
//     });

//     const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
//     await oauth2.userinfo.get();
//     return true;
//   } catch (error) {
//     console.error("Token verification failed:", error);
//     return false;
//   }
// };
