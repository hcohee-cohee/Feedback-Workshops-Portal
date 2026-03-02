const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

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
      sendConfirmationEmails: false,
      sendWaitlistEmails: false
    },
    sessions: [
      { id: "S001", title: "Feedback Fundamentals", description: "Learn core principles of giving and receiving constructive feedback in a collaborative setting.", date: "2026-05-07", time: "1:00 PM", duration: 90, category: "Netflix Workshop", capacity: 25, externalEntityCap: 5, restrictedToEntity: "", status: "Active" },
      { id: "S002", title: "Feedback Fundamentals", description: "Learn core principles of giving and receiving constructive feedback in a collaborative setting.", date: "2026-05-07", time: "4:00 PM", duration: 90, category: "Netflix Workshop", capacity: 25, externalEntityCap: 5, restrictedToEntity: "", status: "Active" },
      { id: "S003", title: "Feedback Fundamentals", description: "Learn core principles of giving and receiving constructive feedback in a collaborative setting.", date: "2026-05-07", time: "7:00 PM", duration: 90, category: "Netflix Workshop", capacity: 25, externalEntityCap: 5, restrictedToEntity: "", status: "Active" },
      { id: "S004", title: "Feedback in Practice — Small Group", description: "Hands-on practice session with live feedback exercises and coaching in a small group format.", date: "2026-05-14", time: "9:00 AM", duration: 90, category: "Netflix Workshop", capacity: 20, externalEntityCap: 5, restrictedToEntity: "", status: "Active" },
      { id: "S005", title: "Feedback in Practice — Small Group", description: "Hands-on practice session with live feedback exercises and coaching in a small group format.", date: "2026-05-14", time: "12:00 PM", duration: 90, category: "Netflix Workshop", capacity: 20, externalEntityCap: 5, restrictedToEntity: "", status: "Active" },
      { id: "S006", title: "Feedback in Practice — Small Group", description: "Hands-on practice session with live feedback exercises and coaching in a small group format.", date: "2026-05-14", time: "3:00 PM", duration: 90, category: "Netflix Workshop", capacity: 20, externalEntityCap: 5, restrictedToEntity: "", status: "Active" },
      { id: "S007", title: "Animation Studio: Feedback Foundations", description: "Tailored feedback workshop for Netflix Animation Studio teams.", date: "2026-05-21", time: "10:00 AM", duration: 90, category: "Animation Studio Workshop", capacity: 10, externalEntityCap: 0, restrictedToEntity: "Netflix Animation Studio", status: "Active" },
      { id: "S008", title: "Animation Studio: Feedback Foundations", description: "Tailored feedback workshop for Netflix Animation Studio teams.", date: "2026-05-21", time: "1:00 PM", duration: 90, category: "Animation Studio Workshop", capacity: 10, externalEntityCap: 0, restrictedToEntity: "Netflix Animation Studio", status: "Active" },
      { id: "S009", title: "Eyeline: Feedback Foundations", description: "Tailored feedback workshop for Eyeline teams.", date: "2026-05-28", time: "10:00 AM", duration: 90, category: "Eyeline Workshop", capacity: 10, externalEntityCap: 0, restrictedToEntity: "Eyeline", status: "Active" },
      { id: "S010", title: "Eyeline: Feedback Foundations", description: "Tailored feedback workshop for Eyeline teams.", date: "2026-05-28", time: "1:00 PM", duration: 90, category: "Eyeline Workshop", capacity: 10, externalEntityCap: 0, restrictedToEntity: "Eyeline", status: "Active" },
      { id: "S011", title: "Advanced Feedback: Difficult Conversations", description: "Navigate challenging feedback scenarios with confidence. Covers upward feedback, cross-functional dynamics, and high-stakes situations.", date: "2026-06-04", time: "1:00 PM", duration: 90, category: "Netflix Workshop", capacity: 25, externalEntityCap: 5, restrictedToEntity: "", status: "Active" },
      { id: "S012", title: "Advanced Feedback: Difficult Conversations", description: "Navigate challenging feedback scenarios with confidence. Covers upward feedback, cross-functional dynamics, and high-stakes situations.", date: "2026-06-04", time: "4:00 PM", duration: 90, category: "Netflix Workshop", capacity: 25, externalEntityCap: 5, restrictedToEntity: "", status: "Active" },
      { id: "S013", title: "Advanced Feedback: Difficult Conversations", description: "Navigate challenging feedback scenarios with confidence. Covers upward feedback, cross-functional dynamics, and high-stakes situations.", date: "2026-06-04", time: "7:00 PM", duration: 90, category: "Netflix Workshop", capacity: 25, externalEntityCap: 5, restrictedToEntity: "", status: "Active" },
      { id: "S014", title: "Feedback Culture Deep Dive", description: "Explore how to embed a feedback-first culture within your team. Interactive discussion and action planning.", date: "2026-06-18", time: "9:00 AM", duration: 60, category: "Netflix Workshop", capacity: 20, externalEntityCap: 5, restrictedToEntity: "", status: "Active" },
      { id: "S015", title: "Feedback Culture Deep Dive", description: "Explore how to embed a feedback-first culture within your team. Interactive discussion and action planning.", date: "2026-06-18", time: "12:00 PM", duration: 60, category: "Netflix Workshop", capacity: 20, externalEntityCap: 5, restrictedToEntity: "", status: "Active" },
      { id: "S016", title: "Feedback Culture Deep Dive", description: "Explore how to embed a feedback-first culture within your team. Interactive discussion and action planning.", date: "2026-06-18", time: "3:00 PM", duration: 60, category: "Netflix Workshop", capacity: 20, externalEntityCap: 5, restrictedToEntity: "", status: "Active" },
      { id: "S017", title: "Animation Studio: Advanced Feedback", description: "Advanced feedback techniques tailored for Animation Studio creative teams.", date: "2026-06-25", time: "10:00 AM", duration: 90, category: "Animation Studio Workshop", capacity: 10, externalEntityCap: 0, restrictedToEntity: "Netflix Animation Studio", status: "Active" },
      { id: "S018", title: "Animation Studio: Advanced Feedback", description: "Advanced feedback techniques tailored for Animation Studio creative teams.", date: "2026-06-25", time: "1:00 PM", duration: 90, category: "Animation Studio Workshop", capacity: 10, externalEntityCap: 0, restrictedToEntity: "Netflix Animation Studio", status: "Active" },
      { id: "S019", title: "Eyeline: Advanced Feedback", description: "Advanced feedback techniques tailored for Eyeline teams.", date: "2026-07-02", time: "10:00 AM", duration: 90, category: "Eyeline Workshop", capacity: 10, externalEntityCap: 0, restrictedToEntity: "Eyeline", status: "Active" },
      { id: "S020", title: "Eyeline: Advanced Feedback", description: "Advanced feedback techniques tailored for Eyeline teams.", date: "2026-07-02", time: "1:00 PM", duration: 90, category: "Eyeline Workshop", capacity: 10, externalEntityCap: 0, restrictedToEntity: "Eyeline", status: "Active" }
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

  const message = status === "Confirmed"
    ? `You're confirmed for "${session.title}" on ${session.date} at ${session.time} PT.`
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

  // Promote from waitlist if confirmed spot freed
  if (wasConfirmed) {
    const waitlisted = data.registrations
      .filter(r => r.sessionId === reg.sessionId && r.status === "Waitlisted")
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    if (waitlisted.length > 0) {
      const idx = data.registrations.findIndex(r => r.id === waitlisted[0].id);
      if (idx !== -1) data.registrations[idx].status = "Confirmed";
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
  const session = { id: "S" + generateId(), ...req.body, status: "Active" };
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
  const headers = ["Registration ID", "Session", "Date", "Time", "Name", "Email", "Entity", "Manager", "Status", "Registered At"];
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

// --- Fallback to index.html ---
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ============================================================
app.listen(PORT, () => {
  console.log(`\n🎯 Feedback Workshop Portal running at http://localhost:${PORT}\n`);
});
