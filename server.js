const express = require("express");
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ============================================================
// GOOGLE CALENDAR INTEGRATION
// ============================================================
let calendarClient = null;

function getCalendarClient() {
  if (calendarClient) return calendarClient;
  try {
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT || "{}");
    if (!creds.client_email) {
      console.log("Google Calendar: No service account configured.");
      return null;
    }
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
    calendarClient = google.calendar({ version: "v3", auth });
    console.log("Google Calendar: Connected as " + creds.client_email);
    return calendarClient;
  } catch (e) {
    console.log("Google Calendar: Setup error -", e.message);
    return null;
  }
}

async function addGuestToCalendarEvent(calendarId, eventId, guestEmail, guestName) {
  const cal = getCalendarClient();
  if (!cal || !calendarId || !eventId) return { success: false, reason: "Calendar not configured" };
  try {
    const event = await cal.events.get({ calendarId, eventId });
    const attendees = event.data.attendees || [];
    if (attendees.find(a => a.email.toLowerCase() === guestEmail.toLowerCase())) {
      return { success: true, reason: "Already on invite" };
    }
    attendees.push({ email: guestEmail, displayName: guestName, responseStatus: "needsAction" });
    await cal.events.patch({ calendarId, eventId, sendUpdates: "all", requestBody: { attendees } });
    console.log("Calendar: Added " + guestEmail + " to event " + eventId);
    return { success: true };
  } catch (e) {
    console.error("Calendar error:", e.message);
    return { success: false, reason: e.message };
  }
}

async function findCalendarEvent(calendarId, session) {
  const cal = getCalendarClient();
  if (!cal || !calendarId) return null;

  try {
    // Parse session time
    const t = session.time.trim();
    const m12 = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm|a|p)\.?m?\.?$/i);
    const m24 = t.match(/^(\d{1,2}):(\d{2})$/);
    let hours = 0, mins = 0;
    if (m12) {
      hours = parseInt(m12[1]); mins = parseInt(m12[2] || "0");
      const pm = m12[3].toLowerCase().startsWith("p");
      if (pm && hours !== 12) hours += 12;
      if (!pm && hours === 12) hours = 0;
    } else if (m24) {
      hours = parseInt(m24[1]); mins = parseInt(m24[2]);
    }

    // Build time range — search window of 15 min before to 15 min after
    const startDate = new Date(session.date + "T" + String(hours).padStart(2, "0") + ":" + String(mins).padStart(2, "0") + ":00");
    const searchStart = new Date(startDate.getTime() - 15 * 60 * 1000);
    const searchEnd = new Date(startDate.getTime() + 15 * 60 * 1000);

    const res = await cal.events.list({
      calendarId,
      timeMin: searchStart.toISOString(),
      timeMax: searchEnd.toISOString(),
      timeZone: "America/Los_Angeles",
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = res.data.items || [];
    if (events.length === 0) {
      console.log("Calendar: No event found for " + session.title + " on " + session.date + " at " + session.time);
      return null;
    }

    // Try to match by title first, then fall back to first event in the window
    const titleMatch = events.find(e => e.summary && session.title && e.summary.toLowerCase().includes(session.title.toLowerCase().split(":")[0].trim()));
    const match = titleMatch || events[0];
    console.log("Calendar: Matched event '" + match.summary + "' (ID: " + match.id + ") for session " + session.title);
    return match.id;
  } catch (e) {
    console.error("Calendar search error:", e.message);
    return null;
  }
}

async function removeGuestFromCalendarEvent(calendarId, eventId, guestEmail) {
  const cal = getCalendarClient();
  if (!cal || !calendarId || !eventId) return;
  try {
    const event = await cal.events.get({ calendarId, eventId });
    const attendees = (event.data.attendees || []).filter(a => a.email.toLowerCase() !== guestEmail.toLowerCase());
    await cal.events.patch({ calendarId, eventId, sendUpdates: "all", requestBody: { attendees } });
    console.log("Calendar: Removed " + guestEmail + " from event " + eventId);
  } catch (e) {
    console.error("Calendar remove error:", e.message);
  }
}

// ============================================================
// DATA LAYER — Simple JSON file storage
// ============================================================

