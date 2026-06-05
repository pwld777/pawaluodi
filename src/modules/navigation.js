const labels = {
  home: "首页",
  beat: "花鼓",
  rhythm: "节奏",
  compose: "创编",
  showcase: "展示"
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
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
    button.setAttribute("aria-label", active ? `${labels[button.dataset.view]}，当前页` : labels[button.dataset.view]);
  });
}

