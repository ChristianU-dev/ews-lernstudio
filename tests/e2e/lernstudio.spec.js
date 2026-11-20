import { test, expect } from "@playwright/test";

function attachZeroErrorGuards(page) {
  const errors = [];
  page.on("pageerror", (err) => errors.push(`PageError: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const txt = msg.text();
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

test.describe("16:10 HiDPI Windows-Laptop (1440x820 & 1920x1200 @ DPR 2)", () => {
  for (const vp of [
    { width: 1440, height: 820, name: "1440x820 (200% Skalierung Laptop-Vollbild)" },
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
      await expect(page.getByTestId("live-study-clock-btn")).toBeVisible();
      await expectZeroHorizontalOverflow(page, `${vp.name} Heute`);

      // Tagesringe, Tagesform-Schalter & Live-Lernuhr prüfen
      await expect(page.getByTestId("mastery-rings-hero")).toBeVisible();
      await expect(page.getByTestId("atelier-garden-card")).toBeVisible();
      await page.getByTestId("energy-btn-gentle").click();
      await page.getByTestId("energy-btn-normal").click();

      // App-Starter Modal mit QR-Code & Desktop-.url
      await page.getByTestId("sidebar-starter-btn").click();
      await expect(page.getByTestId("download-desktop-starter-btn")).toBeVisible();
      await page.keyboard.press("Escape");

      // Multi-Profil ("Christian") & geschütztes Hauptprofil
      await page.getByTestId("sidebar-profile-btn").click();
      await expect(page.getByTestId("quick-create-christian-profile")).toBeVisible();
      await page.getByTestId("quick-create-christian-profile").click();
      await page.getByTestId("switch-profile-profile-main").click();
      await page.keyboard.press("Escape");

      await page.getByTestId("sidebar-theme-toggle").click();
      const themeAfterClick = await page.evaluate(() => document.documentElement.dataset.theme);
      expect(["light", "dark"]).toContain(themeAfterClick);

      // Skripte im Blätter-Modus (keine abgeschnittene linke Spalte mehr!)
      await page.getByTestId("nav-scripts").click();
      await expect(page.getByTestId("active-anchor-sheet")).toBeVisible();
      await expect(page.getByTestId("original-page-badge")).toContainText("Original-Skript");
      await expect(page.getByTestId("visual-diagram-svg")).toBeVisible();
      await expectZeroHorizontalOverflow(page, `${vp.name} Skript A`);

      // Zur letzten Buchseite ("Laut-Check & Notiz") blättern
      await page.getByTestId("slide-pill-check").click();
      await page.getByTestId("laut-check-btn-0").click();
      await page.getByTestId("unit-note-textarea").fill("Wichtige Kunst-Eselsbrücke für S. 8!");
      await page.getByTestId("unit-note-textarea").blur();

      // Wechsel zu Skript B & C
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

      // Theorie-Brücken (3-Spalten-Karten + umschaltbarer ReactFlow-Graph)
      await page.getByTestId("nav-graph").click();
      await expect(page.getByTestId("knowledge-graph-view")).toBeVisible();
      await expect(page.getByTestId("mobile-vernetzungs-pfad")).toBeVisible();
      await page.getByTestId("graph-toggle-canvas").click();
      await expect(page.locator(".react-flow__node").first()).toBeVisible();
      await expectZeroHorizontalOverflow(page, `${vp.name} Wissensgraph`);

      // Podcast-Hub: Unterschied zwischen Sofa-Einstieg & Prüfungs-Fokus prüfen!
      await page.getByTestId("nav-podcast").click();
      const sofaPrompt = await page.getByTestId("notebooklm-prompt-box").inputValue();
      await page.getByTestId("podcast-mode-exam").click();
      const examPrompt = await page.getByTestId("notebooklm-prompt-box").inputValue();
      expect(sofaPrompt).not.toEqual(examPrompt);

      // Staatsexamens-Simulator
      await page.getByTestId("nav-exam").click();
      await expect(page.getByTestId("exam-simulator-view")).toBeVisible();
      const firstTextarea = page.locator("textarea").first();
      await firstTextarea.fill(
        "Die Lehrkraft nutzt die individuelle Bezugsnorm, um Lernfortschritte sichtbar zu machen. Zudem fördert sie variable Attributionen."
      );
      await page.getByTestId("evaluate-exam-btn").click();
      await expectZeroHorizontalOverflow(page, `${vp.name} Examen`);

      // Download-Center (Hochformat-PDF & Word HTTP 200 Check)
      await page.getByTestId("nav-downloads").click();
      const pdfHref = await page
        .getByTestId("download-Lernskript_A_Lernen_und_Lehren_Hochformat.pdf")
        .getAttribute("href");
      expect(pdfHref).toBeTruthy();
      const pdfResp = await page.request.get(pdfHref);
      expect(pdfResp.status()).toBe(200);
      expect((await pdfResp.body()).byteLength).toBeGreaterThan(100000);

      const docxHref = await page
        .getByTestId("download-Lernskript_A_Lernen_und_Lehren.docx")
        .getAttribute("href");
      const docxResp = await page.request.get(docxHref);
      expect(docxResp.status()).toBe(200);

      expect(errors).toEqual([]);
      await context.close();
    });
  }

  test("Convertible-Laptop im Hochformat (900x1360 @ DPR 2, Blätter-Modus)", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 900, height: 1360 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    const errors = attachZeroErrorGuards(page);

    await page.goto("./");
    await expectZeroHorizontalOverflow(page, "900x1360 Convertible Heute");

    await page.getByTestId("mobile-nav-scripts").click();
    await expect(page.getByTestId("active-anchor-sheet")).toBeVisible();
    await expect(page.getByTestId("next-slide-btn")).toBeVisible();
    await page.getByTestId("next-slide-btn").click();
    await expectZeroHorizontalOverflow(page, "900x1360 Convertible Blätter-Modus");

    expect(errors).toEqual([]);
    await context.close();
  });
});

test.describe("iPhone Native PWA (390x844 @ DPR 3, Safe-Areas, 0px Overflow & Offline-Zugmodus)", () => {
  test("Natives iOS-Layout, Bottom-Nav, Blätter-Modus, Audio, FSRS & 100% Offline", async ({ browser }) => {
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

    await page.getByTestId("topbar-theme-toggle").click();
    await expectZeroHorizontalOverflow(page, "iPhone Heute Dark");

    // Sofa-Audioplayer starten (startet automatisch Lernuhr!)
    await page.getByTestId("sofa-start-audio-btn").click();
    await expect(page.getByTestId("audio-mini-dock")).toBeVisible();
    await expectZeroHorizontalOverflow(page, "iPhone mit Audioplayer");

    // Skripte & Kapitel-Picker + Blätter-Modus auf dem iPhone
    await page.getByTestId("mobile-nav-scripts").click();
    await expect(page.getByTestId("active-anchor-sheet")).toBeVisible();
    await expectZeroHorizontalOverflow(page, "iPhone Ankerblatt");

    await page.getByTestId("open-chapter-sheet-btn").click();
    await expect(page.getByText("Kapitel wählen")).toBeVisible();
    await page.keyboard.press("Escape");

    // FSRS-Kartentrainer auf dem iPhone
    await page.getByTestId("mobile-nav-cards").click();
    await expect(page.getByTestId("active-flashcard")).toBeVisible();
    await expectZeroHorizontalOverflow(page, "iPhone FSRS-Karten");
    const flipBtn = page.getByTestId("flip-card-btn");
    await flipBtn.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await flipBtn.click();
    const rateBtn = page.getByTestId("rate-btn-3");
    await expect(page.getByTestId("flashcard-back")).toBeVisible();
    await rateBtn.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await rateBtn.click();

    // Examen auf dem iPhone
    await page.getByTestId("mobile-nav-exam").click();
    await expectZeroHorizontalOverflow(page, "iPhone Examens-Simulator");
    const fontPx = await page.locator("textarea").first().evaluate((el) => getComputedStyle(el).fontSize);
    expect(parseFloat(fontPx)).toBeGreaterThanOrEqual(16);

    // Vaul "Mehr"-Sheet -> Theorie-Brücken & Podcast-Hub
    await page.getByTestId("mobile-nav-more").click();
    await page.getByTestId("mobile-more-graph").click();
    await expect(page.getByTestId("mobile-vernetzungs-pfad")).toBeVisible();
    await expectZeroHorizontalOverflow(page, "iPhone Theorie-Brücken");

    await page.getByTestId("mobile-nav-more").click();
    await page.getByTestId("mobile-more-podcast").click();
    await expect(page.getByTestId("podcast-hub-view")).toBeVisible();
    await expectZeroHorizontalOverflow(page, "iPhone Podcast-Hub");

    // Funkloch im Zug simulieren!
    await context.setOffline(true);
    await page.getByTestId("mobile-nav-today").click();
    await expect(page.getByTestId("today-dashboard-view")).toBeVisible();
    await page.getByTestId("mobile-nav-scripts").click();
    await expect(page.getByTestId("active-anchor-sheet")).toBeVisible();
    await expectZeroHorizontalOverflow(page, "iPhone Offline-Modus");

    expect(errors).toEqual([]);
    await context.close();
  });
});
