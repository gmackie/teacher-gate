// Runs axe-core (WCAG 2.0, 2.1 and 2.2 A and AA rules) on every state of the demo: the teacher's
// review, release, a language rewrite, the student's view, the class brief and goal monitoring.
// Passing means no automated violations were found; it is not a full WCAG conformance audit,
// which needs manual testing with assistive technology too.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function audit(page: Page, state: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = violations.map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.map((n) => n.target.join(" ")).join("; ")}`);
  expect(summary, `axe violations in state "${state}"`).toEqual([]);
}

test("feedback: review, release, rewrite and the student's view", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Connected\. Model: scripted\/a11y-audit/)).toBeVisible();
  await audit(page, "start");

  await page.getByRole("button", { name: "Draft AI feedback" }).click();
  await expect(page.getByRole("heading", { name: "Finding 1: Claim" })).toBeVisible();
  await audit(page, "teacher review, undecided");

  // Reject one, edit one, accept one.
  const finding = (n: number) => page.locator("li.tg-finding").filter({ has: page.getByRole("heading", { name: new RegExp(`^Finding ${n}:`) }) });
  await finding(1).getByRole("button", { name: "Reject", exact: true }).click();
  await audit(page, "reject form open");
  await finding(1).getByRole("button", { name: "Confirm reject" }).click();
  await finding(2).getByRole("button", { name: "Edit", exact: true }).click();
  await audit(page, "edit form open");
  await finding(2).getByRole("textbox").fill("You give one time. Next, give the time for each plate.");
  await finding(2).getByRole("button", { name: "Save edit" }).click();
  await finding(3).getByRole("button", { name: "Accept", exact: true }).click();
  await audit(page, "all decided");

  await page.getByRole("button", { name: /^Release/ }).click();
  await expect(page.getByRole("heading", { name: "Language and reading level" })).toBeVisible();
  await audit(page, "released, rewrite panel");

  await page.getByLabel("Reading level", { exact: true }).selectOption("5");
  await page.getByRole("button", { name: "Draft rewrite" }).click();
  await expect(page.getByRole("button", { name: "Approve for the student" })).toBeVisible();
  await audit(page, "rewrite drafted");
  await page.getByRole("button", { name: "Approve for the student" }).click();
  await expect(page.getByText("approved", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /^Student view/ }).click();
  await expect(page.getByLabel("Show my feedback in")).toBeVisible();
  await audit(page, "student view, teacher's words");
  await page.getByLabel("Show my feedback in").selectOption({ label: "Spanish, grade 5 reading level" });
  await expect(page.getByText(/Versión reescrita/).first()).toBeVisible();
  await audit(page, "student view, rewrite");
});

test("class misconception brief", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Class misconception brief" }).click();
  await audit(page, "brief, before drafting");
  await page.getByRole("button", { name: "Draft brief" }).click();
  await expect(page.getByRole("button", { name: /Save/ }).first()).toBeVisible();
  await audit(page, "brief review");
});

test("goals and monitoring", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Goals and monitoring" }).click();
  await audit(page, "goal form");
  await page.getByRole("button", { name: "Create goal" }).click();
  await page.getByRole("button", { name: "Dry run" }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await audit(page, "dry run");
  for (const [who, met] of [["student-A", "Met"], ["student-B", "Not met"], ["student-C", "Met"]] as const) {
    await page.getByRole("group", { name: `Your judgement for ${who}` }).getByRole("button", { name: met, exact: true }).click();
  }
  await page.getByRole("button", { name: "Record the AI's judgements" }).click();
  await page.getByRole("button", { name: "Compare with my judgements" }).click();
  await expect(page.getByRole("heading", { name: "Agreement report" })).toBeVisible();
  await audit(page, "agreement report");
});

test("control: the audit does report violations when there are some", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Connected\./)).toBeVisible();
  // Plant two known violations: an image without alt text and low-contrast text.
  await page.evaluate(() => {
    const img = document.createElement("img");
    img.src = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
    const p = document.createElement("p");
    p.textContent = "Hard to read";
    p.style.color = "#ccc";
    p.style.background = "#fff";
    document.querySelector("main")!.append(img, p);
  });
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(violations.map((v) => v.id)).toEqual(expect.arrayContaining(["image-alt", "color-contrast"]));
});
