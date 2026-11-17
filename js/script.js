const STORAGE_KEY = "taches";

// statut -> libellé, couleur (nom de la classe CSS) et code couleur du badge
const STATUTS = {
  "à faire": { libelle: "À faire", couleur: "bleu", code: "#3498db" },
  "en cours": { libelle: "En cours", couleur: "orange", code: "#e67e22" },
  "terminée": { libelle: "Terminée", couleur: "vert", code: "#27ae60" },
  "bloquée": { libelle: "Bloquée", couleur: "rouge", code: "#e74c3c" }
};

// Bonus : priorités (de la plus haute à la plus basse)
const PRIORITES = ["haute", "moyenne", "basse"];
const LIBELLES_PRIORITE = { haute: "Haute", moyenne: "Moyenne", basse: "Basse" };

let taches = [];
let idEnEdition = null;
let animation = { id: null, classe: "" }; // animation à jouer au prochain affichage
let idGlisse = null;                      // tâche en cours de glisser-déposer

const form = document.getElementById("task-form");
const inputTitre = document.getElementById("titre");
const inputDescription = document.getElementById("description");
const selectStatut = document.getElementById("statut");
const selectPriorite = document.getElementById("priorite");
const formError = document.getElementById("form-error");
const selectFiltre = document.getElementById("filtre");
const selectFiltrePriorite = document.getElementById("filtre-priorite");
const selectTri = document.getElementById("tri");
const inputRecherche = document.getElementById("recherche");
const statsDiv = document.getElementById("stats");
const emptyMessage = document.getElementById("empty-message");
const taskList = document.getElementById("task-list");
const submitBtn = form.querySelector('button[type="submit"]');

// Bouton « Annuler » (modification), créé en JavaScript
const cancelBtn = document.createElement("button");
cancelBtn.type = "button";
cancelBtn.textContent = "Annuler";
cancelBtn.classList.add("cache");
submitBtn.after(cancelBtn);

// ---------- localStorage ----------
function sauvegarder() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(taches));
}

function charger() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    taches = Array.isArray(data) ? data : [];
  } catch (e) {
    taches = [];
  }
}

// ---------- Validation ----------
function valider(titre, statut, priorite) {
  if (titre.trim() === "") {
    return "Le titre est obligatoire.";
  }
  if (!Object.prototype.hasOwnProperty.call(STATUTS, statut)) {
    return "Le statut choisi n'est pas autorisé.";
  }
  if (!PRIORITES.includes(priorite)) {
    return "La priorité choisie n'est pas autorisée.";
  }
  return "";
}

// ---------- CRUD ----------
function ajouterTache(titre, description, statut, priorite) {
  const id = Date.now();
  animation = { id: id, classe: "anim-ajout" };
  taches.push({
    id: id,
    titre: titre.trim(),
    description: description.trim(),
    statut: statut,
    priorite: priorite,
    createdAt: new Date().toISOString(),
    couleur: STATUTS[statut].couleur
  });
}

function modifierTache(id, titre, description, statut, priorite) {
  const tache = taches.find(function (t) { return t.id === id; });
  if (!tache) return;
  tache.titre = titre.trim();
  tache.description = description.trim();
  tache.statut = statut;
  tache.priorite = priorite;
  tache.couleur = STATUTS[statut].couleur;
  animation = { id: id, classe: "anim-modif" };
}

function supprimerTache(id) {
  taches = taches.filter(function (t) { return t.id !== id; });
  if (idEnEdition === id) quitterEdition();
}

// ---------- Formulaire ----------
function quitterEdition() {
  idEnEdition = null;
  form.reset();
  submitBtn.textContent = "Ajouter";
  cancelBtn.classList.add("cache");
  formError.textContent = "";
}

function demarrerEdition(id) {
  const tache = taches.find(function (t) { return t.id === id; });
  if (!tache) return;
  idEnEdition = id;
  inputTitre.value = tache.titre;
  inputDescription.value = tache.description;
  selectStatut.value = tache.statut;
  selectPriorite.value = tache.priorite || "moyenne";
  submitBtn.textContent = "Enregistrer";
  cancelBtn.classList.remove("cache");
  formError.textContent = "";
  inputTitre.focus();
}

form.addEventListener("submit", function (e) {
  e.preventDefault();
  const titre = inputTitre.value;
  const description = inputDescription.value;
  const statut = selectStatut.value;
  const priorite = selectPriorite.value;

  const erreur = valider(titre, statut, priorite);
  if (erreur) {
    formError.textContent = erreur;
    return;
  }

  if (idEnEdition !== null) {
    modifierTache(idEnEdition, titre, description, statut, priorite);
  } else {
    ajouterTache(titre, description, statut, priorite);
  }
  sauvegarder();
  quitterEdition();
  afficher();
});

cancelBtn.addEventListener("click", quitterEdition);

// ---------- Filtres, recherche, tri ----------
function prioriteDe(tache) {
  return tache.priorite || "moyenne";
}

