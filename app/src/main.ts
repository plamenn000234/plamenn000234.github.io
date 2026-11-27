import "./app.css";
import { mount } from "svelte";
import App from "./App.svelte";
import { migrate } from "./core/store.svelte";
import { applyTheme } from "./core/ui.svelte";

migrate();
applyTheme();
mount(App as any, { target: document.getElementById("app")! } as any);
