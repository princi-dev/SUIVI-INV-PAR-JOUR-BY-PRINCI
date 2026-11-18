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

    // C = REFERENCE (0), K = AGENT (1), P = DATE DE SAISI (2), L = FAMILLE (3), G = ELEMENT (4)
    const query = encodeURIComponent("SELECT C, K, P, L, G WHERE C IS NOT NULL AND P IS NOT NULL");
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

// Fiasa mamadika ny angona voasivana ho rakitra Excel (AGENTS ACTIFS voasaraka sy tsy misy doublon)
function exporterExcel() {
    if (currentFilteredList.length === 0) {
        alert("Tsy misy angona haondrana ho Excel amin'io daty na Agent io.");
        return;
    }

    const selectedIsoDate = document.getElementById("dateFilter").value;
    const targetDateStr = formatInputDateToSheetFormat(selectedIsoDate);
    const selectedAgent = document.getElementById("agentFilter").value;
    const agentSuffix = selectedAgent === "ALL" ? "Tous" : selectedAgent.replace(/\s+/g, "_").replace(/\//g, "-");

    // 1. Manisa mivantana ny isan'ny ELEMENT vitan'ny agent/binôme tsirairay avy amin'ny allRowsData
    const binomeLookup = construireMappingBinomes(targetDateStr);
    const localElementsCount = {};

    allRowsData.forEach(row => {
        const refCell = row.c.at(0);     // C : REFERENCE
        const agentCell = row.c.at(1);   // K : AGENT
        const dateCell = row.c.at(2);    // P : DATE DE SAISI
        const elementCell = row.c.at(4); // G : ELEMENT

        if (refCell && refCell.v && dateCell) {
            const rawAgent = (agentCell && agentCell.v) ? String(agentCell.v).trim() : "Tsy voalaza";
            const rawElement = (elementCell && elementCell.v) ? String(elementCell.v).trim() : "";
            const dateOnly = extractDateOnly(dateCell);

            if (rawAgent.toUpperCase() === "ORLI") return;

            const finalAgent = normaliserAgent(rawAgent, binomeLookup);
            const matchDate = (dateOnly === targetDateStr);
            const matchAgent = (selectedAgent === "ALL" || finalAgent === selectedAgent);

            if (matchDate && matchAgent) {
                if (!localElementsCount[finalAgent]) localElementsCount[finalAgent] = 0;
                if (rawElement !== "") localElementsCount[finalAgent] += 1;
            }
        }
    });

    // 2. Manambatra ny références isaky ny groupe (ankavia A -> D) sy isaky ny agent tokana (ankavanana H -> I)
    const groupesParAgent = {};
    const agentsIndividuelsMap = {}; // Mitahiry ny anarana tokana tsy misy doublon sy ny totaliny

    currentFilteredList.forEach(item => {
        const agentGroupe = item["Agent"] || "Tsy voalaza";
        if (!groupesParAgent[agentGroupe]) {
            groupesParAgent[agentGroupe] = [];
        }
        groupesParAgent[agentGroupe].push({
            date: item["Date Saisie"],
            ref: item["Référence"],
            famille: item["Famille"]
        });

        // Manasaraka ny "/" sy "," mba hahazoana ny anarana tokana tsirairay (tsy misy doublon)
        const nomsSepares = agentGroupe.split(/[\/,]/).map(n => n.trim()).filter(n => n !== "");
        const dejaComptePourCetteRef = new Set();

        nomsSepares.forEach(nom => {
            const cle = nom.toUpperCase();
            if (!dejaComptePourCetteRef.has(cle)) {
                dejaComptePourCetteRef.add(cle);
                if (!agentsIndividuelsMap[cle]) {
                    agentsIndividuelsMap[cle] = { nomAffiche: nom, total: 0 };
                }
                agentsIndividuelsMap[cle].total += 1;
            }
        });
    });

    const agentsTries = Object.keys(groupesParAgent).sort();
    const agentsIndividuelsTries = Object.values(agentsIndividuelsMap).sort((a, b) =>
        a.nomAffiche.localeCompare(b.nomAffiche, 'fr', { sensitivity: 'base' })
    );

    // 3. Kajy MIN sy MAX (Raha mitovy ny Référence, dia jerena ny ELEMENT)
    const totalGeneral = currentFilteredList.length;
    let minCount = Infinity;
    let minElem = Infinity;
    let minAgents = [];

    let maxCount = -Infinity;
    let maxElem = -Infinity;
    let maxAgents = [];

    agentsTries.forEach(agent => {
        const refCount = groupesParAgent[agent].length;
        const elemCount = localElementsCount[agent] || 0;

        if (refCount < minCount || (refCount === minCount && elemCount < minElem)) {
            minCount = refCount;
            minElem = elemCount;
            minAgents = [agent];
        } else if (refCount === minCount && elemCount === minElem) {
            minAgents.push(agent);
        }

        if (refCount > maxCount || (refCount === maxCount && elemCount > maxElem)) {
            maxCount = refCount;
            maxElem = elemCount;
            maxAgents = [agent];
        } else if (refCount === maxCount && elemCount === maxElem) {
            maxAgents.push(agent);
        }
    });

    const minAgentText = `${minAgents.join(", ")} (${minElem} élém.)`;
    const maxAgentText = `${maxAgents.join(", ")} (${maxElem} élém.)`;

    // 4. Fanomanana ny andalana eo amin'ny ankavia (A -> D)
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

    const totalGridRows = Math.max(leftRows.length, agentsIndividuelsTries.length + 4);
    const finalGridRows = Math.max(totalGridRows, 7);
    const bdr = "border: 1px solid #94a3b8;";
      // 5. Fanamboarana ny takelaka Excel (Mitovy haavo tsara daholo ny lignes rehetra)
            let tableHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://w3.org">
        <head>
            <meta charset="UTF-8">
            <!--[if gte mso 9]>
            <xml>
                <x:ExcelWorkbook>
                    <x:ExcelWorksheets>
                        <x:ExcelWorksheet>
                            <x:Name>Suivi Saisie</x:Name>
                            <x:WorksheetOptions>
                                <x:DisplayGridlines/>
                            </x:WorksheetOptions>
                        </x:ExcelWorksheet>
                    </x:ExcelWorksheets>
                </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
                .col-hidden { mso-width-source: userset; mso-width-alt: 0; width: 0pt; display: none; }
            </style>
        </head>
        <body>
        <table style="border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 11pt;">
            <colgroup>
                <col width="45"><col width="105"><col width="175"><col width="125">
                <col width="25"><col width="25"><col width="25">
                <col width="185"><col width="55"><col width="190"><col width="190">
                <col width="25">
                <col span="16372" class="col-hidden" style="display:none; width:0px;">
            </colgroup>
            <tbody>

    `;

    const cellPad = "padding: 3px 8px; vertical-align: middle;";

    for (let r = 0; r < finalGridRows; r++) {
        // Apetraka ho 24px mitovy daholo ny haavon'ny andalana tsirairay
                // Ligne 3 (r === 2) dia atao 36px, ny ambiny mijanona 24px
        const rowHeight = (r === 2) ? "36px" : "24px";
        tableHtml += `<tr style="height: ${rowHeight};">`;


        // 1. Ankavia : Tabilao isaky ny Agent (A -> D)
        const leftItem = leftRows[r];
        if (!leftItem || leftItem.type === "spacer") {
            tableHtml += `<td colspan="4" style="${cellPad}"></td>`;
        } else if (leftItem.type === "agent-header") {
            tableHtml += `<td colspan="4" style="background-color: #1f4e78; color: #ffffff; font-weight: bold; text-align: left; ${cellPad} ${bdr}">${leftItem.text}</td>`;
        } else if (leftItem.type === "col-header") {
            tableHtml += `
                <td style="background-color: #d9e1f2; color: #1f4e78; font-weight: bold; text-align: center; ${cellPad} ${bdr}">N°</td>
                <td style="background-color: #d9e1f2; color: #1f4e78; font-weight: bold; text-align: center; ${cellPad} ${bdr}">Date Saisie</td>
                <td style="background-color: #d9e1f2; color: #1f4e78; font-weight: bold; text-align: center; ${cellPad} ${bdr}">Référence</td>
                <td style="background-color: #d9e1f2; color: #1f4e78; font-weight: bold; text-align: center; ${cellPad} ${bdr}">Famille</td>
            `;
        } else if (leftItem.type === "data") {
            const bg = leftItem.odd ? "#f8fafc" : "#ffffff";
            tableHtml += `
                <td style="background-color: ${bg}; text-align: center; ${cellPad} ${bdr}">${leftItem.index}</td>
                <td style="background-color: ${bg}; text-align: center; ${cellPad} ${bdr}">${leftItem.date}</td>
                <td style="background-color: ${bg}; font-weight: bold; ${cellPad} ${bdr}">${leftItem.ref}</td>
                <td style="background-color: ${bg}; ${cellPad} ${bdr}">${leftItem.famille}</td>
            `;
        } else if (leftItem.type === "total") {
            tableHtml += `
                <td colspan="3" style="background-color: #e9edf4; color: #1f4e78; font-weight: bold; text-align: right; ${cellPad} ${bdr}">TOTAL RÉFÉRENCES (${leftItem.agent}) :</td>
                <td style="background-color: #e9edf4; color: #1f4e78; font-weight: bold; text-align: center; ${cellPad} ${bdr}">${leftItem.count}</td>
            `;
        }

        // 2. Elanelana (E, F, G)
        tableHtml += `<td colspan="3"></td>`;

        // 3. Faritra Mainty (H sy I) : Lisitry ny Agent tokana tsy misy doublon
        if (r === 0) {
            tableHtml += `<td colspan="2" style="background-color: #1e293b; color: #ffffff; font-weight: bold; text-align: center; ${cellPad} ${bdr}">AGENTS ACTIFS (${agentsIndividuelsTries.length})</td>`;
        } else if (r <= agentsIndividuelsTries.length) {
            const agObj = agentsIndividuelsTries[r - 1];
            const rowBg = (r % 2 === 0) ? "#f8fafc" : "#ffffff";
            tableHtml += `
                <td style="background-color: ${rowBg}; color: #0f172a; ${cellPad} ${bdr}">${agObj.nomAffiche}</td>
                <td style="background-color: ${rowBg}; color: #0f172a; font-weight: bold; text-align: center; ${cellPad} ${bdr}">${agObj.total}</td>
            `;
        } else {
            tableHtml += `<td colspan="2"></td>`;
        }

        // 4. Faritra Ankavanana (J sy K) : MIN, MAX, ary TOTAL GÉNÉRAL
        if (r === 0) {
            tableHtml += `
                <td style="background-color: #b91c1c; color: #ffffff; font-weight: bold; text-align: center; ${cellPad} ${bdr}">MIN RÉFÉRENCE</td>
                <td style="background-color: #15803d; color: #ffffff; font-weight: bold; text-align: center; ${cellPad} ${bdr}">MAX RÉFÉRENCE</td>
            `;
        } else if (r === 1) {
            tableHtml += `
                <td style="background-color: #fef2f2; color: #991b1b; font-weight: bold; font-size: 12pt; text-align: center; ${cellPad} ${bdr}">${minCount}</td>
                <td style="background-color: #f0fdf4; color: #166534; font-weight: bold; font-size: 12pt; text-align: center; ${cellPad} ${bdr}">${maxCount}</td>
            `;
        } else if (r === 2) {
            tableHtml += `
                <td style="background-color: #fef2f2; color: #7f1d1d; font-weight: bold; text-align: center; ${cellPad} ${bdr}">${minAgentText}</td>
                <td style="background-color: #f0fdf4; color: #14532d; font-weight: bold; text-align: center; ${cellPad} ${bdr}">${maxAgentText}</td>
            `;
        } else if (r === 4) {
            tableHtml += `<td colspan="2" style="background-color: #1d4ed8; color: #ffffff; font-weight: bold; text-align: center; ${cellPad} ${bdr}">TOTAL GÉNÉRAL RÉFÉRENCES</td>`;
        } else if (r === 5) {
            tableHtml += `<td colspan="2" style="background-color: #eff6ff; color: #1e3a8a; font-weight: bold; font-size: 14pt; text-align: center; ${cellPad} ${bdr}">${totalGeneral}</td>`;
        } else {
            tableHtml += `<td colspan="2"></td>`;
        }

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
