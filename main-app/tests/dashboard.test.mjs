import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { act, create } from "react-test-renderer";
import { MemoryRouter } from "react-router-dom";
import { loadSource } from "./load-source.mjs";

const App = loadSource("src/app/App.tsx").default;
const { monthlyActivity, activityYears } = loadSource(
  "src/modules/dashboard/data/analytics.ts",
);
const { validTasks, taskStorageKey } = loadSource(
  "src/modules/dashboard/data/tasks.ts",
);
const { seedWorkspace, storageKey } = loadSource(
  "src/modules/sales/data/storage.ts",
);
const domain = loadSource("src/modules/sales/domain/workflow.ts");
const content = (node) =>
  typeof node === "string" ? node : node.children?.map(content).join("") || "";

function mount(path = "/", storage = new Map(), failWrites = false) {
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => {
      if (failWrites) throw Error("Storage is full");
      storage.set(key, value);
    },
  };
  globalThis.window = { scrollTo() {} };
  let renderer;
  act(() => {
    renderer = create(
      React.createElement(
        MemoryRouter,
        {
          initialEntries: [path],
          future: { v7_startTransition: true, v7_relativeSplatPath: true },
        },
        React.createElement(App),
      ),
    );
  });
  return {
    renderer,
    storage,
    get text() {
      return content(renderer.root);
    },
    input(label, value) {
      const input = renderer.root
        .findAllByType("input")
        .find((input) => input.props["aria-label"] === label);
      assert.ok(input, `Input ${label} exists`);
      act(() => input.props.onChange({ target: { value } }));
    },
    clickLink(href) {
      const link = renderer.root
        .findAllByType("a")
        .find((link) => link.props.href === href);
      assert.ok(link, `Link ${href} exists`);
      act(() =>
        link.props.onClick({
          button: 0,
          defaultPrevented: false,
          preventDefault() {},
          currentTarget: { getAttribute: () => null },
        }),
      );
    },
    addTask(title) {
      this.input("New task", title);
      act(() =>
        renderer.root
          .findByType("form")
          .props.onSubmit({ preventDefault() {} }),
      );
    },
    unmount() {
      act(() => renderer.unmount());
    },
  };
}

test("dashboard opens sales and returns home without changing saved records", () => {
  const state = seedWorkspace();
  const saved = JSON.stringify(state);
  const ui = mount("/", new Map([[storageKey, saved]]));
  assert.match(ui.text, /Your applications/);
  assert.match(ui.text, /Sales summaries include sample quotations/);
  assert.doesNotMatch(ui.text, /Workspace overview/);
  assert.equal(
    ui.renderer.root.findAllByProps({ "aria-disabled": "true" }).length,
    5,
  );
  ui.clickLink("/sales/quotations");
  assert.match(ui.text, /Quotations/);
  assert.doesNotMatch(ui.text, /To-do manager/);
  ui.clickLink("/");
  assert.match(ui.text, /Your applications/);
  assert.equal(ui.storage.get(storageKey), saved);
  ui.unmount();
});

test("legacy deep links retain their customer query filter", () => {
  const ui = mount("/quotations?customer=1");
  assert.match(ui.text, /Asteria Construction/);
  assert.doesNotMatch(ui.text, /To-do manager/);
  assert.ok(
    ui.renderer.root
      .findAllByType("a")
      .some((link) => link.props.href?.startsWith("/sales/quotations/")),
  );
  ui.unmount();
});

test("workspace search finds documents and navigates to their details", () => {
  const state = seedWorkspace();
  const ui = mount("/", new Map([[storageKey, JSON.stringify(state)]]));
  ui.input("Search workspace", state.sales[0].number);
  ui.clickLink(`/sales/quotations/${state.sales[0].id}`);
  assert.match(ui.text, new RegExp(state.sales[0].number));
  assert.doesNotMatch(ui.text, /Your applications/);
  ui.unmount();
});

