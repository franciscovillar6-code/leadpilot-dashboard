import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import "./styles.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function App() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .not("ai_analysis", "is", null)
      .order("score", { ascending: false });

    if (error) {
      console.error(error);
      setError("No se pudieron cargar los leads.");
      setLoading(false);
      return;
    }

    setLeads(data || []);
    setLoading(false);
  }

  const totals = useMemo(() => {
    return {
      total: leads.length,
      high: leads.filter((lead) => lead.priority === "high").length,
      medium: leads.filter((lead) => lead.priority === "medium").length,
      low: leads.filter((lead) => lead.priority === "low").length,
    };
  }, [leads]);

  function getAnswer(answers, ...terms) {
    if (!answers) return "";

    const key = Object.keys(answers).find((currentKey) => {
      const normalized = currentKey.toLowerCase();

      return terms.some((term) =>
        normalized.includes(term.toLowerCase())
      );
    });

    if (!key) return "";

    const value = answers[key];

    return Array.isArray(value)
      ? value.join(", ")
      : String(value ?? "");
  }

  function normalizeLead(row) {
    const ai = row.ai_analysis || {};
    const answers = row.answers || {};

    return {
      ...row,
      name:
        getAnswer(answers, "Nombre Viajero Principal") ||
        ai.customerInfo ||
        "Sin nombre",
      email: getAnswer(answers, "Mail de contacto"),
      phone: getAnswer(answers, "Wpp de Contacto"),
      destination: ai.destination || "Sin definir",
      travelers: ai.travelers ?? 0,
      startDate: ai.startDate || "",
      endDate: ai.endDate || "",
      budget: ai.budget ?? 0,
      intent: ai.intent || "Sin analizar",
      nextAction: ai.nextAction || "",
      missingInfo: ai.missingInfo || [],
      scoreReason: ai.scoreReason || "",
      suggestedResponse: ai.suggestedResponse || "",
      scoreFactors: ai.scoreFactors || [],
      intentLevel: ai.intentLevel || row.priority || "low",
    };
  }

  const normalizedLeads = leads.map(normalizeLead);

  if (loading) {
    return (
      <div className="screen-message">
        Cargando LeadPilot...
      </div>
    );
  }

  if (error) {
    return (
      <div className="screen-message error">
        {error}
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>
            LeadPilot <span>AI</span>
          </h1>
          <p>Priorización inteligente de oportunidades</p>
        </div>

        <button className="refresh" onClick={loadLeads}>
          Actualizar
        </button>
      </header>

      <main className="content">
        <section className="metrics">
          <div className="metric">
            <strong>{totals.total}</strong>
            <span>Total de Leads</span>
          </div>

          <div className="metric">
            <strong>{totals.high}</strong>
            <span>Alta Prioridad</span>
          </div>

          <div className="metric">
            <strong>{totals.medium}</strong>
            <span>Media Prioridad</span>
          </div>

          <div className="metric">
            <strong>{totals.low}</strong>
            <span>Baja Prioridad</span>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Panel de leads</h2>
              <p>
                Leads analizados automáticamente por Gemini
              </p>
            </div>
          </div>

          {normalizedLeads.length === 0 ? (
            <div className="empty">
              No hay leads analizados todavía.
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Destino</th>
                    <th>Viajeros</th>
                    <th>Fechas</th>
                    <th>Presupuesto</th>
                    <th>Score</th>
                    <th>Prioridad</th>
                    <th>Intención</th>
                  </tr>
                </thead>

                <tbody>
                  {normalizedLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                    >
                      <td>
                        <strong>{lead.name}</strong>
                        <small>{lead.email}</small>
                      </td>

                      <td>{lead.destination}</td>

                      <td>{lead.travelers || "—"}</td>

                      <td>
                        {lead.startDate || lead.endDate
                          ? `${lead.startDate || "—"} ${
                              lead.endDate
                                ? `→ ${lead.endDate}`
                                : ""
                            }`
                          : "Sin definir"}
                      </td>

                      <td>
                        {lead.budget > 0
                          ? `USD ${lead.budget.toLocaleString()}`
                          : "Sin definir"}
                      </td>

                      <td>
                        <span className="score">
                          {lead.score}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`priority ${lead.priority}`}
                        >
                          {lead.priority === "high"
                            ? "Alta"
                            : lead.priority === "medium"
                              ? "Media"
                              : "Baja"}
                        </span>
                      </td>

                      <td>{lead.intent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {selectedLead && (
        <div
          className="overlay"
          onClick={() => setSelectedLead(null)}
        >
          <aside
            className="drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="close"
              onClick={() => setSelectedLead(null)}
            >
              ×
            </button>

            <div className="drawer-score">
              <strong>{selectedLead.score}</strong>
              <span>/100</span>
            </div>

            <h2>{selectedLead.name}</h2>
            <p className="destination">
              {selectedLead.destination}
            </p>

            <section>
              <h3>Razonamiento de IA</h3>
              <p>{selectedLead.scoreReason}</p>
            </section>

            <section>
              <h3>Datos faltantes</h3>

              {selectedLead.missingInfo.length ? (
                <ul>
                  {selectedLead.missingInfo.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p>No se detectaron datos críticos faltantes.</p>
              )}
            </section>

            <section>
              <h3>Próxima acción</h3>
              <p>{selectedLead.nextAction}</p>
            </section>

            <section>
              <h3>Respuesta sugerida</h3>
              <div className="suggested">
                {selectedLead.suggestedResponse}
              </div>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
