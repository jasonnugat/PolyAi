export const THEME_STORAGE_KEY = "polyai-theme";

// Runs in the document head so a saved preference is applied before first paint.
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="dark"){document.documentElement.setAttribute("data-theme","dark")}else{document.documentElement.removeAttribute("data-theme")}}catch(e){}})();`;
