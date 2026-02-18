(function () {
  "use strict";

  const STORAGE_KEY_PREFIX = "linkedin_notes_";
  let lastProfileId = null;

  // --- 1. PROFILE ID (STRICT) ---
  function getProfileId() {
    // On découpe l'URL par les slashs et on retire les segments vides
    const parts = window.location.pathname.split('/').filter(p => p);

    // Un profil valide = exactement 2 segments : ["in", "nom-utilisateur"]
    // Si parts.length > 2, c'est une sous-page (ex: /in/user/details/...) -> on renvoie null.
    if (parts.length === 2 && parts[0] === "in") {
        // On nettoie d'éventuels paramètres URL (au cas où ils n'auraient pas été gérés par pathname)
        return parts[1].split('?')[0].split('#')[0].toLowerCase();
    }
    return null;
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

    // Chargement initial
    browser.storage.sync.get(key).then((obj) => {
      if (obj[key]) textarea.value = obj[key];
    });

    // Synchro temps réel (optionnel mais recommandé pour ton multi-écran)
    browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes[key]) {
        if (document.activeElement !== textarea) {
            textarea.value = changes[key].newValue || "";
        }
      }
    });

    return card;
  }

  // --- 3. INJECTION ---
  function getTargetElement() {
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
    if (!currentId) return;

    const existing = document.getElementById("linkedin-notes-extension-card");
    
    // Si la carte est déjà là avec le bon ID, on ne fait rien
    if (existing && existing.dataset.profileId === currentId) return;
    
    // Si l'ID a changé, on nettoie
    if (existing) existing.remove();

    const targetElement = getTargetElement();
    if (!targetElement) return;

    const card = createNotesCard();
    if (!card) return;

    targetElement.insertAdjacentElement("afterend", card);
  }

  // --- 4. WATCH LOOP (NETTOYAGE & SURVEILLANCE) ---
  function runLoop() {
    const currentId = getProfileId();

    // Cas 1 : On n'est plus sur un profil principal (Flux, Page Education, etc.)
    if (!currentId) {
        if (lastProfileId !== null) {
            removeCard();
            lastProfileId = null;
        }
        return;
    }

    // Cas 2 : Changement de profil détecté
    if (lastProfileId !== currentId) {
        lastProfileId = currentId;
        removeCard(); 
        // L'injection se fera à la ligne suivante
    }

    // Cas 3 : On est sur un profil, on s'assure que la carte est là
    injectCard();
  }

  const observer = new MutationObserver(() => runLoop());
  observer.observe(document.body, { childList: true, subtree: true });

  setInterval(runLoop, 1000);

})();