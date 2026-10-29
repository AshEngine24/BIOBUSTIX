# BIOBUSTIX — Biogas Process Simulator

Browser-local Thai educational anaerobic digestion simulator. Static ES modules, no build dependencies, login, backend, or hardware connection.

## Run

```sh
npm start
# http://localhost:4173
```

## Check

```sh
node tests/engine.test.js
```

13 model/adapter tests cover fixed timestep equivalence, fractional time, mass balance, feed/valve interruption, empty reservoirs, delayed organic loading, thermal lag, mixing, gas integration, bounded states, CSV consistency, independent persistence, and forecast isolation.

## Source

- `dist/js/engine.js`: seeded deterministic educational model, fixed 1-second Euler integration, scenario application, snapshots, history, CSV, model forecasts.
- `dist/js/adapter.js`: simulated data adapter and browser-local persistence. Future transports can replace the adapter; no MQTT/WebSocket is connected.
- `dist/js/diagram.js`: interactive SVG ProcessDiagram and animation state.
- `dist/js/components.js`: SimulationControls, EquipmentPanel, SensorPanel, TrendCharts, ForecastPanel, EventLog, ModelAssumptions.
- `dist/js/app.js`: event bindings and per-reactor UI orchestration.
- `dist/style.css`: responsive SCADA/HMI theme. Narrow screens scroll the detailed process diagram horizontally; controls and panels reflow.

Open the Model assumptions page for equations, numerical parameters, units, limitations and source references. All coefficients are chosen for demonstration, not calibrated. This is not ADM1 or a validated process model. Gas volumes are simulated measurement-condition L, not NL. ORP/EC are proxies. Hardware mapping, moisture separator, gas storage and AI Preview are explicitly conceptual.

Each reactor starts paused with 20 L working volume, 50 L wastewater, 2 L/day feed and 20 gCOD/L input. Run/Pause/speed are per-reactor. Running reactors continue while another reactor is selected; simulation freezes when the browser tab is hidden. Reload resumes saved state paused, without offline catch-up. Model history is sampled each simulation minute, plus event/current snapshots, limited to 10,081 records per reactor (up to 7 days). Local storage errors are displayed in the footer; export CSV before closing if browser quota is reached. The CSV exports the selected reactor and trend time range, including units, `data_type=simulated`, sensor readings and explicitly named true model gas rates. Accumulated gas integrates true model rates.

Forecasts clone the internal state and hold current controls constant for 6 hours. They do not drive equipment. The comparison table uses the nearest available true-rate history sample within 30 s; agreement is not evidence of validation. No trained ML or unsupported confidence/accuracy metric is presented.
