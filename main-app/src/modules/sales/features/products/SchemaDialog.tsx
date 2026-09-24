import { useState } from "react";
import { Button, Field, Icon, Modal } from "../../../../shared/ui/index";
import { useWorkspace } from "../../data/WorkspaceProvider";
import {
  catalogColumns,
  validExtraColumns,
} from "../../services/catalog-schema";

export function SchemaDialog({ onClose }: { onClose: () => void }) {
  const { state, transact } = useWorkspace();
  const [extras, setExtras] = useState(state.extraColumns);
  const [newColumn, setNewColumn] = useState("");
  const [error, setError] = useState("");
  return (
    <Modal
      title="Excel schema"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          <Button
            variant="primary"
            icon="download"
            onClick={async () => {
              try {
                const { downloadSchema } = await import("../../services/excel");
                if (
                  transact((s) => {
                    s.extraColumns = extras;
                  }, "Excel schema saved")
                ) {
                  downloadSchema(extras);
                  onClose();
                }
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Save & download schema
          </Button>
        </>
      }
    >
      <p>
        Use these exact headings in your workbook. Each row is a product or
        service.
      </p>
      <h4>Required columns</h4>
      <div className="schema-chips">
        {Object.values(catalogColumns).map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
      <h4>Extra columns</h4>
      <p className="muted">
        Extra values are kept on products, quotation lines and PDFs.
      </p>
      <div className="schema-chips">
        {extras.map((h) => (
          <span key={h}>
            {h}
            <button
              aria-label={`Remove column ${h}`}
              onClick={() => setExtras(extras.filter((s) => s !== h))}
            >
              <Icon name="close" size={13} />
            </button>
          </span>
        ))}
      </div>
      <div className="attribute-row">
        <Field label="Column heading">
          <input
            value={newColumn}
            onChange={(e) => setNewColumn(e.target.value)}
            placeholder="Brand, warranty, material…"
          />
        </Field>
        <Button
          onClick={() => {
            const next = [...extras, newColumn.trim()];
            if (
              !validExtraColumns(next) ||
              newColumn.trim().toLowerCase() === "quantity"
            )
              return setError(
                "Use a unique heading of 1–60 characters. Quantity is reserved for quotation imports.",
              );
            setExtras(next);
            setNewColumn("");
            setError("");
          }}
        >
          Add
        </Button>
      </div>
      {error && (
        <p role="alert" className="alert error">
          {error}
        </p>
      )}
      <small>
        Quotation line templates include an additional Quantity column and can
        be downloaded from the quotation form.
      </small>
    </Modal>
  );
}
