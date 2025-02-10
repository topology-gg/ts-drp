import "./App.css";

import Home from "@/components/home";
import { ThemeProvider } from "@/components/theme-provider";

function App() {
	return (
		<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
			<Home />
		</ThemeProvider>
	);
}

export default App;
