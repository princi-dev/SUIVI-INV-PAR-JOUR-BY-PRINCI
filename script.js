// =========================================================================
// CONFIGURATION : ID mivantana avy amin'ny Google Sheets-nao
// =========================================================================
const SHEET_ID = "19C4-g_MffI9NRb8hpYusR5vOeglJLsWssuc9ZB4KzBI";
const SHEET_NAME = "SAISIE_INVENTAIRE";
const MAX_SPEEDO = 200; // Sanda farany ambony eo amin'ny compteur moto

let allRowsData = [];
let currentFilteredList = [];
let isDetailsVisible = false;

// Manoritra ny isa 0 hatramin'ny 200 eo amin'ny compteur moto
function dessinerGraduationsCompteur() {
    const ticksGroup = document.getElementById("speedoTicks");
    if (!ticksGroup) return;

    const cx = 170;
    const cy = 165;
    const rOuter = 155;
    const rInnerMajor = 138;
    const rInnerMinor = 146;
    const rText = 120;

    let svgHtml = "";

    for (let val = 0; val <= MAX_SPEEDO; val += 10) {
        const isMajor = (val % 20 === 0);
        const angleDeg = -120 + (val / MAX_SPEEDO) * 240;
        const angleRad = (angleDeg - 90) * (Math.PI / 180);

        const x1 = cx + rOuter * Math.cos(angleRad);
        const y1 = cy + rOuter * Math.sin(angleRad);
        const rIn = isMajor ? rInnerMajor : rInnerMinor;
        const x2 = cx + rIn * Math.cos(angleRad);
        const y2 = cy + rIn * Math.sin(angleRad);

        let strokeColor = isMajor ? "#ffffff" : "#9aa0a6";
        if (val <= 40) strokeColor = "#ff5252";
        else if (val >= 160) strokeColor = "#00e676";

        const strokeWidth = isMajor ? "2.8" : "1.4";
        svgHtml += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" />`;

        if (isMajor) {
            const tx = cx + rText * Math.cos(angleRad);
            const ty = cy + rText * Math.sin(angleRad) + 4;

            let textColor = "#e8eaed";
            if (val <= 40) textColor = "#ff5252";
            else if (val >= 160) textColor = "#00e676";

            svgHtml += `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" fill="${textColor}" font-size="13" font-weight="bold">${val}</text>`;
        }
    }

    ticksGroup.innerHTML = svgHtml;
}

// Manodina ny fandraitrana (aiguille) arakaraka ny isan'ny référence
function mettreAJourAiguille(count) {
    const needle = document.getElementById("needleGroup");
    if (!needle) return;

    const clampedValue = Math.min(Math.max(count, 0), MAX_SPEEDO);
    const angle = -120 + (clampedValue / MAX_SPEEDO) * 240;
    needle.style.transform = `rotate(${angle}deg)`;
}

// Maneho na manafina ny tabilao DETAILS
function toggleDetails() {
    const tableContainer = document.getElementById("tableContainer");
    const logoPlaceholder = document.getElementById("logoPlaceholder");
    const btnDetails = document.getElementById("btnToggleDetails");

    if (currentFilteredList.length === 0) {
        alert("Tsy misy angona haseho.");
        return;
    }

    isDetailsVisible = !isDetailsVisible;

    if (isDetailsVisible) {
        tableContainer.style.display = "block";
        if (logoPlaceholder) logoPlaceholder.style.display = "none";
        btnDetails.textContent = "MOINS";
    } else {
        tableContainer.style.display = "none";
        if (logoPlaceholder) logoPlaceholder.style.display = "flex";
        btnDetails.textContent = "DETAILS";
    }
}

// Apetraka ho daty androany (YYYY-MM-DD) ny champ input date
function initDateInput() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    document.getElementById("dateFilter").value = `${yyyy}-${mm}-${dd}`;
}

// Mamadika ny YYYY-MM-DD ho dd/MM/yyyy
function formatInputDateToSheetFormat(isoDate) {
    if (!isoDate) return "";
    const parts = isoDate.split("-");
    if (parts.length !== 3) return "";
    return parts.at(2) + "/" + parts.at(1) + "/" + parts.at(0);
}

