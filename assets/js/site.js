'use strict';
// Each bilingual pair shares section IDs. Keep deep links on the corresponding page.
for (const link of document.querySelectorAll('[data-language-switch]')) {
 const base=link.getAttribute('href');
 const sync=()=>{link.setAttribute('href',base+location.hash)};
 sync(); window.addEventListener('hashchange',sync);
}
