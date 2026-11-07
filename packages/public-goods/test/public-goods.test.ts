import { describe, expect, it } from "vitest";
import { csvObjects, ellipseLevel, ELLIPSE_ACTIVITY, PUBLIC_GOODS, parseCsv } from "../src";
import { Activity } from "@teacher-gate/core";

describe("public goods", () => {
  it("parses RFC 4180 CSV with quotes, doubled quotes and newlines", () => {
    expect(parseCsv('a,b\n"x, ""y""","line1\nline2"\n')).toEqual([["a", "b"], ['x, "y"', "line1\nline2"]]);
    expect(csvObjects("﻿h1,h2\r\n1,2\r\n")).toEqual([{ h1: "1", h2: "2" }]);
  });
  it("maps ELLIPSE half-point scores to levels and builds a valid activity", () => {
    expect([1, 1.5, 2.5, 3, 4.5, 5].map(ellipseLevel)).toEqual(["l1", "l2", "l3", "l3", "l5", "l5"]);
    expect(Activity.safeParse(ELLIPSE_ACTIVITY).success).toBe(true);
  });
  it("records every good once, and gives placeholders only to unreleased goods", () => {
    expect(new Set(PUBLIC_GOODS.map((g) => g.id)).size).toBe(PUBLIC_GOODS.length);
    for (const g of PUBLIC_GOODS.filter((g) => g.placeholder !== undefined)) expect(g.status).toBe("not-released");
  });
});
