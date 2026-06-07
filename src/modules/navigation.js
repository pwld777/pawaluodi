const labels = {
  home: "首页",
  beat: "花鼓",
  rhythm: "节奏",
  compose: "创编",
  showcase: "展示"
};

const icons = {
  home: "会",
  beat: "鼓",
  rhythm: "花",
  compose: "乐",
  showcase: "奖"
};

export function bindNavigation({ state, setState, render }) {
  document.querySelectorAll(".nav-tab").forEach((button) => {
    button.addEventListener("click", () => {
      setState({ ...state.get(), currentView: button.dataset.view });
      render();
    });
  });
}

export function updateNavigation(currentView) {
  document.querySelectorAll(".nav-tab").forEach((button) => {
    const active = button.dataset.view === currentView;
    const view = button.dataset.view;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
    button.setAttribute("aria-label", active ? `${labels[view]}，当前页` : labels[view]);
    button.innerHTML = `<span class="nav-icon" aria-hidden="true">${icons[view]}</span><span>${labels[view]}</span>`;
  });
}
