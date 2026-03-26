// src/App.jsx
//
// Student Picker — HHS palette, distinct modern identity.
// This file is annotated with explanations of React concepts and syntax
// to help you understand what each section is doing and why.

// ── IMPORTS ───────────────────────────────────────────────────────────────────
//
// React's core hooks are imported by name from the "react" package.
// Hooks are special functions that let your component "remember" things
// (useState), run side effects (useEffect), and reference DOM elements (useRef).
//
//   useState   → stores a value that, when changed, causes the UI to re-render
//   useEffect  → runs code in response to something changing (like a user signing in)
//   useRef     → holds a reference to a DOM element (we use it to re-focus the input)
import { useState, useEffect, useRef } from "react";

// Firestore is Firebase's database. These are the specific functions we need:
//   collection → points to a group of documents (like a folder)
//   doc        → points to a single document (like a file)
//   getDocs    → reads all documents in a collection
//   setDoc     → writes (or overwrites) a single document
//   deleteDoc  → deletes a single document
import {
  collection, doc, getDocs, setDoc, deleteDoc,
} from "firebase/firestore";

// Firebase Authentication functions:
//   signInWithPopup    → opens a Google sign-in popup
//   signOut            → signs the current user out
//   onAuthStateChanged → listens for sign-in/sign-out events (fires automatically)
import {
  signInWithPopup, signOut, onAuthStateChanged,
} from "firebase/auth";

// Our own firebase.js file exports the initialized Firebase instances.
// By importing them here, we can use them throughout this file.
import { db, auth, provider } from "./firebase";


// ── COLOR PALETTE ─────────────────────────────────────────────────────────────
//
// Instead of scattering hex codes throughout the file, we define them once
// in a plain JavaScript object. This makes it easy to update the theme in
// one place. We reference colors as C.teal, C.amber, etc.
const C = {
  teal:      "#1a3a4a",  // HHS dark teal — sidebar, headings
  tealMid:   "#2c5f74",  // lighter teal for hover states
  tealLight: "#e8f2f8",  // very light teal for subtle backgrounds
  amber:     "#f0a500",  // HHS amber — buttons, active pick highlight
  amberHov:  "#d4920a",  // slightly darker amber for button hover
  bg:        "#eef4f8",  // soft blue-grey page background
  white:     "#ffffff",
  border:    "#dce8f0",  // light border color for cards
  text:      "#1e2d3a",  // main body text
  muted:     "#6c8a99",  // secondary/placeholder text
  calledBg:  "#d4f0e4",  // green tint for students already called
  calledTxt: "#0d5c38",  // dark green text for called students
  pendingBg: "#f4f8fb",  // very light blue for pending students
};


// ── FIRESTORE HELPER FUNCTIONS ────────────────────────────────────────────────
//
// These are plain async JavaScript functions (not React components).
// They handle all communication with the Firebase database.
// Each one is declared with "const name = async () => {}" syntax,
// which is an arrow function. The "async" keyword means it can use
// "await" to pause and wait for database operations to complete.

// loadClasses: fetches all classes belonging to a specific user.
// The "userId" parameter comes from Firebase Auth (auth.currentUser.uid).
// Firestore path: users/{userId}/classes  (reads the whole collection)
const loadClasses = async (userId) => {
  try {
    // getDocs fetches every document in the "classes" sub-collection.
    // The result is a "snapshot" — a frozen copy of the data at that moment.
    const snapshot = await getDocs(collection(db, "users", userId, "classes"));

    // snapshot.docs is an array of document snapshots.
    // We use .map() to transform each snapshot into a plain JS object:
    //   d.id       → the document's ID (e.g. "c1234567890")
    //   ...d.data() → spreads all the stored fields (name, students, called, etc.)
    // The "..." spread operator copies all properties from one object into another.
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    // If anything goes wrong, log the error and return an empty array
    // so the app doesn't crash — it just shows no classes.
    console.error("loadClasses failed", e);
    return [];
  }
};

// saveClass: writes (or completely overwrites) one class document.
// Called every time classData changes in the app, keeping Firestore in sync.
// Firestore path: users/{userId}/classes/{classId}
const saveClass = async (userId, classId, data) => {
  try {
    // setDoc writes the entire "data" object to the specified document path.
    // If the document doesn't exist yet, setDoc creates it.
    await setDoc(doc(db, "users", userId, "classes", classId), data);
  } catch (e) {
    console.error("saveClass failed", e);
  }
};

// removeClassDoc: permanently deletes one class document from Firestore.
const removeClassDoc = async (userId, classId) => {
  try {
    await deleteDoc(doc(db, "users", userId, "classes", classId));
  } catch (e) {
    console.error("removeClassDoc failed", e);
  }
};