function getDefaultData() {
  return {
    settings: {
      maxSessionsPerPerson: 5,
      adminCode: "admin2026",
      entities: ["Netflix", "Netflix Animation Studio", "Eyeline"],
      categories: ["Netflix Workshop", "Animation Studio Workshop", "Eyeline Workshop"],
      calendarId: "",
      sendConfirmationEmails: false,
      sendWaitlistEmails: false
    },
    sessions: [
      { id: "S001", title: "Feedback Fundamentals", description: "Learn core principles of giving and receiving constructive feedback in a collaborative setting.", date: "2026-05-07", time: "1:00 PM", duration: 90, category: "Netflix Workshop", capacity: 25, externalEntityCap: 5, restrictedToEntity: "", meetingLink: "", location: "Virtual — Zoom link will be provided", calendarEventId: "", status: "Active" },
      { id: "S002", title: "Feedback Fundamentals", description: "Learn core principles of giving and receiving constructive feedback in a collaborative setting.", date: "2026-05-07", time: "4:00 PM", duration: 90, category: "Netflix Workshop", capacity: 25, externalEntityCap: 5, restrictedToEntity: "", meetingLink: "", location: "Virtual — Zoom link will be provided", calendarEventId: "", status: "Active" },
      { id: "S003", title: "Feedback Fundamentals", description: "Learn core principles of giving and receiving constructive feedback in a collaborative setting.", date: "2026-05-07", time: "7:00 PM", duration: 90, category: "Netflix Workshop", capacity: 25, externalEntityCap: 5, restrictedToEntity: "", meetingLink: "", location: "Virtual — Zoom link will be provided", calendarEventId: "", status: "Active" },
      { id: "S004", title: "Feedback in Practice — Small Group", description: "Hands-on practice session with live feedback exercises and coaching in a small group format.", date: "2026-05-14", time: "9:00 AM", duration: 90, category: "Netflix Workshop", capacity: 20, externalEntityCap: 5, restrictedToEntity: "", meetingLink: "", location: "Virtual — Zoom link will be provided", calendarEventId: "", status: "Active" },
      { id: "S005", title: "Feedback in Practice — Small Group", description: "Hands-on practice session with live feedback exercises and coaching in a small group format.", date: "2026-05-14", time: "12:00 PM", duration: 90, category: "Netflix Workshop", capacity: 20, externalEntityCap: 5, restrictedToEntity: "", meetingLink: "", location: "Virtual — Zoom link will be provided", calendarEventId: "", status: "Active" },
      { id: "S006", title: "Feedback in Practice — Small Group", description: "Hands-on practice session with live feedback exercises and coaching in a small group format.", date: "2026-05-14", time: "3:00 PM", duration: 90, category: "Netflix Workshop", capacity: 20, externalEntityCap: 5, restrictedToEntity: "", meetingLink: "", location: "Virtual — Zoom link will be provided", calendarEventId: "", status: "Active" },
      { id: "S007", title: "Animation Studio: Feedback Foundations", description: "Tailored feedback workshop for Netflix Animation Studio teams.", date: "2026-05-21", time: "10:00 AM", duration: 90, category: "Animation Studio Workshop", capacity: 10, externalEntityCap: 0, restrictedToEntity: "Netflix Animation Studio", meetingLink: "", location: "Virtual — Zoom link will be provided", calendarEventId: "", status: "Active" },
      { id: "S008", title: "Animation Studio: Feedback Foundations", description: "Tailored feedback workshop for Netflix Animation Studio teams.", date: "2026-05-21", time: "1:00 PM", duration: 90, category: "Animation Studio Workshop", capacity: 10, externalEntityCap: 0, restrictedToEntity: "Netflix Animation Studio", meetingLink: "", location: "Virtual — Zoom link will be provided", calendarEventId: "", status: "Active" },
      { id: "S009", title: "Eyeline: Feedback Foundations", description: "Tailored feedback workshop for Eyeline teams.", date: "2026-05-28", time: "10:00 AM", duration: 90, category: "Eyeline Workshop", capacity: 10, externalEntityCap: 0, restrictedToEntity: "Eyeline", meetingLink: "", location: "Virtual — Zoom link will be provided", calendarEventId: "", status: "Active" },
      { id: "S010", title: "Eyeline: Feedback Foundations", description: "Tailored feedback workshop for Eyeline teams.", date: "2026-05-28", time: "1:00 PM", duration: 90, category: "Eyeline Workshop", capacity: 10, externalEntityCap: 0, restrictedToEntity: "Eyeline", meetingLink: "", location: "Virtual — Zoom link will be provided", calendarEventId: "", status: "Active" },
      { id: "S011", title: "Advanced Feedback: Difficult Conversations", description: "Navigate challenging feedback scenarios with confidence. Covers upward feedback, cross-functional dynamics, and high-stakes situations.", date: "2026-06-04", time: "1:00 PM", duration: 90, category: "Netflix Workshop", capacity: 25, externalEntityCap: 5, restrictedToEntity: "", meetingLink: "", location: "Virtual — Zoom link will be provided", calendarEventId: "", status: "Active" },
      { id: "S012", title: "Advanced Feedback: Difficult Conversations", description: "Navigate challenging feedback scenarios with confidence. Covers upward feedback, cross-functional dynamics, and high-stakes situations.", date: "2026-06-04", time: "4:00 PM", duration: 90, category: "Netflix Workshop", capacity: 25, externalEntityCap: 5, restrictedToEntity: "", meetingLink: "", location: "Virtual — Zoom link will be provided", calendarEventId: "", status: "Active" },
      { id: "S013", title: "Advanced Feedback: Difficult Conversations", description: "Navigate challenging feedback scenarios with confidence. Covers upward feedback, cross-functional dynamics, and high-stakes situations.", date: "2026-06-04", time: "7:00 PM", duration: 90, category: "Netflix Workshop", capacity: 25, externalEntityCap: 5, restrictedToEntity: "", meetingLink: "", location: "Virtual — Zoom link will be provided", calendarEventId: "", status: "Active" },
      { id: "S014", title: "Feedback Culture Deep Dive", description: "Explore how to embed a feedback-first culture within your team. Interactive discussion and action planning.", date: "2026-06-18", time: "9:00 AM", duration: 60, category: "Netflix Workshop", capacity: 20, externalEntityCap: 5, restrictedToEntity: "", meetingLink: "", location: "Virtual — Zoom link will be provided", calendarEventId: "", status: "Active" },
      { id: "S015", title: "Feedback Culture Deep Dive", description: "Explore how to embed a feedback-first culture within your team. Interactive discussion and action planning.", date: "2026-06-18", time: "12:00 PM", duration: 60, category: "Netflix Workshop", capacity: 20, externalEntityCap: 5, restrictedToEntity: "", meetingLink: "", location: "Virtual — Zoom link will be provided", calendarEventId: "", status: "Active" },
      { id: "S016", title: "Feedback Culture Deep Dive", description: "Explore how to embed a feedback-first culture within your team. Interactive discussion and action planning.", date: "2026-06-18", time: "3:00 PM", duration: 60, category: "Netflix Workshop", capacity: 20, externalEntityCap: 5, restrictedToEntity: "", meetingLink: "", location: "Virtual — Zoom link will be provided", calendarEventId: "", status: "Active" },
      { id: "S017", title: "Animation Studio: Advanced Feedback", description: "Advanced feedback techniques tailored for Animation Studio creative teams.", date: "2026-06-25", time: "10:00 AM", duration: 90, category: "Animation Studio Workshop", capacity: 10, externalEntityCap: 0, restrictedToEntity: "Netflix Animation Studio", meetingLink: "", location: "Virtual — Zoom link will be provided", calendarEventId: "", status: "Active" },
      { id: "S018", title: "Animation Studio: Advanced Feedback", description: "Advanced feedback techniques tailored for Animation Studio creative teams.", date: "2026-06-25", time: "1:00 PM", duration: 90, category: "Animation Studio Workshop", capacity: 10, externalEntityCap: 0, restrictedToEntity: "Netflix Animation Studio", meetingLink: "", location: "Virtual — Zoom link will be provided", calendarEventId: "", status: "Active" },
      { id: "S019", title: "Eyeline: Advanced Feedback", description: "Advanced feedback techniques tailored for Eyeline teams.", date: "2026-07-02", time: "10:00 AM", duration: 90, category: "Eyeline Workshop", capacity: 10, externalEntityCap: 0, restrictedToEntity: "Eyeline", meetingLink: "", location: "Virtual — Zoom link will be provided", calendarEventId: "", status: "Active" },
      { id: "S020", title: "Eyeline: Advanced Feedback", description: "Advanced feedback techniques tailored for Eyeline teams.", date: "2026-07-02", time: "1:00 PM", duration: 90, category: "Eyeline Workshop", capacity: 10, externalEntityCap: 0, restrictedToEntity: "Eyeline", meetingLink: "", location: "Virtual — Zoom link will be provided", calendarEventId: "", status: "Active" }
    ],
    registrations: []
  };
}

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Error loading data:", e.message);
  }
  const defaults = getDefaultData();
  saveData(defaults);
  return defaults;
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function generateId() {
  return Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 5).toUpperCase();
}

