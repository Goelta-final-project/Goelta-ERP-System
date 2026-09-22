import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { act, create } from "react-test-renderer";
import { MemoryRouter } from "react-router-dom";
import { loadSource } from "./load-source.mjs";
const App = loadSource("src/App.tsx").default;
const { usePersistentState } = loadSource("src/use-persistent-state.ts");
const { storageKey, validWorkspace } = loadSource("src/storage.ts");
const d = loadSource("src/domain.ts");
const content = (node) =>
  typeof node === "string" ? node : node.children?.map(content).join("") || "";
function mount(path, map = new Map()) {
  globalThis.localStorage = {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
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
      {
        createNodeMock: (node) =>
          node.type === "dialog" ? { showModal() {} } : null,
      },
    );
  });
  const buttons = (label) =>
    renderer.root
      .findAllByType("button")
      .filter((b) => content(b).trim() === label);
  const click = (label) => {
    const matches = buttons(label);
    assert.equal(matches.length, 1, `find one button ${label}`);
    act(() => matches[0].props.onClick());
  };
  const change = (label, value, selector = "input") => {
    const field = renderer.root
      .findAllByType("label")
      .find(
        (n) => n.props.className === "field" && content(n).startsWith(label),
      );
    assert.ok(field, `field ${label} exists`);
    const input = field.findByType(selector);
    act(() =>
      input.props.onChange({ target: { value, valueAsNumber: Number(value) } }),
    );
  };
  const aria = (label, value, selector = "input") => {
    const input = renderer.root
      .findAllByType(selector)
      .find((n) => n.props["aria-label"] === label);
    assert.ok(input, `input ${label} exists`);
    act(() =>
      input.props.onChange({ target: { value, valueAsNumber: Number(value) } }),
    );
  };
  const link = (label) => {
    const node = renderer.root
      .findAllByType("a")
      .find((n) => content(n).trim() === label);
    assert.ok(node, `link ${label} exists`);
    act(() =>
      node.props.onClick({
        button: 0,
        defaultPrevented: false,
        preventDefault() {},
        currentTarget: { getAttribute: () => null },
      }),
    );
  };
  return {
    renderer,
    map,
    click,
    change,
    aria,
    link,
    get state() {
      return JSON.parse(map.get(storageKey));
    },
    get text() {
      return content(renderer.root);
    },
    unmount() {
      act(() => renderer.unmount());
    },
  };
}
test("UI: inline quotation → confirmed order → invoice notes → payment → reload", () => {
  const ui = mount("/quotations/new");
  ui.aria("Quotation title", "Integration office");
  ui.aria("Quotation description", "Phase one\nPhase two", "textarea");
  ui.change("Customer", "1", "select");
  ui.click("Add a section");
  ui.aria("Section for line 1", "Office equipment", "textarea");
  ui.click("Add a product");
  ui.aria("Product for line 2", "PRD-001", "select");
  ui.aria("Quantity for line 2", "2");
  ui.click("Add a note");
  ui.aria("Note for line 3", "Assembly included", "textarea");
  ui.change("Customer notes", "Original order note", "textarea");
  ui.click("Save");
  let q = ui.state.sales.find((s) => s.title === "Integration office");
  assert.ok(q);
  assert.equal(q.lines.length, 3);
  assert.equal(q.recipients.length, 2);
  assert.match(ui.text, /Phase one\nPhase two/);
  assert.equal(q.status, "Draft");
  ui.click("Confirm order");
  assert.equal(ui.state.sales.find((s) => s.id === q.id).status, "Accepted");
  ui.click("Create invoice");
  ui.click("Create draft invoice");
  let i = ui.state.invoices[0];
  assert.equal(i.saleId, q.id);
  assert.equal(i.notes, "Original order note");
  ui.change(
    "Notes & terms",
    "Invoice note\nDelivered to floor two",
    "textarea",
  );
  ui.click("Save changes");
  ui.click("Confirm / Post");
  assert.equal(ui.state.invoices[0].status, "Posted");
  ui.click("Register payment");
  ui.change("Amount ($)", "500");
  ui.change("Payment reference", "TEST-REFERENCE");
  ui.click("Record payment");
  assert.equal(d.amountDue(ui.state.invoices[0]), 2000);
  assert.match(ui.text, /Partially paid/);
  assert.equal(validWorkspace(ui.state), true);
  const map = ui.map;
  ui.unmount();
  const restored = mount(`/invoices/${i.id}`, map);
  assert.match(restored.text, /Invoice note\nDelivered to floor two/);
  assert.match(restored.text, /TEST-REFERENCE/);
  assert.match(restored.text, /\$2,000.00/);
  restored.unmount();
});
test("UI: RFQ creation, vendor costs, order confirmation and stock receipt", () => {
  const ui = mount("/purchases/new");
  ui.change("Vendor", "Integration supplier");
  ui.change("Vendor email", "vendor@example.com");
  ui.click("Add a product");
  ui.aria("Product for line 1", "PRD-001", "select");
  ui.aria("Quantity for line 1", "3");
  ui.aria("Unit price for line 1", "800");
  ui.change("Notes & terms", "Deliver on weekdays", "textarea");
  ui.click("Save");
  const id = ui.state.purchases[0].id;
  assert.equal(ui.state.purchases[0].status, "RFQ");
  ui.click("Confirm order");
  assert.equal(ui.state.purchases[0].status, "Purchase Order");
  ui.click("Receive products");
  ui.click("Validate receipt");
  assert.equal(ui.state.purchases[0].status, "Received");
  assert.equal(ui.state.products.find((p) => p.id === "PRD-001").available, 21);
  assert.equal(validWorkspace(ui.state), true);
  const map = ui.map;
  ui.unmount();
  const restored = mount(`/purchases/${id}`, map);
  assert.match(restored.text, /Deliver on weekdays/);
  assert.match(restored.text, /Received/);
  restored.unmount();
});
test("UI: customers retain nameless contacts and recipient profiles without subcontracts", () => {
  const ui = mount("/customers/new");
  ui.aria("Company name", "Integration company");
  ui.change("Email", "main@example.com");
  ui.change("City", "Colombo");
  ui.click("Add contact");
  ui.change("Position", "Engineer");
  const fields = ui.renderer.root
    .findAllByType("label")
    .filter(
      (n) => n.props.className === "field" && content(n).startsWith("Email"),
    );
  act(() =>
    fields[1]
      .findByType("input")
      .props.onChange({ target: { value: "engineer@example.com" } }),
  );
  const tab = ui.renderer.root
    .findAllByProps({ role: "tab" })
    .find((n) => content(n).startsWith("Quotation recipients"));
  act(() => tab.props.onClick());
  ui.click("Add profile");
  ui.change("Profile name", "Engineering team");
  const snapshot = ui.renderer.root
    .findAllByType("label")
    .find(
      (n) =>
        n.props.className === "field" &&
        content(n).startsWith("Main recipient (To)"),
    )
    .findByType("select");
  const contactId = snapshot
    .findAllByType("option")
    .find((n) => content(n).includes("Engineer")).props.value;
  ui.change("Main recipient (To)", contactId, "select");
  const defaultField = ui.renderer.root
    .findAllByType("label")
    .find(
      (n) =>
        n.props.className === "field" &&
        content(n).startsWith("Default profile"),
    );
  const profileId = defaultField.findByType("select").findAllByType("option")[1]
    .props.value;
  ui.change("Default profile", profileId, "select");
  ui.click("Save");
  assert.equal(ui.map.has(storageKey), true, ui.text);
  const c = ui.state.companies.find((c) => c.name === "Integration company");
  assert.equal(c.contacts[0].name, "");
  assert.equal(c.profiles[0].to, c.contacts[0].id);
  assert.equal(c.defaultProfileId, c.profiles[0].id);
  assert.doesNotMatch(ui.text, /subcontract/i);
  assert.equal(validWorkspace(ui.state), true);
  ui.unmount();
});
test("UI: invalid save stays in the quotation form and explains the failure", () => {
  const ui = mount("/quotations/new");
  ui.click("Save");
  assert.match(ui.text, /Select an active customer/);
  assert.ok(
    ui.renderer.root
      .findAllByType("input")
      .some((n) => n.props["aria-label"] === "Quotation title"),
  );
  assert.equal(ui.map.has(storageKey), false);
  ui.unmount();
});
test("persistence rejects conflicting tabs, write failures, and corrupt stored data", () => {
  const map = new Map();
  globalThis.localStorage = {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
  };
  function probe() {
    let latest;
    function Probe() {
      latest = usePersistentState("test-store", [], Array.isArray);
      return null;
    }
    let view;
    act(() => {
      view = create(React.createElement(Probe));
    });
    return {
      get value() {
        return latest;
      },
      close() {
        act(() => view.unmount());
      },
    };
  }
  const first = probe(),
    second = probe();
  act(() => assert.equal(first.value.commit(["saved"]), true));
  act(() => assert.equal(second.value.commit(["conflict"]), false));
  assert.match(second.value.error, /another tab/);
  assert.equal(map.get("test-store"), '["saved"]');
  localStorage.setItem = () => {
    throw Error("Quota exceeded");
  };
  act(() => assert.equal(first.value.commit(["lost"]), false));
  assert.deepEqual(first.value.value, ["saved"]);
  first.close();
  second.close();
  map.set("test-store", "{invalid");
  const broken = probe();
  act(() => assert.equal(broken.value.commit([]), false));
  assert.equal(map.get("test-store"), "{invalid");
  broken.close();
});