function tachesFiltrees() {
  const texte = inputRecherche.value.trim().toLowerCase();
  const filtre = selectFiltre.value;
  const filtrePriorite = selectFiltrePriorite.value;

  const resultat = taches.filter(function (t) {
    const okStatut = filtre === "toutes" || t.statut === filtre;
    const okPriorite = filtrePriorite === "toutes" || prioriteDe(t) === filtrePriorite;
    const okTexte = texte === "" ||
      t.titre.toLowerCase().includes(texte) ||
      t.description.toLowerCase().includes(texte);
    return okStatut && okPriorite && okTexte;
  });

  if (selectTri.value === "priorite") {
    resultat.sort(function (a, b) {
      return PRIORITES.indexOf(prioriteDe(a)) - PRIORITES.indexOf(prioriteDe(b));
    });
  }
  return resultat;
}

// ---------- Bonus : statistiques ----------
function afficherStats() {
  statsDiv.innerHTML = "";

  const total = document.createElement("span");
  total.classList.add("stat");
  total.textContent = "Total : " + taches.length;
  statsDiv.appendChild(total);

  Object.keys(STATUTS).forEach(function (statut) {
    const nombre = taches.filter(function (t) { return t.statut === statut; }).length;
    const el = document.createElement("span");
    el.classList.add("stat");
    el.style.backgroundColor = STATUTS[statut].code;
    el.textContent = STATUTS[statut].libelle + " : " + nombre;
    statsDiv.appendChild(el);
  });
}

// ---------- Bonus : glisser-déposer ----------
function deplacerTache(idSource, idCible) {
  if (idSource === idCible) return;
  const de = taches.findIndex(function (t) { return t.id === idSource; });
  if (de === -1) return;
  const tache = taches.splice(de, 1)[0];
  const vers = taches.findIndex(function (t) { return t.id === idCible; });
  taches.splice(vers, 0, tache);
  sauvegarder();
  afficher();
}

function activerGlisser(carte, tache) {
  carte.draggable = true;

  carte.addEventListener("dragstart", function (e) {
    idGlisse = tache.id;
    carte.classList.add("deplace");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(tache.id));
  });
  carte.addEventListener("dragend", function () {
    idGlisse = null;
    carte.classList.remove("deplace");
  });
  carte.addEventListener("dragover", function (e) {
    if (idGlisse === null) return;
    e.preventDefault();
    carte.classList.add("survol");
  });
  carte.addEventListener("dragleave", function () {
    carte.classList.remove("survol");
  });
  carte.addEventListener("drop", function (e) {
    e.preventDefault();
    carte.classList.remove("survol");
    if (idGlisse !== null) deplacerTache(idGlisse, tache.id);
  });
}

// ---------- Affichage ----------
function creerCarte(tache) {
  const infos = STATUTS[tache.statut];
  const priorite = prioriteDe(tache);

  const carte = document.createElement("article");
  carte.classList.add("carte", tache.couleur);

  const badge = document.createElement("span");
  badge.textContent = infos.libelle;
  badge.style.backgroundColor = infos.code;
  badge.style.color = "white";
  badge.style.padding = "2px 10px";
  badge.style.borderRadius = "10px";

  const prio = document.createElement("span");
  prio.classList.add("priorite", "priorite-" + priorite);
  prio.textContent = "Priorité " + LIBELLES_PRIORITE[priorite].toLowerCase();

  const titre = document.createElement("h3");
  titre.textContent = tache.titre;

  const description = document.createElement("p");
  description.textContent = tache.description || "Aucune description.";

  const date = document.createElement("small");
  date.textContent = "Créée le " + new Date(tache.createdAt).toLocaleString("fr-FR");

  const btnModifier = document.createElement("button");
  btnModifier.type = "button";
  btnModifier.classList.add("btn-modifier");
  btnModifier.textContent = "Modifier";
  btnModifier.addEventListener("click", function () {
    demarrerEdition(tache.id);
  });

  const btnSupprimer = document.createElement("button");
  btnSupprimer.type = "button";
  btnSupprimer.classList.add("btn-supprimer");
  btnSupprimer.textContent = "Supprimer";
  btnSupprimer.addEventListener("click", function () {
    if (confirm("Supprimer la tâche « " + tache.titre + " » ?")) {
      carte.classList.add("anim-suppr");
      setTimeout(function () {
        supprimerTache(tache.id);
        sauvegarder();
        afficher();
      }, 300);
    }
  });

  carte.append(badge, prio, titre, description, date, btnModifier, btnSupprimer);

  if (animation.id === tache.id) {
    carte.classList.add(animation.classe);
    animation = { id: null, classe: "" };
  }
  // Le glisser-déposer n'a de sens qu'en ordre manuel
  if (selectTri.value === "manuel") activerGlisser(carte, tache);

  return carte;
}

function afficher() {
  afficherStats();
  const liste = tachesFiltrees();
  taskList.innerHTML = "";

  if (liste.length === 0) {
    emptyMessage.classList.remove("cache");
    emptyMessage.textContent = taches.length === 0
      ? "Aucune tâche pour le moment."
      : "Aucune tâche ne correspond à votre recherche ou aux filtres choisis.";
    return;
  }

  emptyMessage.classList.add("cache");
  liste.forEach(function (t) {
    taskList.appendChild(creerCarte(t));
  });
}

selectFiltre.addEventListener("change", afficher);
selectFiltrePriorite.addEventListener("change", afficher);
selectTri.addEventListener("change", afficher);
inputRecherche.addEventListener("input", afficher);

// ---------- Démarrage ----------
charger();
afficher();
