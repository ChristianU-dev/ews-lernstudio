# 3-Minuten-Setup: GitHub Pages (iPhone-App), Google-Account Login & Supabase-Sync

Dein gesamtes **EWS Lernstudio & Universal Study Buddy** funktioniert lokal auf deinem Windows-Laptop **sofort zu 100 % ohne Login, ohne Cloud-Konto und ohne externen API-Key**!

Wenn ihr die App zusätzlich kostenlos als **echte Homescreen-App auf dem iPhone** (inkl. 100 % Offline-Zugmodus) nutzen und eure Profile automatisch über **Google-Account** (oder Sync-Code) zwischen Laptop und iPhone synchronisieren möchtet, dauert die Einrichtung nur ca. 3 Minuten:

---

## Schritt 1: Web-App kostenlos auf GitHub Pages veröffentlichen (fürs iPhone)

1. Erstelle auf [github.com/new](https://github.com/new) ein Repository namens **`ews-lernstudio`** (für GitHub Pages im kostenlosen Tarif *Public* wählen – es sind keinerlei persönliche Daten oder Schlüssel im Code enthalten).
2. Öffne auf dem Windows-PC PowerShell im Ordner `C:\EWS-Lernstudio` und führe diesen **1-Zeilen-Push** aus (ersetze `<DEIN-GITHUB-NAME>`):
   ```powershell
   git remote add origin https://github.com/<DEIN-GITHUB-NAME>/ews-lernstudio.git; git push -u origin main
   ```
3. Klicke auf GitHub im Repo auf **Settings → Pages → Build and deployment → Source: „GitHub Actions“**.
4. Nach ca. 60 Sekunden ist die App unter `https://<DEIN-GITHUB-NAME>.github.io/ews-lernstudio/` live!
5. **Auf dem iPhone installieren**: Öffne den Link einmal in **Safari** → tippe unten auf **Teilen** → **„Zum Home-Bildschirm“**. Ab sofort startet das Lernstudio wie eine native iOS-App im Vollbild – auch **komplett offline im Zug**!

---

## Schritt 2 (Optional): Echtzeit-Sync & Google-Account Login (Supabase Free Tier)

*(Auch ohne Cloud-Konto könnt ihr euren Stand jederzeit unter „Downloads & Cloud“ per 1-Klick-Datei sichern und per AirDrop übertragen!)*

1. Erstelle auf [supabase.com](https://supabase.com) ein kostenloses Projekt (Free Tier, keine Kreditkarte nötig).
2. Öffne dort links den **SQL Editor**, kopiere den kompletten Inhalt aus [supabase/schema.sql](file:///C:/EWS-Lernstudio/supabase/schema.sql) hinein und klicke auf **Run**.
3. Kopiere unter **Project Settings → API** deine **Project URL** und deinen **anon / public Key** und trage beide Werte im Lernstudio unter **„Downloads & Cloud“** ein.
4. **Wahlweise Sync per Google-Account ODER Schnell-Code**:
   - **Option A – Schnell-Sync ohne E-Mail (sofort fertig)**: Vergib unter „Downloads & Cloud“ einfach einen geheimen Sync-Code (mind. 8 Zeichen) auf PC und iPhone.
   - **Option B – Echter Google-Account Login (OAuth)**: Aktiviere im Supabase-Dashboard unter **Authentication → Providers → Google** den Schalter, trage deine Google OAuth Client-ID ein und füge unter **Authentication → URL Configuration → Redirect URLs** deine GitHub-Pages-URL (`https://<DEIN-GITHUB-NAME>.github.io/ews-lernstudio/`) hinzu. Danach genügt ein Klick auf **„Mit Google-Account anmelden & synchronisieren“**!
5. **Mehrere Profile auf einem Gerät**: Ihr Hauptprofil **„Staatsexamen (Kunst & Sport)“** ist mit einem Schutz-Schloss (`🔒 Geschützt`) gesichert. Über den Profil-Button oben links kannst du mit einem Klick ein getrenntes **Profil „Christian“** sowie beliebige eigene Lernfächer anlegen!