// ============================================================
// API ROUTES
// ============================================================

// --- Get all portal data ---
app.get("/api/data", (req, res) => {
  const data = loadData();
  const activeSessions = data.sessions.filter(s => s.status === "Active");
  const activeRegs = data.registrations.filter(r => r.status === "Confirmed" || r.status === "Waitlisted");
  res.json({ sessions: activeSessions, registrations: activeRegs, settings: data.settings });
});

// --- Admin auth ---
app.post("/api/admin/login", (req, res) => {
  const data = loadData();
  if (req.body.code === data.settings.adminCode) {
    res.json({ success: true });
  } else {
    res.json({ success: false, message: "Invalid admin code." });
  }
});

// --- Register ---
app.post("/api/register", (req, res) => {
  const { sessionId, name, email, entity, manager } = req.body;
  const data = loadData();

  const session = data.sessions.find(s => s.id === sessionId && s.status === "Active");
  if (!session) return res.json({ success: false, message: "Session not found." });

  // Entity restriction check
  if (session.restrictedToEntity && session.restrictedToEntity !== entity) {
    return res.json({ success: false, message: `This session is restricted to ${session.restrictedToEntity} participants only.` });
  }

  const activeRegs = data.registrations.filter(r => r.status === "Confirmed" || r.status === "Waitlisted");

  // Already registered check
  if (activeRegs.find(r => r.email.toLowerCase() === email.toLowerCase() && r.sessionId === sessionId)) {
    return res.json({ success: false, message: "You're already registered for this session." });
  }

  // Max sessions check
  const personCount = activeRegs.filter(r => r.email.toLowerCase() === email.toLowerCase()).length;
  if (personCount >= data.settings.maxSessionsPerPerson) {
    return res.json({ success: false, message: `You've reached the maximum of ${data.settings.maxSessionsPerPerson} session registrations.` });
  }

  // Capacity check
  const confirmedCount = activeRegs.filter(r => r.sessionId === sessionId && r.status === "Confirmed").length;

  // External entity cap check
  const isExternal = entity !== "Netflix";
  if (!session.restrictedToEntity && isExternal && session.externalEntityCap > 0) {
    const externalConfirmed = activeRegs.filter(r => r.sessionId === sessionId && r.status === "Confirmed" && r.entity !== "Netflix").length;
    if (externalConfirmed >= session.externalEntityCap) {
      const reg = { id: "R" + generateId(), sessionId, sessionTitle: session.title, name, email, entity, manager, status: "Waitlisted", timestamp: new Date().toISOString() };
      data.registrations.push(reg);
      saveData(data);
      return res.json({ success: true, status: "Waitlisted", message: `External entity spots are full. You've been added to the waitlist for "${session.title}".` });
    }
  }

  const status = confirmedCount >= session.capacity ? "Waitlisted" : "Confirmed";
  const reg = { id: "R" + generateId(), sessionId, sessionTitle: session.title, name, email, entity, manager, status, timestamp: new Date().toISOString() };
  data.registrations.push(reg);
  saveData(data);

  // Auto-add to Google Calendar if confirmed
  const calId = data.settings.calendarId;
  if (status === "Confirmed" && calId) {
    findCalendarEvent(calId, session).then(eventId => {
      if (eventId) addGuestToCalendarEvent(calId, eventId, email, name);
    }).catch(e => console.error("Calendar add failed:", e));
  }

  const calMsg = (status === "Confirmed" && calId) ? " A calendar invite will be sent to your email." : "";
  const message = status === "Confirmed"
    ? `You're confirmed for "${session.title}" on ${session.date} at ${session.time} PT.` + calMsg
    : `You've been added to the waitlist for "${session.title}". We'll notify you if a spot opens up.`;

  res.json({ success: true, status, message });
});

