function note(kind = "filled") {
  return `
    <span class="rhythm-note rhythm-note-${kind}">
      <span class="note-head" aria-hidden="true"></span>
      <span class="note-stem" aria-hidden="true"></span>
    </span>
  `;
}

function beamedNotes(count, beamCount) {
  return `
    <span class="beamed-note-group" style="--note-count:${count}; --beam-count:${beamCount}" aria-hidden="true">
      ${Array.from({ length: count }, () => note()).join("")}
      <span class="beam beam-one"></span>
      ${beamCount > 1 ? '<span class="beam beam-two"></span>' : ""}
    </span>
  `;
}

function renderPattern(pattern) {
  if (pattern === "sixteenth-run") {
    return beamedNotes(4, 2);
  }

  if (pattern === "eighth-pair") {
    return beamedNotes(2, 1);
  }

  if (pattern === "quarter-note") {
    return note();
  }

  if (pattern === "half-note") {
    return note("open");
  }

  if (pattern === "dotted-half-note") {
    return `${note("open")}<span class="rhythm-dot" aria-hidden="true"></span>`;
  }

  if (pattern === "two-quarters") {
    return `${note()}${note()}`;
  }

  if (pattern === "three-quarters") {
    return `${note()}${note()}${note()}`;
  }

  if (pattern === "quarter-rest") {
    return '<span class="rhythm-rest" aria-hidden="true">休</span>';
  }

  return "";
}

export function renderRhythmMark(card, className = "") {
  return `
    <span class="rhythm-mark rhythm-mark-${card.pattern} ${className}" aria-label="${card.beats}拍节奏">
      ${renderPattern(card.pattern)}
    </span>
  `;
}