// ── CONFETTI COMPONENT ────────────────────────────────────────────────────────
//
// A React component is a function that returns JSX (the HTML-like syntax).
// This component receives one "prop" (property): { active }.
// Props are how a parent component passes data down to a child component.
//
// Arrow function component syntax:
//   const MyComponent = ({ propName }) => ( ... JSX ... );
//
// When active is false, we return null — React renders nothing for null.
// When active is true, we render 20 animated colored squares/circles.
const Confetti = ({ active }) => {
  // Array.from creates an array of 20 items; we only need the index (i).
  const pieces = Array.from({ length: 20 }, (_, i) => i);
  const colors = [C.amber, C.teal, C.tealMid, "#20c997", "#fd7e14", "#6f42c1"];

  // Early return — if not active, render nothing at all.
  if (!active) return null;

  return (
    // This outer div covers the entire parent card (position: absolute, inset: 0).
    // pointerEvents: "none" means clicks pass through it — it's purely decorative.
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 10 }}>
      {/*
        .map() iterates over the pieces array and returns a JSX element for each one.
        Each element needs a unique "key" prop — React uses this to track elements
        efficiently when the list updates. Here we use the index (i) as the key.
        Math.random() gives each piece a random position, size, color, and spin.
      */}
      {pieces.map((i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${Math.random() * 100}%`,   // random horizontal position
          top: "-10px",                        // starts just above the visible area
          width: i % 4 === 0 ? "10px" : "7px",   // every 4th piece is slightly bigger
          height: i % 4 === 0 ? "10px" : "7px",
          borderRadius: i % 3 === 0 ? "50%" : "2px", // circles vs rounded squares
          background: colors[i % colors.length],      // cycle through colors
          // CSS animation: uses the @keyframes "fall" defined in the <style> block
          animation: `fall ${0.8 + Math.random() * 0.9}s ease-in ${Math.random() * 0.5}s forwards`,
          transform: `rotate(${Math.random() * 360}deg)`,
        }} />
      ))}
    </div>
  );
};


// ── LOGIN SCREEN COMPONENT ────────────────────────────────────────────────────
//
// This is a "presentational" component — it only handles display and user input,
// with no state of its own. It receives one prop: onLogin (a function).
// When the button is clicked, it calls that function, which is defined in App().
//
// Notice the parentheses () instead of curly braces {} after the arrow =>
// This is a shorthand: () => ( JSX ) implicitly returns the JSX,
// whereas () => { } requires an explicit "return" statement inside.
const LoginScreen = ({ onLogin }) => (
  <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Lato', sans-serif" }}>
    {/* Centered login card */}
    <div style={{ background: C.white, borderRadius: 16, boxShadow: "0 4px 24px rgba(26,58,74,0.12)", padding: "48px 40px", textAlign: "center", maxWidth: 380, width: "100%" }}>
      {/* Icon badge */}
      <div style={{ width: 56, height: 56, background: C.teal, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", margin: "0 auto 20px" }}>🎵</div>
      <div style={{ fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, marginBottom: 8 }}>HHS Music</div>
      <h1 style={{ fontSize: "1.9rem", fontWeight: 900, color: C.teal, margin: "0 0 12px", letterSpacing: "-0.02em" }}>Student Picker</h1>
      <p style={{ color: C.muted, fontSize: "0.92rem", lineHeight: 1.6, margin: "0 0 28px" }}>
        Sign in with your school Google account to access your class rosters.
      </p>
      {/*
        onClick={onLogin} attaches the onLogin function as the click handler.
        onMouseEnter / onMouseLeave directly update the element's style for hover effects.
        e.currentTarget refers to the button element that received the event.
      */}
      <button
        onClick={onLogin}
        style={{ background: C.amber, color: C.teal, border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.95rem", padding: "13px 28px", cursor: "pointer", fontFamily: "'Lato', sans-serif", width: "100%", transition: "background 0.15s" }}
        onMouseEnter={e => e.currentTarget.style.background = C.amberHov}
        onMouseLeave={e => e.currentTarget.style.background = C.amber}
      >
        Sign in with Google
      </button>
    </div>
  </div>
);


// ── SIDEBAR COMPONENT ─────────────────────────────────────────────────────────
//
// This component uses the "function" keyword instead of an arrow function —
// both work identically in React. The difference is stylistic preference.
//
// It receives several props from the parent App() component:
//   classes    → array of {id, name} objects to display
//   activeId   → the id of the currently selected class
//   onSelect   → function to call when a class is clicked
//   onAdd      → function to call when a new class is submitted
//   onDelete   → function to call when a class's × button is clicked
//   onSignOut  → function to call when Sign Out is clicked
//   userEmail  → the signed-in teacher's email address (for display)
function Sidebar({ classes, activeId, onSelect, onAdd, onDelete, onSignOut, userEmail }) {

  // Local state — only used inside this component.
  // newName: tracks what the user is typing in the "new class" input.
  // adding: a boolean that toggles whether the input form is visible.
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  // submit: called when the teacher presses Enter or clicks "Add" to create a class.
  // .trim() removes leading/trailing whitespace from the input value.
  const submit = () => {
    const name = newName.trim();
    if (!name) return;          // do nothing if the input is empty
    onAdd(name);                // call the parent's addClass function
    setNewName("");             // clear the input
    setAdding(false);           // hide the input form
  };

  return (
    <div style={{
      width: 210, flexShrink: 0,        // fixed width, won't shrink in flex layout
      background: C.teal, borderRadius: 12,
      padding: "20px 14px",
      display: "flex", flexDirection: "column", gap: 4,
      boxShadow: "0 2px 12px rgba(26,58,74,0.15)",
    }}>
      {/* App name / branding at the top of the sidebar */}
      <div style={{ paddingBottom: 16, marginBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: 4 }}>HHS Music</div>
        <div style={{ fontSize: "1.1rem", fontWeight: 900, color: C.white, letterSpacing: "-0.01em" }}>Student Picker</div>
      </div>

      {/* "CLASSES" label */}
      <div style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 4, paddingLeft: 2 }}>
        Classes
      </div>

      {/*
        Render one row for each class.
        classes.map() iterates the array and returns JSX for each item.
        "key={c.id}" is required — React needs a unique key to track list items.
        The ternary operator (condition ? valueIfTrue : valueIfFalse)
        switches the button style when it's the active class.
      */}
      {classes.map((c) => (
        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <button
            onClick={() => onSelect(c.id)}
            style={{
              flex: 1, textAlign: "left",
              // Ternary: amber background if active, transparent if not
              background: activeId === c.id ? C.amber : "transparent",
              color: activeId === c.id ? C.teal : "rgba(255,255,255,0.75)",
              border: "none",
              borderRadius: 7, padding: "9px 12px",
              fontFamily: "'Lato', sans-serif",
              fontWeight: activeId === c.id ? 700 : 400,
              fontSize: "0.88rem", cursor: "pointer", transition: "all 0.15s",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
            // Only apply the hover background if this isn't the active class
            onMouseEnter={e => { if (activeId !== c.id) e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
            onMouseLeave={e => { if (activeId !== c.id) e.currentTarget.style.background = "transparent"; }}
          >
            {c.name}
          </button>

          {/*
            Conditional rendering: only show the × delete button if there's
            more than one class. You can't delete the last remaining class.
            The && operator short-circuits: if the left side is false,
            React renders nothing; if true, it renders the right side.
          */}
          {classes.length > 1 && (
            <button
              onClick={() => onDelete(c.id)}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", fontSize: "1rem", padding: "4px 5px", borderRadius: 4, transition: "color 0.12s", lineHeight: 1 }}
              onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
              onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.25)"}
              title="Delete class"
            >×</button>
          )}
        </div>
      ))}

      {/*
        Conditional rendering with a ternary:
        If "adding" is true, show the text input + Add/Cancel buttons.
        If "adding" is false, show the "+ New Class" dashed button instead.
      */}
      {adding ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
          <input
            autoFocus  // automatically focuses this input when it appears
            value={newName}
            // onChange fires on every keystroke; we update newName state with the current value
            onChange={e => setNewName(e.target.value)}
            // onKeyDown: submit on Enter, cancel on Escape
            onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") setAdding(false); }}
            placeholder="Class name..."
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 6, color: C.white, fontFamily: "'Lato', sans-serif", fontSize: "0.85rem", padding: "8px 10px", outline: "none", width: "100%" }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={submit} style={{ flex: 1, background: C.amber, color: C.teal, border: "none", borderRadius: 6, fontWeight: 700, fontSize: "0.8rem", padding: "7px", cursor: "pointer", fontFamily: "'Lato', sans-serif" }}>Add</button>
            <button onClick={() => setAdding(false)} style={{ flex: 1, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", border: "none", borderRadius: 6, fontWeight: 400, fontSize: "0.8rem", padding: "7px", cursor: "pointer", fontFamily: "'Lato', sans-serif" }}>Cancel</button>
          </div>
        </div>
      ) : (
        // The dashed "+ New Class" button — clicking it sets adding=true, showing the form
        <button
          onClick={() => setAdding(true)}
          style={{ background: "transparent", border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 7, color: "rgba(255,255,255,0.45)", fontFamily: "'Lato', sans-serif", fontWeight: 600, fontSize: "0.82rem", padding: "8px 12px", cursor: "pointer", transition: "all 0.15s", marginTop: 4, textAlign: "left" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.amber; e.currentTarget.style.color = C.amber; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}
        >
          + New Class
        </button>
      )}

      {/* Sign out section — pinned to the bottom of the sidebar with marginTop: "auto" */}
      <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        {/* Show the signed-in teacher's email as a small label */}
        <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {userEmail}
        </div>
        <button
          onClick={onSignOut}
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: "rgba(255,255,255,0.55)", fontFamily: "'Lato', sans-serif", fontWeight: 600, fontSize: "0.78rem", padding: "7px 12px", cursor: "pointer", width: "100%", transition: "all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.13)"; e.currentTarget.style.color = C.white; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}


// ── SMALL REUSABLE COMPONENTS ─────────────────────────────────────────────────
//
// These tiny components exist to avoid repeating the same JSX + styles
// in multiple places. This is one of React's core strengths — you define
// a piece of UI once and reuse it anywhere.

// Card: a white rounded panel with a soft shadow.
// "children" is a special React prop that means "whatever is nested inside this component".
// "style = {}" sets a default value so the prop is optional.
// The spread "...style" merges any extra styles passed in with the base styles.
const Card = ({ children, style = {} }) => (
  <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: "0 1px 6px rgba(26,58,74,0.06)", padding: "18px 18px", ...style }}>
    {children}
  </div>
);

// Label: a small uppercase section heading used inside cards.
const Label = ({ children }) => (
  <div style={{ fontSize: "0.62rem", letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, fontWeight: 700, marginBottom: 10 }}>
    {children}
  </div>
);


// ── MAIN APP COMPONENT ────────────────────────────────────────────────────────
//
// This is the root component of the application. It holds all the shared state
// and defines all the core logic functions. Child components (Sidebar, Card, etc.)
// receive data and functions as props so they can display and interact with it.
//
// "export default" means this is the main export of the file — Vite's entry
// point (main.jsx) imports this and renders it into the HTML page.
export default function App() {

  // ── STATE DECLARATIONS ──────────────────────────────────────────────────────
  //
  // useState(initialValue) returns [currentValue, setterFunction].
  // When a setter is called, React re-renders the component with the new value.
  // All state is declared at the top of the component — this is a React rule
  // (hooks must always be called in the same order, never inside conditions).

  // user: the signed-in Firebase user object, or null if nobody is signed in.
  const [user, setUser] = useState(null);

  // authLoading: true while Firebase is checking for an existing session on page load.
  // Prevents a flash of the login screen when the page first loads.
  const [authLoading, setAuthLoading] = useState(true);

  // classes: array of {id, name} objects — the list shown in the sidebar.
  const [classes, setClasses] = useState([]);

  // activeId: the id string of whichever class is currently selected.
  const [activeId, setActiveId] = useState(null);

  // classData: a lookup object keyed by classId.
  // Shape: { "c1234": { id, name, students: [], called: [], selected: null }, ... }
  // Storing it this way lets us look up any class instantly by id.
  const [classData, setClassData] = useState({});

  // input: the current text in the "Add Students" textarea.
  const [input, setInput] = useState("");

  // animating: true while the slot-machine shuffle is running.
  // Used to disable the Pick button and apply the shimmer CSS class.
  const [animating, setAnimating] = useState(false);

  // showConfetti: briefly set to true after a pick to trigger the Confetti component.
  const [showConfetti, setShowConfetti] = useState(false);

  // allDone: true when every student in the class has been called this round.
  const [allDone, setAllDone] = useState(false);

  // loaded: true once the Firestore data has finished loading for the current user.
  const [loaded, setLoaded] = useState(false);

  // promptInput: the current text in the "Add Prompts" textarea.
  const [promptInput, setPromptInput] = useState("");

  // promptAnimating: true while the prompt slot-machine shuffle is running.
  const [promptAnimating, setPromptAnimating] = useState(false);

  // currentPrompt: the prompt item currently displayed (null until first spin).
  // This lives in local state (not Firestore) — prompts don't need to persist
  // between sessions, only the list of available prompts does.
  const [currentPrompt, setCurrentPrompt] = useState(null);

  // inputRef: a reference to the textarea DOM element.
  // useRef(null) starts as null; React fills it in when the element mounts.
  // We use it to call inputRef.current.focus() after adding students.
  const inputRef = useRef(null);


  // ── EFFECT: LISTEN FOR AUTH STATE CHANGES ───────────────────────────────────
  //
  // useEffect(callback, [dependencies]) runs the callback after render.
  // The empty array [] means "run this only once, when the component first mounts."
  // onAuthStateChanged sets up a persistent listener — Firebase calls our callback
  // automatically whenever the user signs in or out, including on page reload.
  // The return value (unsub) is a cleanup function React calls when the component
  // unmounts, which removes the listener to prevent memory leaks.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);              // u is the user object if signed in, null if not
      setAuthLoading(false);   // we now know the auth state — stop showing blank screen
    });
    return unsub; // cleanup: unsubscribe from the listener when the component unmounts
  }, []); // empty dependency array → runs once on mount


  // ── EFFECT: LOAD CLASSES WHEN USER SIGNS IN ──────────────────────────────────
  //
  // [user] in the dependency array means: "re-run this effect whenever 'user' changes."
  // This fires when the user first signs in (user goes from null → user object).
  // It also fires on sign-out (user goes to null), where we just bail out early.
  useEffect(() => {
    if (!user) return; // not signed in — do nothing
    setLoaded(false);  // show the loading state while we fetch

    // loadClasses returns a Promise; .then() runs when it resolves.
    loadClasses(user.uid).then(async (cls) => {

      // First-time user: no classes exist yet. Create a default "Period 1" class.
      if (!cls.length) {
        const id = `c${Date.now()}`; // Date.now() gives a unique timestamp-based id
        // prompts: the list of items the secondary randomizer draws from (e.g. years, topics)
        const def = { id, name: "Period 1", students: [], called: [], selected: null, prompts: [] };
        cls = [def];
        await saveClass(user.uid, id, def); // persist it to Firestore immediately
      }

      // Backfill prompts: [] for any class saved before this feature existed.
      // { prompts: [], ...c } means "start with prompts:[], then overwrite with c's fields"
      // so if c already has prompts, that value wins; if it doesn't, [] is used.
      cls = cls.map((c) => ({ prompts: [], ...c }));

      // Build the classData lookup map from the array.
      // forEach iterates the array; for each class c, we store it under its id key.
      const dataMap = {};
      cls.forEach((c) => { dataMap[c.id] = c; });

      // Update state with the loaded data.
      // We keep 'classes' (just id+name for the sidebar) separate from 'classData'
      // (the full data including students) to keep things organized.
      setClasses(cls.map((c) => ({ id: c.id, name: c.name })));
      setClassData(dataMap);
      setActiveId(cls[0].id); // default to the first class
      setLoaded(true);
    });
  }, [user]); // re-run whenever 'user' changes


  // ── EFFECT: AUTO-SAVE WHENEVER CLASS DATA CHANGES ───────────────────────────
  //
  // Every time classData changes (student added, pick made, round reset, etc.),
  // this effect runs and writes every class back to Firestore.
  // The guard "if (!loaded || !user) return" prevents saving during the initial
  // load phase, which would cause unnecessary writes.
  useEffect(() => {
    if (!loaded || !user) return;
    // Object.entries() converts { id: data, ... } into [[id, data], ...] pairs.
    Object.entries(classData).forEach(([id, data]) => saveClass(user.uid, id, data));
  }, [classData, loaded, user]); // re-run when any of these change


  // ── AUTH HANDLERS ────────────────────────────────────────────────────────────

  // handleLogin: triggers the Google sign-in popup.
  // Firebase handles the OAuth flow and calls our onAuthStateChanged listener
  // with the new user object when sign-in completes.
  const handleLogin = async () => {
    try { await signInWithPopup(auth, provider); }
    catch (e) { console.error("Sign-in failed", e); }
  };

  // handleSignOut: signs out and resets all local state so the app is clean
  // if a different teacher signs in on the same device.
  const handleSignOut = async () => {
    await signOut(auth);
    setClasses([]);
    setClassData({});
    setActiveId(null);
    setLoaded(false);
  };


  // ── DERIVED VALUES ────────────────────────────────────────────────────────────
  //
  // These are computed from state on every render — not stored in state themselves.
  // Keeping derived data out of state avoids the risk of it getting out of sync.

  // "active" is the full data object for the currently selected class.
  // The || fallback handles the moment before data is loaded.
  const active = classData[activeId] || { students: [], called: [], selected: null };

  // Destructure the three arrays out of the active class object.
  // This is shorthand for: const students = active.students; etc.
  const { students, called, selected } = active;

  // prompts: the list of prompt items for this class (e.g. ["2020s", "Baroque", ...])
  // We use || [] as a fallback for classes loaded before prompts were added.
  const prompts = active.prompts || [];

  // remaining: students who haven't been called yet this round.
  // .filter() returns a new array containing only items where the test returns true.
  const remaining = students.filter((s) => !called.includes(s));

  // progress: 0–100 value for the progress bar.
  // The ternary guards against dividing by zero when the roster is empty.
  const progress = students.length ? (called.length / students.length) * 100 : 0;


  // ── updateActive: HELPER TO PATCH THE ACTIVE CLASS ──────────────────────────
  //
  // Many actions (addStudent, pickStudent, resetRound) need to update the
  // active class's data. This helper merges a partial update ("patch") into
  // the existing data without overwriting the whole classData object.
  //
  // setClassData receives a function (prev => newValue) instead of a value directly.
  // This is called the "functional update" form — it guarantees we're working with
  // the most recent state, which matters when updates happen rapidly.
  //
  // The spread operator (...) copies all existing properties:
  //   { ...prev }            → copy all classes
  //   { ...prev[activeId] }  → copy all fields of the active class
  //   { ...patch }           → then overwrite with the new fields
  const updateActive = (patch) =>
    setClassData((prev) => ({ ...prev, [activeId]: { ...prev[activeId], ...patch } }));


  // ── CLASS MANAGEMENT FUNCTIONS ───────────────────────────────────────────────

  // switchClass: selects a different class from the sidebar.
  // Also resets the allDone flag, clears the text input, and clears the prompt display.
  const switchClass = (id) => { setActiveId(id); setAllDone(false); setInput(""); setCurrentPrompt(null); };

  // addClass: creates a new empty class, saves it to Firestore, and switches to it.
  const addClass = async (name) => {
    const id = `c${Date.now()}`;  // timestamp-based unique id
    const doc2 = { id, name, students: [], called: [], selected: null, prompts: [] };
    setClasses((p) => [...p, { id, name }]);    // append to sidebar list
    setClassData((p) => ({ ...p, [id]: doc2 })); // add to data map
    await saveClass(user.uid, id, doc2);          // persist to Firestore
    setActiveId(id);   // switch to the new class
    setAllDone(false);
  };

  // deleteClassById: removes a class from both local state and Firestore.
  // If the deleted class was active, automatically switches to the first remaining class.
  const deleteClassById = async (id) => {
    const next = classes.filter((c) => c.id !== id); // all classes except the deleted one
    setClasses(next);
    setClassData((p) => {
      const n = { ...p };   // copy the data map
      delete n[id];          // remove the deleted class's entry
      return n;
    });
    await removeClassDoc(user.uid, id); // delete from Firestore
    // If we just deleted the active class, switch to the first remaining one
    if (activeId === id) setActiveId(next[0]?.id || null);
    // The "?." is optional chaining — if next[0] is undefined, return undefined
    // instead of throwing an error. The "|| null" converts undefined to null.
  };


  // ── STUDENT MANAGEMENT FUNCTIONS ────────────────────────────────────────────

  // addStudent: parses the textarea input and adds new names to the active class.
  const addStudent = () => {
    // Split on newlines or commas, trim whitespace, remove empty strings.
    // /[\n,]+/ is a regular expression: match one or more newlines or commas.
    const names = input.split(/[\n,]+/).map((n) => n.trim()).filter(Boolean);
    if (!names.length) return; // nothing to add

    // Only add names that don't already exist in the roster (deduplication).
    updateActive({ students: [...students, ...names.filter((n) => !students.includes(n))] });
    setInput("");                   // clear the textarea
    inputRef.current?.focus();      // return focus to the textarea for quick re-entry
  };

  // removeStudent: removes a student from the roster, called list, and clears
  // the selected display if the removed student happened to be selected.
  const removeStudent = (name) => {
    updateActive({
      students: students.filter((s) => s !== name),
      called:   called.filter((s) => s !== name),
      // Ternary: if the removed student is currently selected, clear it; otherwise keep it
      selected: selected === name ? null : selected,
    });
  };


  // ── PICK STUDENT: THE SLOT-MACHINE ANIMATION ─────────────────────────────────
  //
  // pickStudent runs a setInterval loop that rapidly cycles through random names
  // (the "shuffle" effect), then locks in a final pick after 12 iterations.
  // The interval delay increases slightly each tick (60 + count * 8 ms) to create
  // a natural "slowing down" effect.
  const pickStudent = () => {
    if (!remaining.length) return; // nothing to pick from
    setAnimating(true);
    setAllDone(false);

    let count = 0;
    const total = 12; // number of shuffle flickers before landing on a final pick

    const interval = setInterval(() => {
      // Show a random name from the remaining pool on each tick
      updateActive({ selected: remaining[Math.floor(Math.random() * remaining.length)] });
      count++;

      if (count >= total) {
        clearInterval(interval); // stop the interval

        // Pick the actual final student
        const finalPick = remaining[Math.floor(Math.random() * remaining.length)];

        // Use the functional update form here because we're inside a closure —
        // "classData" captured at the time pickStudent was called may be stale.
        // (prev) => gives us the guaranteed latest state.
        setClassData((prev) => {
          const cur = prev[activeId];
          // Add finalPick to the called list only if they're not already in it
          const nextCalled = cur.called.includes(finalPick)
            ? cur.called
            : [...cur.called, finalPick];
          // If everyone has now been called, set the allDone flag
          if (nextCalled.length === cur.students.length) setAllDone(true);
          return { ...prev, [activeId]: { ...cur, selected: finalPick, called: nextCalled } };
        });

        // Trigger confetti for 1.8 seconds, then hide it
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 1800);
        setAnimating(false);
      }
    }, 60 + count * 8); // delay increases each tick to simulate slowing down
  };

  // resetRound: clears all call history and the selected name for the active class.
  // The roster itself is unchanged — students aren't removed, just "uncalled."
  // Also clears the current prompt so the display is fresh for the next round.
  const resetRound = () => {
    updateActive({ called: [], selected: null });
    setAllDone(false);
    setCurrentPrompt(null);
  };


  // ── PROMPT MANAGEMENT FUNCTIONS ──────────────────────────────────────────────
  //
  // Prompts are stored as a simple string array inside each class's Firestore document,
  // just like students. The same updateActive helper keeps the data in sync.

  // addPrompt: parses the prompt textarea and appends new items to the active class.
  // Uses the same split/trim/deduplicate pattern as addStudent.
  const addPrompt = () => {
    const items = promptInput.split(/[\n,]+/).map((p) => p.trim()).filter(Boolean);
    if (!items.length) return;
    const prompts = active.prompts || [];
    // Only add items that aren't already in the list
    updateActive({ prompts: [...prompts, ...items.filter((p) => !prompts.includes(p))] });
    setPromptInput("");
  };

  // removePrompt: removes a single prompt item from the active class's list.
  const removePrompt = (item) => {
    updateActive({ prompts: (active.prompts || []).filter((p) => p !== item) });
    // If the removed item is currently displayed, clear it
    if (currentPrompt === item) setCurrentPrompt(null);
  };

  // spinPrompt: runs the same slot-machine shuffle as pickStudent, but for prompts.
  // Only callable after a student has been picked (selected is not null).
  // Picks randomly from the full prompts list (prompts can repeat across students).
  const spinPrompt = () => {
    const prompts = active.prompts || [];
    if (!prompts.length || promptAnimating) return;
    setPromptAnimating(true);

    let count = 0;
    const total = 10; // slightly fewer ticks than student picker for a snappier feel

    const interval = setInterval(() => {
      // Flash a random prompt on each tick
      setCurrentPrompt(prompts[Math.floor(Math.random() * prompts.length)]);
      count++;
      if (count >= total) {
        clearInterval(interval);
        // Lock in the final randomly chosen prompt
        setCurrentPrompt(prompts[Math.floor(Math.random() * prompts.length)]);
        setPromptAnimating(false);
      }
    }, 55 + count * 9); // same slowing-down pattern as the student picker
  };


  // ── CONDITIONAL EARLY RETURNS ────────────────────────────────────────────────
  //
  // React components can return different JSX based on state.
  // These early returns act as "gates" — only the main UI renders once
  // all conditions are met (auth checked, user signed in, data loaded).

  // Still checking auth state — return nothing to avoid a UI flash
  if (authLoading) return null;

  // Not signed in — show the login screen instead of the app
  if (!user) return <LoginScreen onLogin={handleLogin} />;

  // Signed in but classes not yet loaded from Firestore — show a loading message
  if (!loaded) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontFamily: "'Lato', sans-serif" }}>
      Loading your classes...
    </div>
  );

  // Find the full class object for the active ID (used to display the class name)
  const activeClass = classes.find((c) => c.id === activeId);


  // ── MAIN RENDER ───────────────────────────────────────────────────────────────
  //
  // The return statement is the component's JSX output.
  // <> ... </> is a React Fragment — a wrapper that doesn't add a DOM element.
  // We use it here to return the <link> tags alongside the main <div>.
  return (
    <>
      {/* Load Bootstrap and Lato from CDN — injected into <head> by React */}
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&display=swap" rel="stylesheet" />

      {/*
        A <style> tag with a template literal (`...`) lets us write CSS directly
        in the component. ${C.amber} interpolates the JS variable into the CSS string.
        @keyframes define CSS animations referenced by name in inline styles.
      */}
      <style>{`
        *, body { font-family: 'Lato', sans-serif; }
        body { background: ${C.bg}; }

        /* Confetti fall animation — pieces start at top: -10px and fall 440px */
        @keyframes fall { to { transform: translateY(440px) rotate(720deg); opacity: 0; } }

        /* Pop animation — the selected name scales in from small to full size */
        @keyframes pop { 0% { transform: scale(0.72); opacity: 0; } 60% { transform: scale(1.07); } 100% { transform: scale(1); opacity: 1; } }

        /* Shimmer animation — fades in and out while the shuffle is running */
        @keyframes shimmer { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }

        /* Slide-up animation for the prompt result appearing */
        @keyframes slideUp { 0% { transform: translateY(8px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }

        /* The main Pick Student button */
        .pick-btn {
          background: ${C.amber}; color: ${C.teal}; border: none;
          border-radius: 8px; font-weight: 700; font-size: 0.95rem;
          padding: 11px 18px; cursor: pointer; font-family: 'Lato', sans-serif;
          transition: background 0.15s, transform 0.1s; width: 100%;
        }
        .pick-btn:hover:not(:disabled) { background: ${C.amberHov}; transform: translateY(-1px); }
        .pick-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Student name chips in the roster list */
        .student-chip { display: flex; align-items: center; gap: 8px; padding: 6px 10px 6px 13px; border-radius: 7px; font-size: 0.85rem; transition: opacity 0.15s; }
        .chip-called { background: ${C.calledBg}; color: ${C.calledTxt}; }   /* green when called */
        .chip-pending { background: ${C.pendingBg}; color: ${C.text}; }       /* light when pending */
        .chip-remove { background: none; border: none; color: #adb5bd; cursor: pointer; font-size: 1rem; line-height: 1; padding: 0 2px; transition: color 0.12s; }
        .chip-remove:hover { color: #dc3545; }

        /* The large name shown in the picker card — now full-width so we allow a much bigger font */
        .selected-name { font-weight: 900; text-align: center; line-height: 1.15; word-break: break-word; padding: 0 8px; font-size: clamp(2.5rem, 7vw, 5rem); }
        /* clamp(min, preferred, max) makes the font scale with viewport width */
        .selected-name.animating { color: #b0c4ce; animation: shimmer 0.11s linear infinite; }
        .selected-name.final { color: ${C.amber}; animation: pop 0.28s ease forwards; }

        /* Thin custom scrollbar for the roster and history lists */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 99px; }
      `}</style>

      {/* ── PAGE LAYOUT ───────────────────────────────────────────────────────── */}
      <div style={{ minHeight: "100vh", background: C.bg, padding: "32px 20px 80px" }}>

        {/* Centered max-width container with sidebar + main content side by side */}
        <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", gap: 22, alignItems: "start" }}>

          {/*
            The Sidebar component. We pass all the data and handler functions
            it needs as props. The Sidebar never talks to Firebase directly —
            it calls these functions, and App() handles the actual logic.
          */}
          <Sidebar
            classes={classes}
            activeId={activeId}
            onSelect={switchClass}
            onAdd={addClass}
            onDelete={deleteClassById}
            onSignOut={handleSignOut}
            userEmail={user.email}
          />

          {/* Main content area — takes up all remaining width (flex: 1) */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Page heading — shows the active class name via optional chaining (?.) */}
            <div>
              <div style={{ fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, marginBottom: 4 }}>
                HHS Music · {activeClass?.name}
                {/* activeClass?.name — if activeClass is undefined, this returns undefined
                    instead of throwing an error. React renders nothing for undefined. */}
              </div>
              <h1 style={{ fontSize: "1.7rem", fontWeight: 900, color: C.teal, margin: 0, letterSpacing: "-0.02em" }}>
                Student Picker
              </h1>
            </div>

            {/* ── PICKER CARD — full width, sits above the two-column grid ── */}
            {/*
              By pulling this Card out of the grid entirely, it stretches across
              the full width of the main content area. The font size in
              .selected-name uses clamp() so it scales up nicely with the
              extra space without overflowing on smaller screens.
            */}
            <Card style={{ position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", gap: 18, minHeight: 260 }}>
              <Confetti active={showConfetti} />

              {/* Label + Reset Round button side by side at the top of the card */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                <Label style={{ marginBottom: 0 }}>Selected Student</Label>
                {/* Only show Reset Round once someone has been called */}
                {called.length > 0 && (
                  <button
                    className="btn btn-sm"
                    onClick={resetRound}
                    style={{ border: `1px solid ${C.border}`, color: C.muted, fontSize: "0.75rem" }}
                  >
                    Reset Round
                  </button>
                )}
              </div>

              {/* Display area — vertically centered, fills remaining card height */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", minHeight: 140 }}>
                {allDone ? (
                  // State 1: every student has been called this round
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "2.8rem" }}>🎉</div>
                    <div style={{ fontWeight: 700, color: C.calledTxt, marginTop: 10, fontSize: "1.05rem" }}>Everyone's been called!</div>
                    <div style={{ color: C.muted, fontSize: "0.82rem", marginTop: 4 }}>Reset the round to go again</div>
                  </div>
                ) : selected ? (
                  // State 2: a name is selected or being shuffled through.
                  // key={selected + String(animating)} forces React to re-mount this
                  // element on each change, which restarts the CSS animation.
                  <div key={selected + String(animating)} className={`selected-name ${animating ? "animating" : "final"}`}>
                    {selected}
                  </div>
                ) : (
                  // State 3: nothing picked yet
                  <div style={{ color: C.muted, textAlign: "center", fontSize: "0.95rem" }}>
                    {students.length === 0 ? "Add students to begin" : "Press Pick to start"}
                  </div>
                )}
              </div>

              {/* Pick button — capped at 320px wide so it doesn't stretch too far */}
              <button
                className="pick-btn"
                onClick={pickStudent}
                disabled={animating || remaining.length === 0}
                style={{ maxWidth: 320 }}
              >
                {animating ? "Picking…" : "Pick Student"}
              </button>

              {/*
                PROMPT SECTION — only visible once a student has been picked AND
                the class has at least one prompt in its list.
                selected && !animating: a student is locked in (not mid-shuffle)
                prompts.length > 0: there's something to spin
              */}
              {selected && !animating && prompts.length > 0 && (
                <div style={{ width: "100%", borderTop: `1px solid ${C.border}`, paddingTop: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>

                  {/* Show the current prompt result, or a placeholder if not yet spun */}
                  <div style={{ minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {currentPrompt ? (
                      // key={currentPrompt + String(promptAnimating)} restarts the animation
                      // each time a new prompt lands, just like we do for student names.
                      <div
                        key={currentPrompt + String(promptAnimating)}
                        style={{
                          fontWeight: 700,
                          fontSize: "clamp(1rem, 2.5vw, 1.5rem)",
                          textAlign: "center",
                          color: promptAnimating ? C.muted : C.tealMid,
                          animation: promptAnimating ? "shimmer 0.11s linear infinite" : "slideUp 0.22s ease forwards",
                          padding: "6px 16px",
                          background: promptAnimating ? "transparent" : C.tealLight,
                          borderRadius: 8,
                        }}
                      >
                        {currentPrompt}
                      </div>
                    ) : (
                      <div style={{ color: C.muted, fontSize: "0.85rem" }}>Spin to assign a prompt</div>
                    )}
                  </div>

                  {/* Spin Prompt button — teal style to visually distinguish from the amber Pick button */}
                  <button
                    onClick={spinPrompt}
                    disabled={promptAnimating}
                    style={{
                      background: promptAnimating ? C.muted : C.tealMid,
                      color: C.white,
                      border: "none",
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      padding: "9px 24px",
                      cursor: promptAnimating ? "not-allowed" : "pointer",
                      fontFamily: "'Lato', sans-serif",
                      transition: "background 0.15s",
                      maxWidth: 220,
                      width: "100%",
                    }}
                    onMouseEnter={e => { if (!promptAnimating) e.currentTarget.style.background = C.teal; }}
                    onMouseLeave={e => { if (!promptAnimating) e.currentTarget.style.background = C.tealMid; }}
                  >
                    {promptAnimating ? "Spinning…" : currentPrompt ? "Spin Again" : "🎲 Spin Prompt"}
                  </button>
                </div>
              )}
            </Card>

            {/* ── TWO-COLUMN GRID: roster left, add students + history right ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>

              {/* ── LEFT COLUMN: Roster ─────────────────────────────────────── */}
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <Label style={{ marginBottom: 0 }}>Roster — {students.length} students</Label>
                </div>

                {/* Empty state */}
                {students.length === 0 && (
                  <div style={{ color: C.muted, textAlign: "center", padding: "18px 0", fontSize: "0.85rem" }}>No students yet</div>
                )}

                {/* Progress bar */}
                {students.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: C.muted, marginBottom: 5 }}>
                      <span>{called.length} called</span>
                      <span>{remaining.length} remaining</span>
                    </div>
                    <div style={{ height: 6, background: C.pendingBg, borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${progress}%`, background: C.amber, borderRadius: 99, transition: "width 0.4s ease" }} />
                    </div>
                  </div>
                )}

                {/* Student chips */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 280, overflowY: "auto" }}>
                  {students.map(s => (
                    <div key={s} className={`student-chip ${called.includes(s) ? "chip-called" : "chip-pending"}`}>
                      {called.includes(s) && <span style={{ fontSize: "0.68rem" }}>✓</span>}
                      <span style={{ flex: 1 }}>{s}</span>
                      <button className="chip-remove" onClick={() => removeStudent(s)}>×</button>
                    </div>
                  ))}
                </div>
              </Card>

              {/* ── RIGHT COLUMN: Add Students + Call History ───────────────── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Add Students card */}
                <Card>
                  <Label>Add Students to {activeClass?.name}</Label>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        addStudent();
                      }
                    }}
                    placeholder={"One name per line,\nor comma separated"}
                    className="form-control form-control-sm mb-2"
                    style={{ resize: "none", height: 92, fontFamily: "monospace", fontSize: "0.82rem", borderColor: C.border }}
                  />
                  <button className="pick-btn" onClick={addStudent}>+ Add</button>
                </Card>

                {/* Prompt List card — manage the items this class's secondary randomizer draws from */}
                <Card>
                  <Label>Prompts for {activeClass?.name}</Label>

                  {/*
                    The prompt textarea works exactly like the student textarea.
                    Teachers can paste a list of years, topics, composers — anything.
                  */}
                  <textarea
                    value={promptInput}
                    onChange={e => setPromptInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        addPrompt();
                      }
                    }}
                    placeholder={"One item per line, e.g.:\n1920s\nBaroque\nJazz era"}
                    className="form-control form-control-sm mb-2"
                    style={{ resize: "none", height: 80, fontFamily: "monospace", fontSize: "0.82rem", borderColor: C.border }}
                  />
                  <button
                    className="pick-btn"
                    onClick={addPrompt}
                    style={{ marginBottom: prompts.length ? 12 : 0 }}
                  >
                    + Add
                  </button>

                  {/* Current prompt list — shown as removable chips, same as the student roster */}
                  {prompts.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 180, overflowY: "auto" }}>
                      {prompts.map((p) => (
                        // Each prompt is a chip matching the "pending" student chip style
                        <div key={p} className="student-chip chip-pending">
                          <span style={{ flex: 1 }}>{p}</span>
                          <button className="chip-remove" onClick={() => removePrompt(p)}>×</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty state — shown when no prompts have been added yet */}
                  {prompts.length === 0 && (
                    <div style={{ color: C.muted, fontSize: "0.78rem", textAlign: "center", paddingTop: 6 }}>
                      No prompts yet — add some above and a Spin button will appear after each pick.
                    </div>
                  )}
                </Card>

                {/* Call history card — only shown once picks have been made */}
                {called.length > 0 && (
                  <Card>
                    <Label>Called This Round</Label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 210, overflowY: "auto" }}>
                      {/*
                        [...called] copies the array before reversing so we don't
                        mutate the original state array — .reverse() works in place.
                      */}
                      {[...called].reverse().map((s, i) => (
                        <div key={s} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 2px", borderBottom: `1px solid ${C.pendingBg}` }}>
                          <span style={{ fontSize: "0.65rem", color: "#b0c4ce", width: 18, textAlign: "right", flexShrink: 0 }}>{called.length - i}</span>
                          <span style={{ fontSize: "0.88rem", color: i === 0 ? C.amber : C.text, fontWeight: i === 0 ? 700 : 400, flex: 1 }}>{s}</span>
                          {i === 0 && (
                            <span style={{ fontSize: "0.6rem", background: C.tealLight, color: C.teal, borderRadius: 5, padding: "2px 7px", fontWeight: 700, flexShrink: 0 }}>latest</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 48, color: "#b0c4ce", fontSize: "0.74rem" }}>
          Developed by Matt Harden · © 2025–2026
        </div>
      </div>
    </>
  );
}