// --- Cancel registration ---
app.post("/api/cancel", (req, res) => {
  const { regId } = req.body;
  const data = loadData();

  const regIndex = data.registrations.findIndex(r => r.id === regId);
  if (regIndex === -1) return res.json({ success: false, message: "Registration not found." });

  const reg = data.registrations[regIndex];
  const wasConfirmed = reg.status === "Confirmed";
  data.registrations[regIndex].status = "Cancelled";

  const cancelSession = data.sessions.find(s => s.id === reg.sessionId);
  const calId = data.settings.calendarId;

  // Remove from Google Calendar
  if (wasConfirmed && calId && cancelSession) {
    findCalendarEvent(calId, cancelSession).then(eventId => {
      if (eventId) removeGuestFromCalendarEvent(calId, eventId, reg.email);
    }).catch(e => console.error("Calendar remove failed:", e));
  }

  // Promote from waitlist if confirmed spot freed
  if (wasConfirmed) {
    const waitlisted = data.registrations
      .filter(r => r.sessionId === reg.sessionId && r.status === "Waitlisted")
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    if (waitlisted.length > 0) {
      const idx = data.registrations.findIndex(r => r.id === waitlisted[0].id);
      if (idx !== -1) {
        data.registrations[idx].status = "Confirmed";
        if (calId && cancelSession) {
          findCalendarEvent(calId, cancelSession).then(eventId => {
            if (eventId) addGuestToCalendarEvent(calId, eventId, data.registrations[idx].email, data.registrations[idx].name);
          }).catch(e => console.error("Calendar promote-add failed:", e));
        }
      }
    }
  }

  saveData(data);
  res.json({ success: true, message: "Registration cancelled." });
});

