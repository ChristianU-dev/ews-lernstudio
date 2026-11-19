# 3-Minuten-Setup: GitHub Pages (iPhone-App), Google-Account Login & Supabase-Sync

Dein gesamtes **EWS Lernstudio & Universal Study Buddy** funktioniert lokal auf deinem Windows-Laptop **sofort zu 100 % ohne Login, ohne Cloud-Konto und ohne externen API-Key**!

Wenn ihr die App zusätzlich kostenlos als **echte Homescreen-App auf dem iPhone** (inkl. 100 % Offline-Zugmodus) nutzen und eure Profile automatisch über **Google-Account** (oder Sync-Code) zwischen Laptop und iPhone synchronisieren möchtet, dauert die Einrichtung nur ca. 3 Minuten:

---

## Live-Link für PC & iPhone (Bereits aktiv auf GitHub Pages!)

Die App ist fertig veröffentlicht und läuft dauerhaft über HTTPS (komplett ohne `localhost` oder offenen PC):

- **Live-App URL:** https://christianu-dev.github.io/ews-lernstudio/
- **GitHub-Repository:** https://github.com/ChristianU-dev/ews-lernstudio *(jedes zukünftige `git push` aktualisiert die Live-App automatisch)*

### Auf den Homescreen legen (1 Klick, ohne Terminal):
1. **Auf dem iPhone**: Link in **Safari** öffnen → unten auf **Teilen** (`↑`) tippen → **„Zum Home-Bildschirm“** → **Hinzufügen**.
2. **Auf dem Windows-PC**: Link in **Edge oder Chrome** öffnen → rechts oben in der Adressleiste auf das kleine **„App installieren“-Symbol** klicken → Haken bei **„Desktopverknüpfung erstellen“** setzen → **Installieren**. *(Alternativ liegt auch [EWS Lernstudio starten.url](file:///c:/EWS-Lernstudio/EWS%20Lernstudio%20starten.url) im Projektordner.)*

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