// Maka ny daty dd/MM/yyyy avy amin'ny cellule DATE DE SAISI
function extractDateOnly(dateCell) {
    if (!dateCell) return "";
    const rawDateStr = dateCell.f ? String(dateCell.f) : String(dateCell.v);
    if (!rawDateStr) return "";

    if (rawDateStr.startsWith("Date(")) {
        const parts = rawDateStr.replace("Date(", "").replace(")", "").split(",");
        const annee = parts.at(0);
        const mois = String(parseInt(parts.at(1)) + 1).padStart(2, '0');
        const jour = String(parts.at(2)).padStart(2, '0');
        return `${jour}/${mois}/${annee}`;
    }

    return rawDateStr.trim().substring(0, 10);
}

// Mamorona sarintany mampifandray ny anarana tokana amin'ny binôme misy "/"
function construireMappingBinomes(targetDateStr) {
    const binomeLookup = {};
    allRowsData.forEach(row => {
        const refCell = row.c.at(0);
        const agentCell = row.c.at(1);
        const dateCell = row.c.at(2);

        if (refCell && refCell.v && dateCell) {
            const dateOnly = extractDateOnly(dateCell);
            if (dateOnly === targetDateStr) {
                const rawAgent = (agentCell && agentCell.v) ? String(agentCell.v).trim() : "";
                if (rawAgent !== "" && rawAgent.toUpperCase() !== "ORLI" && rawAgent.includes("/")) {
                    const membres = rawAgent.split("/").map(m => m.trim()).filter(m => m !== "");
                    membres.forEach(membre => {
                        const key = membre.toUpperCase();
                        if (!binomeLookup[key]) {
                            binomeLookup[key] = rawAgent;
                        }
                    });
                }
            }
        }
    });
    return binomeLookup;
}

// Manova ny anaran'ny agent ho binôme raha efa ao anaty binôme izy tamin'io daty io
function normaliserAgent(rawAgent, binomeLookup) {
    const clean = rawAgent.trim();
    if (!clean) return "Tsy voalaza";
    if (clean.includes("/")) return clean;
    const key = clean.toUpperCase();
    return binomeLookup[key] ? binomeLookup[key] : clean;
}
async function chargerDonnees() {
    const statusEl = document.getElementById("statusMsg");
    statusEl.textContent = "ACTUALISATION ENCOURS...";

    // C = REFERENCE (0), K = AGENT (1), P = DATE DE SAISI (2), L = FAMILLE (3)
    const query = encodeURIComponent("SELECT C, K, P, L WHERE C IS NOT NULL AND P IS NOT NULL");
    const host = "docs." + "google.com";
    const url = `https://${host}/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}&tq=${query}`;

    try {
        const response = await fetch(url);
        const text = await response.text();
        const jsonText = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
        const data = JSON.parse(jsonText);

        allRowsData = data.table.rows || [];

        const previousAgent = document.getElementById("agentFilter").value;
        mettreAJourListeAgents(previousAgent);
        appliquerFiltres();

        const nowTime = new Date().toLocaleTimeString('fr-FR');
        statusEl.textContent = "DERNIERE ACTUALISATION : " + nowTime;
    } catch (error) {
        console.error(error);
        document.getElementById("uniqueCount").textContent = "!";
        statusEl.textContent = "ERREUR DE CHARGEMENT.";
    }
}

function onDateChange() {
    mettreAJourListeAgents("ALL");
    appliquerFiltres();
}

function mettreAJourListeAgents(selectedToKeep) {
    const agentSelect = document.getElementById("agentFilter");
    const selectedIsoDate = document.getElementById("dateFilter").value;
    const targetDateStr = formatInputDateToSheetFormat(selectedIsoDate);
    const binomeLookup = construireMappingBinomes(targetDateStr);

    const agentsSet = new Set();

    allRowsData.forEach(row => {
        const refCell = row.c.at(0);
        const agentCell = row.c.at(1);
        const dateCell = row.c.at(2);

        if (refCell && refCell.v && dateCell) {
            const dateOnly = extractDateOnly(dateCell);
            if (dateOnly === targetDateStr) {
                const rawAgent = (agentCell && agentCell.v) ? String(agentCell.v).trim() : "Tsy voalaza";
                if (rawAgent.toUpperCase() !== "ORLI") {
                    const finalAgent = normaliserAgent(rawAgent, binomeLookup);
                    agentsSet.add(finalAgent);
                }
            }
        }
    });

    agentSelect.innerHTML = `<option value="ALL">TOUS</option>`;
    Array.from(agentsSet).sort().forEach(agent => {
        const opt = document.createElement("option");
        opt.value = agent;
        opt.textContent = agent;
        agentSelect.appendChild(opt);
    });

    if (selectedToKeep && Array.from(agentsSet).includes(selectedToKeep)) {
        agentSelect.value = selectedToKeep;
    } else {
        agentSelect.value = "ALL";
    }
}

