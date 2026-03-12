// src/App.jsx
//
// This is the Student Picker app, fully connected to Firebase.
//
// WHAT CHANGED FROM THE CLAUDE VERSION:
//   - window.storage calls → Firestore reads and writes
//   - Added a login screen (Google sign-in via Firebase Auth)
//   - All data is now namespaced under the signed-in teacher's userId,
//     so each teacher's classes are completely private and separate
//   - The four storage helper functions at the top now call Firestore
//     instead of window.storage
//
// WHAT STAYED THE SAME:
//   - All app logic (picking, no-repeat, confetti, round tracking)
//   - All UI components (Sidebar, Confetti, roster, history)
//   - The data structure for classes and students

import { useState, useEffect, useRef } from "react";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { db, auth, provider } from "./firebase";

// ── Firestore helpers ────────────────────────────────────────────────────────
//
// Each helper takes a userId so data is always scoped to the signed-in teacher.
// The Firestore path is: users/{userId}/classes/{classId}
//
// Every class document stores:
//   { name, students: [], called: [], selected: null }

// Fetch all classes for this teacher as an array of objects
const loadClasses = async (userId) => {
  try {
    const snapshot = await getDocs(
      collection(db, "users", userId, "classes")
    );
    // snapshot.docs is an array of Firestore document snapshots.
    // doc.id is the classId; doc.data() is the stored object.
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("loadClasses failed", e);
    return [];
  }
};

// Write (or overwrite) one class document
const saveClass = async (userId, classId, data) => {
  try {
    await setDoc(doc(db, "users", userId, "classes", classId), data);
  } catch (e) {
    console.error("saveClass failed", e);
  }
};

// Delete one class document
const removeClassDoc = async (userId, classId) => {
  try {
    await deleteDoc(doc(db, "users", userId, "classes", classId));
  } catch (e) {
    console.error("removeClassDoc failed", e);
  }
};

// ── Confetti component ───────────────────────────────────────────────────────
// Unchanged from the original — purely visual, no storage involved.

