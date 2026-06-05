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

export function addStar(state, amount = 1) {
  return {
    ...state,
    stars: Math.min(99, state.stars + amount)
  };
}

