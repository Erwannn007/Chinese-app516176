# 学中文 · Mon Chinois HSK 1

Application web (PWA) personnelle pour réviser le chinois avec le **New HSK Course 1** (manuel + cahier d'exercices) et les PPT du cours.

## Fonctions
- **Choix des chapitres** (ex. 1 à 7 pour l'examen) : utilisé partout (cartes, quiz, exercices, examens).
- **Cours** : textes avec pinyin et traduction, vocabulaire, grammaire expliquée, astuces, prononciation, caractères, phrases de la prof, virelangues, avec la voix chinoise.
- **Cartes mémoire** avec répétition espacée.
- **Quiz de vocabulaire** : 汉字 ↔ français ↔ pinyin, et à l'écoute.
- **Exercices des livres** (manuel + cahier) présentés **comme dans le livre** : la capture de l'exercice (images, numéros, lettres A, B, C…) puis, juste en dessous, la zone pour répondre (lettres ou champ d'écriture). Touche la capture pour zoomer ; bouton « Écouter le texte » pour les exercices d'écoute. Également : parcours par leçon en séries courtes de 8, consigne claire pour chaque question, bouton « Traduire », texte de la leçon à relire, correction expliquée. Les erreurs reviennent à la fin de la série.
- **Motivation** : XP, objectif du jour, série de bonnes réponses 🔥, étoiles par leçon, sons (désactivables dans Plus).
- **Phrases en ordre**, **écoute**, **écriture des caractères** (ordre des traits).
- **Examen blanc** noté sur 20, avec l'**HSK 1 blanc** du cahier (partie lecture).
- **Mes erreurs** : les questions ratées reviennent jusqu'à ce qu'elles soient réussies.
- Fonctionne **hors ligne** une fois installée ; la progression reste sur le téléphone.

## Installer sur iPhone
Ouvrir le site dans Safari → bouton **Partager** → **Sur l'écran d'accueil**.

## Mettre à jour le contenu
Les cours sont transcrits dans `raw/*.txt` (L = manuel, W = cahier). Après modification :

```
python3 tools/build_data.py
```

Cette commande régénère `data.js` et `tools/crops.json`.

Les captures des exercices (`book/*.webp`) sont découpées dans les PDF des livres (release « Cours »). Dans `raw/*.txt`, une ligne `IMG tb 15 13 29 92 56 | consigne` place la capture de la page 15 du manuel (`tb`, ou `wb` pour le cahier ; rectangle en % : x0 y0 x1 y1) au-dessus des questions qui suivent, et `[3]` au début d'une question donne son numéro dans le livre. Pour regénérer les captures :

```
python3 tools/build_data.py
python3 tools/make_crops.py HSK1_Textbook.pdf HSK1_Workbook.pdf --force
``` Bibliothèques incluses : [pinyin-pro](https://github.com/zh-lx/pinyin-pro) (MIT), [Hanzi Writer](https://hanziwriter.org) (MIT) et ses données de traits (Arphic Public License, voir `hanzi/`).