test("tasks add, complete, survive reload, and delete independently of sales", () => {
  let ui = mount();
  ui.addTask("  Follow up on quotation  ");
  assert.match(ui.text, /1 pending/);
  assert.equal(ui.storage.has(storageKey), false);
  act(() =>
    ui.renderer.root
      .findAllByType("input")
      .find((input) => input.props.type === "checkbox")
      .props.onChange(),
  );
  assert.match(ui.text, /0 pending/);
  const storage = ui.storage;
  ui.unmount();
  ui = mount("/", storage);
  assert.match(ui.text, /Follow up on quotation/);
  assert.equal(
    ui.renderer.root
      .findAllByType("input")
      .find((input) => input.props.type === "checkbox").props.checked,
    true,
  );
  act(() =>
    ui.renderer.root
      .findByProps({ "aria-label": "Delete task: Follow up on quotation" })
      .props.onClick(),
  );
  assert.deepEqual(JSON.parse(storage.get(taskStorageKey)), []);
  ui.unmount();
});

test("task storage errors are visible and do not claim a successful save", () => {
  const ui = mount("/", new Map(), true);
  ui.addTask("Unsaved task");
  assert.match(ui.text, /Storage is full/);
  assert.match(ui.text, /0 pending/);
  assert.equal(ui.storage.has(taskStorageKey), false);
  ui.unmount();
});

test("corrupt tasks and conflicting tabs cannot overwrite stored tasks", () => {
  const storage = new Map([[taskStorageKey, "invalid JSON"]]);
  let ui = mount("/", storage);
  ui.addTask("Do not replace existing data");
  assert.equal(storage.get(taskStorageKey), "invalid JSON");
  assert.match(ui.text, /Saving is disabled/);
  ui.unmount();
  storage.set(taskStorageKey, "[]");
  ui = mount("/", storage);
  const external = JSON.stringify([
    { id: "external", title: "From another tab", completed: false },
  ]);
  storage.set(taskStorageKey, external);
  ui.addTask("Conflicting task");
  assert.equal(storage.get(taskStorageKey), external);
  assert.match(ui.text, /changed in another tab/);
  ui.unmount();
});

test("financial activity includes only posted invoices and committed purchases in the chosen year", () => {
  const workspace = seedWorkspace();
  const lines = [
    { ...domain.blankLine(), description: "Item", quantity: 2, unitPrice: 100 },
  ];
  const invoice = {
    id: "invoice",
    date: "2026-02-03",
    status: "Posted",
    lines,
    discount: 0,
    taxRate: 10,
    deduction: 50,
    payments: [],
  };
  workspace.invoices = [
    invoice,
    { ...invoice, id: "draft", status: "Draft" },
    { ...invoice, id: "cancelled", status: "Cancelled" },
    { ...invoice, id: "old", date: "2025-02-03" },
  ];
  const purchase = {
    id: "purchase",
    date: "2026-02-07",
    status: "Purchase Order",
    lines,
    taxRate: 0,
  };
  workspace.purchases = [
    purchase,
    { ...purchase, id: "received", status: "Received" },
    { ...purchase, id: "rfq", status: "RFQ" },
    { ...purchase, id: "cancelled", status: "Cancelled" },
  ];
  const months = monthlyActivity(workspace, 2026);
  assert.equal(months.length, 12);
  assert.deepEqual(months[1], { month: "Feb", invoiced: 170, purchases: 400 });
  assert.equal(months[0].invoiced, 0);
  assert.deepEqual(activityYears(workspace, 2027), [2027, 2026, 2025]);
});

test("task validation rejects malformed, duplicate, and excessively long entries", () => {
  assert.equal(validTasks([]), true);
  const task = { id: "one", title: "Call customer", completed: false };
  assert.equal(validTasks([task]), true);
  for (const tasks of [
    null,
    [null],
    [task, task],
    [{ ...task, title: " " }],
    [{ ...task, title: "a".repeat(201) }],
    [{ ...task, completed: "yes" }],
  ]) {
    assert.equal(validTasks(tasks), false);
  }
});
