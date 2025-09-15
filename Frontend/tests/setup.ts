// JSDOM globals are provided by Vitest when environment is 'jsdom'
// Extend expect with Testing Library matchers
import '@testing-library/jest-dom';
// Polyfill createObjectURL for tests needing blob downloads
if(!(URL as any).createObjectURL){
	(URL as any).createObjectURL = ()=>'blob:mock-url';
	(URL as any).revokeObjectURL = ()=>{};
}

// Add minimal setup here if needed (e.g., crypto polyfills)
