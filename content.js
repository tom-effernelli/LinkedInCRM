(function () {
  "use strict";

  const STORAGE_KEY_PREFIX = "linkedin_notes_";
  let lastProfileId = null;

  // --- 1. UTILITAIRES ---
  
  function linkify(text) {
    if (!text) return "";
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    
    let safeText = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    return safeText.replace(urlRegex, function(url) {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
  }

  function getProfileId() {
    const parts = window.location.pathname.split('/').filter(p => p);
    if (parts.length === 2 && parts[0] === "in") {
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
      
      <div id="linkedin-notes-view" class="linkedin-notes-view hidden"></div>
      
      <textarea id="linkedin-notes-textarea" class="linkedin-notes-textarea" placeholder="Add a note..." rows="4"></textarea>
      
      <div class="linkedin-notes-actions">
        <button type="button" id="linkedin-notes-clear" class="linkedin-notes-btn linkedin-notes-btn-clear">Clear</button>
        <button type="button" id="linkedin-notes-save" class="linkedin-notes-btn linkedin-notes-btn-save">Save</button>
      </div>
    `;

    const viewDiv = card.querySelector("#linkedin-notes-view");
    const textarea = card.querySelector("#linkedin-notes-textarea");
    const saveBtn = card.querySelector("#linkedin-notes-save");
    const clearBtn = card.querySelector("#linkedin-notes-clear");

    // --- LOGIQUE D'AFFICHAGE ---
    
    function showEditMode() {
      viewDiv.classList.add("hidden");
      textarea.classList.remove("hidden");
      textarea.focus();
    }

    function showViewMode(text) {
      if (!text || text.trim() === "") {
        // Si c'est vide, on reste en mode édition pour voir le placeholder
        showEditMode();
      } else {
        textarea.classList.add("hidden");
        viewDiv.innerHTML = linkify(text);
        viewDiv.classList.remove("hidden");
      }
    }

    function setSaveSuccess() {
      saveBtn.textContent = "Saved";
      saveBtn.classList.add("linkedin-notes-saved");
      setTimeout(() => {
        saveBtn.textContent = "Save";
        saveBtn.classList.remove("linkedin-notes-saved");
      }, 2000);
    }

    // --- EVENTS LISTENERS ---

    // 1. Clic sur le texte (Lecture -> Édition)
    viewDiv.addEventListener("click", () => {
      // On remet le texte brut dans le textarea avant d'afficher
      textarea.value = viewDiv.innerText;
      showEditMode();
    });

    // 2. Perte de Focus (Blur) -> PAS DE SAVE, JUSTE AFFICHAGE
    textarea.addEventListener("blur", () => {
       // On passe simplement en mode lecture visuelle
       showViewMode(textarea.value);
    });

    // 3. Bouton Save -> LA SAUVEGARDE RÉELLE
    saveBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const text = textarea.value.trim();
      
      browser.storage.sync.set({ [key]: text }).then(() => {
        setSaveSuccess();
        showViewMode(text); // On s'assure que l'affichage est à jour
      });
    });

    // 4. Bouton Clear
    clearBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm("Clear all notes?")) {
          textarea.value = "";
          viewDiv.innerHTML = "";
          browser.storage.sync.set({ [key]: "" }).then(() => {
            setSaveSuccess();
            showEditMode();
          });
      }
    });

    // --- CHARGEMENT INITIAL ---
    browser.storage.sync.get(key).then((obj) => {
      const savedText = obj[key] || "";
      textarea.value = savedText;
      showViewMode(savedText);
    });

    // Synchro temps réel
    browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes[key]) {
        const newText = changes[key].newValue || "";
        if (textarea.classList.contains("hidden")) {
            showViewMode(newText);
        } else {
            if (document.activeElement !== textarea) {
                textarea.value = newText;
            }
        }
      }
    });

    return card;
  }

  // --- 3. INJECTION ---
  function getTargetElement() {
    const candidates = [".pv-top-card", ".profile-top-card", ".ph5.pb5", "main > section:first-child"];
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
    if (existing && existing.dataset.profileId === currentId) return;
    if (existing) existing.remove();
    const targetElement = getTargetElement();
    if (!targetElement) return;
    const card = createNotesCard();
    if (!card) return;
    targetElement.insertAdjacentElement("afterend", card);
  }

  // --- 4. BOUCLE ---
  function runLoop() {
    const currentId = getProfileId();
    if (!currentId) {
        if (lastProfileId !== null) {
            removeCard();
            lastProfileId = null;
        }
        return;
    }
    if (lastProfileId !== currentId) {
        lastProfileId = currentId;
        removeCard(); 
    }
    injectCard();
  }

  // --- 5. INIT ---
  const observer = new MutationObserver(() => runLoop());
  observer.observe(document.body, { childList: true, subtree: true });
  setInterval(runLoop, 1000);

})();