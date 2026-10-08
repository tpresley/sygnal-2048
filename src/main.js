// import CSS (Vite automatically injects this properly on bundling)
import '../public/style.css'

// initialize the application
import { run } from 'sygnal'
import App from './app.jsx'

// run() adds STATE, DOM, EVENTS, and LOG drivers automatically
// and mounts to the #root element
// to add additional drivers, provide them as the second parameter to run()
//
// the sygnal Vite plugin automatically wires up HMR for this run() call,
// preserving state across hot updates
run(App)
