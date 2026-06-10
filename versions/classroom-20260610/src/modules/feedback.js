export function announceFeedback(container, message, tone = "info") {
  if (!container) {
    return;
  }

  container.textContent = message;
  container.dataset.tone = tone;
  container.classList.remove("burst");
  void container.offsetWidth;
  container.classList.add("burst");
}

export const maxStars = 3;
export const starLevelIds = ["beat", "rhythm", "compose"];

function normalizeStarCount(value) {
  return Math.min(maxStars, Math.max(0, Number.isFinite(value) ? Math.trunc(value) : 0));
}

export function addStar(state, amount = 1) {
  return {
    ...state,
    stars: normalizeStarCount((Number.isFinite(state.stars) ? state.stars : 0) + amount)
  };
}

export function addLevelStar(state, levelId) {
  if (!starLevelIds.includes(levelId)) {
    return state;
  }

  const awardedLevelStars = state.awardedLevelStars ?? {};
  if (awardedLevelStars[levelId]) {
    return state;
  }

  return addStar({
    ...state,
    awardedLevelStars: {
      ...awardedLevelStars,
      [levelId]: true
    }
  });
}
