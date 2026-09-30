/* ------------------
   app.js
   Brain of the survey:
   - Controls what is displayed
   - Handles navigation
   - Handles questionnaire
   - Randomizes presentation order
   - Handles algorithm ranking
   - Handles image zoom
   - Handles submission

   IMPORTANT:
   - Algorithm IDs/names remain FIXED across respondents.
   - The initial DISPLAY ORDER is randomized per respondent.
   - The PURPLE NUMBERED BADGE is the respondent's ranking position.
   - The submitted ranking uses the stable algorithm IDs.
   ------------------ */

(function () {
  "use strict";

  const CFG = SURVEY_CONFIG;
  const root = document.getElementById("app-root");

  /* ------------------ STATE ------------------ */

  const state = {
    step: 0,

    info: {
      name: "",
      affiliation: "",
      email: "",

      role: [],
      role_other: "",

      practice_type: "",

      qualification: [],
      qualification_other: "",

      fellowship_completed: "",

      fellowship_subspecialty: [],
      subspecialty_other: "",

      years_practice: "",
    },

    /*
     * IMPORTANT:
     *
     * This is NOT an algorithm-label randomization.
     *
     * The algorithm IDs remain fixed.
     *
     * Example:
     *
     * CFG.ALGORITHMS:
     * [
     *   { id: "algoA" },
     *   { id: "algoB" },
     *   ...
     * ]
     *
     * order:
     *   ["algoB", "algoA", ...]
     *
     * This determines the RANDOMIZED INITIAL DISPLAY ORDER.
     *
     * The ID itself remains the identity of the algorithm.
     */
    globalRanking: null,

    submitted: false,
    submitting: false,
    submitError: null,
  };

  /* ------------------ STEP CONSTANTS ------------------ */

  const STEP_COAUTHOR = 1;
  const STEP_QUESTIONNAIRE = 2;
  const STEP_RANKING = 3;
  const STEP_THANKS = 4;

  /* ------------------ ANONYMOUS PARTICIPANT ID ------------------ */

  let anonymousId = localStorage.getItem(
    "survey_anonymous_id"
  );

  if (!anonymousId) {
    anonymousId = crypto.randomUUID();

    localStorage.setItem(
      "survey_anonymous_id",
      anonymousId
    );
  }

  state.anonymous_id = anonymousId;

  /* ------------------ RANDOMIZE INITIAL DISPLAY ORDER ------------------ */

  /*
   * The algorithms themselves are NOT renamed.
   *
   * Their IDs remain stable across all respondents.
   *
   * We only randomize the initial order in which the algorithms
   * appear on the ranking page.
   *
   * Example:
   *
   * Original CFG order:
   *
   *   algoA
   *   algoB
   *   algoC
   *   algoD
   *   algoE
   *   algoF
   *   algoG
   *
   * Respondent 1 may see:
   *
   *   algoD
   *   algoA
   *   algoG
   *   algoB
   *   algoF
   *   algoC
   *   algoE
   *
   * Respondent 2 may see:
   *
   *   algoB
   *   algoF
   *   algoA
   *   algoE
   *   algoD
   *   algoG
   *   algoC
   *
   * The underlying algorithm IDs remain unchanged.
   */

  function ensureGlobalRankingState() {

    if (state.globalRanking) {
      return state.globalRanking;
    }

    const algoIds = CFG.ALGORITHMS.map(
      a => a.id
    );

    /*
     * Fisher-Yates shuffle.
     *
     * This is preferable to:
     * array.sort(() => Math.random() - 0.5)
     *
     * because Fisher-Yates gives a proper unbiased shuffle.
     */

    const shuffled = [...algoIds];

    for (
      let i = shuffled.length - 1;
      i > 0;
      i--
    ) {

      const j =
        Math.floor(
          Math.random() * (i + 1)
        );

      [
        shuffled[i],
        shuffled[j]
      ] = [
        shuffled[j],
        shuffled[i]
      ];
    }

    /*
     * Store only the stable algorithm IDs
     * and their randomized initial order.
     *
     * We deliberately DO NOT create randomized
     * algorithm names here.
     */

    state.globalRanking = {
      order: shuffled
    };

    return state.globalRanking;
  }

  /* ------------------ GET ALGORITHM DISPLAY NAME ------------------ */

  /*
   * Algorithm names should come from SURVEY_CONFIG.
   *
   * If CFG.ALGORITHMS contains:
   *
   * {
   *   id: "algoA",
   *   name: "Algorithm 1"
   * }
   *
   * then this function returns "Algorithm 1".
   *
   * If there is no explicit name, it falls back
   * to the algorithm ID.
   */

  function getAlgorithmName(algoId) {

    const algo =
      CFG.ALGORITHMS.find(
        a => a.id === algoId
      );

    if (!algo) {
      return algoId;
    }

    return (
      algo.name ||
      algo.label ||
      algoId
    );
  }

  /* ------------------ IMAGE PATH FALLBACK ------------------ */

  /*
   * Creates possible paths for:
   * .jpg
   * .jpeg
   * .png
   */

  function imageSrc(
    imageId,
    fileBase
  ) {

    return [
      `images/${imageId}/${fileBase}.jpg`,
      `images/${imageId}/${fileBase}.jpeg`,
      `images/${imageId}/${fileBase}.png`
    ];
  }

  /* ------------------ IMAGE WITH FALLBACK ------------------ */

  function imgWithFallback(
    candidates,
    alt,
    cls
  ) {

    const img =
      document.createElement("img");

    img.alt = alt;

    if (cls) {
      img.className = cls;
    }

    let i = 0;

    img.src = candidates[i];

    img.onerror = () => {

      i += 1;

      if (i < candidates.length) {

        img.src =
          candidates[i];

      } else {

        img.onerror = null;

        img.style.background =
          "#e6e6e6";
      }
    };

    return img;
  }

  /* ------------------ PREVENT ACCIDENTAL TAB CLOSING ------------------ */

  window.addEventListener(
    "beforeunload",
    e => {

      if (
        state.step > 0 &&
        state.step < STEP_THANKS &&
        !state.submitted
      ) {

        e.preventDefault();

        e.returnValue = "";
      }
    }
  );

  /* ------------------ PROGRESS ------------------ */

  function progressPct() {

    if (state.step <= 0) {
      return 0;
    }

    if (state.step >= STEP_THANKS) {
      return 100;
    }

    return Math.round(
      (state.step / STEP_RANKING) *
        100
    );
  }

  function progressLabel() {

    if (state.step === 0) {
      return "Welcome";
    }

    if (
      state.step === STEP_COAUTHOR
    ) {
      return "Your details";
    }

    if (
      state.step === STEP_QUESTIONNAIRE
    ) {
      return "Your background";
    }

    if (
      state.step === STEP_RANKING
    ) {
      return "Algorithm ranking";
    }

    return "Done";
  }

  /* ------------------ MAIN RENDER FUNCTION ------------------ */

  function render() {

    root.innerHTML = "";

    /* Progress bar */

    const wrap =
      document.createElement("div");

    wrap.className =
      "progress-wrap";

    wrap.innerHTML = `
      <div class="progress-label">
        <span>${progressLabel()}</span>
        <span>${progressPct()}%</span>
      </div>

      <div class="progress-track">
        <div
          class="progress-fill"
          style="width:${progressPct()}%"
        ></div>
      </div>
    `;

    root.appendChild(wrap);

    /* Main card */

    const card =
      document.createElement("div");

    card.className =
      "card";

    root.appendChild(card);

    if (state.step === 0) {

      renderWelcome(card);

    } else if (
      state.step === STEP_COAUTHOR
    ) {

      renderCoAuthor(card);

    } else if (
      state.step === STEP_QUESTIONNAIRE
    ) {

      renderQuestionnaire(card);

    } else if (
      state.step === STEP_RANKING
    ) {

      renderRankingStep(card);

    } else {

      renderThanks(card);
    }

    window.scrollTo({
      top: 0,
      behavior:
        "instant" in window
          ? "instant"
          : "auto"
    });
  }

  /* ------------------ WELCOME ------------------ */

  function renderWelcome(card) {

    card.innerHTML = `
      <div class="eyebrow">
        WESTLAB - Bone &amp; Callus Segmentation
      </div>

      <h1>
        Which segmentation algorithm is most accurate overall?
      </h1>

      <p class="subtitle">
        Welcome to the
        <strong>
          Fracture Assessment and Monitoring using Ultrasound (FAMUS)
        </strong>
        study, which aims to advance the use of ultrasound imaging
        for fracture care at the bedside.

        You have been identified as an expert with relevant expertise,
        and your participation and contribution in this survey would
        be invaluable to the progress of this research.

        This work builds on my prior postdoc work in Scotland
        (Edinburgh Royal Infirmary Hospital) and as faculty in
        Canada (Victoria Hospital; UWO).

        Our goal is to produce a consensus statement publication
        about the development of an automated and validated algorithm
        for bone and healing tissue (callus, hematoma and fracture gap)
        segmentation from this survey.

        In this survey, rather than asking you to segment images,
        we have developed 7 algorithms based on the expert responses
        that we received to date, that can automatically segment
        healing tissue.

        Your responses provided in this survey will be used to
        identify the most accurate automated algorithm (1)
        to worst (7) that segments bone and healing tissue
        based on your expert opinion.
      </p>

      <ul class="fact-list">

        <li>
          <span class="dot"></span>
          This survey takes 3 - 5 mins total.
        </li>

        <li>
          <span class="dot"></span>
          Please order the 7 algorithms from best (1) to worst (7).
        </li>

        <li>
          <span class="dot"></span>
          You can tap or click any image to zoom in.
          On phones and tablets, you can also use two fingers
          to pinch-to-zoom or double-tap the image.
        </li>

        <li>
          <span class="dot"></span>
          Please make sure that you click SUBMIT at the end
          of this survey to record your response.
          PLS NOTE: a slight delay on submission is normal.
        </li>

        <li>
          <span class="dot"></span>
          You are welcome to update your response by submitting again.
          Please ensure that each person uses their own device,
          as submissions from the same device are considered a
          single entry. Only the latest submission from each device
          will be saved.
        </li>

      </ul>

      <div class="btn-row">
        <button
          class="btn btn-primary"
          id="btn-start"
        >
          Start
        </button>
      </div>
    `;

    card.querySelector(
      "#btn-start"
    ).onclick = () => {

      state.step =
        STEP_COAUTHOR;

      render();
    };
  }

  /* ------------------ CO-AUTHOR / DETAILS ------------------ */

  function renderCoAuthor(card) {

    const i =
      state.info;

    card.innerHTML = `
      <div class="eyebrow">
        Page 1
      </div>

      <h2>
        Your details
      </h2>

      <p class="subtitle">
        We intend to acknowledge your contributions as a co-author
        on the publication, named either personally, or as a part
        of the FAMUS study investigators.

        Therefore, please provide us with your details:
      </p>

      <div class="field">
        <label for="f-name">
          Your name
        </label>

        <input
          type="text"
          id="f-name"
          placeholder="e.g. Dr. Jane Smith"
          value="${escapeHtml(i.name)}"
        >
      </div>

      <div class="field">
        <label for="f-affil">
          Your academic/clinical affiliation(s)
        </label>

        <input
          type="text"
          id="f-affil"
          placeholder="e.g. Edinburgh Royal Infirmary"
          value="${escapeHtml(i.affiliation)}"
        >
      </div>

      <div class="field">
        <label for="f-email">
          Your email address
        </label>

        <input
          type="email"
          id="f-email"
          placeholder="you@hospital.org"
          value="${escapeHtml(i.email)}"
        >
      </div>

      <div id="info-error"></div>

      <div class="btn-row">

        <button
          class="btn btn-secondary"
          id="btn-back"
        >
          Back
        </button>

        <button
          class="btn btn-primary"
          id="btn-next"
        >
          Continue
        </button>

      </div>
    `;

    card.querySelector(
      "#f-name"
    ).oninput = e => {
      i.name =
        e.target.value;
    };

    card.querySelector(
      "#f-affil"
    ).oninput = e => {
      i.affiliation =
        e.target.value;
    };

    card.querySelector(
      "#f-email"
    ).oninput = e => {
      i.email =
        e.target.value;
    };

    card.querySelector(
      "#btn-back"
    ).onclick = () => {

      state.step = 0;

      render();
    };

    card.querySelector(
      "#btn-next"
    ).onclick = () => {

      if (
        !i.name.trim() ||
        !i.affiliation.trim() ||
        !i.email.trim()
      ) {

        card.querySelector(
          "#info-error"
        ).innerHTML = `
          <div class="error-banner">
            Please fill in your name, affiliation, and email.
          </div>
        `;

        return;
      }

      state.step =
        STEP_QUESTIONNAIRE;

      render();
    };
  }

  /* ------------------ RADIO GROUP ------------------ */

  function pillGroup(
    container,
    options,
    currentValue,
    onSelect,
    name
  ) {

    container.innerHTML = "";

    options.forEach(opt => {

      const pill =
        document.createElement("label");

      pill.className =
        "radio-pill" +
        (
          currentValue === opt
            ? " checked"
            : ""
        );

      pill.innerHTML = `
        <input
          type="radio"
          name="${name}"
          value="${escapeHtml(opt)}"
        >

        ${escapeHtml(opt)}
      `;

      pill.querySelector(
        "input"
      ).checked =
        currentValue === opt;

      pill.onclick = () => {

        onSelect(opt);

        container
          .querySelectorAll(
            ".radio-pill"
          )
          .forEach(p => {

            p.classList.remove(
              "checked"
            );
          });

        pill.classList.add(
          "checked"
        );
      };

      container.appendChild(
        pill
      );
    });
  }

  /* ------------------ QUESTIONNAIRE ------------------ */

  function renderQuestionnaire(card) {

    const i =
      state.info;

    card.innerHTML = `
      <div class="eyebrow">
        Page 2
      </div>

      <h2>
        Your professional background
      </h2>

      <p class="subtitle">
        Your responses from here will be pooled with the rest
        of the panel and analyzed as a group.

        Individual rankings are not linked back to a single
        reviewer or singled out for critique in any report.
      </p>

      <div class="field">
        <label>
          Current professional roles
        </label>

        <div
          class="radio-grid"
          id="f-role"
        ></div>

        <input
          type="text"
          id="f-role-other"
          class="other-input"
          placeholder="Please specify"
          style="display:none; margin-top:8px;"
          value="${escapeHtml(i.role_other)}"
        >
      </div>

      <div class="field">
        <label>
          Type of Practice
        </label>

        <div
          class="radio-grid"
          id="f-practice"
        ></div>
      </div>

      <div class="field">
        <label>
          Please select your professional medical qualification
        </label>

        <div
          class="radio-grid"
          id="f-qual"
        ></div>

        <input
          type="text"
          id="f-qual-other"
          class="other-input"
          placeholder="Please specify"
          style="display:none; margin-top:8px;"
          value="${escapeHtml(i.qualification_other)}"
        >
      </div>

      <div class="field">
        <label>
          Have you completed a fellowship?
        </label>

        <div
          class="radio-grid"
          id="f-fellowship"
        ></div>
      </div>

      <div class="field">
        <label>
          Fellowship Subspecialty
          <span class="hint">
            (if applicable)
          </span>
        </label>

        <div
          class="radio-grid"
          id="f-subspecialty"
        ></div>

        <input
          type="text"
          id="f-subspecialty-other"
          class="other-input"
          placeholder="Please specify"
          style="display:none; margin-top:8px;"
          value="${escapeHtml(i.subspecialty_other)}"
        >
      </div>

      <div class="field">
        <label>
          Years of Independent Orthopedic Practice
        </label>

        <div
          class="radio-grid"
          id="f-years"
        ></div>
      </div>

      <div id="info-error"></div>

      <div class="btn-row">

        <button
          class="btn btn-secondary"
          id="btn-back"
        >
          Back
        </button>

        <button
          class="btn btn-primary"
          id="btn-next"
        >
          Continue
        </button>

      </div>
    `;

    checkboxGroup(
      card.querySelector(
        "#f-role"
      ),
      CFG.ROLE_OPTIONS,
      i.role,
      values => {

        i.role =
          values;

        card.querySelector(
          "#f-role-other"
        ).style.display =
          values.includes("Other")
            ? "block"
            : "none";
      },
      "role"
    );

    card.querySelector(
      "#f-role-other"
    ).oninput = e => {

      i.role_other =
        e.target.value;
    };

    if (
      i.role.includes("Other")
    ) {

      card.querySelector(
        "#f-role-other"
      ).style.display =
        "block";
    }

    pillGroup(
      card.querySelector(
        "#f-practice"
      ),
      CFG.PRACTICE_TYPE_OPTIONS,
      i.practice_type,
      v => {

        i.practice_type =
          v;
      },
      "practice"
    );

    checkboxGroup(
      card.querySelector(
        "#f-qual"
      ),
      CFG.QUALIFICATION_OPTIONS,
      i.qualification,
      values => {

        i.qualification =
          values;

        card.querySelector(
          "#f-qual-other"
        ).style.display =
          values.includes("Other")
            ? "block"
            : "none";
      },
      "qual"
    );

    card.querySelector(
      "#f-qual-other"
    ).oninput = e => {

      i.qualification_other =
        e.target.value;
    };

    if (
      i.qualification.includes(
        "Other"
      )
    ) {

      card.querySelector(
        "#f-qual-other"
      ).style.display =
        "block";
    }

    pillGroup(
      card.querySelector(
        "#f-fellowship"
      ),
      ["Yes", "No"],
      i.fellowship_completed,
      v => {

        i.fellowship_completed =
          v;
      },
      "fellowship"
    );

    checkboxGroup(
      card.querySelector(
        "#f-subspecialty"
      ),
      CFG.SUBSPECIALTY_OPTIONS,
      i.fellowship_subspecialty,
      values => {

        i.fellowship_subspecialty =
          values;

        card.querySelector(
          "#f-subspecialty-other"
        ).style.display =
          values.includes("Other")
            ? "block"
            : "none";
      },
      "subspecialty"
    );

    card.querySelector(
      "#f-subspecialty-other"
    ).oninput = e => {

      i.subspecialty_other =
        e.target.value;
    };

    if (
      i.fellowship_subspecialty.includes(
        "Other"
      )
    ) {

      card.querySelector(
        "#f-subspecialty-other"
      ).style.display =
        "block";
    }

    pillGroup(
      card.querySelector(
        "#f-years"
      ),
      CFG.YEARS_PRACTICE_OPTIONS,
      i.years_practice,
      v => {

        i.years_practice =
          v;
      },
      "years"
    );

    card.querySelector(
      "#btn-back"
    ).onclick = () => {

      state.step =
        STEP_COAUTHOR;

      render();
    };

    card.querySelector(
      "#btn-next"
    ).onclick = () => {

      if (
        i.role.length === 0 ||
        !i.practice_type ||
        i.qualification.length === 0 ||
        !i.fellowship_completed ||
        !i.years_practice
      ) {

        card.querySelector(
          "#info-error"
        ).innerHTML = `
          <div class="error-banner">
            Please answer every question before continuing.
          </div>
        `;

        return;
      }

      state.step =
        STEP_RANKING;

      render();
    };
  }

  /* ------------------ CHECKBOX GROUP ------------------ */

  function checkboxGroup(
    container,
    options,
    selectedValues,
    onChange,
    name
  ) {

    container.innerHTML = "";

    if (!options) {

      console.error(
        "Missing checkbox options for:",
        name
      );

      return;
    }

    options.forEach(opt => {

      const label =
        document.createElement(
          "label"
        );

      label.className =
        "radio-pill";

      const checked =
        selectedValues.includes(
          opt
        );

      label.innerHTML = `
        <input
          type="checkbox"
          name="${name}"
          value="${escapeHtml(opt)}"
        >

        ${escapeHtml(opt)}
      `;

      const input =
        label.querySelector(
          "input"
        );

      input.checked =
        checked;

      if (checked) {

        label.classList.add(
          "checked"
        );
      }

      input.onchange = () => {

        if (input.checked) {

          if (
            !selectedValues.includes(
              opt
            )
          ) {

            selectedValues.push(
              opt
            );
          }

          label.classList.add(
            "checked"
          );

        } else {

          const index =
            selectedValues.indexOf(
              opt
            );

          if (index !== -1) {

            selectedValues.splice(
              index,
              1
            );
          }

          label.classList.remove(
            "checked"
          );
        }

        onChange(
          selectedValues
        );
      };

      container.appendChild(
        label
      );
    });
  }

  /* ------------------ SIMPLE STRIP IMAGE ------------------ */

  function buildStripImage(
    fileBase,
    altText,
    labelText = ""
  ) {

    const wrap =
      document.createElement(
        "div"
      );

    wrap.className =
      "strip-img-wrap";

    const img =
      imgWithFallback(
        imageSrc(
          CFG.GLOBAL_CASE_ID,
          fileBase
        ),
        altText,
        "strip-img"
      );

    wrap.appendChild(
      img
    );

    /*
     * Open zoom viewer.
     */

    wrap.onclick = () => {

      openLightbox(
        img.src,
        labelText
      );
    };

    return wrap;
  }

  /* ------------------ MERGED STRIP IMAGE ------------------ */

  /*
   * Creates one canvas containing:
   *
   * ORIGINAL
   *
   * ----------------
   *
   * ALGORITHM
   *
   * Clicking it opens the zoom viewer.
   */

  function buildMergedStrip(
    topBase,
    bottomBase,
    altText,
    algorithmLabel = ""
  ) {

    const wrap =
      document.createElement(
        "div"
      );

    wrap.className =
      "strip-img-wrap merged-strip";

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.className =
      "strip-img";

    canvas.setAttribute(
      "role",
      "img"
    );

    canvas.setAttribute(
      "aria-label",
      altText
    );

    wrap.appendChild(
      canvas
    );

    const topImg =
      new Image();

    const botImg =
      new Image();

    let topReady =
      false;

    let botReady =
      false;

    const gap = 6;

    function draw() {

      if (
        !topReady ||
        !botReady
      ) {
        return;
      }

      const w =
        Math.max(
          topImg.naturalWidth || 1,
          botImg.naturalWidth || 1
        );

      const topH =
        topImg.naturalWidth
          ? topImg.naturalHeight *
            (
              w /
              topImg.naturalWidth
            )
          : 0;

      const botH =
        botImg.naturalWidth
          ? botImg.naturalHeight *
            (
              w /
              botImg.naturalWidth
            )
          : 0;

      canvas.width =
        Math.round(w);

      canvas.height =
        Math.round(
          topH +
          gap +
          botH
        );

      const ctx =
        canvas.getContext(
          "2d"
        );

      ctx.fillStyle =
        "#000";

      ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      if (
        topImg.naturalWidth
      ) {

        ctx.drawImage(
          topImg,
          0,
          0,
          w,
          topH
        );
      }

      if (
        botImg.naturalWidth
      ) {

        ctx.drawImage(
          botImg,
          0,
          topH + gap,
          w,
          botH
        );
      }
    }

    function loadWithFallback(
      imgEl,
      candidates,
      onDone
    ) {

      let i = 0;

      imgEl.onload =
        onDone;

      imgEl.onerror = () => {

        i++;

        if (
          i < candidates.length
        ) {

          imgEl.src =
            candidates[i];

        } else {

          onDone();
        }
      };

      imgEl.src =
        candidates[i];
    }

    loadWithFallback(
      topImg,
      imageSrc(
        CFG.GLOBAL_CASE_ID,
        topBase
      ),
      () => {

        topReady =
          true;

        draw();
      }
    );

    loadWithFallback(
      botImg,
      imageSrc(
        CFG.GLOBAL_CASE_ID,
        bottomBase
      ),
      () => {

        botReady =
          true;

        draw();
      }
    );

    /*
     * Open zoom viewer.
     *
     * algorithmLabel is the FIXED algorithm name.
     */

    wrap.onclick = () => {

      openLightbox(
        canvas.toDataURL(
          "image/png"
        ),
        algorithmLabel
      );
    };

    return wrap;
  }

  /* ------------------ RANKING PAGE ------------------ */

  function renderRankingStep(card) {

    const entry =
      ensureGlobalRankingState();

    card.innerHTML = `
      <div class="eyebrow">
        Page 3
      </div>

      <h2>
        Rank the 7 algorithms from best to worst
      </h2>

      <p class="subtitle">
        Below in this survey, you are looking at seven
        sample ultrasound images of tibial fracture patients
        treated with an intramedullary nail and imaged
        6 weeks post-operatively using an ultrasound scanner.
      </p>
    `;

    /* ------------------ ORIGINAL / EXPERT REFERENCE ------------------ */

    const refWrap =
      document.createElement(
        "div"
      );

    refWrap.className =
      "ref-block";

    refWrap.innerHTML = `
      <div class="ref-block-title">
        FOR REFERENCE ONLY:
        Here are the 7 original ultrasound images
        without any segmentation.

        Below each original ultrasound image is an example
        expert segmentation provided by one expert in Scotland.

        This is for reference only and no action is required.
      </div>
    `;

    refWrap.appendChild(
      buildStripImage(
        "original_and_experts_grid",
        "Original images and an example expert segmentation.",
        "Reference — Original + Expert Segmentation"
      )
    );

    const capOriginal =
      document.createElement(
        "div"
      );

    capOriginal.className =
      "ref-block-caption";

    refWrap.appendChild(
      capOriginal
    );

    card.appendChild(
      refWrap
    );

    /* ------------------ MAJORITY VOTE REFERENCE ------------------ */

    const mvWrap =
      document.createElement(
        "div"
      );

    mvWrap.className =
      "ref-block";

    mvWrap.innerHTML = `
      <div class="ref-block-title">
        FOR REFERENCE ONLY: Majority Vote
      </div>
    `;

    mvWrap.appendChild(
      buildStripImage(
        "majority_vote",
        "Majority vote",
        "Reference — Majority Vote"
      )
    );

    const capMv =
      document.createElement(
        "div"
      );

    capMv.className =
      "ref-block-caption";

    capMv.textContent =
      "Consensus segmentation generated by majority voting across segmentations from six expert responses provided by experts in Scotland.";

    mvWrap.appendChild(
      capMv
    );

    card.appendChild(
      mvWrap
    );

    /* ------------------ INSTRUCTIONS ------------------ */

    const instr =
      document.createElement(
        "p"
      );

    instr.className =
      "rank-instructions";

    instr.innerHTML =
      "RANKING ACTIVITY: Please order the 7 segmentation algorithms (1 = best, 7 = worst). " +
      "<strong>The purple numbered badge is your ranking position.</strong> " +
      "<strong>The algorithm name is fixed and identifies the same algorithm for every respondent.</strong> " +
      "The algorithm name itself does not indicate quality or rank. " +
      "Tap or click an image to enlarge it. On phones and tablets, you can pinch with two fingers or double-tap to zoom further.";

    card.appendChild(
      instr
    );

    /* ------------------ RANKING LIST ------------------ */

    const list =
      document.createElement(
        "ul"
      );

    list.className =
      "rank-list";

    card.appendChild(
      list
    );

    /* ------------------ PAINT LIST ------------------ */

    function paintList() {

      list.innerHTML = "";

      entry.order.forEach(
        (algoId, idx) => {

          const li =
            document.createElement(
              "li"
            );

          li.className =
            "rank-item algo-block";

          li.draggable =
            true;

          li.dataset.algoId =
            algoId;

          /* -----------------------------------------------
             HEADER
             ----------------------------------------------- */

          const head =
            document.createElement(
              "div"
            );

          head.className =
            "algo-block-head";

          /* Ranking badge */

          const badge =
            document.createElement(
              "div"
            );

          badge.className =
            "rank-badge";

          /*
           * IMPORTANT:
           *
           * This purple badge is NOT the algorithm identity.
           *
           * It represents the CURRENT ranking position:
           *
           * 1 = best
           * 2 = second
           * ...
           * 7 = worst
           *
           * It changes when the participant moves an item.
           */

          badge.style.background =
            rankColor(
              idx,
              entry.order.length
            );

          badge.textContent =
            String(idx + 1);

          badge.setAttribute(
            "aria-label",
            `Rank ${idx + 1}`
          );

          head.appendChild(
            badge
          );

          /* Drag handle */

          const handle =
            document.createElement(
              "span"
            );

          handle.className =
            "drag-handle";

          handle.setAttribute(
            "aria-hidden",
            "true"
          );

          handle.textContent =
            "⋮⋮";

          head.appendChild(
            handle
          );

          /* FIXED ALGORITHM LABEL */

          const name =
            document.createElement(
              "div"
            );

          name.className =
            "algo-tag";

          /*
           * IMPORTANT:
           *
           * This name is obtained from the stable
           * algorithm configuration.
           *
           * It is NOT randomized.
           */

          name.textContent =
            getAlgorithmName(
              algoId
            );

          head.appendChild(
            name
          );

          /* Up/down controls */

          const controls =
            document.createElement(
              "div"
            );

          controls.className =
            "rank-controls";

          const upBtn =
            document.createElement(
              "button"
            );

          upBtn.className =
            "icon-btn";

          upBtn.type =
            "button";

          upBtn.innerHTML =
            "&#8593;";

          upBtn.setAttribute(
            "aria-label",
            "Move up"
          );

          upBtn.disabled =
            idx === 0;

          upBtn.onclick = () => {

            moveItem(
              idx,
              idx - 1
            );
          };

          const downBtn =
            document.createElement(
              "button"
            );

          downBtn.className =
            "icon-btn";

          downBtn.type =
            "button";

          downBtn.innerHTML =
            "&#8595;";

          downBtn.setAttribute(
            "aria-label",
            "Move down"
          );

          downBtn.disabled =
            idx ===
            entry.order.length - 1;

          downBtn.onclick = () => {

            moveItem(
              idx,
              idx + 1
            );
          };

          controls.appendChild(
            upBtn
          );

          controls.appendChild(
            downBtn
          );

          head.appendChild(
            controls
          );

          li.appendChild(
            head
          );

          /* -----------------------------------------------
             IMAGE DESCRIPTION
             ----------------------------------------------- */

          const mergedLabel =
            document.createElement(
              "div"
            );

          mergedLabel.className =
            "algo-block-sublabel";

          mergedLabel.textContent =
            "Original (top) & " +
            getAlgorithmName(
              algoId
            ) +
            " (bottom)";

          li.appendChild(
            mergedLabel
          );

          /* -----------------------------------------------
             IMAGE
             ----------------------------------------------- */

          li.appendChild(
            buildMergedStrip(
              "only_original_row",
              algoId,
              "Original, with " +
                getAlgorithmName(
                  algoId
                ) +
                " below it",

              /*
               * The zoom viewer receives the FIXED
               * algorithm name.
               *
               * It does NOT receive the ranking badge.
               */
              getAlgorithmName(
                algoId
              )
            )
          );

          /* -----------------------------------------------
             DRAG & DROP
             ----------------------------------------------- */

          li.addEventListener(
            "dragstart",
            () => {

              li.classList.add(
                "dragging"
              );
            }
          );

          li.addEventListener(
            "dragend",
            () => {

              li.classList.remove(
                "dragging"
              );
            }
          );

          li.addEventListener(
            "dragover",
            e => {

              e.preventDefault();

              li.classList.add(
                "drag-over"
              );
            }
          );

          li.addEventListener(
            "dragleave",
            () => {

              li.classList.remove(
                "drag-over"
              );
            }
          );

          li.addEventListener(
            "drop",
            e => {

              e.preventDefault();

              li.classList.remove(
                "drag-over"
              );

              const draggingEl =
                list.querySelector(
                  ".dragging"
                );

              if (
                !draggingEl ||
                draggingEl === li
              ) {

                return;
              }

              const fromId =
                draggingEl.dataset.algoId;

              const toId =
                li.dataset.algoId;

              const fromIdx =
                entry.order.indexOf(
                  fromId
                );

              const toIdx =
                entry.order.indexOf(
                  toId
                );

              moveItem(
                fromIdx,
                toIdx
              );
            }
          );

          list.appendChild(
            li
          );
        }
      );
    }

    /* ------------------ MOVE RANKING ITEM ------------------ */

    function moveItem(
      fromIdx,
      toIdx
    ) {

      if (
        toIdx < 0 ||
        toIdx >= entry.order.length
      ) {

        return;
      }

      const firstRects =
        new Map();

      Array.from(
        list.children
      ).forEach(el => {

        firstRects.set(
          el.dataset.algoId,
          el.getBoundingClientRect()
        );
      });

      const [moved] =
        entry.order.splice(
          fromIdx,
          1
        );

      entry.order.splice(
        toIdx,
        0,
        moved
      );

      paintList();

      Array.from(
        list.children
      ).forEach(el => {

        const first =
          firstRects.get(
            el.dataset.algoId
          );

        if (!first) {
          return;
        }

        const last =
          el.getBoundingClientRect();

        const deltaY =
          first.top -
          last.top;

        if (!deltaY) {
          return;
        }

        el.style.transition =
          "none";

        el.style.transform =
          `translateY(${deltaY}px)`;

        requestAnimationFrame(
          () => {

            el.style.transition =
              "transform 320ms cubic-bezier(.22,.8,.28,1)";

            el.style.transform =
              "";
          }
        );
      });
    }

    /* Initial list */

    paintList();

    /* ------------------ SUBMIT BUTTONS ------------------ */

    const btnRow =
      document.createElement(
        "div"
      );

    btnRow.className =
      "btn-row";

    btnRow.innerHTML = `
      <button
        class="btn btn-secondary"
        id="btn-back"
      >
        Back
      </button>

      <button
        class="btn btn-primary"
        id="btn-submit"
      >
        ${
          state.submitting
            ? "Submitting…"
            : "Submit my ranking"
        }
      </button>
    `;

    card.appendChild(
      btnRow
    );

    if (state.submitError) {

      const err =
        document.createElement(
          "div"
        );

      err.innerHTML = `
        <div class="error-banner">
          ${escapeHtml(
            state.submitError
          )}
        </div>
      `;

      card.appendChild(
        err
      );
    }

    card.querySelector(
      "#btn-back"
    ).onclick = () => {

      state.step =
        STEP_QUESTIONNAIRE;

      render();
    };

    card.querySelector(
      "#btn-submit"
    ).onclick =
      submit;
  }

  /* ------------------ RANKING COLORS ------------------ */

  function rankColor(
    idx,
    total
  ) {

    const t =
      total <= 1
        ? 0
        : idx /
          (total - 1);

    const purple =
      [61, 18, 118];

    const wine =
      [126, 41, 84];

    const c =
      purple.map(
        (v, i) =>
          Math.round(
            v +
              (
                wine[i] -
                v
              ) *
                t
          )
      );

    return `rgb(
      ${c[0]},
      ${c[1]},
      ${c[2]}
    )`;
  }

  /* ------------------ THANK YOU PAGE ------------------ */

  function renderThanks(card) {

    card.innerHTML = `
      <div class="thanks-icon">
        &#10003;
      </div>

      <h2>
        Thank you! Your ranking has been recorded.
      </h2>

      <p class="subtitle">
        Your evaluation will help determine
        the most effective segmentation algorithm.
      </p>
    `;
  }

  /* ------------------ ESCAPE HTML ------------------ */

  function escapeHtml(s) {

    return String(s).replace(
      /[&<>"']/g,
      c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[c])
    );
  }

  /* ------------------ ADVANCED IMAGE LIGHTBOX ------------------ */

  /*
   * Features:
   *
   * - Tap/click image to open
   * - Pinch-to-zoom
   * - Double-tap zoom
   * - Double-click zoom
   * - Mouse wheel zoom
   * - Drag image while zoomed
   * - Algorithm label
   * - Escape to close
   * - Close button
   * - Background click to close
   */

function openLightbox(src, algorithmLabel = "") {
  // Create the lightbox
  const box = document.createElement("div");
  box.className = "lightbox";

  // Make the lightbox fill the entire screen
  box.style.position = "fixed";
  box.style.top = "0";
  box.style.left = "0";
  box.style.width = "100vw";
  box.style.height = "100vh";
  box.style.margin = "0";
  box.style.padding = "0";
  box.style.display = "flex";
  box.style.alignItems = "center";
  box.style.justifyContent = "center";
  box.style.overflow = "hidden";
  box.style.zIndex = "99999";
  box.style.touchAction = "none";

  // Create the viewport
  const viewport = document.createElement("div");
  viewport.className = "lightbox-viewport";

  // Make the viewing window fill the available screen
  viewport.style.position = "absolute";
  viewport.style.top = "0";
  viewport.style.left = "0";
  viewport.style.width = "100vw";
  viewport.style.height = "100vh";
  viewport.style.maxWidth = "none";
  viewport.style.maxHeight = "none";
  viewport.style.margin = "0";
  viewport.style.padding = "0";
  viewport.style.display = "flex";
  viewport.style.alignItems = "center";
  viewport.style.justifyContent = "center";
  viewport.style.overflow = "hidden";
  viewport.style.touchAction = "none";

  // Create the image
  const img = document.createElement("img");
  img.src = src;
  img.alt = algorithmLabel || "Zoomed image";
  img.draggable = false;

  // Allow the image to grow beyond its original size when zoomed
  img.style.position = "absolute";
  img.style.left = "50%";
  img.style.top = "50%";
  img.style.width = "auto";
  img.style.height = "auto";
  img.style.maxWidth = "none";
  img.style.maxHeight = "none";
  img.style.margin = "0";
  img.style.padding = "0";
  img.style.transformOrigin = "center center";
  img.style.userSelect = "none";
  img.style.webkitUserDrag = "none";
  img.style.touchAction = "none";

  // Zoom state
  let scale = 1;
  let translateX = 0;
  let translateY = 0;

  const MIN_SCALE = 1;
  const MAX_SCALE = 5;

  // Update the image transform
  function updateTransform() {
    img.style.transform =
      `translate3d(calc(-50% + ${translateX}px), ` +
      `calc(-50% + ${translateY}px), 0) ` +
      `scale(${scale})`;
  }

  // Add the image to the viewport
  viewport.appendChild(img);
  box.appendChild(viewport);

  // Add the algorithm label
  if (algorithmLabel) {
    const label = document.createElement("div");
    label.className = "lightbox-label";
    label.textContent = algorithmLabel;

    label.style.position = "fixed";
    label.style.top = "20px";
    label.style.left = "50%";
    label.style.transform = "translateX(-50%)";
    label.style.zIndex = "100001";
    label.style.pointerEvents = "none";

    box.appendChild(label);
  }

  // Add the close button
  const closeButton = document.createElement("button");
  closeButton.className = "lightbox-close";
  closeButton.innerHTML = "&times;";
  closeButton.setAttribute("aria-label", "Close");

  closeButton.style.position = "fixed";
  closeButton.style.top = "20px";
  closeButton.style.right = "20px";
  closeButton.style.zIndex = "100002";

  box.appendChild(closeButton);

  // Add zoom instructions
  const hint = document.createElement("div");
  hint.className = "lightbox-hint";
  hint.textContent = "Pinch or scroll to zoom • Drag when zoomed";

  hint.style.position = "fixed";
  hint.style.bottom = "20px";
  hint.style.left = "50%";
  hint.style.transform = "translateX(-50%)";
  hint.style.zIndex = "100001";
  hint.style.pointerEvents = "none";

  box.appendChild(hint);

  // Add the lightbox to the page
  document.body.appendChild(box);

  // Reset zoom
  function resetZoom() {
    scale = 1;
    translateX = 0;
    translateY = 0;
    updateTransform();
  }

  // Close the lightbox
  function closeLightbox() {
    box.remove();
    document.removeEventListener("keydown", handleKeyDown);
  }

  // Close when Escape is pressed
  function handleKeyDown(e) {
    if (e.key === "Escape") {
      closeLightbox();
    }
  }

  document.addEventListener("keydown", handleKeyDown);

  // Close button
  closeButton.addEventListener("click", closeLightbox);

  // Close when clicking the background
  box.addEventListener("click", (e) => {
    if (e.target === box) {
      closeLightbox();
    }
  });

  // Prevent the image from being dragged by the browser
  img.addEventListener("dragstart", (e) => {
    e.preventDefault();
  });

  // Mouse wheel zoom
  viewport.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();

      const rect = viewport.getBoundingClientRect();

      // Position of the mouse relative to the centre of the viewport
      const mouseX = e.clientX - (rect.left + rect.width / 2);
      const mouseY = e.clientY - (rect.top + rect.height / 2);

      const oldScale = scale;

      if (e.deltaY < 0) {
        scale = Math.min(MAX_SCALE, scale * 1.15);
      } else {
        scale = Math.max(MIN_SCALE, scale / 1.15);
      }

      // Keep the point underneath the mouse in the same location
      if (scale !== oldScale) {
        const ratio = scale / oldScale;

        translateX = mouseX - (mouseX - translateX) * ratio;
        translateY = mouseY - (mouseY - translateY) * ratio;
      }

      // Reset translation when returning to the original scale
      if (scale === MIN_SCALE) {
        translateX = 0;
        translateY = 0;
      }

      updateTransform();
    },
    { passive: false }
  );

  // Double-click zoom
  viewport.addEventListener("dblclick", (e) => {
    e.preventDefault();

    const rect = viewport.getBoundingClientRect();

    // Position of the double-click relative to the centre of the viewport
    const clickX = e.clientX - (rect.left + rect.width / 2);
    const clickY = e.clientY - (rect.top + rect.height / 2);

    if (scale === MIN_SCALE) {
      const oldScale = scale;
      scale = Math.min(MAX_SCALE, scale * 2);

      const ratio = scale / oldScale;

      translateX = clickX - (clickX - translateX) * ratio;
      translateY = clickY - (clickY - translateY) * ratio;
    } else {
      resetZoom();
    }

    updateTransform();
  });

  // Touch / pinch zoom state
  let initialDistance = null;
  let initialScale = 1;

  // Touch drag state
  let lastTouchX = null;
  let lastTouchY = null;

  // Calculate the distance between two touches
  function getTouchDistance(touch1, touch2) {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;

    return Math.sqrt(dx * dx + dy * dy);
  }

  // Calculate the centre point between two touches
  function getTouchCenter(touch1, touch2) {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  }

  // Touch start
  viewport.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();

      if (e.touches.length === 2) {
        // Start pinch zoom
        initialDistance = getTouchDistance(
          e.touches[0],
          e.touches[1]
        );

        initialScale = scale;

        lastTouchX = null;
        lastTouchY = null;
      } else if (e.touches.length === 1 && scale > MIN_SCALE) {
        // Start dragging when zoomed
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
      }
    },
    { passive: false }
  );

  // Touch move
  viewport.addEventListener(
    "touchmove",
    (e) => {
      e.preventDefault();

      if (e.touches.length === 2 && initialDistance !== null) {
        // Pinch zoom
        const currentDistance = getTouchDistance(
          e.touches[0],
          e.touches[1]
        );

        const center = getTouchCenter(
          e.touches[0],
          e.touches[1]
        );

        const rect = viewport.getBoundingClientRect();

        const centerX =
          center.x - (rect.left + rect.width / 2);

        const centerY =
          center.y - (rect.top + rect.height / 2);

        const oldScale = scale;

        scale =
          initialScale *
          (currentDistance / initialDistance);

        scale = Math.max(
          MIN_SCALE,
          Math.min(MAX_SCALE, scale)
        );

        // Keep the pinch centre fixed while zooming
        const ratio = scale / oldScale;

        translateX =
          centerX -
          (centerX - translateX) * ratio;

        translateY =
          centerY -
          (centerY - translateY) * ratio;

        updateTransform();
      } else if (
        e.touches.length === 1 &&
        scale > MIN_SCALE &&
        lastTouchX !== null &&
        lastTouchY !== null
      ) {
        // Drag the image when zoomed
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;

        translateX += currentX - lastTouchX;
        translateY += currentY - lastTouchY;

        lastTouchX = currentX;
        lastTouchY = currentY;

        updateTransform();
      }
    },
    { passive: false }
  );

  // Touch end
  viewport.addEventListener(
    "touchend",
    (e) => {
      if (e.touches.length < 2) {
        initialDistance = null;
      }

      if (e.touches.length === 0) {
        lastTouchX = null;
        lastTouchY = null;
      }
    },
    { passive: false }
  );

  // Mouse drag state
  let isDragging = false;
  let lastMouseX = null;
  let lastMouseY = null;

  // Mouse down
  viewport.addEventListener("mousedown", (e) => {
    if (scale <= MIN_SCALE) return;

    e.preventDefault();

    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });

  // Mouse move
  viewport.addEventListener("mousemove", (e) => {
    if (!isDragging || scale <= MIN_SCALE) return;

    e.preventDefault();

    translateX += e.clientX - lastMouseX;
    translateY += e.clientY - lastMouseY;

    lastMouseX = e.clientX;
    lastMouseY = e.clientY;

    updateTransform();
  });

  // Mouse up
  viewport.addEventListener("mouseup", () => {
    isDragging = false;
    lastMouseX = null;
    lastMouseY = null;
  });

  // Mouse leaves the viewport
  viewport.addEventListener("mouseleave", () => {
    isDragging = false;
    lastMouseX = null;
    lastMouseY = null;
  });

  // Prevent scrolling while interacting with the image
  viewport.addEventListener(
    "touchmove",
    (e) => {
      e.preventDefault();
    },
    { passive: false }
  );

  // Update the image once it has loaded
  img.addEventListener("load", () => {
    resetZoom();
  });

  // Initial transform
  updateTransform();
}

  /* ------------------ BUILD SUBMISSION PAYLOAD ------------------ */

  function buildPayload() {

    const i =
      state.info;

    /*
     * The ranking is stored as an ordered array
     * of STABLE algorithm IDs.
     *
     * Example:
     *
     * [
     *   "algoC",
     *   "algoA",
     *   "algoG",
     *   ...
     * ]
     *
     * This means:
     *
     * algoC = rank 1
     * algoA = rank 2
     * algoG = rank 3
     * etc.
     *
     * This is important because the algorithm identity
     * is preserved across all respondents.
     */

    const ranking =
      state.globalRanking
        ? [...state.globalRanking.order]
        : [];

    /*
     * Also save an explicit rank map.
     *
     * This makes the submitted data easier to analyze
     * later and avoids ambiguity.
     *
     * Example:
     *
     * {
     *   algoC: 1,
     *   algoA: 2,
     *   algoG: 3
     * }
     */

    const rankingPositions = {};

    ranking.forEach(
      (algoId, index) => {

        rankingPositions[algoId] =
          index + 1;
      }
    );

    return {

      submitted_at:
        new Date().toISOString(),

      anonymous_id:
        state.anonymous_id,

      name:
        i.name,

      affiliation:
        i.affiliation,

      email:
        i.email,

      role:
        i.role.includes("Other")
          ? [
              ...i.role.filter(
                r => r !== "Other"
              ),
              i.role_other
            ]
          : i.role,

      practice_type:
        i.practice_type,

      qualification:
        i.qualification.includes(
          "Other"
        )
          ? [
              ...i.qualification.filter(
                q => q !== "Other"
              ),
              i.qualification_other
            ]
          : i.qualification,

      fellowship_completed:
        i.fellowship_completed,

      fellowship_subspecialty:
        i.fellowship_subspecialty.includes(
          "Other"
        )
          ? [
              ...i.fellowship_subspecialty.filter(
                s => s !== "Other"
              ),
              i.subspecialty_other
            ]
          : i.fellowship_subspecialty,

      years_practice:
        i.years_practice,

      responses: [
        {
          image_id:
            "global",

          /*
           * Ordered list:
           * first item = rank 1
           * second item = rank 2
           * ...
           */

          ranking:
            ranking,

          /*
           * Explicit algorithm -> rank mapping.
           */

          ranking_positions:
            rankingPositions
        }
      ]
    };
  }

  /* ------------------ SUBMIT ------------------ */

  async function submit() {

    if (
      state.submitting
    ) {

      return;
    }

    state.submitting =
      true;

    state.submitError =
      null;

    render();

    const payload =
      buildPayload();

    try {

      if (
        !CFG.APPS_SCRIPT_URL ||
        CFG.APPS_SCRIPT_URL.indexOf(
          "PASTE_YOUR"
        ) === 0
      ) {

        throw new Error(
          "The survey isn't configured yet (missing APPS_SCRIPT_URL)."
        );
      }

      const response =
        await fetch(
          CFG.APPS_SCRIPT_URL,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "text/plain;charset=utf-8"
            },

            body:
              JSON.stringify(
                payload
              )
          }
        );

      /*
       * fetch() does not automatically throw
       * for HTTP 4xx/5xx errors.
       *
       * Check response.ok so that the survey
       * does not show "Thank you" when the server
       * actually rejected the request.
       */

      if (!response.ok) {

        throw new Error(
          `Server returned HTTP ${response.status}`
        );
      }

      state.submitting =
        false;

      state.submitted =
        true;

      state.step =
        STEP_THANKS;

      render();

    } catch (err) {

      console.error(
        "Submission error:",
        err
      );

      state.submitting =
        false;

      state.submitError =
        "Couldn't connect to the server. Please try again.";

      render();
    }
  }

  /* ------------------ START APPLICATION ------------------ */

  render();

})();