const Confetti = ({ active }) => {
  const pieces = Array.from({ length: 18 }, (_, i) => i);
  const colors = ["#f59e0b", "#10b981", "#3b82f6", "#f43f5e", "#a78bfa", "#fb923c"];
  if (!active) return null;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 10 }}>
      {pieces.map((i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${Math.random() * 100}%`,
          top: "-10px",
          width: "8px", height: "8px",
          borderRadius: i % 3 === 0 ? "50%" : "2px",
          background: colors[i % colors.length],
          animation: `fall ${0.8 + Math.random() * 0.8}s ease-in ${Math.random() * 0.4}s forwards`,
          transform: `rotate(${Math.random() * 360}deg)`,
        }} />
      ))}
    </div>
  );
};

// ── Login screen ─────────────────────────────────────────────────────────────
// Shown when no user is signed in. Clicking the button triggers Google sign-in.
// Firebase handles the OAuth popup and returns the authenticated user.

const LoginScreen = ({ onLogin }) => (
  <div style={{ minHeight: "100vh", background: "#0e0e11", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, fontFamily: "'Syne', sans-serif" }}>
    <div style={{ fontSize: "0.7rem", letterSpacing: "0.25em", color: "#f59e0b", textTransform: "uppercase" }}>Class Tool</div>
    <h1 style={{ fontSize: "clamp(1.8rem, 5vw, 2.8rem)", fontWeight: 800, color: "#f3f4f6", letterSpacing: "-0.02em" }}>Student Picker</h1>
    <p style={{ color: "#6b7280", fontSize: "0.9rem", textAlign: "center", maxWidth: 320 }}>
      Sign in with your Google account to access your class rosters.
    </p>
    <button
      onClick={onLogin}
      style={{ background: "#f59e0b", color: "#0e0e11", border: "none", borderRadius: 6, fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "0.95rem", letterSpacing: "0.06em", textTransform: "uppercase", padding: "14px 32px", cursor: "pointer" }}
    >
      Sign in with Google
    </button>
  </div>
);

// ── Sidebar ──────────────────────────────────────────────────────────────────
// Unchanged from the original, except it now also shows a sign-out button.

function Sidebar({ classes, activeId, onSelect, onAdd, onDelete, onSignOut, userEmail }) {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const submit = () => {
    const name = newName.trim();
    if (!name) return;
    onAdd(name);
    setNewName("");
    setAdding(false);
  };

  return (
    <div style={{ width: 190, flexShrink: 0, display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ fontSize: "0.6rem", letterSpacing: "0.22em", color: "#6b7280", textTransform: "uppercase", marginBottom: 8, paddingLeft: 4 }}>
        Classes
      </div>

      {classes.map((c) => (
        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={() => onSelect(c.id)}
            style={{
              flex: 1, textAlign: "left",
              background: activeId === c.id ? "#f59e0b" : "#16161c",
              color: activeId === c.id ? "#0e0e11" : "#9ca3af",
              border: activeId === c.id ? "none" : "1px solid #27272f",
              borderRadius: 6, padding: "9px 12px",
              fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.82rem",
              cursor: "pointer", transition: "all 0.15s",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
          >
            {c.name}
          </button>
          {classes.length > 1 && (
            <button
              onClick={() => onDelete(c.id)}
              title="Delete class"
              style={{ background: "none", border: "none", color: "#374151", cursor: "pointer", fontSize: "1rem", padding: "4px 6px", borderRadius: 4, transition: "color 0.12s" }}
              onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
              onMouseLeave={e => e.currentTarget.style.color = "#374151"}
            >×</button>
          )}
        </div>
      ))}

      {adding ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") setAdding(false); }}
            placeholder="Class name..."
            style={{ background: "#0e0e11", border: "1px solid #f59e0b", borderRadius: 5, color: "#f3f4f6", fontFamily: "'DM Mono', monospace", fontSize: "0.8rem", padding: "7px 10px", outline: "none", width: "100%" }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={submit} style={{ flex: 1, background: "#f59e0b", color: "#0e0e11", border: "none", borderRadius: 5, fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "0.75rem", padding: "7px", cursor: "pointer" }}>Add</button>
            <button onClick={() => setAdding(false)} style={{ flex: 1, background: "transparent", color: "#6b7280", border: "1px solid #374151", borderRadius: 5, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.75rem", padding: "7px", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{ background: "transparent", border: "1px dashed #374151", borderRadius: 6, color: "#6b7280", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.78rem", padding: "9px 12px", cursor: "pointer", transition: "color 0.15s, border-color 0.15s", marginTop: 4, textAlign: "left" }}
          onMouseEnter={e => { e.currentTarget.style.color = "#d1d5db"; e.currentTarget.style.borderColor = "#6b7280"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#6b7280"; e.currentTarget.style.borderColor = "#374151"; }}
        >
          + New Class
        </button>
      )}

      {/* Sign-out section — new addition for Firebase auth */}
      <div style={{ marginTop: "auto", paddingTop: 20, borderTop: "1px solid #1f2937" }}>
        <div style={{ fontSize: "0.65rem", color: "#4b5563", fontFamily: "'DM Mono', monospace", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {userEmail}
        </div>
        <button
          onClick={onSignOut}
          style={{ background: "transparent", border: "1px solid #374151", borderRadius: 5, color: "#6b7280", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.72rem", padding: "7px 12px", cursor: "pointer", width: "100%", transition: "color 0.15s, border-color 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.color = "#d1d5db"; e.currentTarget.style.borderColor = "#6b7280"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#6b7280"; e.currentTarget.style.borderColor = "#374151"; }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  // user → the signed-in Firebase user object, or null if not signed in.
  // Firebase's onAuthStateChanged listener keeps this in sync automatically.
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true); // prevents flash of login screen on reload

  const [classes, setClasses] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [classData, setClassData] = useState({});
  const [input, setInput] = useState("");
  const [animating, setAnimating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef(null);

  // Listen for auth state changes (sign-in, sign-out, page reload).
  // This runs once on mount. Firebase automatically restores the session
  // if the user was previously signed in, so the login screen won't flash.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return unsubscribe; // clean up the listener when the component unmounts
  }, []);

  // Once we have a signed-in user, load their classes from Firestore.
  // This replaces the window.storage loadClasses() call from the original.
  useEffect(() => {
    if (!user) return;
    setLoaded(false);

    loadClasses(user.uid).then(async (cls) => {
      if (!cls.length) {
        // First time this teacher has used the app — create a default class
        const id = `c${Date.now()}`;
        const defaultClass = { id, name: "Period 1", students: [], called: [], selected: null };
        cls = [defaultClass];
        await saveClass(user.uid, id, defaultClass);
      }

      // Build the classData map: { [classId]: { name, students, called, selected } }
      const dataMap = {};
      cls.forEach((c) => { dataMap[c.id] = c; });

      setClasses(cls.map((c) => ({ id: c.id, name: c.name })));
      setClassData(dataMap);
      setActiveId(cls[0].id);
      setLoaded(true);
    });
  }, [user]);

  // Whenever classData changes, persist every class to Firestore.
  // This mirrors the original auto-save useEffect, just targeting Firestore.
  useEffect(() => {
    if (!loaded || !user) return;
    Object.entries(classData).forEach(([id, data]) => {
      saveClass(user.uid, id, data);
    });
  }, [classData, loaded, user]);

  // ── Auth actions ───────────────────────────────────────────────────────────

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged above will fire and update the user state automatically
    } catch (e) {
      console.error("Sign-in failed", e);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    // Reset all local state so a different teacher can sign in cleanly
    setClasses([]);
    setClassData({});
    setActiveId(null);
    setLoaded(false);
  };

  // ── Class actions (same logic as original, now passing user.uid) ───────────

  const active = classData[activeId] || { students: [], called: [], selected: null };
  const { students, called, selected } = active;
  const remaining = students.filter((s) => !called.includes(s));
  const progress = students.length ? (called.length / students.length) * 100 : 0;

  const updateActive = (patch) =>
    setClassData((prev) => ({ ...prev, [activeId]: { ...prev[activeId], ...patch } }));

  const switchClass = (id) => { setActiveId(id); setAllDone(false); setInput(""); };

  const addClass = async (name) => {
    const id = `c${Date.now()}`;
    const newClassDoc = { id, name, students: [], called: [], selected: null };
    const newClasses = [...classes, { id, name }];
    setClasses(newClasses);
    setClassData((prev) => ({ ...prev, [id]: newClassDoc }));
    await saveClass(user.uid, id, newClassDoc);
    setActiveId(id);
    setAllDone(false);
  };

  const deleteClassById = async (id) => {
    const newClasses = classes.filter((c) => c.id !== id);
    setClasses(newClasses);
    setClassData((prev) => { const next = { ...prev }; delete next[id]; return next; });
    await removeClassDoc(user.uid, id);
    if (activeId === id) setActiveId(newClasses[0]?.id || null);
  };

  const addStudent = () => {
    const names = input.split(/[\n,]+/).map((n) => n.trim()).filter(Boolean);
    if (!names.length) return;
    updateActive({ students: [...students, ...names.filter((n) => !students.includes(n))] });
    setInput("");
    inputRef.current?.focus();
  };

  const removeStudent = (name) => {
    updateActive({
      students: students.filter((s) => s !== name),
      called: called.filter((s) => s !== name),
      selected: selected === name ? null : selected,
    });
  };

  const pickStudent = () => {
    if (!remaining.length) return;
    setAnimating(true);
    setAllDone(false);
    let count = 0;
    const total = 12;
    const interval = setInterval(() => {
      const rand = remaining[Math.floor(Math.random() * remaining.length)];
      updateActive({ selected: rand });
      count++;
      if (count >= total) {
        clearInterval(interval);
        const finalPick = remaining[Math.floor(Math.random() * remaining.length)];
        setClassData((prev) => {
          const cur = prev[activeId];
          const nextCalled = cur.called.includes(finalPick) ? cur.called : [...cur.called, finalPick];
          if (nextCalled.length === cur.students.length) setAllDone(true);
          return { ...prev, [activeId]: { ...cur, selected: finalPick, called: nextCalled } };
        });
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 1800);
        setAnimating(false);
      }
    }, 60 + count * 8);
  };

  const resetRound = () => { updateActive({ called: [], selected: null }); setAllDone(false); };

  // ── Render ─────────────────────────────────────────────────────────────────

  // While Firebase checks for an existing session, show nothing (avoids flicker)
  if (authLoading) return null;

  // Not signed in → show login screen
  if (!user) return <LoginScreen onLogin={handleLogin} />;

  // Signed in but classes not yet loaded → simple loading state
  if (!loaded) return (
    <div style={{ minHeight: "100vh", background: "#0e0e11", display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563", fontFamily: "'DM Mono', monospace", fontSize: "0.85rem" }}>
      Loading your classes...
    </div>
  );

  const activeClass = classes.find((c) => c.id === activeId);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0e0e11; min-height: 100vh; }
        @keyframes fall { to { transform: translateY(420px) rotate(720deg); opacity: 0; } }
        @keyframes pop { 0% { transform: scale(0.7); opacity: 0; } 60% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes shimmer { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .pick-btn { background: #f59e0b; color: #0e0e11; border: none; font-family: 'Syne', sans-serif; font-weight: 800; font-size: 1rem; letter-spacing: 0.08em; text-transform: uppercase; padding: 14px 32px; border-radius: 6px; cursor: pointer; transition: background 0.15s, transform 0.1s; }
        .pick-btn:hover:not(:disabled) { background: #fbbf24; transform: translateY(-1px); }
        .pick-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .reset-btn { background: transparent; color: #6b7280; border: 1px solid #374151; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 0.78rem; letter-spacing: 0.06em; text-transform: uppercase; padding: 7px 14px; border-radius: 5px; cursor: pointer; transition: color 0.15s, border-color 0.15s; }
        .reset-btn:hover { color: #d1d5db; border-color: #6b7280; }
        .student-chip { display: flex; align-items: center; gap: 8px; padding: 6px 10px 6px 12px; border-radius: 5px; font-family: 'DM Mono', monospace; font-size: 0.8rem; }
        .chip-called { background: #1a2e1a; color: #6ee7b7; }
        .chip-pending { background: #1c1c22; color: #9ca3af; }
        .chip-remove { background: none; border: none; color: #4b5563; cursor: pointer; font-size: 1rem; line-height: 1; padding: 0 2px; transition: color 0.12s; }
        .chip-remove:hover { color: #f87171; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #374151; border-radius: 99px; }
      `}</style>

      <div style={{ fontFamily: "'Syne', sans-serif", minHeight: "100vh", background: "#0e0e11", color: "#f3f4f6", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 16px 80px" }}>

        <div style={{ marginBottom: 36, textAlign: "center" }}>
          <div style={{ fontSize: "0.7rem", letterSpacing: "0.25em", color: "#f59e0b", textTransform: "uppercase", marginBottom: 8 }}>Class Tool</div>
          <h1 style={{ fontSize: "clamp(1.8rem, 5vw, 2.8rem)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 }}>Student Picker</h1>
        </div>

        <div style={{ width: "100%", maxWidth: 920, display: "flex", gap: 24, alignItems: "start" }}>

          <Sidebar
            classes={classes}
            activeId={activeId}
            onSelect={switchClass}
            onAdd={addClass}
            onDelete={deleteClassById}
            onSignOut={handleSignOut}
            userEmail={user.email}
          />

          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "start" }}>

            {/* Left col */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: "#16161c", border: "1px solid #27272f", borderRadius: 10, padding: 18 }}>
                <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "#6b7280", textTransform: "uppercase", marginBottom: 10 }}>
                  Add to {activeClass?.name}
                </div>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addStudent(); } }}
                  placeholder={"One name per line,\nor comma separated"}
                  style={{ width: "100%", background: "#0e0e11", border: "1px solid #27272f", borderRadius: 6, color: "#f3f4f6", fontFamily: "'DM Mono', monospace", fontSize: "0.82rem", padding: "10px 12px", resize: "none", height: 88, outline: "none", lineHeight: 1.6 }}
                />
                <button className="pick-btn" onClick={addStudent} style={{ marginTop: 10, width: "100%", fontSize: "0.82rem", padding: "9px" }}>
                  + Add
                </button>
              </div>

              <div style={{ background: "#16161c", border: "1px solid #27272f", borderRadius: 10, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "#6b7280", textTransform: "uppercase" }}>
                    Roster ({students.length})
                  </div>
                  {called.length > 0 && <button className="reset-btn" onClick={resetRound}>Reset Round</button>}
                </div>

                {students.length === 0 && (
                  <div style={{ color: "#4b5563", fontSize: "0.78rem", fontFamily: "'DM Mono', monospace", textAlign: "center", padding: "18px 0" }}>No students yet</div>
                )}

                {students.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.67rem", color: "#6b7280", marginBottom: 5 }}>
                      <span>{called.length} called</span><span>{remaining.length} remaining</span>
                    </div>
                    <div style={{ height: 4, background: "#1f2937", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${progress}%`, background: "#f59e0b", borderRadius: 99, transition: "width 0.4s ease" }} />
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 220, overflowY: "auto" }}>
                  {students.map(s => (
                    <div key={s} className={`student-chip ${called.includes(s) ? "chip-called" : "chip-pending"}`}>
                      {called.includes(s) && <span style={{ fontSize: "0.65rem" }}>✓</span>}
                      <span style={{ flex: 1 }}>{s}</span>
                      <button className="chip-remove" onClick={() => removeStudent(s)}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right col */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: "#16161c", border: "1px solid #27272f", borderRadius: 10, padding: 22, display: "flex", flexDirection: "column", alignItems: "center", gap: 20, position: "relative", overflow: "hidden", minHeight: 290 }}>
                <Confetti active={showConfetti} />
                <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "#6b7280", textTransform: "uppercase", alignSelf: "flex-start" }}>Selected</div>

                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
                  {allDone ? (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "2rem" }}>🎉</div>
                      <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#6ee7b7", marginTop: 8 }}>Everyone's been called!</div>
                      <div style={{ fontSize: "0.7rem", color: "#6b7280", marginTop: 4 }}>Reset the round to go again</div>
                    </div>
                  ) : selected ? (
                    <div key={selected + String(animating)} style={{
                      fontFamily: "'Syne', sans-serif", fontWeight: 800,
                      fontSize: "clamp(1.3rem, 3vw, 2rem)",
                      color: animating ? "#6b7280" : "#f59e0b",
                      textAlign: "center",
                      animation: animating ? "shimmer 0.12s linear infinite" : "pop 0.3s ease forwards",
                      lineHeight: 1.2, padding: "0 8px", wordBreak: "break-word",
                    }}>
                      {selected}
                    </div>
                  ) : (
                    <div style={{ color: "#374151", fontFamily: "'DM Mono', monospace", fontSize: "0.8rem", textAlign: "center" }}>
                      {students.length === 0 ? "Add students to begin" : "Press Pick to start"}
                    </div>
                  )}
                </div>

                <button
                  className="pick-btn"
                  onClick={pickStudent}
                  disabled={animating || remaining.length === 0}
                  style={{ width: "100%", fontSize: "0.92rem" }}
                >
                  {animating ? "Picking..." : "Pick Student"}
                </button>
              </div>

              {called.length > 0 && (
                <div style={{ background: "#16161c", border: "1px solid #27272f", borderRadius: 10, padding: 18 }}>
                  <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "#6b7280", textTransform: "uppercase", marginBottom: 10 }}>Called This Round</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 180, overflowY: "auto" }}>
                    {[...called].reverse().map((s, i) => (
                      <div key={s} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0", borderBottom: "1px solid #1f2937" }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", color: "#4b5563", width: 18, textAlign: "right" }}>{called.length - i}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.78rem", color: i === 0 ? "#f59e0b" : "#9ca3af" }}>{s}</span>
                        {i === 0 && <span style={{ fontSize: "0.58rem", color: "#f59e0b" }}>latest</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}