// Will hold all students loaded from CSV
let students = [];
let currentUser = null;

// Load CSV file when the page loads
fetch("students.csv")
  .then((res) => res.text())
  .then((text) => {
    students = parseCSV(text);
    console.log("Loaded students:", students.length);
  })
  .catch((err) => {
    console.error("Error loading students.csv", err);
    const s = document.getElementById("searchStatus");
    s.textContent =
      "Could not load students.csv. Check that the file is in the same folder as index.html.";
    s.classList.add("error");
  });

/**
 * Very simple CSV parser.
 * We try to support:
 * - roll,name,gender
 * - Roll No,Student Name,Gender
 * - or any header that contains words like "roll" and "name" and "gender".
 */
function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length <= 1) return [];

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());

  const rollIdx = header.findIndex((h) => h.includes("roll"));
  const nameIdx = header.findIndex((h) => h.includes("name"));
  const genderIdx = header.findIndex((h) => h.includes("gender"));

  const result = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(",").map((p) => p.trim());

    result.push({
      roll: rollIdx >= 0 ? parts[rollIdx] : "",
      name: nameIdx >= 0 ? parts[nameIdx] : "",
      // gender is optional, we use it only for opposite gender logic
      gender:
        genderIdx >= 0 ? (parts[genderIdx] || "").toUpperCase() : "",
    });
  }
  return result;
}

// DOM elements
const nameInput = document.getElementById("nameInput");
const checkBtn = document.getElementById("checkBtn");
const searchStatus = document.getElementById("searchStatus");
const wheel = document.getElementById("wheel");
const spinBtn = document.getElementById("spinBtn");

const pairCard = document.getElementById("pairResult");
const youRoll = document.getElementById("youRoll");
const youName = document.getElementById("youName");
const friendRoll = document.getElementById("friendRoll");
const friendName = document.getElementById("friendName");
const noResultText = document.getElementById("noResultText");

// Search button click
checkBtn.addEventListener("click", () => {
  const query = nameInput.value.trim().toLowerCase();
  searchStatus.classList.remove("ok", "error");
  noResultText.textContent = "";
  pairCard.classList.add("hidden");
  spinBtn.disabled = true;
  wheel.classList.add("disabled");
  currentUser = null;

  if (!query) {
    searchStatus.textContent = "Please type your name or roll number first.";
    searchStatus.classList.add("error");
    return;
  }

  // Try to match by roll first (if user typed only digits)
  let found = null;
  if (/^\d+$/.test(query)) {
    found = students.find((s) => s.roll.toString().toLowerCase() === query);
  }

  // If not found by roll, try by name (full or partial)
  if (!found) {
    found = students.find((s) =>
      s.name.toLowerCase().includes(query)
    );
  }

  if (!found) {
    searchStatus.textContent =
      "Your name/roll is not in the list. Ask the admin to add you to students.csv.";
    searchStatus.classList.add("error");
    return;
  }

  currentUser = found;
  searchStatus.textContent = `Found: Roll ${found.roll} – ${found.name}. You can spin now.`;
  searchStatus.classList.add("ok");
  spinBtn.disabled = false;
  wheel.classList.remove("disabled");
});

// Spin button click
spinBtn.addEventListener("click", () => {
  if (!currentUser || students.length === 0) return;

  // spin animation
  wheel.classList.remove("spin");
  void wheel.offsetWidth; // restart animation
  wheel.classList.add("spin");

  spinBtn.disabled = true;
  noResultText.textContent = "";
  pairCard.classList.add("hidden");

  setTimeout(() => {
    const friend = pickRandomFriend(currentUser);
    if (!friend) {
      noResultText.textContent =
        "Could not find a matching friend. Check that more students are in the list.";
      return;
    }

    // Fill result – only roll + name, no gender shown
    youRoll.textContent = `Roll: ${currentUser.roll}`;
    youName.textContent = `Name: ${currentUser.name}`;

    friendRoll.textContent = `Roll: ${friend.roll}`;
    friendName.textContent = `Name: ${friend.name}`;

    pairCard.classList.remove("hidden");
    spinBtn.disabled = false;
  }, 1500); // same as CSS animation
});

// Pick a random friend, trying for opposite gender if we have that info
function pickRandomFriend(user) {
  if (!user) return null;

  const userGender = user.gender; // might be "" if not provided
  const oppositeGender =
    userGender === "M" ? "F" : userGender === "F" ? "M" : null;

  // All students except the user
  const others = students.filter(
    (s) => !(s.roll === user.roll && s.name === user.name)
  );
  if (others.length === 0) return null;

  let pool = [];

  // If we know the user's gender and opposite gender exists in data:
  if (oppositeGender) {
    const opposite = others.filter((s) => s.gender === oppositeGender);

    // 90% chance: try opposite gender if any
    const roll = Math.random();
    if (roll < 0.9 && opposite.length > 0) {
      pool = opposite;
    }
  }

  // Fallback: if we didn't fill pool, use everyone else
  if (pool.length === 0) {
    pool = others;
  }

  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}
