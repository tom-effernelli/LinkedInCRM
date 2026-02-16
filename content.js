(function () {
  "use strict";

  const STORAGE_KEY_PREFIX = "linkedin_notes_";
  let lastProfileId = null;

  /**
   * Extrait l'ID unique du profil depuis l'URL (ex: /in/john-doe-123/ -> john-doe-123)
   */
  function getProfileId() {
    const path = window.location.pathname;
    const match = path.match(/\/in\/([^/]+)/);
    return match ? match[1].toLowerCase() : null;
  }

  /**
   * Supprime la card du DOM (pour navigation SPA).
   */
  function removeCard() {
    const card = document.getElementById("linkedin-notes-extension-card");
    if (card) card.remove();
  }

  function getStorageKey() {
    const id = getProfileId();
    return id ? STORAGE_KEY_PREFIX + id : null;
  }

  /**
   * Charge la note depuis browser.storage.sync
   */
  function loadNote(key) {
    return browser.storage.sync.get(key).then((obj) => obj[key] || "");
  }

  /**
   * Sauvegarde la note dans browser.storage.sync
   */
  function saveNote(key, text) {
    return browser.storage.sync.set({ [key]: text });
  }

  /**
   * Crée le bloc UI (card) et l'insère après .pv-top-card
   */
  function createNotesCard() {
    const key = getStorageKey();
    if (!key) return null;

    const profileId = getProfileId();
    const card = document.createElement("div");
    card.id = "linkedin-notes-extension-card";
    card.className = "linkedin-notes-card";
    card.dataset.profileId = profileId;
    card.innerHTML = `
      <div class="linkedin-notes-header">
        <span class="linkedin-notes-title">Mes notes (privées)</span>
      </div>
      <textarea
        id="linkedin-notes-textarea"
        class="linkedin-notes-textarea"
        placeholder="Ajoutez des notes sur ce contact..."
        rows="4"
      ></textarea>
      <div class="linkedin-notes-actions">
        <button type="button" id="linkedin-notes-save" class="linkedin-notes-btn linkedin-notes-btn-save">
          Enregistrer
        </button>
        <button type="button" id="linkedin-notes-clear" class="linkedin-notes-btn linkedin-notes-btn-clear">
          Effacer
        </button>
      </div>
    `;

    const textarea = card.querySelector("#linkedin-notes-textarea");
    const saveBtn = card.querySelector("#linkedin-notes-save");
    const clearBtn = card.querySelector("#linkedin-notes-clear");

    function setSaveSuccess() {
      saveBtn.textContent = "✓ Enregistré";
      saveBtn.classList.add("linkedin-notes-saved");
      setTimeout(() => {
        saveBtn.textContent = "Enregistrer";
        saveBtn.classList.remove("linkedin-notes-saved");
      }, 2000);
    }

    saveBtn.addEventListener("click", () => {
      const text = textarea.value.trim();
      saveNote(key, text)
        .then(() => setSaveSuccess())
        .catch((err) => console.warn("LinkedIn Notes: save failed", err));
    });

    clearBtn.addEventListener("click", () => {
      textarea.value = "";
      saveNote(key, "")
        .then(() => setSaveSuccess())
        .catch((err) => console.warn("LinkedIn Notes: clear save failed", err));
    });

    loadNote(key).then((text) => {
      if (text) textarea.value = text;
    });

    return { card, key };
  }

  /**
   * Retourne le conteneur "Top Card" LinkedIn (priorité au sélecteur le plus fiable).
   */
  function getTopCardContainer() {
    return (
      document.querySelector(".pv-top-card") ||
      document.querySelector("[data-top-card]") ||
      document.querySelector(".scaffold-layout__main aside") ||
      document.querySelector(".pv-profile-section")
    );
  }

  /**
   * Insère la card juste après l'élément .pv-top-card (ou équivalent).
   * Si une card existe déjà pour un autre profil, elle est supprimée et remplacée.
   */
  function injectCard() {
    const currentProfileId = getProfileId();
    const key = getStorageKey();
    if (!key) return;

    const existingCard = document.getElementById("linkedin-notes-extension-card");
    if (existingCard) {
      if (existingCard.dataset.profileId === currentProfileId) return;
      existingCard.remove();
    }

    const container = getTopCardContainer();
    if (!container) return;

    const result = createNotesCard();
    if (!result) return;

    const parent = container.parentNode;
    if (parent) {
      parent.insertBefore(result.card, container.nextSibling);
    }
    lastProfileId = currentProfileId;
  }

  /**
   * Attend que la Top Card soit présente (MutationObserver ciblé + délai de secours).
   * Marge de sécurité (debounce) pour éviter double injection en transitions rapides.
   */
  let injectDebounceTimer = null;
  const INJECT_DEBOUNCE_MS = 300;

  function waitAndInject() {
    function tryInject() {
      const container = getTopCardContainer();
      if (!container) return false;
      injectCard();
      return true;
    }

    if (tryInject()) return;

    const observer = new MutationObserver(() => {
      const container = getTopCardContainer();
      if (!container) return;
      if (injectDebounceTimer) clearTimeout(injectDebounceTimer);
      injectDebounceTimer = setTimeout(() => {
        injectDebounceTimer = null;
        if (tryInject()) observer.disconnect();
      }, INJECT_DEBOUNCE_MS);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      if (injectDebounceTimer) clearTimeout(injectDebounceTimer);
      injectDebounceTimer = null;
      tryInject();
    }, 5000);
  }

  /**
   * Vérifie si l'URL a changé (navigation SPA) et réagit au changement de profil.
   */
  function checkUrlChange() {
    const currentId = getProfileId();
    if (currentId === null) return;
    if (lastProfileId !== null && lastProfileId !== currentId) {
      removeCard();
      lastProfileId = currentId;
      waitAndInject();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      waitAndInject();
      window.addEventListener("popstate", checkUrlChange);
      setInterval(checkUrlChange, 800);
    });
  } else {
    waitAndInject();
    window.addEventListener("popstate", checkUrlChange);
    setInterval(checkUrlChange, 800);
  }
})();
