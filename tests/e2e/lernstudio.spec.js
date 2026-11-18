import { test, expect } from "@playwright/test";

function attachZeroErrorGuards(page) {
  const errors = [];
  page.on("pageerror", (err) => errors.push(`PageError: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const txt = msg.text();
      // Ignoriere harmlose Browser-Medien-Autoplay-Hinweise im Headless-Modus
      if (!txt.includes("NotAllowedError")) {
        errors.push(`ConsoleError: ${txt}`);
      }
    }
  });
  return errors;
}

async function expectZeroHorizontalOverflow(page, label = "") {
  const dims = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(
    dims.scrollWidth,
    `Horizontaler Overflow erkannt bei ${label}: scrollWidth=${dims.scrollWidth} > innerWidth=${dims.innerWidth}`
  ).toBeLessThanOrEqual(dims.innerWidth);
}

test.describe("16:10 HiDPI Windows-Laptop (1440x900 & 1920x1200 @ DPR 2)", () => {
  for (const vp of [
    { width: 1440, height: 900, name: "1440x900 (200% Skalierung auf 2880x1800)" },
    { width: 1920, height: 1200, name: "1920x1200 (150% Skalierung auf 2880x1800)" },
  ]) {
    test(`Widescreen-Werkbank fehlerfrei auf ${vp.name}`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
      });
      const page = await context.newPage();
      const errors = attachZeroErrorGuards(page);

      await page.goto("./");
      await expect(page.getByTestId("desktop-sidebar")).toBeVisible();
      await expect(page.getByTestId("mobile-bottom-nav")).toBeHidden();
      const sbBox = await page.getByTestId("desktop-sidebar").boundingBox();
      const mainBox = await page.locator("main.lx-main-workspace").boundingBox();
      expect(sbBox.width).toBeLessThanOrEqual(260);
      expect(mainBox.x).toBeGreaterThanOrEqual(220);
      expect(mainBox.y).toBeLessThan(40);
      await expectZeroHorizontalOverflow(page, `${vp.name} Heute`);

      // Light <-> Dark Mode prüfen
      await page.getByTestId("sidebar-theme-toggle").click();
      const themeAfterClick = await page.evaluate(() => document.documentElement.dataset.theme);
      expect(["light", "dark"]).toContain(themeAfterClick);

      // Visuelle 1-Seiten-Ankerblätter (A, B, C), Vektor-SVG, Laut-Erzähl-Check & Notiz
      await page.getByTestId("nav-scripts").click();
      await expect(page.getByTestId("active-anchor-sheet")).toBeVisible();
      await expect(page.getByTestId("original-page-badge")).toContainText("Original-Skript");
      await expect(page.getByTestId("visual-diagram-svg")).toBeVisible();
      await expectZeroHorizontalOverflow(page, `${vp.name} Skript A`);

      // Laut-Erzähl-Check & eigene Notiz
      await page.getByTestId("laut-check-btn-0").click();
      await page.getByTestId("unit-note-textarea").fill("Wichtige Kunst-Eselsbrücke für S. 8!");
      await page.getByTestId("unit-note-textarea").blur();

      // Wechsel zu Skript B & C (strikte Einzeltrennung + PISA 2025)
      await page.getByTestId("domain-tab-B").click();
      await expectZeroHorizontalOverflow(page, `${vp.name} Skript B`);
      await page.getByTestId("domain-tab-C").click();
      await expectZeroHorizontalOverflow(page, `${vp.name} Skript C`);

      // Ctrl+K Befehlspalette (`cmdk`) -> Suche nach PISA 2025
      await page.getByTestId("open-cmdk-btn").click();
      const cmdInput = page.locator("[cmdk-input]");
      await expect(cmdInput).toBeVisible();
      await cmdInput.fill("PISA 2025");
      await page.keyboard.press("Enter");
      await expect(page.getByTestId("active-anchor-sheet")).toContainText("PISA");

      // Interaktiver Karten-Wissensgraph (`@xyflow/react`)
      await page.getByTestId("nav-graph").click();
      await expect(page.getByTestId("knowledge-graph-view")).toBeVisible();
      await expect(page.locator(".react-flow__node").first()).toBeVisible();
      await expectZeroHorizontalOverflow(page, `${vp.name} Wissensgraph`);

      // Staatsexamens-Simulator (Testformat, Fallvignette & 0,5-Pkt.-MC)
      await page.getByTestId("nav-exam").click();
      await expect(page.getByTestId("exam-simulator-view")).toBeVisible();
      const firstTextarea = page.locator("textarea").first();
      await firstTextarea.fill(
        "Die Lehrkraft nutzt die individuelle Bezugsnorm, um Lernfortschritte sichtbar zu machen. Zudem fördert sie variable Attributionen."
      );
      await page.getByTestId("evaluate-exam-btn").click();
      await expectZeroHorizontalOverflow(page, `${vp.name} Examen`);

      // Download-Center (.docx & .apkg HTTP 200 Check)
      await page.getByTestId("nav-downloads").click();
      const docxHref = await page
        .getByTestId("download-Lernskript_A_Lernen_und_Lehren.docx")
        .getAttribute("href");
      expect(docxHref).toBeTruthy();
      const resp = await page.request.get(docxHref);
      expect(resp.status()).toBe(200);
      expect((await resp.body()).byteLength).toBeGreaterThan(20000);

      expect(errors).toEqual([]);
      await context.close();
    });
  }
});

test.describe("iPhone Native PWA (390x844 @ DPR 3, Safe-Areas, 0px Overflow & Offline-Zugmodus)", () => {
  test("Natives iOS-Layout, Frosted-Glass-Bottom-Nav, Audio, FSRS & 100% Offline", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    const errors = attachZeroErrorGuards(page);

    await page.goto("./");
    await expect(page.getByTestId("mobile-bottom-nav")).toBeVisible();
    await expect(page.getByTestId("desktop-sidebar")).toBeHidden();
    await expectZeroHorizontalOverflow(page, "iPhone Heute Light");

    // Dark-Mode auf dem iPhone prüfen
    await page.getByTestId("topbar-theme-toggle").click();
    await expectZeroHorizontalOverflow(page, "iPhone Heute Dark");

    // Sofa-Audioplayer starten
    await page.getByTestId("sofa-start-audio-btn").click();
    await expect(page.getByTestId("audio-mini-dock")).toBeVisible();
    await expectZeroHorizontalOverflow(page, "iPhone mit Audioplayer");

    // Skripte & Vaul Kapitel-Bottom-Sheet auf dem iPhone
    await page.getByTestId("mobile-nav-scripts").click();
    await expect(page.getByTestId("active-anchor-sheet")).toBeVisible();
    await expectZeroHorizontalOverflow(page, "iPhone Ankerblatt");

    await page.getByTestId("open-chapter-sheet-btn").click();
    await expect(page.getByText("Kapitel wählen")).toBeVisible();
    await page.keyboard.press("Escape");

    // FSRS-Kartentrainer auf dem iPhone + 16px Input-Font-Check
    await page.getByTestId("mobile-nav-cards").click();
    await expect(page.getByTestId("active-flashcard")).toBeVisible();
    await expectZeroHorizontalOverflow(page, "iPhone FSRS-Karten");
    await page.getByTestId("flip-card-btn").click();
    await expect(page.getByTestId("flashcard-back")).toBeVisible();
    await page.getByTestId("rate-btn-3").click();

    // Examen auf dem iPhone (kein Tabellen-Overflow bei Multiple Choice!)
    await page.getByTestId("mobile-nav-exam").click();
    await expectZeroHorizontalOverflow(page, "iPhone Examens-Simulator");
    const fontPx = await page.locator("textarea").first().evaluate((el) => getComputedStyle(el).fontSize);
    expect(parseFloat(fontPx)).toBeGreaterThanOrEqual(16);

    // Vaul "Mehr"-Sheet -> Podcast-Hub & Offline-Modus im Zug simulieren
    await page.getByTestId("mobile-nav-more").click();
    await page.getByTestId("mobile-more-podcast").click();
    await expect(page.getByTestId("podcast-hub-view")).toBeVisible();
    await expectZeroHorizontalOverflow(page, "iPhone Podcast-Hub");

    // Funkloch im Zug aktivieren!
    await context.setOffline(true);
    await page.getByTestId("mobile-nav-today").click();
    await expect(page.getByTestId("today-dashboard-view")).toBeVisible();
    await page.getByTestId("mobile-nav-scripts").click();
    await expect(page.getByTestId("active-anchor-sheet")).toBeVisible();
    await expectZeroHorizontalOverflow(page, "iPhone Offline-Modus");

    expect(errors).toEqual([]);
    await context.close();
  });

  test("Tablet- / Zwischenformat (768x1024) ohne Overflow", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 768, height: 1024 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    const errors = attachZeroErrorGuards(page);
    await page.goto("./");
    await expectZeroHorizontalOverflow(page, "768x1024 Heute");
    await page.getByTestId("mobile-nav-scripts").click();
    await expectZeroHorizontalOverflow(page, "768x1024 Skripte");
    expect(errors).toEqual([]);
    await context.close();
  });
});
