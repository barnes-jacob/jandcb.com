// Keep footer year current
document.getElementById("year").textContent = new Date().getFullYear();

// Theme switching
const themeSelect = document.getElementById('theme-select');
function applyTheme(name) {
    const root = document.documentElement;
    root.classList.remove('theme-stone', 'theme-red', 'theme-blue');
    switch (name) {
        case 'red':
            root.classList.add('theme-red');
            break;
        case 'blue':
            root.classList.add('theme-blue');
            break;
        case 'stone':
        default:
            root.classList.add('theme-stone');
            break;
    }
}

// Set initial theme based on default value
applyTheme(themeSelect.value);
themeSelect.addEventListener('change', (e) => {
    applyTheme(e.target.value);
});    