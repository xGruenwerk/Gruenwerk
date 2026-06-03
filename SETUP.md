# GrünWerk – Einrichtung (Firebase + Vercel + KI)

Du brauchst **3 Dateien** im Repo (genau diese Struktur):

```
dein-repo/
├── index.html      ← die App
├── sw.js           ← Offline-Funktion
└── api/
    └── ki.js       ← KI-Backend (versteckt den API-Key)
```

Insgesamt 4 Schritte. Plane ~20 Minuten ein.

---

## Schritt 1 – Firebase einrichten (Daten + Login)

1. Auf **console.firebase.google.com** ein neues Projekt anlegen (z.B. `gruenwerk`).
2. Links **Build → Firestore Database → Datenbank erstellen** → im **Produktionsmodus** starten, Region `eur3 (europe-west)`.
3. Links **Build → Authentication → Los geht's**. Anmeldemethoden aktivieren:
   - **Google** → aktivieren → „Projektsupport-E-Mail" = deine Adresse → Speichern. *(empfohlen)*
   - Optional zusätzlich **E-Mail/Passwort** → aktivieren → Speichern.
4. **Firestore-Regeln** setzen: Firestore Database → Reiter **Regeln** → alles ersetzen durch:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
   → **Veröffentlichen.** (Das sorgt dafür, dass nur DU deine Daten lesen/schreiben kannst.)

5. **Web-Konfiguration holen:** Zahnrad oben → **Projekteinstellungen** → runter zu „Meine Apps" → Web-Symbol **`</>`** → App-Name `GrünWerk` → registrieren. Du bekommst einen `firebaseConfig`-Block.

6. Diesen Block in **index.html** eintragen: ganz oben im großen `<script>` steht:
   ```js
   const FIREBASE_CONFIG = {
     apiKey: "DEINE_API_KEY",
     ...
   };
   ```
   Die Werte durch deine echten ersetzen. (Diese Werte dürfen öffentlich sein – die Firestore-Regeln aus Schritt 4 schützen die Daten.)

---

## Schritt 2 – Anthropic-API-Key holen

1. Auf **console.anthropic.com** anmelden → **API Keys → Create Key** → kopieren.
2. Unter **Billing** ein kleines Guthaben aufladen (z.B. 5 $). Die KI nutzt das günstige Haiku-Modell – ein Angebot kostet Bruchteile eines Cents.
3. **Den Key NICHT in den Code schreiben** – er kommt gleich sicher in Vercel (Schritt 3).

---

## Schritt 3 – Auf GitHub + Vercel deployen

1. Die 3 Dateien in dein **GitHub-Repo** legen (push wie gewohnt).
2. Auf **vercel.com** mit GitHub anmelden → **Add New → Project → dein Repo importieren.**
3. Vor dem Deploy: **Environment Variables** aufklappen und eintragen:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** dein Anthropic-Key aus Schritt 2
4. **Deploy** drücken. Nach ~1 Minute bekommst du eine URL wie `https://gruenwerk.vercel.app`.

> Ab jetzt: Wenn du etwas an der App änderst und zu GitHub pushst, deployt Vercel automatisch neu. Du bleibst also bei deinem GitHub-Workflow – Vercel hängt nur dran.

---

## Schritt 3b – Vercel-Domain für Google-Login freigeben (wichtig!)

Der Google-Login funktioniert nur auf Domains, die Firebase kennt. Deine Vercel-URL musst du daher einmal eintragen:

1. Firebase Console → **Authentication → Reiter „Einstellungen" → Autorisierte Domains.**
2. **Domain hinzufügen** → deine Vercel-Domain ohne `https://`, also z.B. `gruenwerk.vercel.app` → hinzufügen.

> Ohne diesen Schritt bricht „Mit Google anmelden" mit einer Fehlermeldung ab. (E-Mail/Passwort-Login bräuchte das nicht – aber Google schon.)

---

## Schritt 4 – Erster Start

1. Deine Vercel-URL öffnen.
2. **„Mit Google anmelden"** antippen und dein Google-Konto wählen – fertig. *(Oder, falls aktiviert, „Konto erstellen" mit E-Mail + Passwort, mind. 6 Zeichen.)*
3. Unten **„Mehr"** → Firmendaten, Steuernr. und IBAN eintragen → speichern.
4. Fertig. Auf dem iPhone: in Safari die URL öffnen → Teilen → **„Zum Home-Bildschirm".** Auf dem Mac: Safari → **Ablage → Zum Dock hinzufügen.**

---

## Gut zu wissen

- **Sync:** Alle Geräte, die mit demselben Konto angemeldet sind, sehen dieselben Daten.
- **Offline:** Die App startet und zeigt deine Daten auch ohne Netz (zuletzt geladener Stand). Die **KI-Erfassung** braucht Internet – ohne Netz springt automatisch der eingebaute Erkenner ein, der deine Stichpunkte gegen den Katalog matcht.
- **Sicherung:** Unter „Mehr → Sicherung exportieren" kannst du jederzeit eine JSON-Datei deiner Daten ziehen.
- **App ändern:** Wenn du die App aktualisierst, in **sw.js** die Zeile `const CACHE = "gruenwerk-v1"` auf `-v2` etc. hochzählen, damit die Geräte die neue Version laden.
- **KI-Kosten begrenzen:** Falls du sichergehen willst, dass nur deine Domain die KI-Funktion aufruft, kann man in `api/ki.js` noch eine Domain-Prüfung ergänzen – sag Bescheid, dann baue ich sie ein.

Bei Fragen zu einem Schritt einfach melden.
