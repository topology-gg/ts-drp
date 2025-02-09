import "./App.css";
import { DRPNode } from "@ts-drp/node";
import { useState, useEffect } from "react";

import Home from "@/components/home";
import { ThemeProvider } from "@/components/theme-provider";
import { Spinner } from "@/components/ui/spinner";

function App() {
	const [node, setNode] = useState<DRPNode | null>(null);

	useEffect(() => {
		const initNode = async () => {
			const node = new DRPNode();
			await node.start();
			setNode(node);
		};

		initNode().catch((err) => console.error("node init error", err));
	}, []);

	return (
		<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
			{node ? <Home node={node} /> : <Spinner />}
		</ThemeProvider>
	);
}

export default App;
