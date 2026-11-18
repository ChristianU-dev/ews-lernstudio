# 3-Minuten-Setup: GitHub Pages (iPhone-Web-App) & Optionaler Supabase-Sync

Dein gesamtes **EWS-Psychologie Lernstudio** funktioniert lokal auf deinem Windows-Laptop **sofort zu 100 % ohne Login, ohne Cloud-Konto und ohne API-Key**!

Wenn du die App zusätzlich kostenlos als **Homescreen-App auf deinem iPhone** (inkl. 100 % Offline-Zugmodus) nutzen und deinen Lernstand automatisch zwischen Laptop und iPhone synchronisieren möchtest, dauert die Einrichtung nur ca. 3 Minuten:

---

## Schritt 1: Deine Web-App kostenlos auf GitHub Pages veröffentlichen (fürs iPhone)

1. Erstelle auf [github.com/new](https://github.com/new) ein Repository namens **`ews-lernstudio`** (für GitHub Pages im kostenlosen Tarif *Public* wählen – es sind keinerlei persönliche Daten oder Schlüssel im Code enthalten).
2. Öffne auf deinem Windows-PC PowerShell im Ordner `C:\EWS-Lernstudio` und führe diesen **1-Zeilen-Push** aus (ersetze `<DEIN-GITHUB-NAME>`):
   ```powershell
   git remote add origin https://github.com/<DEIN-GITHUB-NAME>/ews-lernstudio.git; git push -u origin main
   ```
3. Klicke auf GitHub in deinem Repo auf **Settings → Pages → Build and deployment → Source: „GitHub Actions“**.
4. Nach ca. 60 Sekunden ist deine App unter `https://<DEIN-GITHUB-NAME>.github.io/ews-lernstudio/` live!
5. **Auf dem iPhone installieren**: Öffne den Link einmal in **Safari** → tippe unten auf **Teilen** → **„Zum Home-Bildschirm“**. Ab sofort startet dein Lernstudio wie eine echte iOS-App im Vollbild – auch **komplett offline im Zug**!

---

## Schritt 2 (Optional): Kostenloser Echtzeit-Sync zwischen PC & iPhone (Supabase Free Tier)

*(Auch ohne diesen Schritt kannst du deinen Lernstand jederzeit im Reiter „Downloads & Sync“ per 1-Klick-Datei sichern und per AirDrop aufs iPhone schicken!)*

1. Erstelle auf [supabase.com](https://supabase.com) ein kostenloses Projekt (Free Tier, keine Kreditkarte nötig).
2. Öffne dort links den **SQL Editor**, kopiere den kompletten Inhalt aus [supabase/schema.sql](file:///C:/EWS-Lernstudio/supabase/schema.sql) hinein und klicke auf **Run**.
3. Kopiere unter **Project Settings → API** deine **Project URL** und deinen **anon / public Key**.
4. Trage beide Werte im Lernstudio unter **„Downloads & Sync“** ein und wähle dir einen **persönlichen geheimen Sync-Code** (mind. 8 Zeichen, z. B. `kunst-sport-februar-27`) – gib denselben Code einmal auf dem Laptop und einmal auf dem iPhone ein. Fertig!
