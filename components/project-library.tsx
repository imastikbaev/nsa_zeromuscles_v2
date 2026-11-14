"use client";
import { useI18n } from "./preferences";
import { useEffect, useRef, useState } from "react";
import {
  FolderOpen,
  Save,
  Download,
  Upload,
  ArrowRightLeft,
  X,
  Trash2,
  Satellite,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Design } from "@/lib/data";
import { calculate } from "@/lib/engineering";
import {
  Project,
  PROJECT_LIMIT,
  MAX_IMPORT_BYTES,
  createProject,
  readProjects,
  writeProjects,
  prepareProjectLoad,
  compareDesigns,
  downloadDesign,
  decodeDesign,
} from "@/lib/projects";

export function ProjectLibrary({
  design,
  onLoad,
}: {
  design: Design;
  onLoad: (d: Design) => void;
}) {
  const { t, tx, localeTag } = useI18n();

  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState(design.name);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [removed, setRemoved] = useState<Project | null>(null);
  const [importing, setImporting] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setProjects(readProjects());
    setLoaded(true);
  }, []);
  useEffect(() => setName(design.name), [design.name]);
  const notice = (text: string, bad = false) => {
    setMessage(text);
    setError(bad);
  };
  const commit = (next: Project[]) => {
    if (!writeProjects(next)) {
      notice(
        "Could not save to this device. Export your design to keep a copy.",
        true,
      );
      return false;
    }
    setProjects(next);
    return true;
  };
  const save = (d: Design) => {
    if (projects.length >= PROJECT_LIMIT) {
      notice(
        "Your library has 12 projects. Export or remove one to make room.",
        true,
      );
      return;
    }
    const project = createProject(d);
    if (commit([project, ...projects])) {
      setSelected(project.id);
      notice(`Saved “${project.design.name}” as a separate project.`);
    }
  };
  const candidate = projects.find((p) => p.id === selected);
  const candidateMetrics = candidate ? calculate(candidate.design) : null;
  const load = (project: Project) => {
    try {
      const next = prepareProjectLoad(projects, design);
      if (!commit(next)) return;
      onLoad(structuredClone(project.design));
      notice(
        `Opened “${project.design.name}”. Your previous design is safe in the library.`,
      );
    } catch (e) {
      notice((e as Error).message, true);
    }
  };
  const importFile = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    try {
      if (file.size > MAX_IMPORT_BYTES)
        throw Error("Choose a mission file smaller than 64 KB.");
      save(decodeDesign(await file.text()));
    } catch (e) {
      notice((e as Error).message, true);
    } finally {
      setImporting(false);
      if (input.current) input.current.value = "";
    }
  };
  return (
    <section
      className={`project-library ${open ? "is-open" : ""}`}
      aria-label={t("Project library")}
    >
      <div className="library-bar">
        <button
          className="library-toggle"
          aria-expanded={open}
          aria-controls="project-library-content"
          onClick={() => setOpen(!open)}
        >
          <FolderOpen size={18} />
          <span>
            {t("Mission library")}
            <small>
              {tx(projects.length)} {t(" / ")}
              {tx(PROJECT_LIMIT)} {t(" saved projects")}
            </small>
          </span>
          <span className="library-toggle-label">
            {tx(open ? "Close" : "Open library")}
          </span>
        </button>
        <button
          className="secondary-button"
          onClick={() => downloadDesign(design)}
        >
          <Download size={14} /> {t(" Export design")}
        </button>
      </div>
      {tx(
        open && (
          <div id="project-library-content" className="library-content">
            <div className="library-intro">
              <span className="eyebrow">
                {t("YOUR IDEAS, READY FOR LIFTOFF")}
              </span>
              <h2>{t("A hangar for every possibility.")}</h2>
              <p>
                {t(
                  "Save variations, measure the trade-offs, and take a design to another device. All projects stay on this device until you export them.",
                )}
              </p>
            </div>
            <form
              className="library-save"
              onSubmit={(e) => {
                e.preventDefault();
                save({ ...design, name: name.trim() || design.name });
              }}
            >
              <label>
                {t("Save the current design as")}
                <input
                  aria-label={t("Saved project name")}
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("Name your mission variant")}
                />
              </label>
              <button
                className="primary-button"
                disabled={!loaded || importing || !name.trim()}
                type="submit"
              >
                <Save size={15} /> {t(" Save project")}
              </button>
              <button
                className="secondary-button"
                type="button"
                disabled={importing || !loaded}
                onClick={() => input.current?.click()}
              >
                <Upload size={15} />
                {tx(importing ? "Importing…" : "Import design")}
              </button>
              <input
                ref={input}
                type="file"
                accept=".json,application/json"
                aria-label={t("Import mission design file")}
                hidden
                onChange={(e) => void importFile(e.target.files?.[0])}
              />
            </form>
            {tx(
              message && (
                <div
                  className={`library-notice ${error ? "text-danger" : ""}`}
                  role="status"
                >
                  {tx(
                    error ? <AlertTriangle size={16} /> : <Check size={16} />,
                  )}
                  <span>{tx(message)}</span>
                </div>
              ),
            )}
            {tx(
              removed && (
                <div className="library-undo">
                  <span>
                    {t("Removed “")}
                    {tx(removed.design.name)}
                    {t("”.")}
                  </span>
                  <button
                    onClick={() => {
                      if (projects.length >= PROJECT_LIMIT) {
                        notice(
                          "Make room in your library before undoing.",
                          true,
                        );
                        return;
                      }
                      if (commit([removed, ...projects])) {
                        setRemoved(null);
                        notice("Project restored.");
                      }
                    }}
                  >
                    {t("Undo removal")}
                  </button>
                </div>
              ),
            )}
            {tx(
              !projects.length ? (
                <div className="library-empty">
                  <Satellite size={28} />
                  <h3>{t("Your next mission starts here.")}</h3>
                  <p>
                    {t(
                      "Save this design, then try another engine, instrument, or destination. Compare before you commit.",
                    )}
                  </p>
                </div>
              ) : (
                <div className="project-grid">
                  {tx(
                    projects.map((p) => {
                      const m = calculate(p.design);
                      return (
                        <article
                          className={`project-card ${selected === p.id ? "selected" : ""}`}
                          key={p.id}
                        >
                          <div className="project-card-top">
                            <span>
                              {tx(m.mission.name)} {t(" · ")}
                              {tx(p.design.mode)}
                            </span>
                            <button
                              aria-label={t(`Remove ${p.design.name}`)}
                              title={t("Remove project (can be undone)")}
                              onClick={() => {
                                if (
                                  commit(projects.filter((x) => x.id !== p.id))
                                ) {
                                  setRemoved(p);
                                  if (selected === p.id) setSelected(null);
                                  notice(
                                    "Project removed. You can undo below.",
                                  );
                                }
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <h3>{tx(p.design.name)}</h3>
                          <time dateTime={p.savedAt}>
                            {tx(
                              new Date(p.savedAt).toLocaleDateString(localeTag),
                            )}
                          </time>
                          <div className="project-stats">
                            <span>
                              <strong>
                                {t("$")}
                                {tx(m.cost.toFixed(1))}
                                {t("M")}
                              </strong>{" "}
                              {t(" total cost")}
                            </span>
                            <span>
                              <strong>
                                {tx(Math.round(m.science))} {t(" pts")}
                              </strong>{" "}
                              {t(" potential science")}
                            </span>
                          </div>
                          <div
                            className={`project-readiness ${m.issues.length ? "text-amber" : "text-green"}`}
                          >
                            {tx(
                              m.issues.length ? (
                                <AlertTriangle size={13} />
                              ) : (
                                <Check size={13} />
                              ),
                            )}
                            {tx(" ")}
                            {tx(
                              m.issues.length
                                ? `${m.issues.length} launch checks to resolve`
                                : "Ready for launch",
                            )}
                          </div>
                          <div className="project-actions">
                            <button
                              className="secondary-button"
                              aria-pressed={selected === p.id}
                              aria-label={t(`Compare ${p.design.name}`)}
                              onClick={() =>
                                setSelected(selected === p.id ? null : p.id)
                              }
                            >
                              <ArrowRightLeft size={13} />
                              {t("Compare")}
                            </button>
                            <button
                              className="secondary-button"
                              aria-label={t(`Open ${p.design.name}`)}
                              onClick={() => load(p)}
                            >
                              {t("Open")}
                            </button>
                            <button
                              className="icon-button"
                              aria-label={t(`Export ${p.design.name}`)}
                              onClick={() => downloadDesign(p.design)}
                            >
                              <Download size={16} />
                            </button>
                          </div>
                        </article>
                      );
                    }),
                  )}
                </div>
              ),
            )}
            {tx(
              candidate && candidateMetrics && (
                <section
                  className="design-comparison"
                  aria-label={t("Design comparison")}
                >
                  <div className="sub-heading">
                    <h3>{t("Every choice changes the equation.")}</h3>
                    <button
                      aria-label={t("Close comparison")}
                      onClick={() => setSelected(null)}
                    >
                      <X size={17} />
                    </button>
                  </div>
                  <p>
                    {t("Compare “")}
                    {tx(candidate.design.name)}
                    {t("” with your current “")}
                    {design.name}
                    {t(
                      "”. Changes show saved minus current; more is not always better.",
                    )}
                  </p>
                  {tx(
                    (candidate.design.mission !== design.mission ||
                      candidate.design.mode !== design.mode ||
                      candidate.design.scenario !== design.scenario) && (
                      <p className="text-amber">
                        {t(
                          "Different destinations or rules: budgets, power availability, and science opportunities may differ.",
                        )}
                      </p>
                    ),
                  )}
                  <div className="comparison-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>{t("Engineering metric")}</th>
                          <th>{t("Current")}</th>
                          <th>{t("Saved")}</th>
                          <th>{t("Change")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tx(
                          compareDesigns(design, candidate.design).map((r) => (
                            <tr key={r.label}>
                              <th>
                                {tx(r.label)}
                                <small>{tx(r.unit)}</small>
                              </th>
                              <td>{tx(r.current.toFixed(r.digits))}</td>
                              <td>{tx(r.candidate.toFixed(r.digits))}</td>
                              <td>
                                {tx(
                                  Math.abs(r.delta) < 0.5 * 10 ** -r.digits
                                    ? "—"
                                    : `${r.delta > 0 ? "+" : ""}${r.delta.toFixed(r.digits)}`,
                                )}
                              </td>
                            </tr>
                          )),
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="comparison-readiness">
                    <strong>
                      {tx(
                        candidateMetrics.issues.length
                          ? "Before this design can launch"
                          : "Saved design is ready for launch",
                      )}
                    </strong>
                    {tx(
                      candidateMetrics.issues.length > 0 && (
                        <ul>
                          {tx(
                            candidateMetrics.issues.map((i) => (
                              <li key={i.label}>
                                {tx(i.label)} {t(" — ")}
                                {tx(i.fix)}
                              </li>
                            )),
                          )}
                        </ul>
                      ),
                    )}
                  </div>
                  <button
                    className="primary-button"
                    onClick={() => load(candidate)}
                  >
                    {t("Open saved design ")}
                    <FolderOpen size={15} />
                  </button>
                </section>
              ),
            )}
          </div>
        ),
      )}
    </section>
  );
}
