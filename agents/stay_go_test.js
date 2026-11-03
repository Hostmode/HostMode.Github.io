// Checks the Stay & Go money math (the sg-math block in js/17a-stay-go.js) on its own, without a browser.
// Run: node agents/stay_go_test.js   (exit 0 = every check passed)
// It also runs a self-test with planted mistakes, so a checker that silently passes everything is caught.
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "..", "js", "17a-stay-go.js"), "utf8");
const m = /\/\* sg-math:start[\s\S]*?\*\/([\s\S]*?)\/\* sg-math:end \*\//.exec(src);
if (!m) { console.error("Couldn't find the sg-math block"); process.exit(1); }
const SG = new Function(m[1] + "\nreturn SG;")();

let fails = 0, checks = 0;
function eq(label, got, want) {
  checks++;
  const a = JSON.stringify(got), b = JSON.stringify(want);
  if (a !== b) { fails++; console.log("FAIL " + label + "\n  got  " + a + "\n  want " + b); }
}

// money parsing never uses floating point
eq("cents 450", SG.cents("450"), 45000);
eq("cents 1,234.5", SG.cents("$1,234.5"), 123450);
eq("cents 0.07", SG.cents("0.07"), 7);
eq("cents 19.99", SG.cents("19.99"), 1999);
eq("cents blank", SG.cents(""), 0);
eq("cents 3 decimals", isNaN(SG.cents("1.234")), true);
eq("cents negative", isNaN(SG.cents("-5")), true);
eq("cents letters", isNaN(SG.cents("abc")), true);
eq("plain", SG.plain(123405), "1234.05");
eq("fmt", SG.fmt(123405, "USD"), "$1,234.05");

// even split always adds up exactly
eq("even 100.00 / 3", SG.even(10000, ["a", "b", "c"]), { a: 3334, b: 3333, c: 3333 });
eq("even sum", SG.sum(SG.even(100001, ["a", "b", "c", "d", "e", "f", "g"])), 100001);
eq("even nobody", SG.even(5000, []), {});

// the scenario from the spec: a shared rental, partial payments, an overdue share, a credit
const today = "2026-11-03";
const costs = [
  { key: "r:house", total: 120000, owe: { ana: 40000, ben: 40000, cy: 40000 }, due: "2026-11-01" }, // overdue
  { key: "r:car", total: 30000, owe: { ana: 15000, ben: 15000 }, due: "2026-12-01" },
  { key: "e:food", total: 9000, owe: { ana: 3000, ben: 3000, cy: 3000 }, due: "" },
];
const pays = [
  { k: "p1", mid: "ana", amt: 58000, alloc: { "r:house": 40000, "r:car": 15000, "e:food": 3000 } }, // paid in full
  { k: "p2", mid: "ben", amt: 20000, alloc: { "r:house": 20000 } },                                // partial
  { k: "p3", mid: "cy", amt: 50000, alloc: { "r:house": 40000, "e:food": 3000 } },               // 7000 not applied
];
const lg = SG.ledger(costs, pays, today);
eq("group total", lg.total, 159000);
eq("group split", lg.split, 159000);
eq("group paid", lg.paid, 128000);
eq("ana paid", [lg.people.ana.bal, lg.people.ana.st], [0, "paid"]);
eq("ben partial and overdue", [lg.people.ben.owed, lg.people.ben.paid, lg.people.ben.bal, lg.people.ben.overdue, lg.people.ben.st], [58000, 20000, 38000, 20000, "overdue"]);
eq("cy credit", [lg.people.cy.bal, lg.people.cy.unapplied, lg.people.cy.st], [-7000, 7000, "paid"]);
eq("still owed", lg.out, 38000);
eq("credit", lg.credit, 7000);
eq("overdue", lg.overdue, 20000);
eq("ben next due", lg.people.ben.next, "2026-11-01");

// a payment can't count for more than the person's share
const over = SG.ledger([{ key: "r:x", total: 1000, owe: { a: 1000 }, due: "" }], [{ mid: "a", amt: 1500, alloc: { "r:x": 1500 } }], today);
eq("over-allocated is capped", [over.people.a.used, over.people.a.unapplied, over.people.a.bal], [1000, 500, -500]);

// unsplit part of a cost is reported
eq("unsplit", SG.ledger([{ key: "r:y", total: 5000, owe: { a: 3000 } }], [], today).unsplit, 2000);

// automatic allocation: soonest due first, then no-due last
eq("auto ben", SG.auto(costs, pays, "ben", 30000), { "r:house": 20000, "r:car": 10000 });
eq("auto too much", SG.auto(costs, pays, "ben", 99999), { "r:house": 20000, "r:car": 15000, "e:food": 3000 });
eq("auto nothing owed", SG.auto(costs, pays, "ana", 1000), {});
eq("left excluding p2", SG.left(costs, pays, "ben", "r:house", "p2"), 40000);

// paid to the company
eq("pstat paid", SG.pstat(1000, 1000, "", today, false), "paid");
eq("pstat overdue", SG.pstat(1000, 200, "2026-10-01", today, false), "overdue");
eq("pstat part", SG.pstat(1000, 200, "2026-12-01", today, false), "part");
eq("pstat cancelled", SG.pstat(1000, 0, "", today, true), "cancelled");

// self-test: these planted mistakes must be caught
const before = fails;
const quiet = console.log; console.log = () => {};
eq("planted 1", SG.cents("10.50"), 1049);
eq("planted 2", SG.even(100, ["a", "b", "c"]), { a: 33, b: 33, c: 33 });
console.log = quiet;
const caught = fails - before; fails = before; checks -= 2;
if (caught !== 2) { console.log("SELF-TEST FAILED: the checker missed a planted mistake"); process.exit(1); }

console.log(fails ? `${fails} of ${checks} checks failed` : `All ${checks} Stay & Go money checks passed (self-test caught 2 of 2 planted mistakes)`);
process.exit(fails ? 1 : 0);