// --- Lookup registrations by email ---
app.get("/api/my-registrations", (req, res) => {
  const email = (req.query.email || "").toLowerCase();
  if (!email) return res.json([]);
  const data = loadData();
  const regs = data.registrations.filter(r =>
    r.email.toLowerCase() === email && (r.status === "Confirmed" || r.status === "Waitlisted")
  );
  res.json(regs);
});

// --- Admin: Add session ---
app.post("/api/admin/sessions", (req, res) => {
  const data = loadData();
  const session = { id: "S" + generateId(), ...req.body, calendarEventId: "", status: "Active" };
  data.sessions.push(session);
  saveData(data);
  res.json({ success: true, id: session.id });
});

// --- Admin: Update session ---
app.put("/api/admin/sessions/:id", (req, res) => {
  const data = loadData();
  const idx = data.sessions.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.json({ success: false, message: "Session not found." });
  data.sessions[idx] = { ...data.sessions[idx], ...req.body };
  saveData(data);
  res.json({ success: true });
});

// --- Admin: Delete session ---
app.delete("/api/admin/sessions/:id", (req, res) => {
  const data = loadData();
  const idx = data.sessions.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.json({ success: false, message: "Session not found." });
  data.sessions[idx].status = "Deleted";
  saveData(data);
  res.json({ success: true });
});

// --- Admin: Update settings ---
app.put("/api/admin/settings", (req, res) => {
  const data = loadData();
  data.settings = { ...data.settings, ...req.body };
  saveData(data);
  res.json({ success: true });
});

