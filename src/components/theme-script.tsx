// Inline script to prevent flash of wrong theme on load.
// This is a static, hardcoded string — no user input, no XSS risk.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(t==null&&matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})()`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />;
}