function appliquerFiltres() {
    const countEl = document.getElementById("uniqueCount");
    const tissuEl = document.getElementById("tissuCount");
    const accessoireEl = document.getElementById("accessoireCount");
    const labelEl = document.getElementById("counterLabel");
    const tableContainer = document.getElementById("tableContainer");
    const tbody = document.getElementById("refTableBody");
    const btnDetails = document.getElementById("btnToggleDetails");

    const selectedIsoDate = document.getElementById("dateFilter").value;
    const targetDateStr = formatInputDateToSheetFormat(selectedIsoDate);
    const selectedAgent = document.getElementById("agentFilter").value;

    if (!targetDateStr) return;

    const binomeLookup = construireMappingBinomes(targetDateStr);
    const refMap = {};

    allRowsData.forEach(row => {
        const refCell = row.c.at(0);     // C : REFERENCE
        const agentCell = row.c.at(1);   // K : AGENT
        const dateCell = row.c.at(2);    // P : DATE DE SAISI
        const familleCell = row.c.at(3); // L : FAMILLE (Tissu / Accessoire)

        if (refCell && refCell.v && dateCell) {
            const refVal = String(refCell.v).trim().toUpperCase();
            const rawAgent = (agentCell && agentCell.v) ? String(agentCell.v).trim() : "Tsy voalaza";
            const rawFamille = (familleCell && familleCell.v) ? String(familleCell.v).trim().toUpperCase() : "";
            const dateOnly = extractDateOnly(dateCell);

            if (rawAgent.toUpperCase() === "ORLI") return;

            const finalAgent = normaliserAgent(rawAgent, binomeLookup);

            const matchDate = (dateOnly === targetDateStr);
            const matchAgent = (selectedAgent === "ALL" || finalAgent === selectedAgent);

            if (matchDate && matchAgent && refVal !== "") {
                if (!refMap[refVal]) {
                    refMap[refVal] = {
                        agents: new Set(),
                        famille: rawFamille
                    };
                }
                refMap[refVal].agents.add(finalAgent);
                if (!refMap[refVal].famille && rawFamille) {
                    refMap[refVal].famille = rawFamille;
                }
            }
        }
    });
   const uniqueRefsList = Object.keys(refMap);
    const totalCount = uniqueRefsList.length;

    let countTissu = 0;
    let countAccessoire = 0;

    uniqueRefsList.forEach(ref => {
        const fam = refMap[ref].famille;
        if (fam === "TISSU") {
            countTissu++;
        } else if (fam === "ACCESSOIRE") {
            countAccessoire++;
        }
    });

    countEl.textContent = totalCount;
    tissuEl.textContent = countTissu;
    accessoireEl.textContent = countAccessoire;
    mettreAJourAiguille(totalCount);

    const agentText = selectedAgent === "ALL" ? "" : ` (${selectedAgent})`;
    labelEl.textContent = `RÉF. NON DOUBLANT DU ${targetDateStr}${agentText}`;

    currentFilteredList = uniqueRefsList.map((ref, idx) => ({
        "N°": idx + 1,
        "Date Saisie": targetDateStr,
        "Référence": ref,
        "Famille": refMap[ref].famille || "-",
        "Agent": Array.from(refMap[ref].agents).join(", ")
    }));

    tbody.innerHTML = "";

    if (totalCount > 0) {
        uniqueRefsList.forEach((ref, index) => {
            const agentsArray = Array.from(refMap[ref].agents);
            const agentsHtml = agentsArray.map(a => `<span class="agent-badge">${a}</span>`).join(" ");
            const familleText = refMap[ref].famille || "-";

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${ref}</strong></td>
                <td>${familleText}</td>
                <td>${agentsHtml}</td>
            `;
            tbody.appendChild(tr);
        });

        tableContainer.style.display = isDetailsVisible ? "block" : "none";
        btnDetails.textContent = isDetailsVisible ? "MOINS" : "DETAILS";
    } else {
        isDetailsVisible = false;
        tableContainer.style.display = "none";
        btnDetails.textContent = "DETAILS";
    }
}

// Fiasa mamadika ny angona voasivana ho rakitra Excel (Entête = Agent, Corps = Références)
// Fiasa mamadika ny angona voasivana ho rakitra Excel (Misy Synthèse eo amin'ny G, H-I, J, K)
function exporterExcel() {
    if (currentFilteredList.length === 0) {
        alert("Tsy misy angona haondrana ho Excel amin'io daty na Agent io.");
        return;
    }

    const selectedIsoDate = document.getElementById("dateFilter").value;
    const selectedAgent = document.getElementById("agentFilter").value;
    const agentSuffix = selectedAgent === "ALL" ? "Tous" : selectedAgent.replace(/\s+/g, "_").replace(/\//g, "-");

    // 1. Manambatra ny références isaky ny Agent
    const groupesParAgent = {};
    currentFilteredList.forEach(item => {
        const agentName = item["Agent"] || "Tsy voalaza";
        if (!groupesParAgent[agentName]) {
            groupesParAgent[agentName] = [];
        }
        groupesParAgent[agentName].push({
            date: item["Date Saisie"],
            ref: item["Référence"],
            famille: item["Famille"]
        });
    });

    const agentsTries = Object.keys(groupesParAgent).sort();

    // 2. Kajy ho an'ny faritra 4 (Manga, Mainty, Mena, Maitso)
    const totalGeneral = currentFilteredList.length;
    let minCount = Infinity;
    let maxCount = -Infinity;
    let minAgents = [];
    let maxAgents = [];

    agentsTries.forEach(agent => {
        const count = groupesParAgent[agent].length;
        if (count < minCount) {
            minCount = count;
            minAgents = [agent];
        } else if (count === minCount) {
            minAgents.push(agent);
        }

        if (count > maxCount) {
            maxCount = count;
            maxAgents = [agent];
        } else if (count === maxCount) {
            maxAgents.push(agent);
        }
    });

    const minAgentText = minAgents.join(", ");
    const maxAgentText = maxAgents.join(", ");
    // 3. Fanomanana ny andalana eo amin'ny ankavia (A -> D)
    const leftRows = [];
    agentsTries.forEach(agent => {
        const liste = groupesParAgent[agent];
        leftRows.push({ type: "agent-header", text: `AGENT : ${agent}` });
        leftRows.push({ type: "col-header" });
        liste.forEach((row, idx) => {
            leftRows.push({ type: "data", index: idx + 1, ...row, odd: idx % 2 !== 0 });
        });
        leftRows.push({ type: "total", agent: agent, count: liste.length });
        leftRows.push({ type: "spacer" });
    });

    const totalGridRows = Math.max(leftRows.length, agentsTries.length + 4);

    // 4. Fanamboarana ny takelaka Excel (Endrika matihanina, tsy misy loko mihoatra ny tabilao)
    let tableHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://w3.org">
        <head>
            <meta charset="UTF-8">
            <style>
                body { background-color: #ffffff; }
                table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 10.5pt; }
                .no-border { border: none; background-color: transparent; }
                .cell { border: 1px solid #cbd5e1; padding: 5px 8px; }
                .agent-header { background-color: #1e3a8a; color: #ffffff; font-weight: bold; text-align: left; border: 1px solid #1e3a8a; }
                .col-header { background-color: #dbeafe; color: #1e3a8a; font-weight: bold; text-align: center; border: 1px solid #93c5fd; }
                .row-even { background-color: #ffffff; }
                .row-odd { background-color: #f8fafc; }
                .total-row { background-color: #e2e8f0; color: #0f172a; font-weight: bold; border: 1px solid #cbd5e1; }
                
                .blue-head { background-color: #1d4ed8; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #1d4ed8; }
                .blue-val { background-color: #eff6ff; color: #1e3a8a; font-weight: bold; font-size: 14pt; text-align: center; border: 1px solid #93c5fd; }

                .black-head { background-color: #1e293b; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #1e293b; }
                .black-item { background-color: #f8fafc; color: #0f172a; border: 1px solid #cbd5e1; padding: 4px 8px; }

                .red-head { background-color: #b91c1c; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #b91c1c; }
                .red-val { background-color: #fef2f2; color: #991b1b; font-weight: bold; font-size: 13pt; text-align: center; border: 1px solid #fca5a5; }
                .red-agent { background-color: #fef2f2; color: #7f1d1d; font-weight: bold; text-align: center; border: 1px solid #fca5a5; }

                .green-head { background-color: #15803d; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #15803d; }
                .green-val { background-color: #f0fdf4; color: #166534; font-weight: bold; font-size: 13pt; text-align: center; border: 1px solid #86efac; }
                .green-agent { background-color: #f0fdf4; color: #14532d; font-weight: bold; text-align: center; border: 1px solid #86efac; }
            </style>
        </head>
        <body>
        <table>
            <colgroup>
                <col width="45"><col width="105"><col width="175"><col width="120">
                <col width="25"><col width="25">
                <col width="135"><col width="180"><col width="55"><col width="165"><col width="165">
            </colgroup>
            <tbody>
    `;

    for (let r = 0; r < totalGridRows; r++) {
        tableHtml += `<tr>`;

        // Ankavia (A -> D)
        const leftItem = leftRows[r];
        if (!leftItem || leftItem.type === "spacer") {
            tableHtml += `<td colspan="4" class="no-border" style="height: 12px;"></td>`;
        } else if (leftItem.type === "agent-header") {
            tableHtml += `<td colspan="4" class="agent-header cell">${leftItem.text}</td>`;
        } else if (leftItem.type === "col-header") {
            tableHtml += `<td class="col-header cell">N°</td><td class="col-header cell">Date Saisie</td><td class="col-header cell">Référence</td><td class="col-header cell">Famille</td>`;
        } else if (leftItem.type === "data") {
            const bg = leftItem.odd ? "row-odd" : "row-even";
            tableHtml += `<td class="cell ${bg}" style="text-align: center;">${leftItem.index}</td><td class="cell ${bg}" style="text-align: center;">${leftItem.date}</td><td class="cell ${bg}"><strong>${leftItem.ref}</strong></td><td class="cell ${bg}">${leftItem.famille}</td>`;
        } else if (leftItem.type === "total") {
            tableHtml += `<td colspan="3" class="total-row cell" style="text-align: right;">TOTAL RÉFÉRENCES (${leftItem.agent}) :</td><td class="total-row cell" style="text-align: center;">${leftItem.count}</td>`;
        }

        // Elanelana (E sy F)
        tableHtml += `<td colspan="2" class="no-border"></td>`;

        // Faritra Manga (G)
        if (r === 0) tableHtml += `<td class="blue-head cell">TOTAL GÉNÉRAL</td>`;
        else if (r === 1) tableHtml += `<td class="blue-val cell">${totalGeneral}</td>`;
        else tableHtml += `<td class="no-border"></td>`;

        // Faritra Mainty (H sy I)
        if (r === 0) {
            tableHtml += `<td colspan="2" class="black-head cell">AGENTS ACTIFS (${agentsTries.length})</td>`;
        } else if (r <= agentsTries.length) {
            const ag = agentsTries[r - 1];
            tableHtml += `<td class="black-item">${ag}</td><td class="black-item" style="text-align: center; font-weight: bold;">${groupesParAgent[ag].length}</td>`;
        } else {
            tableHtml += `<td colspan="2" class="no-border"></td>`;
        }

        // Faritra Mena (J)
        if (r === 0) tableHtml += `<td class="red-head cell">MIN RÉFÉRENCE</td>`;
        else if (r === 1) tableHtml += `<td class="red-val cell">${minCount}</td>`;
        else if (r === 2) tableHtml += `<td class="red-agent cell">${minAgentText}</td>`;
        else tableHtml += `<td class="no-border"></td>`;

        // Faritra Maitso (K)
        if (r === 0) tableHtml += `<td class="green-head cell">MAX RÉFÉRENCE</td>`;
        else if (r === 1) tableHtml += `<td class="green-val cell">${maxCount}</td>`;
        else if (r === 2) tableHtml += `<td class="green-agent cell">${maxAgentText}</td>`;
        else tableHtml += `<td class="no-border"></td>`;

        tableHtml += `</tr>`;
    }

    tableHtml += `</tbody></table></body></html>`;

    const blob = new Blob(["\ufeff", tableHtml], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `Suivi_Saisie_${selectedIsoDate}_${agentSuffix}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Rehefa misokatra ny pejy dia alefa avy hatrany ireto
window.addEventListener("DOMContentLoaded", () => {
    dessinerGraduationsCompteur();
    initDateInput();
    chargerDonnees();
    setInterval(chargerDonnees, 15000);
});