// --- Admin: Export CSV ---
app.get("/api/admin/export", (req, res) => {
  const data = loadData();
  const headers = ["Registration ID", "Session", "Session Date", "Session Time", "Name", "Email", "Entity", "Manager", "Status", "RSVP Date"];
  const rows = data.registrations.map(r => {
    const s = data.sessions.find(sess => sess.id === r.sessionId);
    return [r.id, r.sessionTitle, s?.date || "", s?.time || "", r.name, r.email, r.entity, r.manager, r.status, r.timestamp];
  });
  const csv = [headers, ...rows].map(row => row.map(c => `"${String(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=feedback-workshop-registrations.csv");
  res.send(csv);
});

// --- Admin: Get ALL registrations (including cancelled) for admin view ---
app.get("/api/admin/all-registrations", (req, res) => {
  const data = loadData();
  res.json(data.registrations);
});

// --- Admin: Reset data ---
app.post("/api/admin/reset", (req, res) => {
  const defaults = getDefaultData();
  saveData(defaults);
  res.json({ success: true });
});

// --- Generate .ics calendar file ---
app.get("/api/calendar/:sessionId", (req, res) => {
  const data = loadData();
  const session = data.sessions.find(s => s.id === req.params.sessionId);
  if (!session) return res.status(404).send("Session not found");

  const dateStr = session.date;
  const timeStr = session.time;
  // Flexible time parsing: accepts "9am", "9:00am", "9:00 AM", "1:00 PM", "14:00", etc.
  let hours, mins;
  const t = timeStr.trim();
  const match12 = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm|a|p)\.?[m]?\.?$/i);
  const match24 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (match12) {
    hours = parseInt(match12[1]);
    mins = parseInt(match12[2] || "0");
    const pm = match12[3].toLowerCase().startsWith("p");
    if (pm && hours !== 12) hours += 12;
    if (!pm && hours === 12) hours = 0;
  } else if (match24) {
    hours = parseInt(match24[1]);
    mins = parseInt(match24[2]);
  } else {
    return res.status(400).send("Invalid time format. Use formats like: 9:00 AM, 1:00 PM, 9am, 14:00");
  }

  const dateParts = dateStr.split("-");
  const startStr = dateParts[0] + dateParts[1] + dateParts[2] + "T" +
    String(hours).padStart(2, "0") + String(mins).padStart(2, "0") + "00";
  const endMinsTotal = hours * 60 + mins + session.duration;
  const endH = Math.floor(endMinsTotal / 60);
  const endM = endMinsTotal % 60;
  const endStr = dateParts[0] + dateParts[1] + dateParts[2] + "T" +
    String(endH).padStart(2, "0") + String(endM).padStart(2, "0") + "00";

  const uid = session.id + "-" + Date.now() + "@feedback-workshop-portal";
  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  let desc = (session.description || "").replace(/\n/g, "\\n");
  desc += "\\n\\nFeedback Workshop \\u00B7 UCAN \\u00B7 Pacific Time";
  if (session.meetingLink) desc += "\\n\\nJoin here: " + session.meetingLink;
  if (session.location) desc += "\\n\\nLocation: " + session.location;

  const loc = session.meetingLink || session.location || "Virtual (link to be provided)";

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Feedback Workshop Portal//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "DTSTART;TZID=America/Los_Angeles:" + startStr,
    "DTEND;TZID=America/Los_Angeles:" + endStr,
    "DTSTAMP:" + now,
    "UID:" + uid,
    "SUMMARY:" + session.title,
    "DESCRIPTION:" + desc,
    "LOCATION:" + loc,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder: " + session.title + " starts in 15 minutes",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="' + session.title.replace(/[^a-zA-Z0-9 ]/g, "") + '.ics"');
  res.send(ics);
});

// --- Daily Digest Email ---
app.get("/api/digest", async (req, res) => {
  // Protect with a secret key
  const digestKey = process.env.DIGEST_KEY || "digest2026";
  if (req.query.key !== digestKey) return res.status(403).json({ error: "Invalid key" });

  const apiKey = process.env.RESEND_API_KEY;
  const digestTo = process.env.DIGEST_EMAIL || "";
  if (!apiKey || !digestTo) return res.status(500).json({ error: "Email not configured. Set RESEND_API_KEY and DIGEST_EMAIL in Render environment variables." });

  const data = loadData();
  const activeSessions = data.sessions.filter(s => s.status === "Active");
  const activeRegs = data.registrations.filter(r => r.status !== "Cancelled");

  const totalConfirmed = activeRegs.filter(r => r.status === "Confirmed").length;
  const totalWaitlisted = activeRegs.filter(r => r.status === "Waitlisted").length;
  const uniqueEmails = [...new Set(activeRegs.map(r => r.email))].length;

  // Registrations from last 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const newRegs = activeRegs.filter(r => r.timestamp > oneDayAgo);

  // Build session summary
  let sessionRows = "";
  activeSessions.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  activeSessions.forEach(s => {
    const sRegs = activeRegs.filter(r => r.sessionId === s.id);
    const confirmed = sRegs.filter(r => r.status === "Confirmed").length;
    const waitlisted = sRegs.filter(r => r.status === "Waitlisted").length;
    const pct = Math.round((confirmed / s.capacity) * 100);
    const barColor = pct >= 90 ? "#C62828" : pct >= 70 ? "#E65100" : "#2E7D32";
    sessionRows += `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600">${s.title}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">${s.date} · ${s.time} PT</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="background:#eee;border-radius:4px;width:80px;height:12px;overflow:hidden">
            <div style="background:${barColor};height:100%;width:${pct}%"></div>
          </div>
          <span style="font-size:13px;font-weight:600">${confirmed}/${s.capacity}</span>
        </div>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#888">${waitlisted > 0 ? waitlisted + " waitlisted" : "—"}</td>
    </tr>`;
  });

  // New registrations detail
  let newRegRows = "";
  if (newRegs.length > 0) {
    newRegs.forEach(r => {
      newRegRows += `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #eee">${r.name}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee">${r.email}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee">${r.sessionTitle}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee">${r.entity}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee">
          <span style="background:${r.status === "Confirmed" ? "#E8F5E9" : "#FFF3E0"};color:${r.status === "Confirmed" ? "#2E7D32" : "#E65100"};padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600">${r.status}</span>
        </td>
      </tr>`;
    });
  }

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const html = `
  <div style="max-width:640px;margin:0 auto;font-family:Arial,sans-serif;color:#333">
    <div style="background:#1a1a1a;padding:24px 32px;border-radius:12px 12px 0 0">
      <p style="color:#C62828;font-size:11px;font-weight:700;letter-spacing:1px;margin:0 0 4px">FEEDBACK WORKSHOPS · UCAN</p>
      <h1 style="color:#fff;font-size:22px;margin:0">Daily Registration Digest</h1>
      <p style="color:#999;font-size:14px;margin:4px 0 0">${today}</p>
    </div>
    <div style="background:#fff;padding:24px 32px;border:1px solid #eee">
      <div style="display:flex;gap:16px;margin-bottom:24px">
        <div style="flex:1;background:#F5F5F5;padding:16px;border-radius:8px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:#1a1a1a">${totalConfirmed}</div>
          <div style="font-size:12px;color:#888;margin-top:4px">Confirmed</div>
        </div>
        <div style="flex:1;background:#F5F5F5;padding:16px;border-radius:8px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:#E65100">${totalWaitlisted}</div>
          <div style="font-size:12px;color:#888;margin-top:4px">Waitlisted</div>
        </div>
        <div style="flex:1;background:#F5F5F5;padding:16px;border-radius:8px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:#0D47A1">${uniqueEmails}</div>
          <div style="font-size:12px;color:#888;margin-top:4px">Unique People</div>
        </div>
        <div style="flex:1;background:#F5F5F5;padding:16px;border-radius:8px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:#2E7D32">${newRegs.length}</div>
          <div style="font-size:12px;color:#888;margin-top:4px">New (24hr)</div>
        </div>
      </div>
      <h2 style="font-size:16px;margin:0 0 12px;color:#1a1a1a">Session Fill Rates</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:#F5F5F5">
          <th style="padding:8px 12px;text-align:left">Session</th>
          <th style="padding:8px 12px;text-align:left">Date & Time</th>
          <th style="padding:8px 12px;text-align:left">Filled</th>
          <th style="padding:8px 12px;text-align:left">Waitlist</th>
        </tr></thead>
        <tbody>${sessionRows}</tbody>
      </table>
      ${newRegs.length > 0 ? `
      <h2 style="font-size:16px;margin:24px 0 12px;color:#1a1a1a">New Registrations (Last 24 Hours)</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:#F5F5F5">
          <th style="padding:6px 12px;text-align:left">Name</th>
          <th style="padding:6px 12px;text-align:left">Email</th>
          <th style="padding:6px 12px;text-align:left">Session</th>
          <th style="padding:6px 12px;text-align:left">Entity</th>
          <th style="padding:6px 12px;text-align:left">Status</th>
        </tr></thead>
        <tbody>${newRegRows}</tbody>
      </table>` : `<p style="color:#888;font-size:13px;margin-top:24px">No new registrations in the last 24 hours.</p>`}
    </div>
    <div style="background:#F5F5F5;padding:16px 32px;border-radius:0 0 12px 12px;text-align:center">
      <p style="font-size:12px;color:#999;margin:0">Feedback Workshop Registration Portal · Netflix Talent Management · L&D</p>
    </div>
  </div>`;

  try {
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
      body: JSON.stringify({
        from: "Feedback Workshops <onboarding@resend.dev>",
        to: digestTo.split(",").map(e => e.trim()),
        subject: "📊 Workshop Registration Digest — " + today,
        html: html,
      }),
    });
    const result = await emailRes.json();
    console.log("Digest sent:", result);
    res.json({ success: true, to: digestTo, newRegistrations: newRegs.length, totalConfirmed, totalWaitlisted });
  } catch (e) {
    console.error("Digest error:", e);
    res.status(500).json({ error: e.message });
  }
});

// --- Fallback to index.html ---
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ============================================================
app.listen(PORT, () => {
  console.log(`\n🎯 Feedback Workshop Portal running at http://localhost:${PORT}\n`);
});
