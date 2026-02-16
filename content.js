(function () {
  "use strict";

  const STORAGE_KEY_PREFIX = "linkedin_notes_";
  let lastProfileId = null;

  // --- 1. PROFILE ID ---
  function getProfileId() {
    // Not on a profile URL: return null immediately
    if (!window.location.pathname.includes("/in/")) return null;
    
    const id = window.location.pathname
      .split("/in/")[1]
      ?.split("/")[0]
      ?.split("?")[0]
      ?.split("#")[0];
      
    if (!id || id.trim() === "") return null;
    return id.trim().toLowerCase();
  }

  function getStorageKey() {
    const id = getProfileId();
    return id ? STORAGE_KEY_PREFIX + id : null;
  }

  // --- 2. UI ---
  function removeCard() {
    const card = document.getElementById("linkedin-notes-extension-card");
    if (card) card.remove();
  }

  function createNotesCard() {
    const key = getStorageKey();
    if (!key) return null;

    const card = document.createElement("div");
    card.id = "linkedin-notes-extension-card";
    card.className = "linkedin-notes-card";
    card.dataset.profileId = getProfileId();
    
    card.innerHTML = `
      <div class="linkedin-notes-header">
        <span class="linkedin-notes-title">Private notes</span>
      </div>
      <textarea id="linkedin-notes-textarea" class="linkedin-notes-textarea" placeholder="Add a note..." rows="4"></textarea>
      <div class="linkedin-notes-actions">
        <button type="button" id="linkedin-notes-clear" class="linkedin-notes-btn linkedin-notes-btn-clear">Clear</button>
        <button type="button" id="linkedin-notes-save" class="linkedin-notes-btn linkedin-notes-btn-save">Save</button>
      </div>
    `;

    const textarea = card.querySelector("#linkedin-notes-textarea");
    const saveBtn = card.querySelector("#linkedin-notes-save");
    const clearBtn = card.querySelector("#linkedin-notes-clear");

    function setSaveSuccess() {
      saveBtn.textContent = "Saved";
      saveBtn.classList.add("linkedin-notes-saved");
      setTimeout(() => {
        saveBtn.textContent = "Save";
        saveBtn.classList.remove("linkedin-notes-saved");
      }, 2000);
    }

    saveBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      browser.storage.sync.set({ [key]: textarea.value.trim() }).then(setSaveSuccess);
    });

    clearBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm("Clear all notes?")) {
          textarea.value = "";
          browser.storage.sync.set({ [key]: "" }).then(setSaveSuccess);
      }
    });

    browser.storage.sync.get(key).then((obj) => {
      if (obj[key]) textarea.value = obj[key];
    });

    return card;
  }

  // --- 3. INJECTION ---
  function getTargetElement() {
    // Selectors used to find the profile header
    const candidates = [
      ".pv-top-card",
      ".profile-top-card",
      ".ph5.pb5",
      "main > section:first-child"
    ];

    for (let sel of candidates) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) return el;
    }
    return null;
  }

  function injectCard() {
    const currentId = getProfileId();
    
    // Not on a profile page: do nothing (still watching)
    if (!currentId) return;

    const existing = document.getElementById("linkedin-notes-extension-card");
    if (existing) {
      if (existing.dataset.profileId === currentId) return;
      existing.remove();
    }

    const targetElement = getTargetElement();
    if (!targetElement) {
      console.log("LinkedIn Notes: Waiting for profile section...");
      return;
    }

    const card = createNotesCard();
    if (!card) return;

    targetElement.insertAdjacentElement("afterend", card);
    console.log("LinkedIn Notes: Card injected for", currentId);
  }

  // --- 4. WATCH LOOP ---
  function runLoop() {
    injectCard();

    const currentId = getProfileId();
    if (lastProfileId !== currentId) {
      if (currentId) console.log("LinkedIn Notes: Profile changed ->", currentId);
      lastProfileId = currentId;
      removeCard();
      setTimeout(injectCard, 500);
      setTimeout(injectCard, 1500);
      setTimeout(injectCard, 3000);
    }
  }

  // --- 5. INIT ---
  console.log("LinkedIn Notes: Extension loaded.");

  const observer = new MutationObserver(() => runLoop());
  observer.observe(document.body, { childList: true, subtree: true });

  setInterval(runLoop, 1000);

})();