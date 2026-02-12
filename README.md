# Témoigner pour Lutter — Tool

Ce projet est une application web développée pour **Ely & Marion Collective**, dans le cadre de la performance **Témoigner pour Lutter**.

L’objectif est de proposer un outil simple, lisible et fluide permettant :
- d’explorer une bibliothèque de références (visuelles et sonores),
- de composer une forme audiovisuelle en direct,
- d’exporter une trace de composition (PDF, vidéo).

Une attention particulière a été portée à la cohérence visuelle (interface éditoriale, minimale), à la qualité d’usage (drag & drop, feedbacks clairs), ainsi qu’à la maintenabilité du code (structure modulaire, typage).

---

## Fonctionnalités

### Bibliothèque de références
- Navigation par pages : `/archives`, `/collective`, `/performances`, `/diy`
- Références structurées via un schéma commun (id, type, titre, auteur·ice, année, médias, etc.)
- Typologie de références : image, vidéo, audio, texte (selon les entrées)

### DIY — Drag, compose, export
- Pool de médias (visuels) disposés aléatoirement autour de la zone de composition
- Drag & drop depuis le pool vers le canvas
- Déplacement libre des éléments au sein du canvas
- Sélection et suppression d’un élément
- Reset complet de la composition
- Console audio (liste + lecture + drag vers le canvas)
- Refresh du pool (nouvelle sélection / disposition)

### Export
- Export PDF (capture haute résolution de la composition)
- Export vidéo (WebM, optionnel selon activation du bouton)

---

## UI / UX

L’interface a été conçue dans une logique éditoriale :
- hiérarchie simple et lisible,
- mise en page structurée par lignes (plutôt que des cartes),
- interactions minimales mais explicites.

Sur la page DIY, l’enchaînement est volontairement clair :
- actions (refresh, export, remove, clear),
- espace de composition,
- console audio.

---

## Accessibilité

L’outil a été pensé pour rester compréhensible et utilisable avec :
- des libellés et états explicites,
- une hiérarchie visuelle stable,
- des interactions simples et répétables.

Certaines interactions (drag & drop) sont par nature plus complexes à rendre totalement accessibles ; l’objectif est de maintenir une expérience cohérente et d’améliorer progressivement les alternatives clavier.

---

## Choix techniques

Le projet est construit avec :
- **Next.js 16 (App Router)**
- **React**
- **Tailwind CSS**

Les médias sont hébergés sur **Supabase Storage**.  
L’application récupère les fichiers (image, vidéo, audio) depuis un bucket et tente de les associer automatiquement aux références via :
- normalisation des noms,
- score de similarité,
- fallback en cas d’absence de match exact.

L’export repose sur :
- `html-to-image` pour la capture PNG (PDF),
- `jsPDF` pour la génération du PDF,
- `html2canvas` + `MediaRecorder` pour l’export vidéo (optionnel).

---

## Structure du projet

```txt
src/
 ├── app/
 │    ├── archives/
 │    ├── collective/
 │    ├── performances/
 │    └── diy/
 │
 ├── lib/
 │    ├── references.ts
 │    ├── schema.ts
 │    └── (helpers: matching, media, etc.)


---

## Installation & lancement

Prérequis :

- Node.js >= 18 (recommandé : 20)
- npm

Installation :

```bash
npm install

Lancer le projet :

npm run dev


Build :

npm run build
npm run start

---

## Configuration Supabase

Créer un fichier .env.local :

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...


Bucket utilisé :

tpl-web


Structure attendue dans Supabase Storage :

tpl-web/
 ├── image/
 ├── video/
 └── audio/

---

## État du projet

Matching automatique des médias depuis Supabase Storage

Drag & drop (pool → canvas, + déplacement interne)

Console audio

Export PDF

Export vidéo (optionnel)

Interface harmonisée entre les pages

Le projet évolue au fil des besoins artistiques et des itérations de performance.

---

## Crédit

Ely & Marion Collective
Développement : Thalia Woods

