export const FILTERS = [
  { key: "normal", label: "Normal", css: "none" },
  { key: "grayscale", label: "Grayscale", css: "grayscale(1)" },
  { key: "sepia", label: "Sepia", css: "sepia(0.9)" },
  { key: "blur", label: "Blur", css: "blur(4px)" },
  { key: "invert", label: "Invert", css: "invert(1)" },
  { key: "contrast", label: "Contrast", css: "contrast(1.5)" }
];

export function getFilterCss(filterKey) {
  return FILTERS.find((filter) => filter.key === filterKey)?.css ?? "none";
}

export function applyVideoFilter(videoElement, filterKey) {
  videoElement.style.filter = getFilterCss(filterKey);
}

export function setupFilterControls(container, onChange) {
  let activeFilter = FILTERS[0].key;

  container.innerHTML = "";
  FILTERS.forEach((filter) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chip${filter.key === activeFilter ? " active" : ""}`;
    button.dataset.filter = filter.key;
    button.textContent = filter.label;
    button.setAttribute("aria-pressed", String(filter.key === activeFilter));

    button.addEventListener("click", () => {
      activeFilter = filter.key;
      updateActiveButtons(container, "filter", activeFilter);
      onChange(activeFilter);
    });

    container.appendChild(button);
  });

  return () => activeFilter;
}

export function updateActiveButtons(container, dataName, activeValue) {
  container.querySelectorAll("button").forEach((button) => {
    const isActive = button.dataset[dataName] === activeValue;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}
