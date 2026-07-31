
/*app.js is the brain of the survey, choses what to show on screen 
and what happens then user clicks a bottonn */

(function () {
  "use strict";

  const CFG = SURVEY_CONFIG;
  const root = document.getElementById("app-root");
 
  const state = {
    step: 0,
    info: {
      name: "", affiliation: "", email: "",
      role: [], role_other: "",
      practice_type: "",
      qualifications: [], qualifications_other: "",
      fellowship_completed: "",
      fellowship_subspecialty: [], subspecialty_other: "",
      years_practice: "",
    },
    globalRanking: null, // { labels: {algoId: 'Algorithm 3'}, order: [algoId,...] }
    submitted: false,
    submitting: false,
    submitError: null,
  };
  
  // Create or retrieve anonymous participant ID
  let anonymousId = localStorage.getItem("survey_anonymous_id");
  
  if (!anonymousId) {
    anonymousId = crypto.randomUUID();
    localStorage.setItem("survey_anonymous_id", anonymousId);
  }
  
  state.anonymous_id = anonymousId;

  const STEP_COAUTHOR = 1;
  const STEP_QUESTIONNAIRE = 2;
  const STEP_RANKING = 3;
  const STEP_THANKS = 4;

/* This function - The first time you enter the ranking, it mixes the 
7 algorithms in random order and labels them "Algorithm 1".."Algorithm 7 */
  function ensureGlobalRankingState() {
    if (state.globalRanking) return state.globalRanking;
    const algoIds = CFG.ALGORITHMS.map(a => a.id);
    const shuffled = [...algoIds].sort(() => Math.random() - 0.5);
    const labels = {};
    shuffled.forEach((id, i) => { labels[id] = "Algorithm " + (i + 1); });
    const entry = { labels, order: shuffled };
    state.globalRanking = entry;
    return entry;
  }

  /* This function creates the 3 possible paths for a file (.jpg, .jpeg, .png) */
  function imageSrc(imageId, fileBase) {
    return [`images/${imageId}/${fileBase}.jpg`,
            `images/${imageId}/${fileBase}.jpeg`,
            `images/${imageId}/${fileBase}.png`];
  }

  /* This function creates an <image> that tries all 3 routes in order until one loads. */
  function imgWithFallback(candidates, alt, cls) {
    const img = document.createElement("img");
    img.alt = alt;
    if (cls) img.className = cls;
    let i = 0;
    img.src = candidates[i];
    img.onerror = () => {
      i += 1;
      if (i < candidates.length) { img.src = candidates[i]; }
      else { img.onerror = null; img.style.background = "#e6e6e6"; }
    };
    return img;
  }

  // Prevents someone from closing the tab mid-survey without noticing 
  window.addEventListener("beforeunload", (e) => {
    if (state.step > 0 && state.step < STEP_THANKS && !state.submitted) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  // This function calculates the progress percentage

  function progressPct() {
    if (state.step <= 0) return 0;
    if (state.step >= STEP_THANKS) return 100;
    return Math.round((state.step / STEP_RANKING) * 100);
  }

  function progressLabel() {
    if (state.step === 0) return "Welcome";
    if (state.step === STEP_COAUTHOR) return "Your details";
    if (state.step === STEP_QUESTIONNAIRE) return "Your background";
    if (state.step === STEP_RANKING) return "Algorithm ranking";
    return "Done";
  }

  // This function handles the rendering of the survey interface

  function render() {
    root.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "progress-wrap";
    wrap.innerHTML = `
      <div class="progress-label">
        <span>${progressLabel()}</span>
        <span>${progressPct()}%</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${progressPct()}%"></div></div>
    `;
    root.appendChild(wrap);

    const card = document.createElement("div");
    card.className = "card";
    root.appendChild(card);

    if (state.step === 0) renderWelcome(card);
    else if (state.step === STEP_COAUTHOR) renderCoAuthor(card);
    else if (state.step === STEP_QUESTIONNAIRE) renderQuestionnaire(card);
    else if (state.step === STEP_RANKING) renderRankingStep(card);
    else renderThanks(card);

    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  // This function renders the welcome screen of the survey
  //Dr Yang, here you can change, what the user sees when he opens the survey, you can change the text and the video link
  function renderWelcome(card) {
    card.innerHTML = `
      <div class="eyebrow">WESTLAB - Bone &amp; Callus Segmentation</div>
      <h1>Which segmentation algorithm is most accurate overall?</h1>
      <p class="subtitle">
        Welcome to the <strong>Fracture Assessment and Monitoring using Ultrasound (FAMUS)</strong> study,
        which aims to advance the use of ultrasound imaging for fracture care at the bedside.
        You have been identified as an expert with relevant expertise, and your participation
        and contribution to this discussion would be invaluable to the progress of this research.
        This work builds on prior work in Scotland (Edinburgh Royal Infirmary Hospital) and in
        Canada (Victoria Hospital). Our goal is to produce a consensus statement publication
        about the development of an automated and validated algorithm for bone and callus
        segmentation from this survey. Your responses provided in this survey will be used to
        identify the most accurate automated algorithm that segments bone and callus.
      </p>
      <p class="subtitle" style="margin-bottom:8px;">Below is a brief demonstration of how to complete this survey.</p>
      <a class="welcome-video" href="${CFG.VIDEO_TUTORIAL_URL}" target="_blank" rel="noopener">
        &#9654;&nbsp; Watch the tutorial before you start
      </a>
      <ul class="fact-list">
        <li><span class="dot"></span> Takes about 3 to 5 minutes, on a single ranking screen.</li>
        <li><span class="dot"></span> Please order the 7 anonymous algorithms from best to worst.</li>
        <li><span class="dot"></span> Click any thumbnail to zoom in before deciding.</li>
        <li><span class="dot"></span> Please make sure that you click SUBMIT at the end of this survey.</li>
      </ul>
      <div class="btn-row">
        <button class="btn btn-primary" id="btn-start">Start</button>
      </div>
    `;
    card.querySelector("#btn-start").onclick = () => { state.step = STEP_COAUTHOR; render(); };
  }

  //Dr Yang, here you can change the text that the user sees when he clicks on "Start" and before he starts the ranking, you can change the text and the questions
  function renderCoAuthor(card) {
    const i = state.info;
    card.innerHTML = `
      <div class="eyebrow">Page 1</div>
      <h2>Your details</h2>
      <p class="subtitle">
        We intend to acknowledge your contributions as a co-author on the publication,
        named either personally, or as a part of the FAMUS study investigators.
        Therefore, please provide us with your details:
      </p>

      <div class="field">
        <label for="f-name">Your name</label>
        <input type="text" id="f-name" placeholder="e.g. Dr. Jane Smith" value="${escapeHtml(i.name)}">
      </div>

      <div class="field">
        <label for="f-affil">Your academic/clinical affiliation(s)</label>
        <input type="text" id="f-affil" placeholder="e.g. Edinburgh Royal Infirmary" value="${escapeHtml(i.affiliation)}">
      </div>

      <div class="field">
        <label for="f-email">Your email address</label>
        <input type="email" id="f-email" placeholder="you@hospital.org" value="${escapeHtml(i.email)}">
      </div>

      <div id="info-error"></div>
      <div class="btn-row">
        <button class="btn btn-secondary" id="btn-back">Back</button>
        <button class="btn btn-primary" id="btn-next">Continue</button>
      </div>
    `;

    card.querySelector("#f-name").oninput   = e => { i.name = e.target.value; };
    card.querySelector("#f-affil").oninput  = e => { i.affiliation = e.target.value; };
    card.querySelector("#f-email").oninput  = e => { i.email = e.target.value; };

    card.querySelector("#btn-back").onclick = () => { state.step = 0; render(); };
    card.querySelector("#btn-next").onclick = () => {
      if (!i.name.trim() || !i.affiliation.trim() || !i.email.trim()) {
        card.querySelector("#info-error").innerHTML =
          `<div class="error-banner">Please fill in your name, affiliation, and email.</div>`;
        return;
      }
      state.step = STEP_QUESTIONNAIRE;
      render();
    };
  }

  //This function renders the questionnaire, where the user has to answer questions about his professional background, you can change the questions and the answers
  function pillGroup(container, options, currentValue, onSelect, name) {
    container.innerHTML = "";
    options.forEach(opt => {
      const pill = document.createElement("label");
      pill.className = "radio-pill" + (currentValue === opt ? " checked" : "");
      pill.innerHTML = `<input type="radio" name="${name}" value="${escapeHtml(opt)}"> ${escapeHtml(opt)}`;
      pill.querySelector("input").checked = currentValue === opt;
      pill.onclick = () => {
        onSelect(opt);
        container.querySelectorAll(".radio-pill").forEach(p => p.classList.remove("checked"));
        pill.classList.add("checked");
      };
      container.appendChild(pill);
    });
  }

  //This function renders the questionnaire, where the user has to answer questions about his professional background, you can change the questions and the answers
  function renderQuestionnaire(card) {
    const i = state.info;
    card.innerHTML = `
      <div class="eyebrow">Page 2</div>
      <h2>Your professional background</h2>
      <p class="subtitle">
        Your responses from here will be pooled with the rest of the panel and analyzed as a
        group. Individual rankings are not linked back to a single reviewer or singled out for
        critique in any report.
      </p>

      <div class="field">
        <label>Current professional roles</label>
        <div class="radio-grid" id="f-role"></div>
        <input type="text" id="f-role-other" class="other-input" placeholder="Please specify"
              style="display:none; margin-top:8px;" value="${escapeHtml(i.role_other)}">
      </div>

      <div class="field">
        <label>Type of Practice</label>
        <div class="radio-grid" id="f-practice"></div>
      </div>

      <div class="field">
        <label>Please select your professional medical qualifications</label>
        <div class="radio-grid" id="f-qual"></div>
        <input type="text" id="f-qual-other" class="other-input" placeholder="Please specify"
              style="display:none; margin-top:8px;" value="${escapeHtml(i.qualifications_other)}">
      </div>

      <div class="field">
        <label>Have you completed a fellowship?</label>
        <div class="radio-grid" id="f-fellowship"></div>
      </div>

      <div class="field">
        <label>Fellowship Subspecialty <span class="hint">(if applicable)</span></label>
        <div class="radio-grid" id="f-subspecialty"></div>
        <input type="text" id="f-subspecialty-other" class="other-input" placeholder="Please specify"
              style="display:none; margin-top:8px;" value="${escapeHtml(i.subspecialty_other)}">
      </div>

      <div class="field">
        <label>Years of Independent Orthopedic Practice</label>
        <div class="radio-grid" id="f-years"></div>
      </div>

      <div id="info-error"></div>
      <div class="btn-row">
        <button class="btn btn-secondary" id="btn-back">Back</button>
        <button class="btn btn-primary" id="btn-next">Continue</button>
      </div>
    `;

    //Dr Yang here you can change the questions and the answers, you can also add more questions if you want, just make sure to add them to the config.js file
    checkboxGroup(
      card.querySelector("#f-role"),
      CFG.ROLE_OPTIONS,
      i.role,
      values => {
        i.role = values;
        card.querySelector("#f-role-other").style.display =
          values.includes("Other") ? "block" : "none";
      },
      "role"
    );
    card.querySelector("#f-role-other").oninput = e => { i.role_other = e.target.value; };
    if (i.role === "Other") card.querySelector("#f-role-other").style.display = "block";

    pillGroup(card.querySelector("#f-practice"), CFG.PRACTICE_TYPE_OPTIONS, i.practice_type,
      v => { i.practice_type = v; }, "practice");

    checkboxGroup(
      card.querySelector("#f-qual"),
      CFG.qualifications_OPTIONS,
      i.qualifications,
      values => {
        i.qualifications = values;
        card.querySelector("#f-qual-other").style.display =
          values.includes("Other") ? "block" : "none";
      },
      "qual"
    );
    card.querySelector("#f-qual-other").oninput = e => { i.qualifications_other = e.target.value; };
    if (i.qualifications === "Other") card.querySelector("#f-qual-other").style.display = "block";

    pillGroup(card.querySelector("#f-fellowship"), ["Yes", "No"], i.fellowship_completed,
      v => { i.fellowship_completed = v; }, "fellowship");

    checkboxGroup(
      card.querySelector("#f-subspecialty"),
      CFG.SUBSPECIALTY_OPTIONS,
      i.fellowship_subspecialty,
      values => {
        i.fellowship_subspecialty = values;
        card.querySelector("#f-subspecialty-other").style.display =
          values.includes("Other") ? "block" : "none";
      },
      "subspecialty"
    );
    card.querySelector("#f-subspecialty-other").oninput = e => { i.subspecialty_other = e.target.value; };
    if (i.fellowship_subspecialty === "Other") card.querySelector("#f-subspecialty-other").style.display = "block";

    pillGroup(card.querySelector("#f-years"), CFG.YEARS_PRACTICE_OPTIONS, i.years_practice,
      v => { i.years_practice = v; }, "years");

    card.querySelector("#btn-back").onclick = () => { state.step = STEP_COAUTHOR; render(); };
    card.querySelector("#btn-next").onclick = () => {
       if (
          i.role.length === 0 ||
          !i.practice_type ||
          i.qualifications.length === 0 ||
          !i.fellowship_completed ||
          !i.years_practice
        ) {
        card.querySelector("#info-error").innerHTML =
          `<div class="error-banner">Please answer every question before continuing.</div>`;
        return;
      }
      state.step = STEP_RANKING;
      render();
    };
  }

  function checkboxGroup(container, options, selectedValues, onChange, name) {
  container.innerHTML = "";

  options.forEach(opt => {
    const label = document.createElement("label");
    label.className = "radio-pill";

    const checked = selectedValues.includes(opt);

    label.innerHTML = `
      <input type="checkbox" name="${name}" value="${escapeHtml(opt)}">
      ${escapeHtml(opt)}
    `;

    const input = label.querySelector("input");
    input.checked = checked;

    if (checked) {
      label.classList.add("checked");
    }

    input.onchange = () => {
      if (input.checked) {
        if (!selectedValues.includes(opt)) {
          selectedValues.push(opt);
        }
        label.classList.add("checked");
      } else {
        const index = selectedValues.indexOf(opt);
        if (index !== -1) {
          selectedValues.splice(index, 1);
        }
        label.classList.remove("checked");
      }

      onChange(selectedValues);
    };

    container.appendChild(label);
  });
}

  //This function builds the strip image for the ranking step, it takes the file name and the alt text as parameters
  function buildStripImage(fileBase, altText) {
    const wrap = document.createElement("div");
    wrap.className = "strip-img-wrap";
    const img = imgWithFallback(imageSrc(CFG.GLOBAL_CASE_ID, fileBase), altText, "strip-img");
    wrap.appendChild(img);
    wrap.onclick = () => openLightbox(img.src);
    return wrap;
  }

  // Loads two strip images (with the usual jpg/jpeg/png fallback) and
  // draws them stacked into a single canvas: top image above, bottom image below. 
  // I used canvas to merge the two images into one, so when the user clicks on it, it zooms in both images at the same time
  function buildMergedStrip(topBase, bottomBase, altText) {
    const wrap = document.createElement("div");
    wrap.className = "strip-img-wrap merged-strip";
    const canvas = document.createElement("canvas");
    canvas.className = "strip-img";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", altText);
    wrap.appendChild(canvas);

    const topImg = new Image();
    const botImg = new Image();
    let topReady = false, botReady = false;
    const gap = 6;

    function draw() {
      if (!topReady || !botReady) return;
      const w = Math.max(topImg.naturalWidth || 1, botImg.naturalWidth || 1);
      const topH = topImg.naturalWidth ? topImg.naturalHeight * (w / topImg.naturalWidth) : 0;
      const botH = botImg.naturalWidth ? botImg.naturalHeight * (w / botImg.naturalWidth) : 0;
      canvas.width = w;
      canvas.height = topH + gap + botH;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, canvas.height);
      if (topImg.naturalWidth) ctx.drawImage(topImg, 0, 0, w, topH);
      if (botImg.naturalWidth) ctx.drawImage(botImg, 0, topH + gap, w, botH);
    }

    //This function loads the images and if one of them fails, it tries the other two formats (.jpg, .jpeg, .png)
    function loadWithFallback(imgEl, candidates, onDone) {
      let i = 0;
      imgEl.onload = onDone;
      imgEl.onerror = () => {
        i += 1;
        if (i < candidates.length) imgEl.src = candidates[i];
        else onDone();
      };
      imgEl.src = candidates[i];
    }

    loadWithFallback(topImg, imageSrc(CFG.GLOBAL_CASE_ID, topBase), () => { topReady = true; draw(); });
    loadWithFallback(botImg, imageSrc(CFG.GLOBAL_CASE_ID, bottomBase), () => { botReady = true; draw(); });

    wrap.onclick = () => openLightbox(canvas.toDataURL("image/png"));
    return wrap;
  }
//Renders the ranking step, where the user has to rank the 7 algorithms from best to worst, you can change the text and the instructions
  function renderRankingStep(card) {
    const entry = ensureGlobalRankingState();

    card.innerHTML = `
      <div class="eyebrow">Page 3</div>
      <h2>Rank the 7 algorithms from best to worst</h2>
      <p class="subtitle">
        In this survey, we had seven ultrasound images of tibial fracture patients treated
        with an intramedullary nail and imaged 6 weeks post-operatively using an ultrasound
        scanner.
      </p>
    `;


  //All the next code is for the ranking step, where the user has to rank the 7 algorithms from best to worst, you can change the text and the instructions
  //You dont neet to change it if you are okay with it

    const refWrap = document.createElement("div");
    refWrap.className = "ref-block";
    refWrap.innerHTML = `<div class="ref-block-title">Here are the 7 original ultrasound images</div>`;
    refWrap.appendChild(buildStripImage("original_and_experts_grid", "Original images and an example expert segmentation"));
    const capOriginal = document.createElement("div");
    capOriginal.className = "ref-block-caption";
    capOriginal.textContent = "Original reference images, with one expert's segmentation shown as an example";
    refWrap.appendChild(capOriginal);
    card.appendChild(refWrap);

    const mvWrap = document.createElement("div");
    mvWrap.className = "ref-block";
    mvWrap.innerHTML = `<div class="ref-block-title">Majority Vote</div>`;
    mvWrap.appendChild(buildStripImage("majority_vote", "Majority vote"));
    const capMv = document.createElement("div");
    capMv.className = "ref-block-caption";
    capMv.textContent = "This is the combination and agreement between the segmentations of 6 experts. " +
      "It may not be an anatomically sound segmentation on its own. It simply reflects " +
      "what all experts commonly segmented.";
    mvWrap.appendChild(capMv);
    card.appendChild(mvWrap);

    const instr = document.createElement("p");
    instr.className = "rank-instructions";
    instr.innerHTML = "Please order the 7 segmentation algorithms (1 = best, 7 = worst). " +
      "<strong>The numbered badge is your ranking position.</strong> " +
      "<strong>\u201cAlgorithm N\u201d is only a label</strong> to identify each option and carries no meaning on its own.";
    card.appendChild(instr);

    const list = document.createElement("ul");
    list.className = "rank-list";
    card.appendChild(list);

    function paintList() {
      list.innerHTML = "";
      entry.order.forEach((algoId, idx) => {
        const li = document.createElement("li");
        li.className = "rank-item algo-block";
        li.draggable = true;
        li.dataset.algoId = algoId;

        const head = document.createElement("div");
        head.className = "algo-block-head";

        const badge = document.createElement("div");
        badge.className = "rank-badge";
        badge.style.background = rankColor(idx, entry.order.length);
        badge.textContent = String(idx + 1);
        head.appendChild(badge);

        const handle = document.createElement("span");
        handle.className = "drag-handle";
        handle.setAttribute("aria-hidden", "true");
        handle.textContent = "\u22ee\u22ee";
        head.appendChild(handle);

        const name = document.createElement("div");
        name.className = "algo-tag";
        name.textContent = entry.labels[algoId];
        head.appendChild(name);

        const controls = document.createElement("div");
        controls.className = "rank-controls";

        const upBtn = document.createElement("button");
        upBtn.className = "icon-btn";
        upBtn.type = "button";
        upBtn.innerHTML = "&#8593;";
        upBtn.setAttribute("aria-label", "Move up");
        upBtn.disabled = idx === 0;
        upBtn.onclick = () => { moveItem(idx, idx - 1); };

        const downBtn = document.createElement("button");
        downBtn.className = "icon-btn";
        downBtn.type = "button";
        downBtn.innerHTML = "&#8595;";
        downBtn.setAttribute("aria-label", "Move down");
        downBtn.disabled = idx === entry.order.length - 1;
        downBtn.onclick = () => { moveItem(idx, idx + 1); };

        controls.appendChild(upBtn);
        controls.appendChild(downBtn);
        head.appendChild(controls);

        li.appendChild(head);

        const mergedLabel = document.createElement("div");
        mergedLabel.className = "algo-block-sublabel";
        mergedLabel.textContent = "Original (top) & " + entry.labels[algoId] + " (bottom)";
        li.appendChild(mergedLabel);
        li.appendChild(buildMergedStrip("only_original_row", algoId,
          "Original, with " + entry.labels[algoId] + " below it"));

        li.addEventListener("dragstart", () => { li.classList.add("dragging"); });
        li.addEventListener("dragend", () => {
          li.classList.remove("dragging");
          if (list.querySelector(".dragging")) paintList();
        });
        li.addEventListener("dragover", (e) => {
          e.preventDefault();
          li.classList.add("drag-over");
        });
        li.addEventListener("dragleave", () => li.classList.remove("drag-over"));
        li.addEventListener("drop", (e) => {
          e.preventDefault();
          li.classList.remove("drag-over");
          const draggingEl = list.querySelector(".dragging");
          if (!draggingEl || draggingEl === li) return;
          const fromId = draggingEl.dataset.algoId;
          const toId = li.dataset.algoId;
          const fromIdx = entry.order.indexOf(fromId);
          const toIdx = entry.order.indexOf(toId);
          moveItem(fromIdx, toIdx);
        });

        list.appendChild(li);
      });
    }

    // This function moves an item in the ranking list from one index to another
    function moveItem(fromIdx, toIdx) {
      if (toIdx < 0 || toIdx >= entry.order.length) return;

      const firstRects = new Map();
      Array.from(list.children).forEach(el => {
        firstRects.set(el.dataset.algoId, el.getBoundingClientRect());
      });

      const [moved] = entry.order.splice(fromIdx, 1);
      entry.order.splice(toIdx, 0, moved);
      paintList();

      Array.from(list.children).forEach(el => {
        const first = firstRects.get(el.dataset.algoId);
        if (!first) return;
        const last = el.getBoundingClientRect();
        const deltaY = first.top - last.top;
        if (!deltaY) return;
        el.style.transition = "none";
        el.style.transform = `translateY(${deltaY}px)`;
        requestAnimationFrame(() => {
          el.style.transition = "transform 320ms cubic-bezier(.22,.8,.28,1)";
          el.style.transform = "";
        });
      });
    }

    // Initial paint of the ranking list
    paintList();

    const btnRow = document.createElement("div");
    btnRow.className = "btn-row";
    btnRow.innerHTML = `
      <button class="btn btn-secondary" id="btn-back">Back</button>
      <button class="btn btn-primary" id="btn-submit">${state.submitting ? "Submitting\u2026" : "Submit my ranking"}</button>
    `;
    card.appendChild(btnRow);

    if (state.submitError) {
      const err = document.createElement("div");
      err.innerHTML = `<div class="error-banner">${escapeHtml(state.submitError)}</div>`;
      card.appendChild(err);
    }

    card.querySelector("#btn-back").onclick = () => { state.step = STEP_QUESTIONNAIRE; render(); };
    card.querySelector("#btn-submit").onclick = submit;
  }


  //Next functions are all helper functions, you dont need to change them
  function rankColor(idx, total) {
    const t = total <= 1 ? 0 : idx / (total - 1);
    const purple = [61, 18, 118];
    const wine = [126, 41, 84];
    const c = purple.map((v, i) => Math.round(v + (wine[i] - v) * t));
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
  }

  function renderThanks(card) {
    card.innerHTML = `
      <div class="thanks-icon">&#10003;</div>
      <h2>Thank you! Your ranking has been recorded.</h2>
      <p class="subtitle">
        Your evaluation will help determine the most effective segmentation algorithm.
      </p>
    `;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function openLightbox(src) {
    const box = document.createElement("div");
    box.className = "lightbox";
    box.innerHTML = `<button class="close-x" aria-label="Close">&times;</button>`;
    const img = document.createElement("img");
    img.src = src;
    box.appendChild(img);
    box.onclick = (e) => { if (e.target === box || e.target.classList.contains("close-x")) box.remove(); };
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape") { box.remove(); document.removeEventListener("keydown", esc); }
    });
    document.body.appendChild(box);
  }

  function buildPayload() {
    const i = state.info;
    return {
      submitted_at: new Date().toISOString(),
      anonymous_id: state.anonymous_id,
      name: i.name,
      affiliation: i.affiliation,
      email: i.email,
      role: i.role.includes("Other")
      ? [...i.role.filter(r => r !== "Other"), i.role_other]
      : i.role,
      practice_type: i.practice_type,
      qualifications: i.qualifications.includes("Other")
      ? [...i.qualifications.filter(q => q !== "Other"), i.qualifications_other]
      : i.qualifications,
      fellowship_completed: i.fellowship_completed,
      fellowship_subspecialty: i.fellowship_subspecialty.includes("Other")
      ? [...i.fellowship_subspecialty.filter(s => s !== "Other"), i.subspecialty_other]
      : i.fellowship_subspecialty,
      years_practice: i.years_practice,
      responses: [
        {
          image_id: "global",
          ranking: state.globalRanking ? state.globalRanking.order : [],
        }
      ],
    };
  }

  //Submits the survey data to the server, handles errors and updates the UI accordingly
  async function submit() {
    if (state.submitting) return;
    state.submitting = true;
    state.submitError = null;
    render();

    const payload = buildPayload();

    try {
      if (!CFG.APPS_SCRIPT_URL || CFG.APPS_SCRIPT_URL.indexOf("PASTE_YOUR") === 0) {
        throw new Error("The survey isn't configured yet (missing APPS_SCRIPT_URL).");
      }
      await fetch(CFG.APPS_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload),
      });
      state.submitting = false;
      state.submitted = true;
      state.step = STEP_THANKS;
      render();
    } catch (err) {
      state.submitting = false;
      state.submitError = "Couldn't connect to the server. Please try again.";
      render();
    }
  }

  render();
})();
